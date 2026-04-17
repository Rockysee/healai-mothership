"use client";
import { useState, useCallback } from "react";

// ═══════════════════════════════════════════════════════════════════════════════
// THE MOTHERSHIP — GAMIFIED MENTAL HEALTH ASSESSMENT
// "Discover Your Resilience Archetype"
// Goldenhour Systems Pvt Ltd · DIPP Certified · ambulance.run
//
// Maps users across the Dual-Continua spectrum using scenario-based questions.
// Outputs empowering psychological archetypes, NOT clinical labels.
// Integrates with existing resilience_matrix.py backend via /api/screen
// ═══════════════════════════════════════════════════════════════════════════════

// ─── ARCHETYPE DEFINITIONS ──────────────────────────────────────────────────
const ARCHETYPES = {
  ARCHITECT: {
    id: "ARCHITECT",
    title: "The Architect",
    subtitle: "Builder of Inner Worlds",
    emoji: "🏛️",
    color: "#10b981",
    gradient: "from-emerald-500/20 to-teal-500/10",
    border: "border-emerald-500/30",
    continuum: "Flourishing",
    scoreRange: [80, 100],
    summary:
      "You possess remarkable emotional architecture. Your inner systems — how you process stress, maintain relationships, and sustain energy — are operating with rare precision. You don't just cope; you construct.",
    strengths: [
      "Consistent emotional regulation under pressure",
      "Strong social bonds that energize rather than drain",
      "Natural ability to find meaning in daily routines",
    ],
    growth:
      "Your edge lies in optimization, not repair. Peak performance coaching, advanced mindfulness, and cognitive enhancement protocols can push you from excellent to extraordinary.",
    route: "longevity",
  },
  SENTINEL: {
    id: "SENTINEL",
    title: "The Sentinel",
    subtitle: "Guardian of the Threshold",
    emoji: "🛡️",
    color: "#3b82f6",
    gradient: "from-blue-500/20 to-indigo-500/10",
    border: "border-blue-500/30",
    continuum: "Stable",
    scoreRange: [60, 79],
    summary:
      "You stand watch at the boundary between thriving and surviving. Your instincts are sharp, your defenses are functional, but you're spending energy on vigilance that could be redirected toward growth.",
    strengths: [
      "Reliable under moderate pressure",
      "Protective awareness of personal boundaries",
      "Functional routines that maintain baseline stability",
    ],
    growth:
      "The gap between where you are and where you could be is smaller than you think. A structured 5-day habit reset — focused on sleep, movement, and one honest conversation — can shift your trajectory measurably.",
    route: "habits",
  },
  SEEKER: {
    id: "SEEKER",
    title: "The Seeker",
    subtitle: "Cartographer of the Unknown",
    emoji: "🧭",
    color: "#f59e0b",
    gradient: "from-amber-500/20 to-yellow-500/10",
    border: "border-amber-500/30",
    continuum: "Languishing",
    scoreRange: [40, 59],
    summary:
      "You feel the pull of something unnamed. Not broken, not thriving — somewhere in the fog between. This is languishing: the absence of flourishing. It's the most common and least diagnosed state in modern life.",
    strengths: [
      "Self-awareness that something needs to change",
      "Capacity for deep reflection and honest self-assessment",
      "Resilience reserves that haven't been activated yet",
    ],
    growth:
      "Languishing responds powerfully to micro-interventions. A guided digital CBT module, daily 10-minute mood check-ins, or a structured peer support community can restart your upward trajectory within weeks.",
    route: "therapy-lite",
  },
  PHOENIX: {
    id: "PHOENIX",
    title: "The Phoenix",
    subtitle: "Forged in Transformation",
    emoji: "🔥",
    color: "#ef4444",
    gradient: "from-red-500/20 to-orange-500/10",
    border: "border-red-500/30",
    continuum: "Struggling",
    scoreRange: [20, 39],
    summary:
      "You're in the fire. This is not a character flaw — it is a signal that your current environment, habits, or circumstances have exceeded your system's capacity. The phoenix mythology exists because transformation always begins with honest reckoning.",
    strengths: [
      "Courage to face difficult truths",
      "Awareness that current patterns aren't sustainable",
      "The raw material for profound personal transformation",
    ],
    growth:
      "This is the moment where professional support makes the biggest difference. A direct conversation with a licensed therapist — even one session — can provide the clarity and tools that self-help cannot.",
    route: "therapy",
  },
};

// ─── CRISIS DEFINITION (Not an archetype — safety override) ────────────────
const CRISIS_CONFIG = {
  threshold: 19,
  message:
    "Your responses suggest you may be experiencing significant distress right now. You are not alone, and immediate support is available.",
  resources: [
    { name: "Tele-MANAS (Govt, 24/7)", number: "14416", primary: true },
    { name: "iCall (TISS)", number: "9152987821" },
    { name: "AASRA", number: "9820466726" },
    { name: "Vandrevala Foundation", number: "1860-2662-345" },
  ],
};

// ─── SCENARIO-BASED QUESTIONS ───────────────────────────────────────────────
// Each question covertly assesses a clinical dimension without clinical language.
// Scoring: 0 = highest functioning, 3 = most distressed
// Maps to PHQ-9 dimensions for backend compatibility via /api/screen
const SCENARIOS = [
  {
    id: 1,
    dimension: "interest_pleasure",
    scene: "Monday Morning",
    prompt:
      "Your alarm goes off. The week stretches ahead of you. Before your feet hit the floor, your brain's first automatic thought is:",
    options: [
      { text: "Scanning the week for the thing I'm most excited to build", score: 0 },
      { text: "Mentally assembling today's to-do list — let's get through it", score: 1 },
      { text: "Already tired. Nothing on the calendar sparks anything", score: 2 },
      { text: "The weight of getting up feels genuinely physical", score: 3 },
    ],
  },
  {
    id: 2,
    dimension: "mood_baseline",
    scene: "The Mirror Check",
    prompt:
      "You catch your reflection unexpectedly — in a shop window, a car mirror. The honest, involuntary feeling that surfaces is:",
    options: [
      { text: "Quiet recognition — that's me, moving through the world", score: 0 },
      { text: "Quick self-correction — stand straighter, look sharper", score: 1 },
      { text: "A wave of something I'd rather not name", score: 2 },
      { text: "I avoid mirrors. The disconnect between inside and outside is too loud", score: 3 },
    ],
  },
  {
    id: 3,
    dimension: "sleep_quality",
    scene: "3 AM",
    prompt:
      "It's 3 AM. You're awake. The most accurate description of why is:",
    options: [
      { text: "Rare — I sleep through most nights. If I'm up, I drift back easily", score: 0 },
      { text: "A thought loop got loud. I can usually quiet it within 20 minutes", score: 1 },
      { text: "This happens multiple times a week. My mind won't stop auditing the day", score: 2 },
      { text: "I dread nighttime. Sleep feels like a place where control disappears", score: 3 },
    ],
  },
  {
    id: 4,
    dimension: "energy_fatigue",
    scene: "The 3 PM Crossroads",
    prompt:
      "It's mid-afternoon. Your energy has been declining since lunch. Someone asks you to take on one more small task. Your internal response is:",
    options: [
      { text: "Sure — I've got reserves. I manage energy deliberately", score: 0 },
      { text: "I'll do it, but I'm running on discipline, not enthusiasm", score: 1 },
      { text: "The thought of anything additional feels like being asked to push a car uphill", score: 2 },
      { text: "I'm not sure where the morning went. Every hour feels the same heavy fog", score: 3 },
    ],
  },
  {
    id: 5,
    dimension: "social_connection",
    scene: "The Unanswered Message",
    prompt:
      "A friend you care about sent a voice note 3 days ago. You haven't replied. The real reason is:",
    options: [
      { text: "Genuinely busy — but I've mentally scheduled when I'll respond", score: 0 },
      { text: "I saw it. I'll get to it. Social maintenance just takes effort right now", score: 1 },
      { text: "Replying requires performing a version of myself that I can't access", score: 2 },
      { text: "I've been avoiding most people. Being perceived feels exhausting", score: 3 },
    ],
  },
  {
    id: 6,
    dimension: "cognitive_load",
    scene: "The Decision Point",
    prompt:
      "You need to make a moderately important decision — nothing life-changing, just a choice. Your cognitive process is:",
    options: [
      { text: "Weigh the options, trust my judgment, decide, move on", score: 0 },
      { text: "I can decide, but I second-guess more than I used to", score: 1 },
      { text: "Even small choices feel heavy. I'm outsourcing decisions to avoid the load", score: 2 },
      { text: "My brain feels like it's processing through wet cement. Nothing computes cleanly", score: 3 },
    ],
  },
  {
    id: 7,
    dimension: "self_worth",
    scene: "The Quiet Moment",
    prompt:
      "Late evening. The noise stops. You're alone with your thoughts. The narrative that plays most often is:",
    options: [
      { text: "Gratitude mixed with planning — what I built today, what I'll build tomorrow", score: 0 },
      { text: "A mild accounting — could've done more, but it was okay", score: 1 },
      { text: "A prosecutor's monologue listing everything I'm failing at", score: 2 },
      { text: "Silence would be better than what my thoughts say about me", score: 3 },
    ],
  },
];

// ─── KIDS SCENARIOS (Ages 6-12, simplified) ─────────────────────────────────
const KIDS_SCENARIOS = [
  {
    id: 1,
    scene: "🌅 Morning Time",
    prompt: "When you wake up for school, how do you usually feel?",
    options: [
      { text: "Excited! I can't wait to see my friends", score: 0, emoji: "😊" },
      { text: "It's okay, just another day", score: 1, emoji: "😐" },
      { text: "I wish I could stay in bed longer", score: 2, emoji: "😔" },
      { text: "My tummy hurts and I don't want to go", score: 3, emoji: "😢" },
    ],
  },
  {
    id: 2,
    scene: "🎮 Play Time",
    prompt: "When someone asks you to play your favorite game, you think:",
    options: [
      { text: "Yes! Let's go right now!", score: 0, emoji: "🎉" },
      { text: "Maybe... I'll play for a bit", score: 1, emoji: "🤔" },
      { text: "I don't really feel like playing anything", score: 2, emoji: "😕" },
      { text: "Nothing is fun anymore", score: 3, emoji: "😞" },
    ],
  },
  {
    id: 3,
    scene: "🌙 Bedtime",
    prompt: "When it's time to sleep, what happens?",
    options: [
      { text: "I fall asleep pretty fast after my story/routine", score: 0, emoji: "😴" },
      { text: "Sometimes my brain is busy but I get there", score: 1, emoji: "💭" },
      { text: "I lie awake thinking about worries a lot", score: 2, emoji: "😰" },
      { text: "I get scared or sad at night and can't stop it", score: 3, emoji: "😥" },
    ],
  },
  {
    id: 4,
    scene: "👫 Friend Time",
    prompt: "At lunch or recess with other kids, you usually feel:",
    options: [
      { text: "Happy — I love being with my friends", score: 0, emoji: "💛" },
      { text: "Fine, but sometimes I'd rather be alone", score: 1, emoji: "🙂" },
      { text: "Like I don't really fit in", score: 2, emoji: "😶" },
      { text: "I try to stay away from everyone", score: 3, emoji: "😔" },
    ],
  },
  {
    id: 5,
    scene: "⚡ Energy Check",
    prompt: "How does your body feel most days?",
    options: [
      { text: "Strong and ready to run around!", score: 0, emoji: "💪" },
      { text: "Okay but I get tired sometimes", score: 1, emoji: "🙂" },
      { text: "Tired a lot, even when I slept enough", score: 2, emoji: "😫" },
      { text: "Heavy and slow, like I'm carrying something invisible", score: 3, emoji: "😩" },
    ],
  },
];

// ─── ARCHETYPE RESOLVER ────────────────────────────────────────────────────
function resolveArchetype(totalScore, maxPossible) {
  const healthScore = Math.round((1 - totalScore / maxPossible) * 100);

  if (healthScore < CRISIS_CONFIG.threshold) return { archetype: null, healthScore, crisis: true };

  for (const key of ["ARCHITECT", "SENTINEL", "SEEKER", "PHOENIX"]) {
    const a = ARCHETYPES[key];
    if (healthScore >= a.scoreRange[0] && healthScore <= a.scoreRange[1]) {
      return { archetype: a, healthScore, crisis: false };
    }
  }
  return { archetype: ARCHETYPES.SEEKER, healthScore, crisis: false };
}

// ─── BACKEND SYNC ──────────────────────────────────────────────────────────
async function syncToBackend(answers, healthScore) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 4500);
  try {
    const phq9Mapped = answers.map((a) => a.score);
    while (phq9Mapped.length < 9) phq9Mapped.push(0);
    const res = await fetch("/api/screen", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({
        patient_id: `web_${Date.now()}`,
        scores: phq9Mapped.slice(0, 9),
        run_reference: `ASSESS-${Date.now()}`,
      }),
    });
    if (res.ok) return await res.json();
  } catch {
    // Silently fail — assessment works offline
  } finally {
    clearTimeout(timeoutId);
  }
  return null;
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════
export default function GamifiedAssessment({ onComplete }) {
  const [submittingLead, setSubmittingLead] = useState(false);
  // Unbreakable singleton state
  const [state, setState] = useState({
    stage: "LANDING",     // LANDING | MODE_SELECT | KIDS_AGE | ASSESSING | GATE | RESULT | CRISIS
    mode: null,           // "human" | "kids"
    kidsAge: null,        // "6-8" | "9-12"
    step: 0,
    answers: [],
    result: null,
    lead: { name: "", whatsapp: "" },
    backendResponse: null,
  });

  const scenarios = state.mode === "kids" ? KIDS_SCENARIOS : SCENARIOS;
  const totalQuestions = scenarios.length;
  const progress = totalQuestions > 0 ? (state.step / totalQuestions) * 100 : 0;

  // ── State transition commands ─────────────────────────────────────────
  const startHuman = useCallback(() => {
    setState((s) => ({ ...s, stage: "ASSESSING", mode: "human", step: 0, answers: [] }));
  }, []);

  const startKids = useCallback(() => {
    setState((s) => ({ ...s, stage: "KIDS_AGE", mode: "kids" }));
  }, []);

  const selectKidsAge = useCallback((age) => {
    setState((s) => ({ ...s, stage: "ASSESSING", kidsAge: age, step: 0, answers: [] }));
  }, []);

  const selectOption = useCallback(
    (optionIndex) => {
      const currentScenario = scenarios[state.step];
      const selectedOption = currentScenario.options[optionIndex];
      const newAnswers = [...state.answers, { questionId: currentScenario.id, score: selectedOption.score }];
      const nextStep = state.step + 1;

      if (nextStep >= totalQuestions) {
        const totalScore = newAnswers.reduce((a, b) => a + b.score, 0);
        const maxPossible = totalQuestions * 3;
        const result = resolveArchetype(totalScore, maxPossible);

        if (result.crisis) {
          setState((s) => ({ ...s, answers: newAnswers, stage: "CRISIS", result }));
        } else {
          setState((s) => ({ ...s, answers: newAnswers, stage: "GATE", result }));
        }
      } else {
        setState((s) => ({ ...s, answers: newAnswers, step: nextStep }));
      }
    },
    [state.step, state.answers, scenarios, totalQuestions]
  );

  const submitLead = useCallback(async () => {
    if (submittingLead) return;
    setSubmittingLead(true);
    try {
      const backendResponse = await syncToBackend(state.answers, state.result?.healthScore);
      setState((s) => ({ ...s, stage: "RESULT", backendResponse }));
      // Fire parent callback with archetype + lead data
      if (onComplete && state.result?.archetype) {
        onComplete(
          { ...state.result.archetype, healthScore: state.result.healthScore },
          state.lead
        );
      }
    } finally {
      setSubmittingLead(false);
    }
  }, [state.answers, state.result, state.lead, onComplete, submittingLead]);

  const skipGate = useCallback(async () => {
    const backendResponse = await syncToBackend(state.answers, state.result?.healthScore);
    setState((s) => ({ ...s, stage: "RESULT", backendResponse }));
    if (onComplete && state.result?.archetype) {
      onComplete(
        { ...state.result.archetype, healthScore: state.result.healthScore },
        null
      );
    }
  }, [state.answers, state.result, onComplete]);

  const restart = useCallback(() => {
    setState({
      stage: "LANDING", mode: null, kidsAge: null, step: 0,
      answers: [], result: null, lead: { name: "", whatsapp: "" }, backendResponse: null,
    });
  }, []);

  const updateLead = useCallback((field, value) => {
    setState((s) => ({ ...s, lead: { ...s.lead, [field]: value } }));
  }, []);

  // ═══════════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════════
  return (
    <div className="min-h-screen bg-[#09090b] text-white font-['Inter'] antialiased">
      {/* Progress Bar (during assessment) */}
      {state.stage === "ASSESSING" && (
        <div className="fixed top-0 left-0 right-0 z-50 h-1 bg-white/5">
          <div
            className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      <div className="max-w-2xl mx-auto px-4 py-8 min-h-screen flex flex-col">
        {/* ── Header ────────────────────────────────────────────── */}
        <header className="text-center mb-2">
          <div className="inline-flex items-center gap-2 text-[10px] tracking-[0.2em] text-white/30 font-mono uppercase mb-4">
            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
            Goldenhour Systems · The Mothership
          </div>
        </header>

        {/* ── LANDING ────────────────────────────────────────────── */}
        {state.stage === "LANDING" && (
          <div className="flex-1 flex flex-col justify-center text-center space-y-8">
            <div className="relative mb-4">
              <div className="absolute inset-0 bg-emerald-500/20 blur-[60px] animate-pulse-glow" />
              <h1 className="relative text-4xl sm:text-6xl font-black tracking-tight mb-4 bg-gradient-to-b from-white to-white/40 bg-clip-text text-transparent">
                Discover Your
                <br />
                Resilience Archetype
              </h1>
            </div>
            <p className="text-white/40 text-lg max-w-md mx-auto leading-relaxed font-light">
              7 scenarios. 3 minutes. <br />
              A mirror you've never looked into.
            </p>

            <div className="space-y-3 max-w-xs mx-auto w-full">
              <button
                onClick={startHuman}
                className="w-full py-5 px-6 glass-card rounded-2xl text-sm font-bold tracking-wider transition-all duration-500 group relative overflow-hidden btn-premium"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/10 to-teal-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                <span className="relative text-white/90 group-hover:text-emerald-400 transition-colors">
                  BEGIN ASSESSMENT →
                </span>
              </button>
              <button
                onClick={startKids}
                className="w-full py-5 px-6 glass-card rounded-2xl text-sm font-bold tracking-wider transition-all duration-500 group relative overflow-hidden btn-premium"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-indigo-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                <span className="relative text-white/90 group-hover:text-blue-400 transition-colors">
                  KIDS CORNER (AGES 6–12) →
                </span>
              </button>
            </div>

            <p className="text-[11px] text-white/20 max-w-sm mx-auto">
              Not a diagnosis. A self-discovery tool for educational and wellness purposes only.
              If you're in crisis, call 14416 (Tele-MANAS, 24/7, free).
            </p>
          </div>
        )}

        {/* ── KIDS AGE SELECT ────────────────────────────────────── */}
        {state.stage === "KIDS_AGE" && (
          <div className="flex-1 flex flex-col justify-center text-center space-y-8">
            <h2 className="text-2xl font-bold">How old is the young explorer?</h2>
            <div className="flex gap-4 justify-center">
              {["6-8", "9-12"].map((age) => (
                <button
                  key={age}
                  onClick={() => selectKidsAge(age)}
                  className="py-6 px-8 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-blue-500/30 rounded-2xl transition-all duration-300"
                >
                  <div className="text-3xl mb-2">
                    {age === "6-8" ? "🌱" : "🌿"}
                  </div>
                  <div className="font-medium">{age} years</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── ASSESSING ──────────────────────────────────────────── */}
        {state.stage === "ASSESSING" && state.step < totalQuestions && (
          <div className="flex-1 flex flex-col justify-center space-y-8">
            {/* Scene label */}
            <div className="text-center">
              <span className="inline-block text-[10px] tracking-[0.15em] uppercase text-white/30 font-mono mb-3">
                {state.step + 1} / {totalQuestions} · {scenarios[state.step].scene}
              </span>
              <h2 className="text-xl sm:text-2xl font-semibold leading-relaxed text-white/90 max-w-lg mx-auto">
                {scenarios[state.step].prompt}
              </h2>
            </div>

            {/* Options */}
            <div className="space-y-4">
              {scenarios[state.step].options.map((opt, i) => (
                <button
                  key={i}
                  onClick={() => selectOption(i)}
                  className="w-full text-left py-5 px-6 glass-card rounded-2xl text-sm text-white/70 hover:text-white hover:translate-x-1 transition-all duration-300 leading-relaxed shadow-lg group"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-[10px] font-mono group-hover:bg-white/10 transition-colors">
                      {String.fromCharCode(65 + i)}
                    </div>
                    <span>{opt.text}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── LEAD CAPTURE GATE ───────────────────────────────────── */}
        {state.stage === "GATE" && state.result && (
          <div className="flex-1 flex flex-col justify-center space-y-8 text-center">
            <div>
              <div className="text-5xl mb-4">{state.result.archetype.emoji}</div>
              <h2 className="text-2xl font-bold mb-2">Your Archetype is Ready</h2>
              <p className="text-white/40 text-sm max-w-sm mx-auto">
                Enter your details to unlock your full Resilience Archetype Dossier —
                including your strengths map, growth pathway, and a personalized 5-day protocol.
              </p>
            </div>

            <div className="space-y-3 max-w-xs mx-auto w-full">
              <input
                type="text"
                placeholder="Your name"
                value={state.lead.name}
                onChange={(e) => updateLead("name", e.target.value)}
                className="w-full py-3 px-4 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder-white/30 focus:outline-none focus:border-emerald-500/40 transition-colors"
              />
              <input
                type="tel"
                placeholder="WhatsApp number"
                value={state.lead.whatsapp}
                onChange={(e) => updateLead("whatsapp", e.target.value)}
                className="w-full py-3 px-4 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder-white/30 focus:outline-none focus:border-emerald-500/40 transition-colors"
              />
              <button
                onClick={submitLead}
                disabled={submittingLead || (!state.lead.name.trim() && !state.lead.whatsapp.trim())}
                className="w-full py-3 px-6 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/30 rounded-xl text-sm font-medium text-emerald-400 transition-all duration-300 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                {submittingLead ? "Unlocking..." : "Unlock My Archetype →"}
              </button>
              <button
                onClick={skipGate}
                className="text-[11px] text-white/20 hover:text-white/40 transition-colors"
              >
                Skip — show me the basics
              </button>
            </div>
          </div>
        )}

        {/* ── RESULT ─────────────────────────────────────────────── */}
        {state.stage === "RESULT" && state.result?.archetype && (
          <div className="flex-1 flex flex-col space-y-6 py-4">
            {/* Archetype Card */}
            <div
              className={`bg-gradient-to-br ${state.result.archetype.gradient} border ${state.result.archetype.border} rounded-3xl p-8 text-center`}
            >
              <div className="text-5xl mb-3">{state.result.archetype.emoji}</div>
              <div className="space-y-2">
                <h2 className="text-4xl font-black bg-gradient-to-r from-white via-emerald-200 to-emerald-400 bg-clip-text text-transparent">
                  {state.mode === "kids" ? "YOU ARE A HERO!" : state.result.archetype.title}
                </h2>
                {state.mode === "kids" && (
                  <p className="text-emerald-400 font-bold tracking-widest uppercase text-xs">
                    Hero Hook: {state.result.archetype.id === "SENTINEL" ? "Tiny warriors inside every living thing" : "Solar-powered food factories"}
                  </p>
                )}
              </div>
              <p className="text-white/50 text-sm italic mb-4">
                {state.result.archetype.subtitle}
              </p>
              <div className="inline-flex items-center gap-2 text-[10px] font-mono tracking-wider uppercase px-3 py-1.5 bg-white/5 rounded-full border border-white/10">
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: state.result.archetype.color }}
                />
                {state.result.archetype.continuum} · Score {state.result.healthScore}/100
              </div>
            </div>

            {/* Summary */}
            <div className="glass-panel rounded-3xl p-6 shadow-inner relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-10 text-4xl italic font-serif">"</div>
              <p className="text-white/70 text-sm leading-relaxed relative z-10">
                {state.result.archetype.summary}
              </p>
            </div>

            {/* Strengths */}
            <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-6">
              <h3 className="text-xs font-mono tracking-wider uppercase text-white/30 mb-4">
                Your Strengths
              </h3>
              <ul className="space-y-3">
                {state.result.archetype.strengths.map((s, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm text-white/60">
                    <span className="mt-0.5 w-1.5 h-1.5 bg-emerald-500 rounded-full shrink-0" />
                    {s}
                  </li>
                ))}
              </ul>
            </div>

            {/* Growth Path */}
            <div
              className={`bg-gradient-to-br ${state.result.archetype.gradient} border ${state.result.archetype.border} rounded-2xl p-6`}
            >
              <h3 className="text-xs font-mono tracking-wider uppercase text-white/40 mb-3">
                Your Growth Edge
              </h3>
              <p className="text-white/80 text-sm leading-relaxed mb-4">
                {state.result.archetype.growth}
              </p>
              {/* Route-specific CTA */}
              {state.result.archetype.route === "longevity" && (
                <button className="w-full py-3 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/30 rounded-xl text-sm font-medium text-emerald-400 transition-all">
                  Explore Longevity Protocols →
                </button>
              )}
              {state.result.archetype.route === "habits" && (
                <button className="w-full py-3 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/30 rounded-xl text-sm font-medium text-blue-400 transition-all">
                  Start 5-Day Habit Reset (Free) →
                </button>
              )}
              {state.result.archetype.route === "therapy-lite" && (
                <button className="w-full py-3 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/30 rounded-xl text-sm font-medium text-amber-400 transition-all">
                  Try Guided Self-Care Module →
                </button>
              )}
              {state.result.archetype.route === "therapy" && (
                <button className="w-full py-3 bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 rounded-xl text-sm font-medium text-red-400 transition-all">
                  Talk to a Counselor (Confidential) →
                </button>
              )}
            </div>

            {/* Primary CTA — Talk to AI Guru */}
            {/* Primary CTA — Talk to AI Guru */}
            <button
              onClick={() => {
                if (onComplete && state.result?.archetype) {
                  onComplete(
                    { ...state.result.archetype, healthScore: state.result.healthScore },
                    state.lead
                  );
                }
              }}
              className="w-full py-4 bg-gradient-to-r from-emerald-500/25 to-teal-500/15 hover:from-emerald-500/35 hover:to-teal-500/25 border border-emerald-500/30 rounded-2xl text-sm font-semibold text-emerald-300 transition-all duration-300 flex items-center justify-center gap-2"
            >
              <span>🧠</span>
              Talk to Your AI Life Guru
              <span className="text-xs text-emerald-500/60">→</span>
            </button>

            {/* Intelligence Mapping: Guardian & Flow */}
            <div className="grid grid-cols-2 gap-3">
              {(state.mode === "kids" || state.result.archetype.id === "SENTINEL") && (
                <button
                  onClick={() => onComplete && onComplete({ ...state.result.archetype, view: "guardian" }, state.lead)}
                  className="py-4 bg-indigo-500/20 border border-indigo-500/30 rounded-2xl text-xs font-bold text-indigo-300 transition-all flex items-center justify-center gap-2"
                >
                  🛡️ Active Guardian
                </button>
              )}
              {(state.result.archetype.id === "ARCHITECT" || state.result.healthScore > 85) && (
                <button
                  onClick={() => onComplete && onComplete({ ...state.result.archetype, view: "flow" }, state.lead)}
                  className="py-4 bg-amber-500/20 border border-amber-500/30 rounded-2xl text-xs font-bold text-amber-300 transition-all flex items-center justify-center gap-2"
                >
                  ⚡ Enter Flow
                </button>
              )}
            </div>

            {/* Share + Restart */}
            <div className="flex gap-3">
              <button
                onClick={() => {
                  const text = `I'm "${state.result.archetype.title}" — ${state.result.archetype.subtitle}. Discover your Resilience Archetype:`;
                  if (navigator.share) {
                    navigator.share({ title: "My Resilience Archetype", text });
                  } else {
                    navigator.clipboard?.writeText(text);
                  }
                }}
                className="flex-1 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-sm text-white/60 hover:text-white/90 transition-all"
              >
                Share Result
              </button>
              <button
                onClick={restart}
                className="flex-1 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-sm text-white/60 hover:text-white/90 transition-all"
              >
                Retake
              </button>
            </div>

            {/* Disclaimer */}
            <p className="text-[10px] text-white/15 text-center leading-relaxed px-4">
              This assessment is for educational and self-discovery purposes only. It is not a medical
              diagnosis and does not replace professional psychiatric evaluation. If you are
              experiencing distress, please contact Tele-MANAS at 14416 (free, 24/7). Your data is
              encrypted with AES-256 and never shared without your consent. MHCA 2017 compliant.
              <br />© {new Date().getFullYear()} Goldenhour Systems Pvt Ltd · ambulance.run
            </p>
          </div>
        )}

        {/* ── CRISIS SAFETY NET ─────────────────────────────────── */}
        {state.stage === "CRISIS" && (
          <div className="flex-1 flex flex-col justify-center space-y-8 text-center">
            <div className="bg-red-500/10 border border-red-500/20 rounded-3xl p-8">
              <div className="text-4xl mb-4">💙</div>
              <h2 className="text-2xl font-bold mb-4 text-white">
                You're not alone right now
              </h2>
              <p className="text-white/60 text-sm leading-relaxed max-w-sm mx-auto mb-6">
                {CRISIS_CONFIG.message}
              </p>
              <div className="space-y-3 max-w-xs mx-auto">
                {CRISIS_CONFIG.resources.map((r, i) => (
                  <a
                    key={i}
                    href={`tel:${r.number}`}
                    className={`block py-4 px-6 rounded-xl text-sm font-medium transition-all ${
                      r.primary
                        ? "bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/30"
                        : "bg-white/5 border border-white/10 text-white/70 hover:bg-white/10"
                    }`}
                  >
                    📞 {r.name} — {r.number}
                  </a>
                ))}
              </div>
            </div>
            <button
              onClick={restart}
              className="text-[11px] text-white/20 hover:text-white/40 transition-colors"
            >
              ← Back to start
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
