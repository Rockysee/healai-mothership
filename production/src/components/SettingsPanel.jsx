"use client";
import { useState, useEffect, useCallback } from 'react';

const FONT  = "'Inter', system-ui, -apple-system, sans-serif";
const GREEN  = '#22c55e';
const PURPLE = '#a78bfa';
const CYAN   = '#06b6d4';
const ORANGE = '#f59e0b';
const RED    = '#f87171';

const GRADES = [
  'Grade 3','Grade 4','Grade 5','Grade 6','Grade 7','Grade 8',
  'Grade 9','Grade 10','Grade 11','Grade 12','College','Other',
];
const ROLES  = ['Student','Parent','Teacher','Counsellor','Other'];
const BOARDS = ['ICSE','CBSE','State Board','IB','Cambridge','Other'];
const GURUS  = ['Fox (Gen-AI)','Werner Chat','AiRjun','Let AI Decide'];

// ── Voice options per mentor (mirrors MENTOR_VOICE_OPTIONS in /api/jarvis) ──
const VOICE_OPTIONS = {
  ontological: {
    label: 'Werner Chat',
    emoji: '🧠',
    options: [
      { id: 'onifCkec0oVEH6lBKgKq', label: 'Raj — Deep, measured Indian male', desc: 'Warm baritone, slow-paced, ideal for philosophical guidance' },
      { id: 'JBFqnCBsd6RMkjVDRZzb', label: 'George — Warm British baritone', desc: 'Calm, authoritative, classic coaching voice' },
      { id: 'nPczCjzI2devNBz1zQrb', label: 'Brian — Calm authoritative male', desc: 'Steady, grounded, fatherly tone' },
    ],
  },
  spiritual: {
    label: 'Spiritual Guide',
    emoji: '✨',
    options: [
      { id: 'ThT5KcBeYPX3keUQqHPh', label: 'Dorothy — Gentle, nurturing female', desc: 'Soft-spoken, meditative warmth' },
      { id: 'EXAVITQu4vr4xnSDxMaL', label: 'Bella — Warm, expressive female', desc: 'Soothing with natural Indian English cadence' },
      { id: 'jBpfuIE2acCO8z3wKNLl', label: 'Gigi — Youthful, clear female', desc: 'Bright and encouraging, sister-like' },
    ],
  },
  peak: {
    label: 'The Catalyst',
    emoji: '🔥',
    options: [
      { id: 'TX3LPaxmHKxFdv7VOQHJ', label: 'Liam — Energetic, motivational male', desc: 'Punchy but controlled, great for peak coaching' },
      { id: 'pNInz6obpgDQGcFmaJgB', label: 'Adam — Deep, professional male', desc: 'Strong and clear, slow-burn intensity' },
      { id: '2EiwWnXFnvU5JabPnv8n', label: 'Callum — Warm Scottish male', desc: 'Friendly authority, approachable coach' },
    ],
  },
  somatic: {
    label: 'Body Intelligence',
    emoji: '🧘',
    options: [
      { id: 'XB0fDUnXU5powFXDhCwa', label: 'Charlotte — Soothing, clinical female', desc: 'Calm precision, guided breathing pace' },
      { id: 'pFZP5JQG7iQjIQuC4Bku', label: 'Lily — Gentle British female', desc: 'Quiet strength, yoga-instructor warmth' },
      { id: 'onwK4e9ZLuTAKqWW03F9', label: 'Daniel — Low, reassuring male', desc: 'Deep calm, body-scan meditation voice' },
    ],
  },
  fox: {
    label: 'Fox (Gen-AI)',
    emoji: '🦊',
    options: [
      { id: 'SAz9YHcvj6GT2YYXdXww', label: 'River — Non-binary, modern', desc: 'Fresh, conversational, Gen-Z friendly' },
      { id: 'jsCqWAovK2LkecY7zXl4', label: 'Freya — Bright, youthful female', desc: 'Energetic but not rushed, peer-like' },
      { id: 'bIHbv24MWmeRgasZH58o', label: 'Will — Warm, friendly male', desc: 'Casual, big-brother energy' },
    ],
  },
};

// ── Data helpers ─────────────────────────────────────────────────────────────
function readLS(key, fallback = null) {
  if (typeof window === 'undefined') return fallback;
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; } catch { return fallback; }
}
function writeLS(key, val) {
  try { localStorage.setItem(key, typeof val === 'string' ? val : JSON.stringify(val)); } catch {}
}
function clearLS(key) {
  try { localStorage.removeItem(key); } catch {}
}

// ── Sub-components ────────────────────────────────────────────────────────────
function SectionLabel({ children }) {
  return (
    <div style={{ fontSize:'10px', fontWeight:700, color:'rgba(255,255,255,0.3)', letterSpacing:'0.11em', marginBottom:'10px', marginTop:'22px', padding:'0 4px' }}>
      {children}
    </div>
  );
}

function SettingRow({ icon, label, sub, rightEl, onClick, danger, last }) {
  return (
    <div
      onClick={onClick}
      style={{
        display:'flex', alignItems:'center', gap:'14px',
        padding:'13px 16px',
        background:'rgba(255,255,255,0.04)',
        borderBottom: last ? 'none' : '1px solid rgba(255,255,255,0.05)',
        cursor: onClick ? 'pointer' : 'default',
        transition:'background 0.15s',
        WebkitTapHighlightColor:'transparent',
      }}
      onMouseEnter={e => { if (onClick) e.currentTarget.style.background = 'rgba(255,255,255,0.07)'; }}
      onMouseLeave={e => { if (onClick) e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
    >
      {icon && (
        <div style={{ width:'34px', height:'34px', borderRadius:'9px', flexShrink:0, background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.08)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'18px' }}>
          {icon}
        </div>
      )}
      <div style={{ flex:1 }}>
        <div style={{ fontSize:'14px', fontWeight:500, color: danger ? RED : '#fff', lineHeight:1.3 }}>{label}</div>
        {sub && <div style={{ fontSize:'11px', color:'rgba(255,255,255,0.38)', marginTop:'1px', lineHeight:1.4 }}>{sub}</div>}
      </div>
      {rightEl && <div style={{ flexShrink:0 }}>{rightEl}</div>}
      {onClick && !rightEl && <div style={{ color:'rgba(255,255,255,0.22)', fontSize:'13px' }}>›</div>}
    </div>
  );
}

function SettingCard({ children, style = {} }) {
  return (
    <div style={{ borderRadius:'14px', overflow:'hidden', border:'1px solid rgba(255,255,255,0.07)', ...style }}>
      {children}
    </div>
  );
}

function Toggle({ value, onChange }) {
  return (
    <div
      onClick={() => onChange(!value)}
      style={{
        width:'44px', height:'26px', borderRadius:'13px',
        background: value ? GREEN : 'rgba(255,255,255,0.12)',
        position:'relative', cursor:'pointer',
        transition:'background 0.2s ease',
        flexShrink:0,
      }}
    >
      <div style={{
        position:'absolute', top:'3px',
        left: value ? '21px' : '3px',
        width:'20px', height:'20px', borderRadius:'50%',
        background:'#fff',
        transition:'left 0.2s ease',
        boxShadow:'0 1px 4px rgba(0,0,0,0.3)',
      }} />
    </div>
  );
}

function InlineField({ label, value, onChange, type = 'text', placeholder = '' }) {
  return (
    <div style={{ padding:'12px 16px', background:'rgba(255,255,255,0.04)', borderBottom:'1px solid rgba(255,255,255,0.05)' }}>
      <div style={{ fontSize:'11px', color:'rgba(255,255,255,0.38)', fontWeight:600, letterSpacing:'0.05em', marginBottom:'5px' }}>{label}</div>
      <input
        type={type}
        value={value || ''}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          width:'100%', background:'none', border:'none', outline:'none',
          fontSize:'14px', color:'#fff', fontFamily:FONT, padding:0,
          WebkitAppearance:'none',
        }}
      />
    </div>
  );
}

function InlineSelect({ label, value, onChange, options, placeholder = '' }) {
  return (
    <div style={{ padding:'12px 16px', background:'rgba(255,255,255,0.04)', borderBottom:'1px solid rgba(255,255,255,0.05)' }}>
      <div style={{ fontSize:'11px', color:'rgba(255,255,255,0.38)', fontWeight:600, letterSpacing:'0.05em', marginBottom:'5px' }}>{label}</div>
      <select
        value={value || ''}
        onChange={e => onChange(e.target.value)}
        style={{
          width:'100%', background:'transparent', border:'none', outline:'none',
          fontSize:'14px', color: value ? '#fff' : 'rgba(255,255,255,0.35)',
          fontFamily:FONT, padding:0, WebkitAppearance:'none', cursor:'pointer',
        }}
      >
        <option value="">{placeholder || 'Select…'}</option>
        {options.map(o => <option key={o} value={o} style={{ background:'#1a1a1f' }}>{o}</option>)}
      </select>
    </div>
  );
}

// ── Score badge ───────────────────────────────────────────────────────────────
function ScoreBadge({ label, score, band, color }) {
  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 16px', background:'rgba(255,255,255,0.04)', borderBottom:'1px solid rgba(255,255,255,0.05)' }}>
      <span style={{ fontSize:'13px', color:'rgba(255,255,255,0.7)' }}>{label}</span>
      {score != null ? (
        <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
          <span style={{ fontSize:'14px', fontWeight:700, color: color || GREEN }}>{score}</span>
          <span style={{ fontSize:'10px', color:'rgba(255,255,255,0.35)', fontWeight:600, letterSpacing:'0.05em' }}>{band}</span>
        </div>
      ) : (
        <span style={{ fontSize:'11px', color:'rgba(255,255,255,0.22)', fontStyle:'italic' }}>Not taken</span>
      )}
    </div>
  );
}

// ── Confirm dialog ────────────────────────────────────────────────────────────
function ConfirmDialog({ title, body, confirmLabel, onConfirm, onCancel, danger }) {
  return (
    <div style={{ position:'fixed', inset:0, zIndex:500, background:'rgba(0,0,0,0.72)', display:'flex', alignItems:'center', justifyContent:'center', padding:'24px' }}>
      <div style={{ background:'#1a1a1f', border:'1px solid rgba(255,255,255,0.1)', borderRadius:'18px', padding:'24px', width:'100%', maxWidth:'340px' }}>
        <div style={{ fontSize:'17px', fontWeight:700, color:'#fff', marginBottom:'10px' }}>{title}</div>
        <div style={{ fontSize:'13px', color:'rgba(255,255,255,0.5)', lineHeight:1.6, marginBottom:'22px' }}>{body}</div>
        <div style={{ display:'flex', gap:'10px' }}>
          <button onClick={onCancel} style={{ flex:1, padding:'12px', background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:'10px', color:'rgba(255,255,255,0.7)', fontSize:'14px', fontWeight:600, cursor:'pointer', fontFamily:FONT }}>Cancel</button>
          <button onClick={onConfirm} style={{ flex:1, padding:'12px', background: danger ? 'rgba(248,113,113,0.15)' : GREEN, border:`1px solid ${danger ? RED : GREEN}`, borderRadius:'10px', color: danger ? RED : '#000', fontSize:'14px', fontWeight:700, cursor:'pointer', fontFamily:FONT }}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}

// ── Toast ─────────────────────────────────────────────────────────────────────
function Toast({ message, visible }) {
  return (
    <div style={{
      position:'fixed', bottom:'100px', left:'50%', transform:'translateX(-50%)',
      background:'rgba(34,197,94,0.15)', border:'1px solid rgba(34,197,94,0.35)',
      borderRadius:'20px', padding:'8px 18px',
      fontSize:'13px', fontWeight:600, color:GREEN, fontFamily:FONT,
      zIndex:600, whiteSpace:'nowrap',
      opacity: visible ? 1 : 0, transition:'opacity 0.3s ease',
      pointerEvents:'none',
    }}>
      {message}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// MAIN SETTINGS PANEL
// ════════════════════════════════════════════════════════════════════════════
export default function SettingsPanel({ onClose, onResetAll }) {
  // ── Profile state ──────────────────────────────────────────────────────────
  const [name,        setName]        = useState('');
  const [grade,       setGrade]       = useState('');
  const [whatsapp,    setWhatsapp]    = useState('');
  const [role,        setRole]        = useState('');
  const [school,      setSchool]      = useState('');
  const [board,       setBoard]       = useState('');
  const [parentWA,    setParentWA]    = useState('');
  const [parentEmail, setParentEmail] = useState('');

  // ── Assessment state ───────────────────────────────────────────────────────
  const [eqData,          setEqData]          = useState(null);
  const [iqData,          setIqData]          = useState(null);
  const [personalityData, setPersonalityData] = useState(null);
  const [guruNominated,   setGuruNominated]   = useState(false);
  const [sessionCount,    setSessionCount]    = useState(0);

  // ── Preferences state ──────────────────────────────────────────────────────
  const [guruPref,       setGuruPref]       = useState('');
  const [guardianAlerts, setGuardianAlerts] = useState(true);
  const [soundEffects,   setSoundEffects]   = useState(true);
  const [darkMode,       setDarkMode]       = useState(true);
  const [weeklyReport,   setWeeklyReport]   = useState(false);
  const [startingRank,   setStartingRank]   = useState('');

  // ── Voice customization state ─────────────────────────────────────────────
  const [voicePrefs,     setVoicePrefs]     = useState({ ontological: 0, spiritual: 0, peak: 0, somatic: 0, fox: 0 });
  const [voicePreviewing, setVoicePreviewing] = useState(null); // mentorId being previewed

  // ── UI state ───────────────────────────────────────────────────────────────
  const [userId,      setUserId]      = useState('');
  const [dirty,       setDirty]       = useState(false);
  const [toast,       setToast]       = useState('');
  const [toastVis,    setToastVis]    = useState(false);
  const [confirm,     setConfirm]     = useState(null); // { title, body, onConfirm, danger }
  const [mounted,     setMounted]     = useState(false);
  const [section,     setSection]     = useState('main'); // 'main' | 'assessment' | 'guardian' | 'voice' | 'vijnana'

  // ── Load data on mount ────────────────────────────────────────────────────
  useEffect(() => {
    setTimeout(() => setMounted(true), 30);

    const profile = readLS('healai_profile');
    if (profile) {
      setName(profile.name || '');
      setGrade(profile.grade || '');
      setWhatsapp(profile.whatsapp || '');
      setRole(profile.role || '');
      setSchool(profile.school || '');
      setBoard(profile.board || '');
      setParentWA(profile.parentWA || '');
      setParentEmail(profile.parentEmail || '');
      setGuruPref(profile.guruPref || '');
      setGuardianAlerts(profile.guardianAlerts !== false);
      setSoundEffects(profile.soundEffects !== false);
      setDarkMode(profile.darkMode !== false);
      setWeeklyReport(!!profile.weeklyReport);
      setStartingRank(profile.startingRank || '');
    }

    const vp = readLS('healai_voice_prefs');
    if (vp) setVoicePrefs(prev => ({ ...prev, ...vp }));

    setEqData(readLS('healai_eq'));
    setIqData(readLS('healai_iq'));
    setPersonalityData(readLS('healai_personality'));
    setGuruNominated(!!localStorage.getItem('healai_guru_nominated'));
    setSessionCount((readLS('healai_sessions') || []).length);
    setUserId(localStorage.getItem('ms_user_id') || '—');
  }, []);

  // ── Mark dirty on any profile field change ────────────────────────────────
  useEffect(() => { setDirty(true); }, [name, grade, whatsapp, role, school, board, parentWA, parentEmail, guruPref, guardianAlerts, soundEffects, darkMode, weeklyReport, startingRank]);

  // ── Save profile ──────────────────────────────────────────────────────────
  const saveProfile = useCallback(() => {
    const existing = readLS('healai_profile') || {};
    const updated  = {
      ...existing,
      name: name.trim() || existing.name || 'Explorer',
      grade, whatsapp, role, school, board,
      parentWA, parentEmail, guruPref,
      guardianAlerts, soundEffects, darkMode,
      weeklyReport, startingRank,
      updatedAt: Date.now(),
    };
    writeLS('healai_profile', updated);
    writeLS('healai_voice_prefs', voicePrefs);
    setDirty(false);
    showToast('Profile saved ✓');
  }, [name, grade, whatsapp, role, school, board, parentWA, parentEmail, guruPref, guardianAlerts, soundEffects, darkMode, weeklyReport, startingRank, voicePrefs]);

  // ── Toast helper ──────────────────────────────────────────────────────────
  const showToast = (msg) => {
    setToast(msg);
    setToastVis(true);
    setTimeout(() => setToastVis(false), 2200);
  };

  // ── Clear helpers ─────────────────────────────────────────────────────────
  const clearTest = (key, setter) => {
    clearLS(key);
    setter(null);
    showToast('Test data cleared');
  };

  const clearAllData = () => {
    ['healai_profile','healai_eq','healai_iq','healai_personality',
     'healai_guru_nominated','healai_sessions','healai_session_date',
     'healai_mood_log','healai_visited','healai_role','ms_scores',
     'healai_sessions','healai_voice_prefs'].forEach(clearLS);
    setVoicePrefs({ ontological: 0, spiritual: 0, peak: 0, somatic: 0, fox: 0 });
    setEqData(null); setIqData(null); setPersonalityData(null);
    setGuruNominated(false); setSessionCount(0);
    setName(''); setGrade(''); setWhatsapp(''); setRole('');
    setSchool(''); setBoard(''); setParentWA(''); setParentEmail('');
    setConfirm(null);
    showToast('All data cleared');
    if (onResetAll) setTimeout(onResetAll, 800);
  };

  // ── Shared input style ────────────────────────────────────────────────────
  const memberSince = (() => {
    const p = readLS('healai_profile');
    if (!p?.createdAt) return 'New member';
    return new Date(p.createdAt).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' });
  })();

  // ── Render: sub-sections ──────────────────────────────────────────────────
  if (section === 'assessment') return (
    <PanelShell mounted={mounted} onClose={() => setSection('main')} title="Assessment Data" backLabel="Settings">
      <SectionLabel>TEST RESULTS</SectionLabel>
      <SettingCard>
        <ScoreBadge label="EQ Radar"    score={eqData?.score}          band={eqData?.band}          color={GREEN}  />
        <ScoreBadge label="IQ Matrix"   score={iqData?.score}          band={iqData?.band}          color={PURPLE} />
        <ScoreBadge label="Personality" score={personalityData?.typeProfile?.label} band={personalityData?.band} color={CYAN} />
        <ScoreBadge label="Self-Discovery" score={guruNominated ? '✓' : null} band="Completed" color={ORANGE} last />
      </SettingCard>

      <SectionLabel>CLEAR INDIVIDUAL TESTS</SectionLabel>
      <SettingCard>
        <SettingRow icon="🧠" label="Clear EQ Radar"     sub={eqData ? `Score: ${eqData.score} · ${eqData.band}` : 'No data'} danger onClick={eqData ? () => setConfirm({ title:'Clear EQ Data?', body:'Your EQ Radar results will be deleted. You can retake the test anytime.', confirmLabel:'Clear', onConfirm:() => { clearTest('healai_eq', setEqData); setConfirm(null); }, danger:true }) : null} />
        <SettingRow icon="⚡" label="Clear IQ Matrix"    sub={iqData ? `Score: ${iqData.score} · ${iqData.band}` : 'No data'} danger onClick={iqData ? () => setConfirm({ title:'Clear IQ Data?', body:'Your IQ Matrix results will be deleted.', confirmLabel:'Clear', onConfirm:() => { clearTest('healai_iq', setIqData); setConfirm(null); }, danger:true }) : null} />
        <SettingRow icon="🔮" label="Clear Personality"  sub={personalityData ? `Type: ${personalityData.typeProfile?.label}` : 'No data'} danger onClick={personalityData ? () => setConfirm({ title:'Clear Personality Data?', body:'Your Learning Archetype result will be deleted.', confirmLabel:'Clear', onConfirm:() => { clearTest('healai_personality', setPersonalityData); setConfirm(null); }, danger:true }) : null} />
        <SettingRow icon="◈"  label="Clear AI Guru Match" sub={guruNominated ? 'Nomination saved' : 'No data'} danger last onClick={guruNominated ? () => setConfirm({ title:'Clear AI Guru Match?', body:'Your Self-Discovery responses and Guru nomination will be cleared.', confirmLabel:'Clear', onConfirm:() => { clearLS('healai_guru_nominated'); setGuruNominated(false); setConfirm(null); showToast('Guru match cleared'); }, danger:true }) : null} />
      </SettingCard>

      <SectionLabel>SESSION HISTORY</SectionLabel>
      <SettingCard>
        <SettingRow icon="📅" label="Total sessions"  sub={`${sessionCount} check-in${sessionCount !== 1 ? 's' : ''} recorded`} rightEl={<span style={{ fontSize:'18px', fontWeight:700, color:GREEN }}>{sessionCount}</span>} last />
      </SettingCard>

      {confirm && <ConfirmDialog {...confirm} onCancel={() => setConfirm(null)} />}
    </PanelShell>
  );

  if (section === 'guardian') return (
    <PanelShell mounted={mounted} onClose={() => setSection('main')} title="Guardian" backLabel="Settings">
      <div style={{ padding:'14px 16px', background:'rgba(248,113,113,0.06)', border:'1px solid rgba(248,113,113,0.18)', borderRadius:'12px', marginBottom:'6px', fontSize:'12.5px', color:'rgba(255,255,255,0.55)', lineHeight:1.6 }}>
        Guardian monitors mood trends and EQ signals, then alerts a parent or counsellor when stress indicators are elevated.
      </div>

      <SectionLabel>GUARDIAN CONTACT</SectionLabel>
      <SettingCard>
        <InlineField label="PARENT / GUARDIAN NAME"   value={name}        onChange={v => { setName(v); setDirty(true); }}        placeholder="Full name" />
        <InlineField label="PARENT WHATSAPP"          value={parentWA}    onChange={v => { setParentWA(v); setDirty(true); }}    type="tel" placeholder="+91 98xxx xxxxx" />
        <InlineField label="PARENT EMAIL (optional)"  value={parentEmail} onChange={v => { setParentEmail(v); setDirty(true); }} type="email" placeholder="parent@email.com" last />
      </SettingCard>

      <SectionLabel>ALERT PREFERENCES</SectionLabel>
      <SettingCard>
        <SettingRow icon="🔔" label="Guardian Alerts"   sub="WhatsApp nudge when stress peaks"   rightEl={<Toggle value={guardianAlerts} onChange={v => { setGuardianAlerts(v); setDirty(true); }} />} />
        <SettingRow icon="📊" label="Weekly EQ Report"  sub="Sunday evening summary to parent"    rightEl={<Toggle value={weeklyReport} onChange={v => { setWeeklyReport(v); setDirty(true); showToast(v ? 'Weekly report enabled' : 'Weekly report disabled'); }} />} last />
      </SettingCard>

      {dirty && <SaveBar onSave={saveProfile} />}
    </PanelShell>
  );

  if (section === 'voice') return (
    <PanelShell mounted={mounted} onClose={() => setSection('main')} title="Voice Customization" backLabel="Settings">
      <div style={{ padding:'14px 16px', background:'rgba(34,197,94,0.06)', border:'1px solid rgba(34,197,94,0.18)', borderRadius:'12px', marginBottom:'6px', fontSize:'12.5px', color:'rgba(255,255,255,0.55)', lineHeight:1.6 }}>
        Choose the voice for each AI Mentor. All voices are tuned for Indian audiences — slow-paced, warm, and natural. Tap the play button to preview.
      </div>

      {Object.entries(VOICE_OPTIONS).map(([mentorId, mentor]) => (
        <div key={mentorId}>
          <SectionLabel>{mentor.emoji} {mentor.label.toUpperCase()}</SectionLabel>
          <SettingCard>
            {mentor.options.map((voice, idx) => {
              const isSelected = voicePrefs[mentorId] === idx;
              const isPreviewing = voicePreviewing === `${mentorId}_${idx}`;
              return (
                <div
                  key={voice.id}
                  onClick={() => {
                    setVoicePrefs(prev => {
                      const updated = { ...prev, [mentorId]: idx };
                      writeLS('healai_voice_prefs', updated);
                      return updated;
                    });
                    setDirty(true);
                  }}
                  style={{
                    display:'flex', alignItems:'center', gap:'12px',
                    padding:'12px 16px',
                    background: isSelected ? 'rgba(34,197,94,0.08)' : 'rgba(255,255,255,0.04)',
                    borderBottom: idx < mentor.options.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
                    cursor:'pointer',
                    transition:'background 0.15s',
                    border: isSelected ? '1px solid rgba(34,197,94,0.25)' : '1px solid transparent',
                    borderRadius: idx === 0 ? '14px 14px 0 0' : idx === mentor.options.length - 1 ? '0 0 14px 14px' : '0',
                  }}
                  onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = 'rgba(255,255,255,0.07)'; }}
                  onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
                >
                  {/* Radio indicator */}
                  <div style={{
                    width:'20px', height:'20px', borderRadius:'50%', flexShrink:0,
                    border: isSelected ? `2px solid ${GREEN}` : '2px solid rgba(255,255,255,0.2)',
                    display:'flex', alignItems:'center', justifyContent:'center',
                  }}>
                    {isSelected && <div style={{ width:'10px', height:'10px', borderRadius:'50%', background:GREEN }} />}
                  </div>

                  {/* Voice info */}
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:'13px', fontWeight:600, color: isSelected ? GREEN : '#fff', lineHeight:1.3 }}>
                      {voice.label}
                    </div>
                    <div style={{ fontSize:'11px', color:'rgba(255,255,255,0.38)', marginTop:'2px', lineHeight:1.4 }}>
                      {voice.desc}
                    </div>
                  </div>

                  {/* Preview button */}
                  <button
                    onClick={async (e) => {
                      e.stopPropagation();
                      if (isPreviewing) return;
                      setVoicePreviewing(`${mentorId}_${idx}`);
                      try {
                        const res = await fetch('/api/jarvis', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            text: 'Hello, I am your AI mentor. Let us begin this journey together.',
                            mentorId,
                            voiceOptionIndex: idx,
                            ttsOnly: true,
                          }),
                        });
                        if (res.ok) {
                          const blob = await res.blob();
                          const url = URL.createObjectURL(blob);
                          const audio = new Audio(url);
                          audio.onended = () => { URL.revokeObjectURL(url); setVoicePreviewing(null); };
                          audio.onerror = () => { URL.revokeObjectURL(url); setVoicePreviewing(null); };
                          audio.play().catch(() => setVoicePreviewing(null));
                        } else {
                          showToast('Voice preview unavailable');
                          setVoicePreviewing(null);
                        }
                      } catch {
                        showToast('Voice preview unavailable');
                        setVoicePreviewing(null);
                      }
                    }}
                    style={{
                      width:'36px', height:'36px', borderRadius:'50%', flexShrink:0,
                      background: isPreviewing ? 'rgba(34,197,94,0.2)' : 'rgba(255,255,255,0.08)',
                      border: `1px solid ${isPreviewing ? 'rgba(34,197,94,0.4)' : 'rgba(255,255,255,0.12)'}`,
                      display:'flex', alignItems:'center', justifyContent:'center',
                      cursor:'pointer', fontSize:'14px', color: isPreviewing ? GREEN : 'rgba(255,255,255,0.6)',
                      transition:'all 0.15s',
                    }}
                  >
                    {isPreviewing ? '◼' : '▶'}
                  </button>
                </div>
              );
            })}
          </SettingCard>
        </div>
      ))}

      {/* Chatbot-to-page mapping reference */}
      <SectionLabel>WHICH AI POWERS WHICH PAGE</SectionLabel>
      <SettingCard>
        <SettingRow icon="📋" label="Assessment" sub="Claude AI · text-based psychometric engine" />
        <SettingRow icon="🧠" label="Mentor Chat" sub="5 AI Life Gurus · JARVIS voice engine" />
        <SettingRow icon="🎤" label="Voice Analysis" sub="Acoustic Biomarker Analyzer · Python engine" />
        <SettingRow icon="📊" label="Dashboard" sub="Resilience Tracker · client-side, no AI chat" />
        <SettingRow icon="🛡️" label="Guardian" sub="AEGIS Intelligence · transparent wellbeing monitor" />
        <SettingRow icon="🧬" label="Longevity" sub="Longevity OS · Don't Die Protocol engine" />
        <SettingRow icon="🚑" label="MedPod" sub="MedPod NEXUS · dispatch system (not patient chat)" last />
      </SettingCard>

      <div style={{ height:'32px' }} />

      {dirty && <SaveBar onSave={saveProfile} />}
      {confirm && <ConfirmDialog {...confirm} onCancel={() => setConfirm(null)} />}
      <Toast message={toast} visible={toastVis} />
    </PanelShell>
  );

  if (section === 'vijnana') return (
    <PanelShell mounted={mounted} onClose={() => setSection('main')} title="Vijnana Edugaming" backLabel="Settings">
      <SectionLabel>GAME PREFERENCES</SectionLabel>
      <SettingCard>
        <InlineSelect label="DEFAULT SUBJECT"    value={board}  onChange={v => { setBoard(v); setDirty(true); }}  options={['Physics','Chemistry','Maths','Biology']} placeholder="All subjects" />
        <InlineSelect label="STARTING RANK"      value={startingRank}  onChange={v => { setStartingRank(v); setDirty(true); }}  options={['D-Rank (Genin)','C-Rank (Jonin)','B-Rank (Elite)','A-Rank (Special Grade)','S-Rank (Shadow Monarch)']} placeholder="Auto (based on IQ)" last />
      </SettingCard>

      <SectionLabel>SERVER</SectionLabel>
      <SettingCard>
        <SettingRow icon="⚡" label="Game Server"    sub={process.env.NEXT_PUBLIC_VIJNANA_URL || 'localhost:3099'}   rightEl={<span style={{ fontSize:'11px', fontWeight:700, padding:'3px 8px', borderRadius:'4px', background:'rgba(34,197,94,0.12)', color:GREEN, border:`1px solid rgba(34,197,94,0.3)` }}>{process.env.NEXT_PUBLIC_VIJNANA_URL ? 'LIVE' : 'PORT 3099'}</span>} />
        <SettingRow icon="📦" label="Active Course"  sub="Electrolysis & Electrochemistry — ICSE 10" last />
      </SettingCard>

      <SectionLabel>SOUND</SectionLabel>
      <SettingCard>
        <SettingRow icon="🔊" label="Sound Effects"  sub="XP earn, rank-up, correct answer tones"  rightEl={<Toggle value={soundEffects} onChange={v => { setSoundEffects(v); setDirty(true); }} />} last />
      </SettingCard>

      {dirty && <SaveBar onSave={saveProfile} />}
    </PanelShell>
  );

  // ── MAIN panel ────────────────────────────────────────────────────────────
  return (
    <PanelShell mounted={mounted} onClose={onClose} title="Settings">

      {/* ── Account strip ── */}
      <div style={{ padding:'16px', marginBottom:'4px', background:'rgba(255,255,255,0.04)', borderRadius:'14px', border:'1px solid rgba(255,255,255,0.07)', display:'flex', alignItems:'center', gap:'14px' }}>
        <div style={{ width:'52px', height:'52px', borderRadius:'16px', background:'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'24px', fontWeight:800, color:'#fff', flexShrink:0 }}>
          {name ? name[0].toUpperCase() : '✦'}
        </div>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontSize:'16px', fontWeight:700, color:'#fff', lineHeight:1.2, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{name || 'Create your profile'}</div>
          <div style={{ fontSize:'11px', color:'rgba(255,255,255,0.38)', marginTop:'2px' }}>{grade || 'Grade not set'}{role ? ` · ${role}` : ''}</div>
          <div style={{ fontSize:'10px', color:'rgba(255,255,255,0.22)', marginTop:'1px' }}>Member since {memberSince}</div>
        </div>
        <div style={{ fontSize:'11px', fontWeight:700, padding:'4px 10px', borderRadius:'20px', background:'rgba(34,197,94,0.12)', border:'1px solid rgba(34,197,94,0.28)', color:GREEN, flexShrink:0 }}>
          {eqData && iqData ? 'MAPPED' : eqData || iqData ? 'IN PROGRESS' : 'NEW'}
        </div>
      </div>

      {/* ── Profile fields ── */}
      <SectionLabel>PROFILE</SectionLabel>
      <SettingCard>
        <InlineField label="FULL NAME"      value={name}     onChange={v => { setName(v); setDirty(true); }}     placeholder="Your name" />
        <InlineSelect label="GRADE / YEAR"  value={grade}    onChange={v => { setGrade(v); setDirty(true); }}    options={GRADES} placeholder="Select grade" />
        <InlineSelect label="I AM A"        value={role}     onChange={v => { setRole(v); setDirty(true); }}     options={ROLES} placeholder="Select role" />
        <InlineField label="SCHOOL NAME"    value={school}   onChange={v => { setSchool(v); setDirty(true); }}   placeholder="School / College (optional)" />
        <InlineSelect label="BOARD"         value={board}    onChange={v => { setBoard(v); setDirty(true); }}    options={BOARDS} placeholder="Curriculum board" last />
      </SettingCard>

      {/* ── Contact ── */}
      <SectionLabel>CONTACT</SectionLabel>
      <SettingCard>
        <InlineField label="WHATSAPP NUMBER" value={whatsapp}   onChange={v => { setWhatsapp(v); setDirty(true); }}   type="tel"   placeholder="+91 98xxx xxxxx" />
        <InlineField label="PARENT WHATSAPP" value={parentWA}   onChange={v => { setParentWA(v); setDirty(true); }}   type="tel"   placeholder="For Guardian alerts (optional)" last />
      </SettingCard>

      {/* ── AI Guru preference ── */}
      <SectionLabel>AI GURU</SectionLabel>
      <SettingCard>
        <InlineSelect label="PREFERRED GURU" value={guruPref} onChange={v => { setGuruPref(v); setDirty(true); }} options={GURUS} placeholder="Auto-matched by assessment" />
        <SettingRow icon="🦊" label="Guru Assessment"  sub={guruNominated ? 'Completed — guru nominated · tap to retake' : 'Tap to take the Self-Discovery assessment'}
          onClick={() => { onClose(); setTimeout(() => { window.dispatchEvent(new CustomEvent('healai-navigate', { detail: 'assess' })); }, 350); }}
          rightEl={<span style={{ fontSize:'11px', color: guruNominated ? GREEN : ORANGE, fontWeight:600 }}>{guruNominated ? '✓ Done' : '→ Start'}</span>} last />
      </SettingCard>

      {/* ── Voice Customization ── */}
      <SectionLabel>VOICE CUSTOMIZATION</SectionLabel>
      <SettingCard>
        <SettingRow
          icon="🎙️"
          label="Mentor Voices"
          sub={`${Object.entries(voicePrefs).filter(([,v]) => v > 0).length} customized · tap to change voices`}
          onClick={() => setSection('voice')}
          rightEl={<span style={{ fontSize:'11px', color: CYAN, fontWeight:600 }}>3 options each →</span>}
          last
        />
      </SettingCard>

      {/* ── Quick-nav rows ── */}
      <SectionLabel>MODULES</SectionLabel>
      <SettingCard>
        <SettingRow icon="📊" label="Assessment Data"     sub={`EQ${eqData?` ${eqData.score}`:'—'} · IQ${iqData?` ${iqData.score}`:'—'} · ${guruNominated?'Guru ✓':'Guru pending'}`} onClick={() => setSection('assessment')} />
        <SettingRow icon="🛡️" label="Guardian"            sub={parentWA ? `Alerts → ${parentWA}` : 'Parent contact not set'} onClick={() => setSection('guardian')} />
        <SettingRow icon="⚔️" label="Vijnana Edugaming"   sub="Game server · course · sound" onClick={() => setSection('vijnana')} last />
      </SettingCard>

      {/* ── Preferences ── */}
      <SectionLabel>PREFERENCES</SectionLabel>
      <SettingCard>
        <SettingRow icon="🔔" label="Guardian Alerts"  sub="Notify parent when stress peaks"   rightEl={<Toggle value={guardianAlerts} onChange={v => { setGuardianAlerts(v); setDirty(true); }} />} />
        <SettingRow icon="🔊" label="Sound Effects"    sub="XP, rank-up, correct answer tones"  rightEl={<Toggle value={soundEffects}   onChange={v => { setSoundEffects(v); setDirty(true); }} />} />
        <SettingRow icon="🌙" label="Dark Mode"        sub={darkMode ? "Dark theme active" : "Light theme (experimental)"}  rightEl={<Toggle value={darkMode} onChange={v => { setDarkMode(v); setDirty(true); document.documentElement.style.setProperty('--healai-theme', v ? 'dark' : 'light'); showToast(v ? 'Dark mode on' : 'Light mode (experimental)'); }} />} last />
      </SettingCard>

      {/* ── Account info ── */}
      <SectionLabel>ACCOUNT</SectionLabel>
      <SettingCard>
        <SettingRow icon="🆔" label="Device ID"      sub={userId}   onClick={() => { try { navigator.clipboard.writeText(userId); showToast('Device ID copied ✓'); } catch { showToast('Copy not available'); } }}  rightEl={<span style={{ fontSize:'11px', fontFamily:'monospace', color:'rgba(255,255,255,0.28)' }}>tap to copy</span>} />
        <SettingRow icon="📅" label="Member since"   sub={memberSince} rightEl={<span style={{ fontSize:'11px', color:'rgba(255,255,255,0.28)' }}>{sessionCount} sessions</span>} />
        <SettingRow icon="📤" label="Export data"    sub="Copy all your assessment data to clipboard" onClick={() => {
          const data = {
            profile:     readLS('healai_profile'),
            eq:          readLS('healai_eq'),
            iq:          readLS('healai_iq'),
            personality: readLS('healai_personality'),
            sessions:    readLS('healai_sessions'),
            exportedAt:  new Date().toISOString(),
          };
          try {
            navigator.clipboard.writeText(JSON.stringify(data, null, 2));
            showToast('Data copied to clipboard ✓');
          } catch { showToast('Export unavailable in this browser'); }
        }} />
        <SettingRow icon="📥" label="Import data"    sub="Restore from exported JSON in clipboard" onClick={async () => {
          try {
            const text = await navigator.clipboard.readText();
            const data = JSON.parse(text);
            if (data.profile)     writeLS('healai_profile', data.profile);
            if (data.eq)          writeLS('healai_eq', data.eq);
            if (data.iq)          writeLS('healai_iq', data.iq);
            if (data.personality) writeLS('healai_personality', data.personality);
            if (data.sessions)    writeLS('healai_sessions', data.sessions);
            // Reload state
            const p = data.profile || {};
            setName(p.name || ''); setGrade(p.grade || ''); setWhatsapp(p.whatsapp || '');
            setRole(p.role || ''); setSchool(p.school || ''); setBoard(p.board || '');
            setParentWA(p.parentWA || ''); setParentEmail(p.parentEmail || '');
            setEqData(data.eq || null); setIqData(data.iq || null);
            setPersonalityData(data.personality || null);
            showToast('Data imported successfully ✓');
          } catch (e) {
            showToast('Import failed — copy valid JSON first');
          }
        }} />
        <SettingRow icon="🔗" label="Share profile"  sub="Share your assessment summary" onClick={() => {
          const p = readLS('healai_profile') || {};
          const eq = readLS('healai_eq');
          const iq = readLS('healai_iq');
          const summary = [
            `🧬 Healai Profile: ${p.name || 'Explorer'}`,
            `Grade: ${p.grade || '—'} · Role: ${p.role || '—'}`,
            eq ? `EQ Score: ${eq.score} (${eq.band})` : 'EQ: Not taken',
            iq ? `IQ Score: ${iq.score} (${iq.band})` : 'IQ: Not taken',
            `\nhttps://healai.app`,
          ].join('\n');
          if (navigator.share) {
            navigator.share({ title: 'My Healai Profile', text: summary }).catch(() => {});
          } else {
            try { navigator.clipboard.writeText(summary); showToast('Profile summary copied ✓'); } catch { showToast('Share not available'); }
          }
        }} last />
      </SettingCard>

      {/* ── Sign out ── */}
      <SectionLabel>ACCOUNT</SectionLabel>
      <SettingCard>
        <SettingRow
          icon="🚪"
          label="Sign Out"
          sub="Return to home screen · your data stays saved"
          onClick={() => setConfirm({
            title:        'Sign Out?',
            body:         'You\'ll return to the AIrJun home screen. Your profile and test results are saved locally and will be here when you return.',
            confirmLabel: 'Sign Out',
            danger:       false,
            onConfirm:    () => {
              clearLS('healai_visited');
              setConfirm(null);
              if (onResetAll) setTimeout(onResetAll, 300);
            },
          })}
          last
        />
      </SettingCard>

      {/* ── Danger zone ── */}
      <SectionLabel>DANGER ZONE</SectionLabel>
      <SettingCard>
        <SettingRow icon="🗑️" label="Reset all data" sub="Clears profile, all test results, sessions" danger onClick={() => setConfirm({
          title:        'Reset Everything?',
          body:         'This will permanently delete your profile, all assessment results, session history, and AI Guru match. This cannot be undone.',
          confirmLabel: 'Reset All',
          danger:       true,
          onConfirm:    clearAllData,
        })} last />
      </SettingCard>

      {/* ── About ── */}
      <SectionLabel>ABOUT</SectionLabel>
      <SettingCard>
        <SettingRow icon="✦"  label="Healai Mothership"  sub="Psychometric · Edugaming · AI Coaching" onClick={() => showToast('v0.3-beta · Build ' + Date.now().toString(36).slice(-6))} rightEl={<span style={{ fontSize:'11px', color:'rgba(255,255,255,0.25)', fontFamily:'monospace' }}>v0.3-beta</span>} />
        <SettingRow icon="🤖" label="Powered by"         sub="Anthropic Claude · ElevenLabs · Next.js" onClick={() => showToast('JARVIS voice engine active')} />
        <SettingRow icon="💼" label="Goldenhour Systems" sub="Built by Goldenhour Systems Pvt Ltd" onClick={() => { try { navigator.clipboard.writeText('https://goldenhour.systems'); showToast('URL copied ✓'); } catch {} }} />
        <SettingRow icon="🇮🇳" label="Made for India"    sub="ICSE · CBSE · State Board students" onClick={() => showToast('Jai Hind 🇮🇳')} last />
      </SettingCard>

      <div style={{ height:'32px' }} />

      {/* Floating save bar */}
      {dirty && <SaveBar onSave={saveProfile} />}

      {/* Confirm dialog */}
      {confirm && <ConfirmDialog {...confirm} onCancel={() => setConfirm(null)} />}

      {/* Toast */}
      <Toast message={toast} visible={toastVis} />
    </PanelShell>
  );
}

// ── Panel shell — handles slide-in animation + scroll ────────────────────────
function PanelShell({ mounted, onClose, title, backLabel, children }) {
  return (
    <>
      <style>{`
        @keyframes slidePanelIn { from { transform:translateX(100%); } to { transform:translateX(0); } }
        .settings-scroll::-webkit-scrollbar { display:none; }
      `}</style>
      <div style={{
        position:'fixed', inset:0, zIndex:200,
        background:'rgba(0,0,0,0.55)', backdropFilter:'blur(4px)',
      }}
        onClick={onClose}
      />
      <div
        className="settings-scroll"
        style={{
          position:'fixed', top:0, right:0, bottom:0,
          width:'min(400px, 100vw)',
          background:'linear-gradient(180deg, #111116 0%, #0c0c0f 100%)',
          borderLeft:'1px solid rgba(255,255,255,0.07)',
          zIndex:201,
          overflowY:'auto', overflowX:'hidden',
          transform: mounted ? 'translateX(0)' : 'translateX(100%)',
          transition:'transform 0.32s cubic-bezier(0.34,1.05,0.64,1)',
          fontFamily:FONT, color:'#fff',
          paddingBottom:'40px',
          boxShadow:'-8px 0 40px rgba(0,0,0,0.6)',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ position:'sticky', top:0, zIndex:10, background:'rgba(17,17,22,0.95)', backdropFilter:'blur(8px)', borderBottom:'1px solid rgba(255,255,255,0.06)', padding:'14px 16px', display:'flex', alignItems:'center', gap:'12px' }}>
          <button onClick={onClose} style={{ display:'flex', alignItems:'center', gap:'6px', background:'none', border:'none', cursor:'pointer', color:'rgba(255,255,255,0.55)', fontSize:'13px', fontFamily:FONT, padding:'4px 0', WebkitTapHighlightColor:'transparent', flexShrink:0 }}>
            {backLabel ? <><span style={{ fontSize:'16px', lineHeight:1 }}>‹</span> {backLabel}</> : <span style={{ fontSize:'18px', lineHeight:1 }}>✕</span>}
          </button>
          <div style={{ flex:1, fontSize:'17px', fontWeight:700, color:'#fff', textAlign: backLabel ? 'center' : 'left', marginRight: backLabel ? '50px' : 0 }}>{title}</div>
        </div>

        {/* Content */}
        <div style={{ padding:'8px 16px 24px' }}>
          {children}
        </div>
      </div>
    </>
  );
}

// ── Floating save bar ─────────────────────────────────────────────────────────
function SaveBar({ onSave }) {
  return (
    <div style={{ position:'sticky', bottom:'16px', zIndex:50, padding:'0 0 4px', pointerEvents:'none' }}>
      <button
        onClick={onSave}
        style={{
          display:'block', width:'100%', padding:'14px',
          background:'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
          border:'none', borderRadius:'14px',
          color:'#fff', fontSize:'15px', fontWeight:700,
          cursor:'pointer', fontFamily:FONT,
          boxShadow:'0 4px 24px rgba(34,197,94,0.45)',
          pointerEvents:'all',
          WebkitTapHighlightColor:'transparent',
        }}
      >
        Save Changes
      </button>
    </div>
  );
}
