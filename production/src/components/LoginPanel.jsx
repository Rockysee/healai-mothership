/**
 * LoginPanel.jsx — Profile creation panel
 * First-run screen. Saves profile to healai_profile in localStorage.
 * onComplete(profile) is called when done.
 */

import React, { useState } from 'react';

const D = {
  bg:           '#0a0a0b',
  surface:      'rgba(255,255,255,0.04)',
  surfaceHover: 'rgba(255,255,255,0.07)',
  border:       'rgba(255,255,255,0.08)',
  borderFocus:  'rgba(255,255,255,0.25)',
  textPrimary:  '#ffffff',
  textSecondary:'rgba(255,255,255,0.5)',
  textMuted:    'rgba(255,255,255,0.25)',
  green:        '#22c55e',
  greenDim:     'rgba(34,197,94,0.15)',
  font:         "'Inter', system-ui, -apple-system, sans-serif",
};

const GRADES = [
  { value: '8',  label: 'Grade 8  (Age ~13)' },
  { value: '9',  label: 'Grade 9  (Age ~14)' },
  { value: '10', label: 'Grade 10 (Age ~15) — Board Year' },
  { value: '11', label: 'Grade 11 (Age ~16)' },
  { value: '12', label: 'Grade 12 (Age ~17)' },
  { value: 'college', label: 'College / University' },
  { value: 'other',   label: 'Other / Parent' },
];

function InputField({ label, value, onChange, placeholder, type = 'text' }) {
  const [focused, setFocused] = useState(false);
  return (
    <div style={{ marginBottom: '16px' }}>
      <label style={{
        display: 'block', fontSize: '11px', color: D.textMuted,
        letterSpacing: '0.06em', textTransform: 'uppercase',
        marginBottom: '6px', fontFamily: D.font,
      }}>
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={{
          width: '100%', padding: '12px 14px',
          backgroundColor: D.surface,
          border: `1px solid ${focused ? D.borderFocus : D.border}`,
          borderRadius: '10px', color: D.textPrimary,
          fontFamily: D.font, fontSize: '15px', outline: 'none',
          boxSizing: 'border-box', transition: 'border-color 0.2s ease',
        }}
      />
    </div>
  );
}

function SelectField({ label, value, onChange, options }) {
  const [focused, setFocused] = useState(false);
  return (
    <div style={{ marginBottom: '16px' }}>
      <label style={{
        display: 'block', fontSize: '11px', color: D.textMuted,
        letterSpacing: '0.06em', textTransform: 'uppercase',
        marginBottom: '6px', fontFamily: D.font,
      }}>
        {label}
      </label>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={{
          width: '100%', padding: '12px 14px',
          backgroundColor: '#111113',
          border: `1px solid ${focused ? D.borderFocus : D.border}`,
          borderRadius: '10px', color: value ? D.textPrimary : D.textMuted,
          fontFamily: D.font, fontSize: '15px', outline: 'none',
          boxSizing: 'border-box', cursor: 'pointer',
          transition: 'border-color 0.2s ease',
          appearance: 'none',
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='rgba(255,255,255,0.3)' d='M6 8L1 3h10z'/%3E%3C/svg%3E")`,
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'right 14px center',
          paddingRight: '36px',
        }}
      >
        <option value="">Select grade / level</option>
        {options.map(o => (
          <option key={o.value} value={o.value} style={{ backgroundColor: '#111113' }}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

export default function LoginPanel({ onComplete }) {
  const [step, setStep]     = useState(1); // 1 = name/grade, 2 = welcome
  const [name, setName]     = useState('');
  const [grade, setGrade]   = useState('');
  const [phone, setPhone]   = useState('');
  const [error, setError]   = useState('');

  const handleSubmit = () => {
    if (!name.trim()) { setError('What should we call you?'); return; }
    if (!grade) { setError('Select your grade so we calibrate the right challenges.'); return; }
    setError('');

    const profile = {
      name:      name.trim(),
      grade,
      phone:     phone.trim() || null,
      createdAt: Date.now(),
    };
    localStorage.setItem('healai_profile', JSON.stringify(profile));
    setStep(2);
  };

  const handleEnter = (e) => {
    if (e.key === 'Enter') handleSubmit();
  };

  // ── Step 2 — Welcome screen ──────────────────────────────────────────
  if (step === 2) {
    const firstName = name.split(' ')[0];
    return (
      <div style={{
        minHeight: '100vh', backgroundColor: D.bg,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: '40px 24px', fontFamily: D.font,
        textAlign: 'center',
      }}>
        <div style={{ fontSize: '48px', marginBottom: '20px' }}>🦊</div>
        <h1 style={{
          fontSize: '24px', fontWeight: 700, color: D.textPrimary,
          margin: '0 0 10px', letterSpacing: '-0.01em',
        }}>
          Let's go, {firstName}.
        </h1>
        <p style={{ fontSize: '15px', color: D.textSecondary, margin: '0 0 32px', lineHeight: 1.6, maxWidth: '320px' }}>
          Your profile is set. First — let's map your intelligence so your guides know exactly how to work with you.
        </p>

        {/* What happens next */}
        <div style={{
          width: '100%', maxWidth: '360px',
          backgroundColor: D.surface, border: `1px solid ${D.border}`,
          borderRadius: '14px', padding: '20px', marginBottom: '28px', textAlign: 'left',
        }}>
          <div style={{ fontSize: '11px', color: D.textMuted, letterSpacing: '0.06em', marginBottom: '14px' }}>
            YOUR LEARNING PATH
          </div>
          {[
            { icon: '🧠', label: 'EQ Radar', desc: 'Map your emotional intelligence across 5 domains' },
            { icon: '⚡', label: 'IQ Matrix', desc: 'Discover your cognitive strengths across 4 domains' },
            { icon: '◈', label: 'Self-Discovery', desc: 'Optional — find which AI Guru guides your transformation' },
          ].map((item, i) => (
            <div key={i} style={{
              display: 'flex', gap: '12px', alignItems: 'flex-start',
              marginBottom: i < 2 ? '14px' : '0',
            }}>
              <span style={{ fontSize: '18px', flexShrink: 0, marginTop: '1px' }}>{item.icon}</span>
              <div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: D.textPrimary, marginBottom: '2px' }}>
                  {item.label}
                </div>
                <div style={{ fontSize: '12px', color: D.textSecondary }}>{item.desc}</div>
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={() => onComplete({ name: name.trim(), grade, phone: phone.trim() || null })}
          style={{
            width: '100%', maxWidth: '360px',
            padding: '14px', backgroundColor: D.green,
            border: 'none', borderRadius: '12px',
            color: '#000', fontSize: '15px', fontWeight: 700,
            cursor: 'pointer', fontFamily: D.font,
            letterSpacing: '0.02em', transition: 'opacity 0.2s ease',
          }}
          onMouseEnter={e => e.currentTarget.style.opacity = '0.9'}
          onMouseLeave={e => e.currentTarget.style.opacity = '1'}
        >
          Begin Assessment →
        </button>
      </div>
    );
  }

  // ── Step 1 — Profile form ────────────────────────────────────────────
  return (
    <div style={{
      minHeight: '100vh', backgroundColor: D.bg,
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: '40px 24px', fontFamily: D.font,
    }}>
      {/* Logo mark */}
      <div style={{ marginBottom: '28px', textAlign: 'center' }}>
        <div style={{
          width: '52px', height: '52px', borderRadius: '50%',
          backgroundColor: D.greenDim, border: `1px solid ${D.green}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '22px', margin: '0 auto 12px',
        }}>
          🦊
        </div>
        <h1 style={{
          fontSize: '20px', fontWeight: 700, color: D.textPrimary,
          margin: '0 0 6px', letterSpacing: '-0.01em',
        }}>
          Welcome to AIrJun
        </h1>
        <p style={{ fontSize: '13px', color: D.textMuted, margin: 0 }}>
          Your intelligence map starts here.
        </p>
      </div>

      {/* Form card */}
      <div style={{
        width: '100%', maxWidth: '380px',
        backgroundColor: D.surface, border: `1px solid ${D.border}`,
        borderRadius: '16px', padding: '24px',
      }}>
        <InputField
          label="Your Name"
          value={name}
          onChange={setName}
          placeholder="First name or nickname"
        />

        <SelectField
          label="Grade / Level"
          value={grade}
          onChange={setGrade}
          options={GRADES}
        />

        <InputField
          label="Parent / Guardian WhatsApp (optional)"
          value={phone}
          onChange={setPhone}
          placeholder="+91 98765 43210"
          type="tel"
        />

        {error && (
          <div style={{
            fontSize: '12px', color: '#ef4444',
            backgroundColor: 'rgba(239,68,68,0.08)',
            border: '1px solid rgba(239,68,68,0.2)',
            borderRadius: '8px', padding: '10px 12px',
            marginBottom: '16px',
          }}>
            {error}
          </div>
        )}

        <button
          onClick={handleSubmit}
          style={{
            width: '100%', padding: '13px',
            backgroundColor: name.trim() && grade ? D.green : D.surface,
            border: `1px solid ${name.trim() && grade ? D.green : D.border}`,
            borderRadius: '10px',
            color: name.trim() && grade ? '#000' : D.textMuted,
            fontSize: '14px', fontWeight: 700,
            cursor: name.trim() && grade ? 'pointer' : 'default',
            fontFamily: D.font, letterSpacing: '0.02em',
            transition: 'all 0.2s ease',
          }}
        >
          Create Profile
        </button>
      </div>

      <p style={{ fontSize: '11px', color: D.textMuted, marginTop: '16px', textAlign: 'center', maxWidth: '300px' }}>
        Your data stays on this device. Nothing is shared without your consent.
      </p>
    </div>
  );
}
