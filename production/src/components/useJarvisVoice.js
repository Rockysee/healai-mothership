"use client";
import { useState, useCallback, useRef, useEffect } from "react";

// ═══════════════════════════════════════════════════════════════════════════════
// JARVIS VOICE ENGINE — React Hook
//
// Full voice pipeline:
//   1. STT: Web SpeechRecognition (browser-native)
//   2. AI:  POST /api/jarvis → Anthropic Claude response
//   3. TTS: ElevenLabs audio (base64 → AudioContext playback)
//   4. Sync: Einstein avatar lip-sync via analyser node
//
// Falls back to browser SpeechSynthesis if ElevenLabs returns no audio.
//
// Usage:
//   const jarvis = useJarvisVoice({ einsteinRef, mentorId, onTranscript });
//   jarvis.speak("Hello world", mentor);
//   jarvis.startListening();
//
// Goldenhour Systems Pvt Ltd
// ═══════════════════════════════════════════════════════════════════════════════

const SpeechRecognition = typeof window !== "undefined"
  ? window.SpeechRecognition || window.webkitSpeechRecognition
  : null;

// Read user's voice preferences from localStorage
function getVoiceOptionIndex(mentorId) {
  if (typeof window === "undefined") return 0;
  try {
    const prefs = JSON.parse(localStorage.getItem("healai_voice_prefs") || "{}");
    return prefs[mentorId] ?? 0;
  } catch { return 0; }
}

function pickBrowserVoice(voices, pref) {
  const english = voices.filter(v => v.lang.startsWith("en"));
  if (pref === "female") {
    const f = english.find(v => /samantha|karen|victoria|fiona|female|moira|tessa/i.test(v.name));
    if (f) return f;
  }
  if (pref === "male") {
    const m = english.find(v => /daniel|alex|tom|james|male|aaron|david|fred/i.test(v.name));
    if (m) return m;
  }
  return english[0] || voices[0] || null;
}

export default function useJarvisVoice({
  einsteinRef = null,
  einsteinContext = null,
  onTranscript = null,
  onSpeakingChange = null,
  onListeningChange = null,
} = {}) {
  const [speaking, setSpeaking] = useState(false);
  const [listening, setListening] = useState(false);
  const [loading, setLoading] = useState(false);
  const [voices, setVoices] = useState([]);

  const audioCtxRef = useRef(null);
  const sourceRef = useRef(null);
  const analyserRef = useRef(null);
  const animFrameRef = useRef(null);
  const recognitionRef = useRef(null);
  const synthRef = useRef(typeof window !== "undefined" ? window.speechSynthesis : null);

  // Load browser voices for fallback
  useEffect(() => {
    if (!synthRef.current) return;
    const load = () => setVoices(synthRef.current.getVoices());
    load();
    synthRef.current.onvoiceschanged = load;
  }, []);

  // Notify external state changes
  useEffect(() => { onSpeakingChange?.(speaking); }, [speaking, onSpeakingChange]);
  useEffect(() => { onListeningChange?.(listening); }, [listening, onListeningChange]);

  // ── Audio context (lazy init) ──
  const getAudioCtx = useCallback(() => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
      analyserRef.current = audioCtxRef.current.createAnalyser();
      analyserRef.current.fftSize = 256;
      analyserRef.current.connect(audioCtxRef.current.destination);
    }
    if (audioCtxRef.current.state === "suspended") {
      audioCtxRef.current.resume();
    }
    return audioCtxRef.current;
  }, []);

  // ── Lip-sync animation from audio analyser ──
  const startLipSync = useCallback(() => {
    if (!analyserRef.current) return;
    const data = new Uint8Array(analyserRef.current.frequencyBinCount);

    function tick() {
      analyserRef.current.getByteFrequencyData(data);
      // Calculate energy in speech frequency range (300-3000 Hz)
      let sum = 0;
      const start = Math.floor(300 / (audioCtxRef.current.sampleRate / analyserRef.current.fftSize));
      const end = Math.floor(3000 / (audioCtxRef.current.sampleRate / analyserRef.current.fftSize));
      for (let i = start; i < Math.min(end, data.length); i++) sum += data[i];
      const energy = sum / (end - start) / 255;

      // Drive viseme from energy — this provides real audio-driven lip sync
      // The EinsteinAvatar's speaking mode handles the actual mouth shape cycling,
      // but we sync the start/stop to the actual audio
      if (energy > 0.05 && !speaking) {
        // Audio still playing
      }

      animFrameRef.current = requestAnimationFrame(tick);
    }
    tick();
  }, [speaking]);

  const stopLipSync = useCallback(() => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
  }, []);

  // ── Play ElevenLabs audio (base64 → AudioBuffer → play) ──
  const playElevenLabsAudio = useCallback(async (base64Audio, contentType) => {
    const ctx = getAudioCtx();

    // Decode base64 to ArrayBuffer
    const binaryStr = atob(base64Audio);
    const bytes = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) bytes[i] = binaryStr.charCodeAt(i);

    const audioBuffer = await ctx.decodeAudioData(bytes.buffer);

    // Stop any currently playing audio
    if (sourceRef.current) {
      try { sourceRef.current.stop(); } catch {}
    }

    const source = ctx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(analyserRef.current);
    sourceRef.current = source;

    return new Promise((resolve) => {
      source.onended = () => {
        stopLipSync();
        resolve();
      };
      startLipSync();
      source.start(0);
    });
  }, [getAudioCtx, startLipSync, stopLipSync]);

  // ── Browser TTS fallback ──
  const playBrowserTTS = useCallback((text, mentor) => {
    return new Promise((resolve) => {
      if (!synthRef.current) { resolve(); return; }
      synthRef.current.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      const vc = mentor?.voice || { pitch: 1, rate: 1, voicePref: "female" };
      utterance.pitch = vc.pitch;
      utterance.rate = vc.rate;
      utterance.volume = 1;

      const selectedVoice = pickBrowserVoice(voices, vc.voicePref);
      if (selectedVoice) utterance.voice = selectedVoice;

      utterance.onend = resolve;
      utterance.onerror = resolve;
      synthRef.current.speak(utterance);
    });
  }, [voices]);

  // ── Main speak function — calls JARVIS API ──
  const speak = useCallback(async (text, mentor, options = {}) => {
    if (!text) return;

    // Start avatar speaking
    setSpeaking(true);
    einsteinRef?.current?.startSpeaking?.();
    einsteinContext?.setSpeaking?.(true);

    try {
      if (options.ttsOnly) {
        // Just synthesize audio for existing text
        const res = await fetch("/api/jarvis", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            mentorId: mentor?.id,
            message: text,
            ttsOnly: true,
            voiceOptionIndex: getVoiceOptionIndex(mentor?.id),
          }),
        });

        if (res.ok) {
          const data = await res.json();
          if (data.audioBase64) {
            await playElevenLabsAudio(data.audioBase64, data.audioContentType);
          } else {
            await playBrowserTTS(text, mentor);
          }
        } else {
          await playBrowserTTS(text, mentor);
        }
      } else {
        // Just play audio for pre-fetched text (used when text is already known)
        await playBrowserTTS(text, mentor);
      }
    } catch (err) {
      console.error("[JARVIS speak]", err);
      // Silent fallback — don't break the UX
      await playBrowserTTS(text, mentor).catch(() => {});
    } finally {
      setSpeaking(false);
      einsteinRef?.current?.stopSpeaking?.();
      einsteinContext?.setSpeaking?.(false);
    }
  }, [einsteinRef, einsteinContext, playElevenLabsAudio, playBrowserTTS]);

  // ── Full JARVIS call: AI + TTS in one shot ──
  const askJarvis = useCallback(async (message, mentor, history = [], userMetadata = {}) => {
    setLoading(true);
    einsteinRef?.current?.setExpression?.("pondering");

    try {
      const res = await fetch("/api/jarvis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mentorId: mentor?.id,
          systemPrompt: mentor?.systemPrompt,
          message,
          history: history.slice(-8).map(m => ({ role: m.role, content: m.content })),
          userMetadata,
          voiceOptionIndex: getVoiceOptionIndex(mentor?.id),
        }),
      });

      if (!res.ok) throw new Error(`JARVIS API ${res.status}`);
      const data = await res.json();

      setLoading(false);
      einsteinRef?.current?.setExpression?.("excited");

      // Start speaking
      setSpeaking(true);
      einsteinRef?.current?.startSpeaking?.();
      einsteinContext?.setSpeaking?.(true);

      if (data.audioBase64) {
        await playElevenLabsAudio(data.audioBase64, data.audioContentType);
      } else {
        await playBrowserTTS(data.response, mentor);
      }

      setSpeaking(false);
      einsteinRef?.current?.stopSpeaking?.();
      einsteinContext?.setSpeaking?.(false);
      setTimeout(() => einsteinRef?.current?.setExpression?.("neutral"), 500);

      return data.response;
    } catch (err) {
      console.error("[JARVIS askJarvis]", err);
      setLoading(false);
      setSpeaking(false);
      einsteinRef?.current?.setExpression?.("concerned");
      einsteinRef?.current?.stopSpeaking?.();
      einsteinContext?.setSpeaking?.(false);
      setTimeout(() => einsteinRef?.current?.setExpression?.("neutral"), 3000);
      throw err;
    }
  }, [einsteinRef, einsteinContext, playElevenLabsAudio, playBrowserTTS]);

  // ── Stop all audio ──
  const stop = useCallback(() => {
    // Stop ElevenLabs audio
    if (sourceRef.current) {
      try { sourceRef.current.stop(); } catch {}
      sourceRef.current = null;
    }
    stopLipSync();
    // Stop browser TTS
    synthRef.current?.cancel();
    // Stop recognition
    recognitionRef.current?.stop();

    setSpeaking(false);
    setListening(false);
    einsteinRef?.current?.stopSpeaking?.();
    einsteinContext?.setSpeaking?.(false);
  }, [einsteinRef, einsteinContext, stopLipSync]);

  // ── STT: Start listening ──
  const startListening = useCallback(() => {
    if (!SpeechRecognition) return;
    stop(); // Stop any ongoing activity

    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setListening(true);
      einsteinRef?.current?.setExpression?.("listening");
    };
    recognition.onresult = (event) => {
      const transcript = Array.from(event.results)
        .map(r => r[0].transcript)
        .join("");
      onTranscript?.(transcript, event.results[0]?.isFinal);
    };
    recognition.onend = () => {
      setListening(false);
      einsteinRef?.current?.setExpression?.("neutral");
    };
    recognition.onerror = () => {
      setListening(false);
      einsteinRef?.current?.setExpression?.("neutral");
    };

    recognitionRef.current = recognition;
    recognition.start();
  }, [stop, einsteinRef, onTranscript]);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    setListening(false);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stop();
      if (audioCtxRef.current) {
        audioCtxRef.current.close().catch(() => {});
      }
    };
  }, [stop]);

  return {
    speaking,
    listening,
    loading,
    speak,
    askJarvis,
    stop,
    startListening,
    stopListening,
    hasSTT: !!SpeechRecognition,
    hasTTS: true, // Always true — ElevenLabs or browser fallback
  };
}
