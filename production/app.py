"""
GoldenOS Mental Health Module — Powered by Goldenhour Systems Pvt Ltd
Resilience Matrix: Gamified PHQ-9 screening, Dual-Continua visualization,
acoustic biomarker analysis, and Tele-MANAS crisis integration.
Part of the GoldenOS AI EMS Intelligence Platform.
"""

import io
import streamlit as st
import numpy as np
import plotly.graph_objects as go
import soundfile as sf
from datetime import datetime

from resilience_matrix import create_user_matrix, ResilienceLevel
from voice_analyzer import create_analyzer
from data_encryption import create_vault

# ── Page config ────────────────────────────────────────────────────────────────
st.set_page_config(
    page_title="GoldenOS · Resilience Matrix",
    page_icon="🚑",
    layout="wide",
    initial_sidebar_state="expanded",
)

st.markdown("""
<style>
/* GoldenOS brand colours: gold #F5A623, dark navy #0D1B2A, teal #00B4D8 */
.card {
    border-radius:12px; padding:20px;
    background:linear-gradient(135deg,#0D1B2A,#1a3a5c);
    color:white; text-align:center;
    box-shadow:0 4px 15px rgba(0,0,0,.3); margin:8px 0;
}
.card-gold {
    border-radius:12px; padding:20px;
    background:linear-gradient(135deg,#F5A623,#e8890c);
    color:#0D1B2A; text-align:center;
    box-shadow:0 4px 15px rgba(245,166,35,.4); margin:8px 0;
    font-weight:bold;
}
.big { font-size:48px; font-weight:bold; }
.brand-header {
    background:linear-gradient(90deg,#0D1B2A,#1a3a5c);
    color:#F5A623; padding:8px 16px; border-radius:8px;
    font-size:13px; letter-spacing:1px; margin-bottom:16px;
}
</style>
""", unsafe_allow_html=True)

# ── Session state ───────────────────────────────────────────────────────────────
if "uid" not in st.session_state:
    st.session_state.uid      = f"gspl_{datetime.now().timestamp():.0f}"
    st.session_state.matrix   = create_user_matrix(st.session_state.uid)
    st.session_state.vault    = create_vault()
    st.session_state.analyzer = create_analyzer()

# ── Sidebar ────────────────────────────────────────────────────────────────────
with st.sidebar:
    st.markdown("## 🚑 GoldenOS")
    st.markdown("**Mental Health Module**")
    st.caption("Goldenhour Systems Pvt Ltd · ambulance.run")
    st.markdown("---")
    page = st.radio(
        "Navigate",
        ["🏠 Home", "📋 Screening", "📊 Dashboard",
         "🎤 Voice Analysis", "🆘 Crisis Support", "🔐 Privacy"],
        label_visibility="collapsed",
    )
    st.markdown("---")
    st.caption(f"Session: `{st.session_state.uid[-8:]}`")
    cp = st.session_state.matrix.get_current_checkpoint()
    if cp:
        color = "#ff4b4b" if cp.risk_flag else "#00cc88"
        st.markdown(f"**Status:** <span style='color:{color}'>{'⚠️ AT RISK' if cp.risk_flag else '✅ Stable'}</span>", unsafe_allow_html=True)
        st.metric("Health Score", f"{cp.score:.0f}/100")

# ── PHQ-9 items ────────────────────────────────────────────────────────────────
PHQ9 = [
    "Little interest or pleasure in doing things",
    "Feeling down, depressed, or hopeless",
    "Trouble sleeping or sleeping too much",
    "Feeling tired or having little energy",
    "Poor appetite or overeating",
    "Feeling bad about yourself",
    "Trouble concentrating",
    "Moving/speaking slowly — or fidgety/restless",
    "Thoughts that you'd be better off dead",
]

RISK_TABLE = [
    (5,  "✅ Minimal",            "flourishing", "#00cc88"),
    (10, "💚 Mild",               "stable",      "#88cc00"),
    (15, "⚠️ Moderate",          "languishing", "#ffaa00"),
    (20, "🔴 Moderately Severe",  "distressed",  "#ff6600"),
    (28, "🚨 Severe",             "crisis",      "#ff0000"),
]

def get_risk(total):
    for threshold, label, level, color in RISK_TABLE:
        if total < threshold:
            return label, level, color
    return RISK_TABLE[-1][0], RISK_TABLE[-1][2], RISK_TABLE[-1][3]

# ── Voice result display ───────────────────────────────────────────────────────
def show_voice_result(result):
    c1, c2, c3 = st.columns(3)
    c1.metric("Stress Score",    f"{result.stress_score:.2f}")
    c1.progress(float(result.stress_score))
    c2.metric("Confidence",      f"{result.overall_confidence:.1%}")
    c3.metric("Pitch Stability", f"{result.pitch_features['pitch_stability']:.2f}")
    st.info(f"**Analysis:** {result.interpretation}")
    st.session_state.matrix.integrate_acoustic_marker(result.stress_score)
    st.session_state.vault.encrypt_health_record(
        st.session_state.uid,
        {"stress": result.stress_score, "ts": result.timestamp.isoformat()},
        purpose="voice",
    )
    st.success("✅ Stored securely in GoldenOS vault.")

# ══════════════════════════════════════════════════════════════════════════════
# PAGES
# ══════════════════════════════════════════════════════════════════════════════

if page == "🏠 Home":
    st.markdown('<div class="brand-header">🚑 GOLDENHOUR SYSTEMS · GOLDENHOS AI PLATFORM · MENTAL HEALTH MODULE</div>', unsafe_allow_html=True)
    st.title("Resilience Matrix")
    st.subheader("Gamified Mental Health Screening & Triage")

    col1, col2, col3, col4 = st.columns(4)
    col1.markdown('<div class="card-gold"><div style="font-size:28px">🧠</div><div>PHQ-9 Screening</div><div style="font-size:12px">2 minutes</div></div>', unsafe_allow_html=True)
    col2.markdown('<div class="card"><div style="color:#F5A623;font-size:28px">📊</div><div>Dual-Continua Map</div><div style="font-size:12px;opacity:.7">Visual insights</div></div>', unsafe_allow_html=True)
    col3.markdown('<div class="card"><div style="color:#F5A623;font-size:28px">🎤</div><div>Acoustic Analysis</div><div style="font-size:12px;opacity:.7">Voice biomarkers</div></div>', unsafe_allow_html=True)
    col4.markdown('<div class="card"><div style="color:#F5A623;font-size:28px">🆘</div><div>Tele-MANAS</div><div style="font-size:12px;opacity:.7">Crisis escalation</div></div>', unsafe_allow_html=True)

    st.markdown("---")
    st.markdown("""
**How it works:**
1. **Screening** — Complete the PHQ-9 questionnaire (2 min)
2. **Dashboard** — See your Flourishing ↔ Crisis position on the Dual-Continua model
3. **Voice** — Optional acoustic stress analysis via voice upload
4. **Support** — Direct connection to Tele-MANAS counsellors if needed

**Part of the GoldenOS Platform:**
This module feeds into the GoldenOS AI EMS Intelligence stack alongside ambulance dispatch,
PCR documentation, and the Don't Die longevity protocol.

**Privacy:** AES-256 encrypted · MHCA 2017 compliant · Non-diagnostic · No data shared without consent
""")
    st.info("👈 Use the sidebar to navigate. Start with **Screening**.")

elif page == "📋 Screening":
    st.markdown('<div class="brand-header">📋 PHQ-9 MENTAL HEALTH SCREENING</div>', unsafe_allow_html=True)
    st.title("Mental Health Screening")
    st.caption("Rate each item for the **past 2 weeks** · 0 = Not at all → 3 = Nearly every day")

    scores = {}
    cols = st.columns(3)
    for i, q in enumerate(PHQ9):
        with cols[i % 3]:
            scores[i] = st.select_slider(q, options=[0, 1, 2, 3], value=0, key=f"q{i}")

    total = sum(scores.values())
    answered = sum(1 for v in scores.values() if v > 0)
    st.progress(answered / 9, text=f"{answered}/9 answered · Total score: {total}/27")

    if total > 0:
        label, level, color = get_risk(total)
        st.markdown(f"### {label}")

        cp = st.session_state.matrix.update_from_screening({f"q_{k}": v for k, v in scores.items()})
        st.session_state.vault.encrypt_health_record(
            st.session_state.uid,
            {"phq9_total": total, "risk": level, "ts": datetime.now().isoformat()},
            purpose="screening",
        )

        if level == "crisis":
            st.error("🚨 **Immediate support available.** Please go to **Crisis Support** now or call **iCall: 9152987821**")
        elif level == "distressed":
            st.warning("Professional support is recommended. See **Crisis Support** for resources.")
        else:
            st.success("Screening saved. Go to **Dashboard** to see your full results.")

elif page == "📊 Dashboard":
    st.markdown('<div class="brand-header">📊 GOLDENHOS HEALTH DASHBOARD</div>', unsafe_allow_html=True)
    st.title("Your Health Dashboard")
    cp = st.session_state.matrix.get_current_checkpoint()

    if not cp:
        st.info("Complete the **Screening** tab first to generate your dashboard.")
    else:
        c1, c2, c3, c4 = st.columns(4)
        c1.markdown(f'<div class="card-gold"><div>Health Score</div><div class="big">{cp.score:.0f}</div><div>/100</div></div>', unsafe_allow_html=True)
        c2.markdown(f'<div class="card"><div style="color:#F5A623">Mental Health</div><div style="font-size:20px;font-weight:bold;margin-top:8px">{cp.mental_health.value.capitalize()}</div></div>', unsafe_allow_html=True)
        c3.markdown(f'<div class="card"><div style="color:#F5A623">Resilience</div><div style="font-size:20px;font-weight:bold;margin-top:8px">{cp.resilience.value.capitalize()}</div></div>', unsafe_allow_html=True)
        risk_color = "#ff4b4b" if cp.risk_flag else "#00cc88"
        risk_text  = "🚨 HIGH RISK" if cp.risk_flag else "✅ STABLE"
        c4.markdown(f'<div class="card"><div style="color:#F5A623">Risk Status</div><div style="font-size:18px;font-weight:bold;margin-top:8px;color:{risk_color}">{risk_text}</div></div>', unsafe_allow_html=True)

        st.markdown("---")

        # Dual-Continua quadrant chart
        res_score = {ResilienceLevel.HIGH: 80, ResilienceLevel.MODERATE: 50, ResilienceLevel.LOW: 20}.get(cp.resilience, 50)
        fig = go.Figure()

        quadrants = [
            ("Flourishing", 0,  50, 50, 100, "rgba(0,204,136,0.2)"),
            ("Coping",      50, 50, 100,100, "rgba(245,166,35,0.2)"),
            ("Struggling",  0,  0,  50, 50,  "rgba(255,102,0,0.2)"),
            ("Crisis",      50, 0,  100,50,  "rgba(255,0,0,0.2)"),
        ]
        for name, x0, y0, x1, y1, color in quadrants:
            fig.add_shape(type="rect", x0=x0, y0=y0, x1=x1, y1=y1,
                          fillcolor=color, line_width=0)
            fig.add_annotation(x=(x0+x1)/2, y=(y0+y1)/2, text=f"<b>{name}</b>",
                               showarrow=False, font=dict(size=13, color="#eee"))

        fig.add_shape(type="line", x0=50, y0=0, x1=50, y1=100,
                      line=dict(color="#F5A623", width=1, dash="dot"))
        fig.add_shape(type="line", x0=0, y0=50, x1=100, y1=50,
                      line=dict(color="#F5A623", width=1, dash="dot"))

        fig.add_trace(go.Scatter(
            x=[cp.score], y=[res_score],
            mode="markers+text",
            marker=dict(size=24, color="#F5A623", symbol="star",
                        line=dict(color="#0D1B2A", width=2)),
            text=["YOU"], textposition="top center",
            textfont=dict(color="#F5A623", size=13),
            showlegend=False,
        ))

        fig.update_layout(
            title=dict(text="Dual-Continua Mental Health Model", font=dict(color="#F5A623")),
            paper_bgcolor="#0D1B2A", plot_bgcolor="#0D1B2A",
            font=dict(color="#eee"),
            xaxis=dict(title="Mental Health Score", range=[0,100], gridcolor="#1a3a5c"),
            yaxis=dict(title="Resilience Level",    range=[0,100], gridcolor="#1a3a5c"),
            height=480, margin=dict(l=40, r=40, t=50, b=40),
        )
        st.plotly_chart(fig, use_container_width=True)

        # Trajectory
        traj = st.session_state.matrix.get_trajectory()
        if len(traj) > 1:
            fig2 = go.Figure(go.Scatter(
                x=[c.timestamp for c in traj], y=[c.score for c in traj],
                mode="lines+markers",
                line=dict(color="#F5A623", width=3),
                marker=dict(size=8, color="#F5A623"),
                fill="tozeroy", fillcolor="rgba(245,166,35,0.1)",
            ))
            fig2.update_layout(
                title=dict(text="Score Trajectory", font=dict(color="#F5A623")),
                paper_bgcolor="#0D1B2A", plot_bgcolor="#0D1B2A",
                font=dict(color="#eee"),
                xaxis=dict(gridcolor="#1a3a5c"),
                yaxis=dict(gridcolor="#1a3a5c", range=[0,100]),
                height=280, margin=dict(l=40, r=40, t=40, b=40),
            )
            st.plotly_chart(fig2, use_container_width=True)

elif page == "🎤 Voice Analysis":
    st.markdown('<div class="brand-header">🎤 ACOUSTIC BIOMARKER ANALYSIS · GOLDENHOS AI</div>', unsafe_allow_html=True)
    st.title("Voice Stress Analysis")
    st.info('📝 Read aloud naturally: *"I feel like I\'m handling things well today, and I\'m optimistic about the future."*')

    # Try WebRTC
    try:
        from streamlit_webrtc import webrtc_streamer, WebRtcMode, RTCConfiguration
        ctx = webrtc_streamer(
            key="voice",
            mode=WebRtcMode.SENDONLY,
            rtc_configuration=RTCConfiguration({"iceServers": [{"urls": ["stun:stun.l.google.com:19302"]}]}),
            media_stream_constraints={"video": False, "audio": True},
            async_processing=True,
        )
        if ctx.audio_receiver:
            frames = ctx.audio_receiver.get_frames()
            if frames:
                audio = np.concatenate([f.to_ndarray() for f in frames])
                result = st.session_state.analyzer.analyze_audio_array(audio, frames[0].sample_rate)
                show_voice_result(result)
    except Exception:
        st.warning("⚠️ Live recording unavailable in this environment. Upload an audio file below.")

    st.markdown("#### 📁 Upload Audio File")
    f = st.file_uploader("WAV / MP3 / M4A · 5–10 seconds recommended", type=["wav", "mp3", "m4a"])
    if f:
        try:
            audio, sr = sf.read(io.BytesIO(f.read()))
            if audio.ndim > 1:
                audio = audio.mean(axis=1)
            result = st.session_state.analyzer.analyze_audio_array(audio.astype(np.float32), sr)
            show_voice_result(result)
        except Exception as e:
            st.error(f"Could not process file: {e}")

elif page == "🆘 Crisis Support":
    st.markdown('<div class="brand-header">🆘 CRISIS SUPPORT · TELE-MANAS INTEGRATION</div>', unsafe_allow_html=True)
    st.title("Crisis Support")
    cp = st.session_state.matrix.get_current_checkpoint()

    if cp and cp.risk_flag:
        st.error("⚠️ Your results indicate you may be experiencing significant distress. Help is available right now.")
        c1, c2 = st.columns(2)
        if c1.button("📱 Connect Tele-MANAS", use_container_width=True):
            st.success("**Call 14416** — Free, 24/7 government telemedicine counselling (Tele-MANAS, MoHFW)")
        if c2.button("🚑 Dispatch via ambulance.run", use_container_width=True):
            st.info("Opening ambulance.run dispatch portal... In production, this triggers the GoldenOS dispatch API.")
    else:
        st.success("✅ No acute crisis detected. Support resources are available below at any time.")

    st.markdown("---")
    st.markdown("### 📞 Emergency Contacts")
    st.markdown("""
| Service | Contact | Hours | Notes |
|---------|---------|-------|-------|
| **Tele-MANAS** (Govt) | **14416** | 24/7 | Free · Hindi + regional languages |
| **iCall** (TISS) | **9152987821** | Mon–Sat 8am–10pm | Chat + call |
| **AASRA** | **9820466726** | 24/7 | Suicide prevention |
| **Vandrevala Foundation** | **1860-2662-345** | 24/7 | Free |
| **iCall WhatsApp** | +91 9152987821 | Mon–Sat | Text support |
""")
    st.markdown("---")
    st.markdown("### 🔗 GoldenOS Integration")
    st.info("In the full GoldenOS deployment, a crisis flag here automatically:\n- Notifies the on-call paramedic via ambulance.run\n- Pre-fills a mental health PCR record\n- Routes the nearest equipped ambulance via Dispatch AI")

elif page == "🔐 Privacy":
    st.markdown('<div class="brand-header">🔐 DATA PRIVACY · MHCA 2017 COMPLIANT</div>', unsafe_allow_html=True)
    st.title("Data Privacy & Compliance")

    records = st.session_state.vault.get_user_records(st.session_state.uid)
    c1, c2 = st.columns(2)
    c1.metric("Records This Session", len(records))
    c2.metric("Encryption", "AES-256")

    st.markdown("""
**Encryption**
- In transit: TLS 1.2+
- At rest: AES-256
- Voice data: encrypted before processing

**Compliance**
- ✅ MHCA 2017 (Mental Healthcare Act)
- ✅ ABDM-aligned data structure
- ✅ GDPR-aligned consent
- ✅ Non-diagnostic tool with clinical safeguards

**Your Rights**
- View, export, or delete your data at any time
- Withdraw consent instantly
- Data never shared without explicit consent
""")

    col1, col2 = st.columns(2)
    if col1.button("📤 Export My Data"):
        export = st.session_state.vault.export_user_data(st.session_state.uid)
        st.json({"record_count": export["record_count"], "exported_at": export["export_timestamp"]})
    if col2.button("🗑️ Delete My Data"):
        st.session_state.vault.delete_user_data(st.session_state.uid)
        st.success("All records deleted from this session.")

# ── Footer ─────────────────────────────────────────────────────────────────────
st.markdown("---")
st.markdown(
    '<div style="text-align:center;color:#666;font-size:12px">'
    '🚑 <b>Goldenhour Systems Pvt Ltd</b> · ambulance.run · GoldenOS AI Platform · '
    'DIPP Certified Startup · Sub-8-minute response · '
    '<a href="mailto:hemant.thackeray@gmail.com" style="color:#F5A623">Contact</a>'
    '</div>',
    unsafe_allow_html=True,
)
