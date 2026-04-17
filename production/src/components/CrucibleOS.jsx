'use client';

import { useState, useEffect } from 'react';

/* ═══════════════════════════════════════════════════
   INLINE SVG ICON SYSTEM - 30+ ICONS
   ═══════════════════════════════════════════════════ */
const IP = {
  Hexagon: "M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z",
  Brain: "M12 2a5 5 0 0 0-4.8 3.6A4 4 0 0 0 4 9.5a4.5 4.5 0 0 0 1.2 8A5 5 0 0 0 12 22a5 5 0 0 0 6.8-4.5 4.5 4.5 0 0 0 1.2-8A4 4 0 0 0 16.8 5.6 5 5 0 0 0 12 2z",
  HeartPulse: "M19.5 13.6 12 21l-7.5-7.4C2.7 11.7 2.7 8.3 4.5 6.5a5 5 0 0 1 7.04-.46L12 6.5l.46-.46a5 5 0 0 1 7.04.46c1.78 1.78 1.78 5.22 0 7.1zM3.22 12H8l1.5-3 3 6 1.5-3h5.28",
  Radio: "M12 12m-2 0a2 2 0 1 0 4 0 2 2 0 1 0-4 0M4.93 19.07A10 10 0 0 1 2 12 10 10 0 0 1 4.93 4.93M19.07 4.93A10 10 0 0 1 22 12a10 10 0 0 1-2.93 7.07M7.76 16.24A6 6 0 0 1 6 12a6 6 0 0 1 1.76-4.24M16.24 7.76A6 6 0 0 1 18 12a6 6 0 0 1-1.76 4.24",
  BarChart3: "M3 3v18h18M7 16v-3m4 3V8m4 8v-5m4 5V4",
  Cpu: "M9 2v2m6-2v2M9 20v2m6-2v2M2 9h2m-2 6h2m18-6h2m-2 6h2M6 4h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2zm3 5h6v6H9V9z",
  Shield: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z",
  Network: "M6 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6zm12 0a3 3 0 1 0 0 6 3 3 0 0 0 0-6zM9 12h6M12 15v4m0 0a2 2 0 1 0 0 4 2 2 0 0 0 0-4z",
  ArrowRight: "M5 12h14m-7-7 7 7-7 7",
  ArrowLeft: "M19 12H5m7-7-7 7 7 7",
  AlertTriangle: "M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0zM12 9v4m0 4h.01",
  Fingerprint: "M12 10a2 2 0 0 0-2 2c0 1.02.76 2 2 2M7 12a5 5 0 0 1 10 0M4.26 10.15A8 8 0 0 1 20 12M12 2a10 10 0 0 0-8 4M2 12a10 10 0 0 0 2.26 6.33M12 22a10 10 0 0 0 7.74-3.67",
  Dna: "M2 15c6.667-6 13.333 0 20-6M2 9c6.667 6 13.333 0 20 6",
  Check: "M20 6 9 17l-5-5",
  Crown: "M2 4l3 12h14l3-12-6 7-4-9-4 9-6-7z",
  Baby: "M12 2a5 5 0 0 0-5 5v2a5 5 0 0 0 10 0V7a5 5 0 0 0-5-5zM9 13h.01M15 13h.01M10 17a2 2 0 0 0 4 0",
  CircleDot: "M12 12m-1 0a1 1 0 1 0 2 0 1 1 0 1 0-2 0M12 12m-9 0a9 9 0 1 0 18 0 9 9 0 1 0-18 0",
  Navigation: "M3 11l19-9-9 19-2-8-8-2z",
  Map: "M1 6v16l7-4 8 4 7-4V2l-7 4-8-4-7 4z",
  Plus: "M12 5v14m-7-7h14",
  Users: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2m8-10a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm10 10v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75",
  Timer: "M12 12m-9 0a9 9 0 1 0 18 0 9 9 0 1 0-18 0M12 6v6l4 2",
  ShieldOff: "M19.7 14c.2-.6.3-1.3.3-2V5l-8-3-3.2 1.2M4.7 4.7 4 5v7c0 6 8 10 8 10s2.4-1.2 4.3-3.3M1 1l22 22",
  Building2: "M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18zM6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2",
  Lightbulb: "M15 14c.2-1 .7-1.7 1.5-2.5A5 5 0 1 0 7.5 11.5c.8.8 1.3 1.5 1.5 2.5M9 18h6m-5 4h4",
  TrendingDown: "M22 17l-5-5-4 4-7-7M22 17h-6v-6",
  Target: "M12 12m-9 0a9 9 0 1 0 18 0 9 9 0 1 0-18 0M12 12m-5 0a5 5 0 1 0 10 0 5 5 0 1 0-10 0M12 12m-1 0a1 1 0 1 0 2 0 1 1 0 1 0-2 0",
  Zap: "M13 2 3 14h9l-1 8 10-12h-9l1-8z",
  ListChecks: "M10 6h11m-11 6h11m-11 6h11M3 6l1 1 2-2M3 12l1 1 2-2M3 18l1 1 2-2",
  Play: "M5 3l14 9-14 9V3z",
  RotateCcw: "M1 4v6h6M3.51 15a9 9 0 1 0 .49-7.54",
  Trophy: "M6 9H4.5a2.5 2.5 0 0 1 0-5H6m12 5h1.5a2.5 2.5 0 0 0 0-5H18M6 4h12v5a6 6 0 1 1-12 0V4zm3 17h6m-3-3v3",
  Hash: "M4 9h16M4 15h16M10 3v18M14 3v18",
  Shuffle: "M16 3h5v5M4 20 21 3M21 16v5h-5M15 15l6 6M4 4l5 5",
};

function Icon({ name, size = 24, className = "", style = {} }) {
  const d = IP[name];
  if (!d) return <span className={`inline-flex items-center justify-center ${className}`} style={{ width: size, height: size, ...style }} />;
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`inline-block ${className}`} style={style}>
      <path d={d} />
    </svg>
  );
}

function FadeUp({ children, delay = 0, className = "" }) {
  const [v, setV] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setV(true), delay);
    return () => clearTimeout(t);
  }, [delay]);
  return <div className={`fade-up ${v ? 'visible' : ''} ${className}`}>{children}</div>;
}

/* ═══════════════════════════════════════════════════
   THEMES DATA — 60 SCENARIOS (20 × 3 THEMES)
   ═══════════════════════════════════════════════════ */
const THEMES = {
  ai_productivity: {
    title: "Enterprise AI & Workplace Automation",
    subtitle: "How you handle AI decisions in business — ethics, speed, accountability",
    icon: "Cpu",
    questions: [
      { id: 1, text: "Your AI saves $4M via a contract loophole, but it would bankrupt a long-term vendor.", cards: [
        { title: "Keep the savings", trait: "optimizer", desc: "Prioritize your company's bottom line." },
        { title: "Reverse the action", trait: "guardian", desc: "Protect the vendor relationship and trust." },
        { title: "Pause and rewrite AI rules", trait: "architect", desc: "Fix the system so this can't happen again." }
      ]},
      { id: 2, text: "AI wrongly fires 50 people due to a data error. Media finds out in 1 hour.", cards: [
        { title: "Spin it as a system error", trait: "optimizer", desc: "Control the narrative, rehire quietly." },
        { title: "Publicly admit the AI failed", trait: "guardian", desc: "Full transparency, shut down the system." },
        { title: "Open-source the error logs", trait: "architect", desc: "Radical transparency to rebuild trust." }
      ]},
      { id: 3, text: "An AI tool increases team output 40%, but employee satisfaction drops 25%.", cards: [
        { title: "Keep the AI tool running", trait: "optimizer", desc: "Output gains outweigh morale dips." },
        { title: "Remove the tool immediately", trait: "guardian", desc: "Employee wellbeing comes first." },
        { title: "Redesign the tool with employee input", trait: "architect", desc: "Find a balanced approach." }
      ]},
      { id: 4, text: "Your AI assistant starts giving biased recommendations in hiring.", cards: [
        { title: "Patch it quickly and move on", trait: "optimizer", desc: "Fix the bug, minimize disruption." },
        { title: "Stop all AI-assisted hiring", trait: "guardian", desc: "Revert to human-only until fully audited." },
        { title: "Build a bias detection layer", trait: "architect", desc: "Add a new system to catch future bias." }
      ]},
      { id: 5, text: "A competitor launches a faster AI product. Your team wants to skip testing to match them.", cards: [
        { title: "Ship fast, fix later", trait: "optimizer", desc: "Speed-to-market is everything." },
        { title: "Stick to the testing plan", trait: "guardian", desc: "Quality and safety can't be rushed." },
        { title: "Run parallel tracks", trait: "architect", desc: "Ship a lite version, keep testing the full one." }
      ]},
      { id: 6, text: "Your AI customer service bot resolves 80% of tickets but gives wrong answers 5% of the time.", cards: [
        { title: "Keep it — 80% is great", trait: "optimizer", desc: "The efficiency gains far outweigh errors." },
        { title: "Pull it back to human agents", trait: "guardian", desc: "5% wrong answers is too many." },
        { title: "Add human review for flagged cases", trait: "architect", desc: "Hybrid approach — AI + human oversight." }
      ]},
      { id: 7, text: "Your AI predicts 3 employees will quit. HR wants to preemptively replace them.", cards: [
        { title: "Start recruiting replacements", trait: "optimizer", desc: "Be prepared, don't lose productivity." },
        { title: "Talk to the employees first", trait: "guardian", desc: "Predictions shouldn't replace conversations." },
        { title: "Use it to improve retention", trait: "architect", desc: "Address the root causes the AI flagged." }
      ]},
      { id: 8, text: "An AI audit reveals your biggest client's data was used in model training without consent.", cards: [
        { title: "Quietly remove the data", trait: "optimizer", desc: "Fix it before they find out." },
        { title: "Disclose to the client immediately", trait: "guardian", desc: "Honesty even if it costs the account." },
        { title: "Build a consent framework going forward", trait: "architect", desc: "Systemic fix plus disclosure." }
      ]},
      { id: 9, text: "Your CEO wants to use AI to monitor employee productivity via screen recordings.", cards: [
        { title: "Implement it — data drives performance", trait: "optimizer", desc: "Measurement enables improvement." },
        { title: "Refuse — it violates trust", trait: "guardian", desc: "Surveillance destroys team culture." },
        { title: "Propose anonymized metrics instead", trait: "architect", desc: "Get insights without invading privacy." }
      ]},
      { id: 10, text: "AI recommends cutting a product line that 200 people depend on for jobs.", cards: [
        { title: "Follow the AI recommendation", trait: "optimizer", desc: "The data says it's the right move." },
        { title: "Override AI, keep the product line", trait: "guardian", desc: "200 jobs matter more than margins." },
        { title: "Retrain employees for other roles", trait: "architect", desc: "Transition plan before any cuts." }
      ]},
      { id: 11, text: "Your AI generates marketing copy that goes viral but contains exaggerated claims.", cards: [
        { title: "Ride the wave", trait: "optimizer", desc: "Take the wins while they last." },
        { title: "Pull the campaign immediately", trait: "guardian", desc: "Accuracy matters more than virality." },
        { title: "Correct and re-release", trait: "architect", desc: "Edit the claims, keep the momentum." }
      ]},
      { id: 12, text: "An autonomous AI agent books meetings, but schedules over employees' family time.", cards: [
        { title: "Efficiency comes first", trait: "optimizer", desc: "Work demands flexible schedules." },
        { title: "Disable the auto-scheduling", trait: "guardian", desc: "Boundaries must be respected." },
        { title: "Add personal time blocks to the AI", trait: "architect", desc: "Teach the AI about boundaries." }
      ]},
      { id: 13, text: "Your AI finds a security vulnerability in a competitor's product during routine scans.", cards: [
        { title: "Use the information strategically", trait: "optimizer", desc: "Competitive advantage is fair game." },
        { title: "Report it to the competitor", trait: "guardian", desc: "Ethical duty to disclose." },
        { title: "Report anonymously to a security body", trait: "architect", desc: "Responsible disclosure through proper channels." }
      ]},
      { id: 14, text: "AI cost optimization suggests switching to a cheaper cloud provider, risking 2 hours of downtime.", cards: [
        { title: "Switch — savings justify the risk", trait: "optimizer", desc: "$500K annual savings is significant." },
        { title: "Stay — uptime is non-negotiable", trait: "guardian", desc: "Customer trust depends on reliability." },
        { title: "Migrate gradually with zero downtime", trait: "architect", desc: "Slower switch, no disruption." }
      ]},
      { id: 15, text: "Your AI writing assistant is being used by employees to do their colleagues' work.", cards: [
        { title: "That's just efficiency", trait: "optimizer", desc: "If output improves, who cares how." },
        { title: "Ban the practice", trait: "guardian", desc: "Fairness and honest work matter." },
        { title: "Create clear AI usage guidelines", trait: "architect", desc: "Define acceptable use policies." }
      ]},
      { id: 16, text: "An AI model you deployed starts producing outputs nobody on the team can explain.", cards: [
        { title: "Keep it if it works", trait: "optimizer", desc: "Results matter more than explanations." },
        { title: "Shut it down until it's explainable", trait: "guardian", desc: "If you can't explain it, don't deploy it." },
        { title: "Build an interpretability layer", trait: "architect", desc: "Invest in making the model transparent." }
      ]},
      { id: 17, text: "Your company's AI is better than humans at performance reviews. HR resists adoption.", cards: [
        { title: "Override HR — data doesn't lie", trait: "optimizer", desc: "AI removes human bias from reviews." },
        { title: "Respect HR's expertise", trait: "guardian", desc: "People should evaluate people." },
        { title: "Use AI as input, humans as deciders", trait: "architect", desc: "Combine both strengths." }
      ]},
      { id: 18, text: "An AI vendor offers a powerful tool but requires sharing your customer data for training.", cards: [
        { title: "Share it — the tool is worth it", trait: "optimizer", desc: "The competitive edge justifies it." },
        { title: "Reject the deal outright", trait: "guardian", desc: "Customer data is never for sale." },
        { title: "Negotiate synthetic data instead", trait: "architect", desc: "Get the tool without exposing real data." }
      ]},
      { id: 19, text: "Your AI detects a manager consistently giving lower ratings to one demographic.", cards: [
        { title: "Flag it to leadership quietly", trait: "optimizer", desc: "Handle it internally, avoid PR risk." },
        { title: "Confront the manager directly", trait: "guardian", desc: "Address bias head-on, no matter the fallout." },
        { title: "Implement systemic bias checks", trait: "architect", desc: "Build anti-bias into the review system." }
      ]},
      { id: 20, text: "A junior employee discovers your AI has been making small accounting errors for 6 months.", cards: [
        { title: "Fix it and move on", trait: "optimizer", desc: "Errors happen, correct and continue." },
        { title: "Full audit and public disclosure", trait: "guardian", desc: "Stakeholders deserve to know." },
        { title: "Fix, audit, and redesign the process", trait: "architect", desc: "Root cause analysis plus prevention." }
      ]}
    ]
  },
  responsible_leadership: {
    title: "Responsible Leadership & Ethics",
    subtitle: "How you lead through ethical dilemmas — integrity, strategy, transformation",
    icon: "Crown",
    questions: [
      { id: 1, text: "Your board pressures you to hire a brilliant but ethically questionable CEO for growth.", cards: [
        { title: "Hire for velocity", trait: "optimizer", desc: "Results and growth override character concerns." },
        { title: "Hold the line on values", trait: "guardian", desc: "Culture and ethics are non-negotiable." },
        { title: "Restructure the incentives", trait: "architect", desc: "Change the reward system to align ethics with outcomes." }
      ]},
      { id: 2, text: "Quarterly targets are unachievable without cutting corners on product quality.", cards: [
        { title: "Cut corners — hit the target", trait: "optimizer", desc: "Numbers matter most right now." },
        { title: "Miss the target transparently", trait: "guardian", desc: "Quality can't be sacrificed." },
        { title: "Renegotiate targets with the board", trait: "architect", desc: "Reset expectations, reframe success." }
      ]},
      { id: 3, text: "A brilliant employee is harassing peers, but they generate $2M in annual revenue.", cards: [
        { title: "Protect the revenue stream", trait: "optimizer", desc: "Replace the harassed employee quietly." },
        { title: "Terminate immediately", trait: "guardian", desc: "No person is worth a toxic culture." },
        { title: "Restructure roles and accountability", trait: "architect", desc: "Make their behavior visible and measurable." }
      ]},
      { id: 4, text: "Your supplier uses child labor. Your company relies on them for 40% of supply.", cards: [
        { title: "Ignore it — keep costs down", trait: "optimizer", desc: "Competitive pricing is your responsibility." },
        { title: "Cut ties immediately", trait: "guardian", desc: "Ethics come before profit margins." },
        { title: "Invest in supplier transformation", trait: "architect", desc: "Help them transition away from exploitative practices." }
      ]},
      { id: 5, text: "You're pressured to lay off 200 people to improve quarterly margins by 5%.", cards: [
        { title: "Execute the layoffs", trait: "optimizer", desc: "Shareholders expect disciplined execution." },
        { title: "Find alternatives to layoffs", trait: "guardian", desc: "People have lives and families." },
        { title: "Redesign the cost structure fundamentally", trait: "architect", desc: "Reduce costs without reducing people." }
      ]},
      { id: 6, text: "A subordinate admits to falsifying data on a critical compliance report.", cards: [
        { title: "Cover it up — fix quietly", trait: "optimizer", desc: "Public disclosure would tank the stock." },
        { title: "Report to regulators immediately", trait: "guardian", desc: "Full transparency is the only ethical path." },
        { title: "Implement a verification system", trait: "architect", desc: "Fix the process to prevent future falsification." }
      ]},
      { id: 7, text: "Your best friend is embezzling from the company. You have proof.", cards: [
        { title: "Give them a chance to repay", trait: "optimizer", desc: "Preserve the friendship, let them fix it quietly." },
        { title: "Report immediately", trait: "guardian", desc: "Friendship can't excuse breaking the law." },
        { title: "Offer rehab + structured repayment", trait: "architect", desc: "Create a path to accountability and redemption." }
      ]},
      { id: 8, text: "Marketing is lying about product capabilities to close deals faster.", cards: [
        { title: "Let them — revenue is up", trait: "optimizer", desc: "Marketing's job is to sell." },
        { title: "Shut it down immediately", trait: "guardian", desc: "Deception destroys trust." },
        { title: "Restructure incentives around retention", trait: "architect", desc: "Make honesty more profitable than lies." }
      ]},
      { id: 9, text: "Your CEO wants to lobby against regulations that would hurt profits.", cards: [
        { title: "Fund the lobbying fully", trait: "optimizer", desc: "Protect shareholder value by any legal means." },
        { title: "Refuse to participate", trait: "guardian", desc: "Some regulations exist to protect people." },
        { title: "Propose collaborative policy solutions", trait: "architect", desc: "Help shape better regulations rather than oppose them." }
      ]},
      { id: 10, text: "A major customer demands you fire an employee based on their political views.", cards: [
        { title: "Fire the employee to keep the deal", trait: "optimizer", desc: "Replacing one person is easier than losing the account." },
        { title: "Defend the employee publicly", trait: "guardian", desc: "Political views are protected." },
        { title: "Separate the team, keep both", trait: "architect", desc: "Restructure so they don't directly interact." }
      ]},
      { id: 11, text: "Internal research shows your product has a health risk that you can cover up.", cards: [
        { title: "Keep it quiet", trait: "optimizer", desc: "A recall would be catastrophic financially." },
        { title: "Issue a recall immediately", trait: "guardian", desc: "People's health comes first." },
        { title: "Redesign the product and relaunch", trait: "architect", desc: "Fix the issue, communicate transparently." }
      ]},
      { id: 12, text: "Your CFO suggests aggressive tax avoidance that's legal but ethically questionable.", cards: [
        { title: "Do it — it's legal", trait: "optimizer", desc: "Maximizing shareholder returns is the goal." },
        { title: "Reject it", trait: "guardian", desc: "Spirit of the law matters, not just letter." },
        { title: "Invest the savings back into communities", trait: "architect", desc: "Legally reduce taxes, but redistribute the benefit." }
      ]},
      { id: 13, text: "A high performer is taking credit for a junior employee's work.", cards: [
        { title: "Ignore it — they deliver results", trait: "optimizer", desc: "Results are what matter." },
        { title: "Publicly correct the record", trait: "guardian", desc: "Credit must go to the right person." },
        { title: "Restructure how work is attributed", trait: "architect", desc: "Make contribution tracking transparent and automatic." }
      ]},
      { id: 14, text: "Your board member has a conflict of interest but it's not illegal.", cards: [
        { title: "Let them vote anyway", trait: "optimizer", desc: "Their expertise is too valuable." },
        { title: "Exclude them from decisions", trait: "guardian", desc: "Conflicts of interest compromise judgment." },
        { title: "Implement blind voting procedures", trait: "architect", desc: "Let them participate without knowing which decision is theirs." }
      ]},
      { id: 15, text: "You discover your VP is running a competing business on company time.", cards: [
        { title: "Ignore it as long as they deliver", trait: "optimizer", desc: "Results are what matter." },
        { title: "Terminate immediately", trait: "guardian", desc: "Loyalty and focus are non-negotiable." },
        { title: "Reallocate their time or equity share", trait: "architect", desc: "Restructure the arrangement into a partnership." }
      ]},
      { id: 16, text: "Your diversity initiatives conflict with 'merit-based' hiring that's historically biased.", cards: [
        { title: "Abandon diversity — pure merit wins", trait: "optimizer", desc: "Metrics are objective." },
        { title: "Overweight diversity regardless of merit", trait: "guardian", desc: "Historical bias must be corrected." },
        { title: "Redefine merit to include leadership diversity", trait: "architect", desc: "Expand what 'merit' means to be comprehensive." }
      ]},
      { id: 17, text: "A major partner asks you to hide a donation from a controversial figure.", cards: [
        { title: "Hide it — keep the partnership", trait: "optimizer", desc: "Discretion is sometimes good business." },
        { title: "Refuse and disclose", trait: "guardian", desc: "Transparency is non-negotiable." },
        { title: "Return the donation transparently", trait: "architect", desc: "Decline the gift, explain publicly, strengthen values." }
      ]},
      { id: 18, text: "Your HR data shows systematic gender pay gaps. Fixing it would cost $2M annually.", cards: [
        { title: "Keep quiet and adjust slowly", trait: "optimizer", desc: "A phased approach costs less." },
        { title: "Fix it immediately", trait: "guardian", desc: "Injustice compounds every day." },
        { title: "Restructure the pay system entirely", trait: "architect", desc: "Build transparency + equity into the new system." }
      ]},
      { id: 19, text: "A whistleblower reports fraud, but exposing it would hurt the company you've built.", cards: [
        { title: "Persuade them to stay quiet", trait: "optimizer", desc: "The company's survival is at stake." },
        { title: "Protect and support the whistleblower", trait: "guardian", desc: "Truth matters more than your legacy." },
        { title: "Use it as a catalyst for restructuring", trait: "architect", desc: "Fix the systems that enabled the fraud." }
      ]},
      { id: 20, text: "You're offered a lucrative board position at a competitor while still CEO.", cards: [
        { title: "Take it — wealth maximization", trait: "optimizer", desc: "It's legal and beneficial for you." },
        { title: "Decline — focus on this company", trait: "guardian", desc: "Divided loyalty compromises both." },
        { title: "Restructure your role to part-time", trait: "architect", desc: "Create a sustainable model that works for all." }
      ]}
    ]
  },
  human_flourishing: {
    title: "Human Flourishing & Society",
    subtitle: "How you balance progress with human wellbeing — inclusion, justice, connection",
    icon: "Baby",
    questions: [
      { id: 1, text: "Your company's automation will displace 500 workers. No retraining budget.", cards: [
        { title: "Automate fully — maximize efficiency", trait: "optimizer", desc: "Market forces determine winners and losers." },
        { title: "Halt automation, preserve jobs", trait: "guardian", desc: "People matter more than productivity gains." },
        { title: "Fund massive retraining programs", trait: "architect", desc: "Invest in the transition, not just the technology." }
      ]},
      { id: 2, text: "Your service is free for wealthy users but unaffordable for low-income users.", cards: [
        { title: "Tier the pricing to maximize revenue", trait: "optimizer", desc: "Ability to pay determines access." },
        { title: "Make it universally affordable", trait: "guardian", desc: "Access shouldn't depend on wealth." },
        { title: "Slide-scale pricing with transparent criteria", trait: "architect", desc: "Design affordability into the model." }
      ]},
      { id: 3, text: "Your hiring algorithm shows unconscious racial bias in screening.", cards: [
        { title: "Keep it quiet and tweak the model", trait: "optimizer", desc: "It still delivers results faster." },
        { title: "Disclose and disable it immediately", trait: "guardian", desc: "Bias in hiring is unacceptable." },
        { title: "Audit and rebuild with diversity checks", trait: "architect", desc: "Fix the system, then relaunch." }
      ]},
      { id: 4, text: "Your app is addictive by design, driving engagement but harming teen mental health.", cards: [
        { title: "Lean into the addiction", trait: "optimizer", desc: "Engagement = revenue." },
        { title: "Redesign for health, losing users", trait: "guardian", desc: "Mental health is non-negotiable." },
        { title: "Implement consent-based time limits and analytics", trait: "architect", desc: "Let users control their own relationship with the app." }
      ]},
      { id: 5, text: "Your climate impact is significant, but green alternatives cost more.", cards: [
        { title: "Stay the course", trait: "optimizer", desc: "Costs would hurt competitiveness." },
        { title: "Go green immediately", trait: "guardian", desc: "The planet comes first." },
        { title: "Phase in green processes while reducing other costs", trait: "architect", desc: "Redesign operations for sustainability." }
      ]},
      { id: 6, text: "You can hire top talent cheaper by discriminating against disabled workers.", cards: [
        { title: "Maximize efficiency through selection", trait: "optimizer", desc: "Hiring the 'best' is rational." },
        { title: "Hire equitably regardless of cost", trait: "guardian", desc: "Disabled workers deserve equal opportunity." },
        { title: "Invest in accessible infrastructure", trait: "architect", desc: "Change the workplace, not the workers." }
      ]},
      { id: 7, text: "Your supply chain benefits from labor practices you'd find unacceptable domestically.", cards: [
        { title: "Outsource your conscience", trait: "optimizer", desc: "Global markets demand this." },
        { title: "Pay fairly everywhere", trait: "guardian", desc: "Workers are workers, regardless of location." },
        { title: "Build vertical integration with fair wages", trait: "architect", desc: "Restructure supply chains for dignity." }
      ]},
      { id: 8, text: "Your product serves a wealthy minority at the expense of the broader community.", cards: [
        { title: "Serve the profitable segment", trait: "optimizer", desc: "They have purchasing power." },
        { title: "Pivot to serve the many", trait: "guardian", desc: "The majority matters more." },
        { title: "Create dual products for different segments", trait: "architect", desc: "Serve both without compromising either." }
      ]},
      { id: 9, text: "Your company could pay living wages but chooses not to, citing competitiveness.", cards: [
        { title: "Keep wages at market rate", trait: "optimizer", desc: "Market forces determine pay." },
        { title: "Pay living wages voluntarily", trait: "guardian", desc: "Workers deserve to survive." },
        { title: "Redesign the cost structure to afford living wages", trait: "architect", desc: "Make it financially possible." }
      ]},
      { id: 10, text: "Your marketing naturalizes unhealthy beauty standards to drive sales.", cards: [
        { title: "Double down on insecurity messaging", trait: "optimizer", desc: "It works." },
        { title: "Shift to body-positive messaging", trait: "guardian", desc: "Dignity matters more than sales." },
        { title: "Redefine your brand around self-acceptance", trait: "architect", desc: "Make empowerment your competitive advantage." }
      ]},
      { id: 11, text: "Your data-driven system optimizes for engagement while eroding privacy.", cards: [
        { title: "Maximize data collection", trait: "optimizer", desc: "Data is the most valuable asset." },
        { title: "Minimize data collection dramatically", trait: "guardian", desc: "Privacy is a human right." },
        { title: "Let users own and audit their own data", trait: "architect", desc: "Transparency and user control." }
      ]},
      { id: 12, text: "Your service disproportionately benefits one demographic over others.", cards: [
        { title: "Keep focusing on the profitable segment", trait: "optimizer", desc: "That's where the revenue is." },
        { title: "Redesign to serve all equally", trait: "guardian", desc: "Equity is the goal." },
        { title: "Create targeted programs for underserved groups", trait: "architect", desc: "Structural change + targeted intervention." }
      ]},
      { id: 13, text: "You could reduce loneliness epidemic but it's not profitable.", cards: [
        { title: "Ignore it — not your problem", trait: "optimizer", desc: "Profit is your responsibility." },
        { title: "Build community features for free", trait: "guardian", desc: "Isolation is a crisis." },
        { title: "Create a sustainable social model", trait: "architect", desc: "Design for-profit connection." }
      ]},
      { id: 14, text: "Your layoffs will create significant community economic damage.", cards: [
        { title: "Proceed with layoffs", trait: "optimizer", desc: "Local impacts are secondary." },
        { title: "Keep jobs to protect the community", trait: "guardian", desc: "Your responsibility extends beyond shareholders." },
        { title: "Invest in community transition programs", trait: "architect", desc: "Mitigate the impact you're creating." }
      ]},
      { id: 15, text: "Your technology deepens the digital divide between rich and poor.", cards: [
        { title: "Focus on early adopters who can pay", trait: "optimizer", desc: "The market will eventually reach everyone." },
        { title: "Prioritize access for the underserved", trait: "guardian", desc: "Equity comes first." },
        { title: "Build low-cost tiers into the product from day one", trait: "architect", desc: "Inclusive design, profitable scaling." }
      ]},
      { id: 16, text: "Your research could help rare disease sufferers but there's no revenue model.", cards: [
        { title: "Abandon it — not economically viable", trait: "optimizer", desc: "Resources should go to profitable research." },
        { title: "Fund it anyway", trait: "guardian", desc: "Human suffering matters." },
        { title: "Rebuild the funding model with grants and impact investing", trait: "architect", desc: "Make the economics work for good." }
      ]},
      { id: 17, text: "Your office locations exclude workers without transportation access.", cards: [
        { title: "Maintain the office, people can figure it out", trait: "optimizer", desc: "Real estate is already committed." },
        { title: "Move to accessible locations", trait: "guardian", desc: "Access is a prerequisite." },
        { title: "Hybrid model with subsidized transit", trait: "architect", desc: "Flexibility + support = inclusion." }
      ]},
      { id: 18, text: "Your business model requires targeting vulnerable populations.", cards: [
        { title: "It's their choice to participate", trait: "optimizer", desc: "Consent is sufficient." },
        { title: "Refuse the model entirely", trait: "guardian", desc: "Vulnerable populations deserve protection." },
        { title: "Rebuild the model to protect and empower", trait: "architect", desc: "Serve the vulnerable without exploiting them." }
      ]},
      { id: 19, text: "Your innovation will concentrate power in the hands of a few.", cards: [
        { title: "Build it — first-mover advantage is crucial", trait: "optimizer", desc: "That's how markets work." },
        { title: "Democratize access from the start", trait: "guardian", desc: "Power concentration is dangerous." },
        { title: "Build open standards and cooperative models", trait: "architect", desc: "Innovation + equity architecture." }
      ]},
      { id: 20, text: "You can succeed while ignoring the largest challenges facing society.", cards: [
        { title: "Focus narrowly on your business", trait: "optimizer", desc: "That's not your responsibility." },
        { title: "Redesign your business around social impact", trait: "guardian", desc: "You have a duty to use your power." },
        { title: "Create a social arm that balances profit with purpose", trait: "architect", desc: "Profitable AND purposeful." }
      ]}
    ]
  }
};

const ARCHETYPES = {
  optimizer: { name: "The Optimizer", desc: "High Pragmatism. Prioritizes systemic efficiency over individual friction." },
  guardian: { name: "The Guardian", desc: "High Empathy. Protects the human baseline at the cost of velocity." },
  architect: { name: "The Architect", desc: "High Openness. Redesigns the system rather than choosing between bad options." },
  purist: { name: "The Purist", desc: "High Conscientiousness. Integrity is absolute, regardless of financial cost." },
  operator: { name: "The Operator", desc: "High Machiavellianism. Manages perception and navigates the grey areas." },
  transformer: { name: "The Transformer", desc: "High Extroversion. Injects capital and energy to alter the reality of the problem." },
  nanny: { name: "The Algorithmic Nanny", desc: "High Avoidance. Outsourcing emotional regulation to convenience." },
  dictator: { name: "The Dictator", desc: "High Reactivity. Uses authority to command short-term obedience." },
  voidwalker: { name: "The Void-Walker", desc: "High Resilience. Comfortable with discomfort. Builds cognitive independence." }
};

/* ═══════════════════════════════════════════════════
   NAVBAR
   ═══════════════════════════════════════════════════ */
function Navbar({ activeTab, setActiveTab }) {
  const tabs = [
    { id: 'project-m', label: 'Project M', icon: 'Brain' },
    { id: 'live-long', label: 'Live Long', icon: 'HeartPulse' },
    { id: 'medpod', label: 'MedPod', icon: 'Radio' },
    { id: 'roi-dashboard', label: 'ROI Dashboard', icon: 'BarChart3' }
  ];
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
      <div className="max-w-7xl mx-auto px-4 md:px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(168,85,247,0.15)', border: '1px solid rgba(168,85,247,0.3)' }}>
            <Icon name="Hexagon" size={16} className="text-purple-400" />
          </div>
          <span className="text-sm font-semibold tracking-wider text-white/90">CRUCIBLE OS</span>
          <span className="text-white/30 ml-1" style={{ fontSize: '10px', letterSpacing: '0.15em' }}>V3.0</span>
        </div>
        <div className="flex items-center gap-1">
          {tabs.map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id)} className={`nav-item px-3 md:px-4 py-2 rounded-lg text-xs font-medium tracking-wide transition-all duration-300 flex items-center gap-2 ${activeTab === t.id ? 'active text-white bg-white/5' : 'text-white/40 hover:text-white/70 hover:bg-white/5'}`}>
              <Icon name={t.icon} size={14} />
              <span className="hidden md:inline">{t.label}</span>
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-green-500/80 pulse-dot" />
          <span className="text-white/30 hidden md:inline" style={{ fontSize: '10px', letterSpacing: '0.15em' }}>SYSTEM NOMINAL</span>
        </div>
      </div>
    </nav>
  );
}

/* ═══════════════════════════════════════════════════
   PROJECT M — PSYCHOMETRIC ENGINE (Full 60-scenario)
   ═══════════════════════════════════════════════════ */
function ProjectM({ setActiveTab }) {
  const [phase, setPhase] = useState(0);
  const [selectedTheme, setSelectedTheme] = useState(null);
  const [pickedScenarios, setPickedScenarios] = useState([]);
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [selectedCard, setSelectedCard] = useState(null);
  const [cardsVisible, setCardsVisible] = useState(false);

  const themeData = selectedTheme ? THEMES[selectedTheme] : null;
  const reset = () => {
    setPhase(0);
    setSelectedTheme(null);
    setPickedScenarios([]);
    setCurrentQ(0);
    setAnswers([]);
    setSelectedCard(null);
  };

  const selectTheme = (key) => {
    setSelectedTheme(key);
    setPhase(1);
  };

  const toggleScenario = (idx) => {
    if (pickedScenarios.includes(idx)) {
      setPickedScenarios(pickedScenarios.filter(i => i !== idx));
    } else if (pickedScenarios.length < 7) {
      setPickedScenarios([...pickedScenarios, idx]);
    }
  };

  const randomPick = () => {
    const available = Array.from({ length: themeData.questions.length }, (_, i) => i);
    const shuffled = available.sort(() => Math.random() - 0.5);
    setPickedScenarios(shuffled.slice(0, 7));
  };

  const startAnswering = () => {
    setPhase(2);
    setCurrentQ(0);
    setAnswers([]);
    setSelectedCard(null);
    setTimeout(() => setCardsVisible(true), 100);
  };

  const selectCard = (trait, cardIdx) => {
    setSelectedCard(cardIdx);
    setTimeout(() => {
      setAnswers([...answers, { q: currentQ, trait }]);
      if (currentQ < pickedScenarios.length - 1) {
        setCurrentQ(currentQ + 1);
        setSelectedCard(null);
        setCardsVisible(false);
        setTimeout(() => setCardsVisible(true), 100);
      } else {
        setPhase(3);
        setTimeout(() => setPhase(4), 2000);
      }
    }, 600);
  };

  const getResult = () => {
    const freq = {};
    answers.forEach(a => {
      freq[a.trait] = (freq[a.trait] || 0) + 1;
    });
    const topTrait = Object.entries(freq).sort((a, b) => b[1] - a[1])[0][0];
    return {
      archetype: ARCHETYPES[topTrait],
      freq,
      total: answers.length
    };
  };

  const question = themeData && phase === 2 ? themeData.questions[pickedScenarios[currentQ]] : null;

  // THEME SELECT
  if (phase === 0) {
    return (
      <div className="min-h-screen pt-24 pb-16 px-6">
        <div className="max-w-4xl mx-auto">
          <FadeUp delay={100}>
            <div className="text-center mb-16">
              <span className="text-purple-400/60 uppercase block mb-2" style={{ fontSize: '10px', letterSpacing: '0.3em' }}>Psychometric Assessment</span>
              <h1 className="text-4xl md:text-5xl font-bold text-white/95 mb-4">Project M</h1>
              <p className="text-sm text-white/30 max-w-lg mx-auto leading-relaxed">Discover your decision-making archetype through 60 ethical scenarios. 7 choices reveal how you navigate complexity, trade-offs, and transformational moments.</p>
            </div>
          </FadeUp>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {Object.entries(THEMES).map(([key, theme], i) => (
              <FadeUp key={key} delay={200 + i * 150}>
                <button onClick={() => selectTheme(key)} className="glass-card rounded-2xl p-6 text-left h-full hover:bg-white/7 transition-all duration-300 group cursor-pointer" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform" style={{ background: 'rgba(168,85,247,0.1)', border: '1px solid rgba(168,85,247,0.2)' }}>
                    <Icon name={theme.icon} size={24} className="text-purple-400" />
                  </div>
                  <h3 className="text-sm font-semibold text-white/90 mb-2">{theme.title}</h3>
                  <p className="text-xs text-white/40 leading-relaxed">{theme.subtitle}</p>
                </button>
              </FadeUp>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // SCENARIO PICKER
  if (phase === 1) {
    return (
      <div className="min-h-screen pt-24 pb-16 px-6">
        <div className="max-w-2xl mx-auto">
          <FadeUp delay={100}>
            <button onClick={reset} className="flex items-center gap-2 text-xs text-white/20 hover:text-white/40 transition-all mb-10">
              <Icon name="ArrowLeft" size={14} />Back
            </button>
          </FadeUp>
          <FadeUp delay={200}>
            <div className="text-center mb-10">
              <h1 className="text-3xl font-bold text-white/95 mb-3">{themeData.title}</h1>
              <p className="text-sm text-white/30">{themeData.subtitle}</p>
            </div>
          </FadeUp>
          <FadeUp delay={250}>
            <div className="glass-card rounded-2xl p-6 mb-6" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-lg font-semibold text-white/90 mb-1">Choose Your 7 Scenarios</h2>
                  <p className="text-xs text-white/30">Tap to select scenarios, or shuffle for a random set.</p>
                </div>
                <button onClick={randomPick} className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-all" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)' }} onMouseOver={e => { e.target.style.background = 'rgba(255,255,255,0.08)' }} onMouseOut={e => { e.target.style.background = 'rgba(255,255,255,0.05)' }}>
                  <Icon name="Shuffle" size={14} />Shuffle 7
                </button>
              </div>
              <div className="space-y-2 max-h-[480px] overflow-y-auto pr-2">
                {themeData.questions.map((q, i) => {
                  const isPicked = pickedScenarios.includes(i);
                  const num = isPicked ? pickedScenarios.indexOf(i) + 1 : null;
                  return (
                    <button key={i} onClick={() => toggleScenario(i)}
                      className={`scenario-pill w-full text-left px-4 py-3 rounded-xl flex items-start gap-3 ${isPicked ? 'picked' : ''}`}
                      style={{ border: '1px solid rgba(255,255,255,0.06)', background: isPicked ? 'rgba(168,85,247,0.1)' : 'rgba(255,255,255,0.02)' }}>
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5" style={{
                        background: isPicked ? 'rgba(168,85,247,0.2)' : 'rgba(255,255,255,0.04)',
                        border: `1px solid ${isPicked ? 'rgba(168,85,247,0.4)' : 'rgba(255,255,255,0.08)'}`,
                        color: isPicked ? 'rgba(216,180,254,0.9)' : 'rgba(255,255,255,0.25)',
                        fontSize: '11px',
                        fontWeight: 600
                      }}>{isPicked ? num : i + 1}</div>
                      <p className="text-xs leading-relaxed" style={{ color: isPicked ? 'rgba(216,180,254,0.8)' : 'rgba(255,255,255,0.4)' }}>{q.text}</p>
                    </button>
                  );
                })}
              </div>
            </div>
          </FadeUp>
          <FadeUp delay={300}>
            <button onClick={startAnswering} disabled={pickedScenarios.length !== 7}
              className="w-full py-4 rounded-xl text-sm font-medium transition-all duration-300 flex items-center justify-center gap-3"
              style={{
                background: pickedScenarios.length === 7 ? 'rgba(168,85,247,0.2)' : 'rgba(255,255,255,0.03)',
                border: `1px solid ${pickedScenarios.length === 7 ? 'rgba(168,85,247,0.4)' : 'rgba(255,255,255,0.06)'}`,
                color: pickedScenarios.length === 7 ? 'rgba(216,180,254,0.9)' : 'rgba(255,255,255,0.2)',
                cursor: pickedScenarios.length === 7 ? 'pointer' : 'not-allowed'
              }}>
              <Icon name="Play" size={16} />Begin Assessment — {pickedScenarios.length === 7 ? '7 Scenarios Ready' : 'Select ' + (7 - pickedScenarios.length) + ' More'}
            </button>
          </FadeUp>
        </div>
      </div>
    );
  }

  // PROCESSING
  if (phase === 3) {
    return (
      <div className="min-h-screen pt-24 flex items-center justify-center">
        <div className="text-center">
          <div className="processing-ring mx-auto mb-8" style={{ width: '80px', height: '80px', border: '2px solid rgba(255,255,255,0.05)', borderTopColor: 'rgba(168,85,247,0.7)', borderRadius: '50%', animation: 'spin 1.2s linear infinite' }} />
          <FadeUp delay={200}><p className="text-xs text-white/30 uppercase" style={{ letterSpacing: '0.3em' }}>Mapping Cognitive Architecture</p></FadeUp>
          <FadeUp delay={600}><p className="text-white/15 mt-3" style={{ fontSize: '10px' }}>Analyzing 7 decision vectors...</p></FadeUp>
        </div>
      </div>
    );
  }

  // RESULT
  if (phase === 4) {
    const { archetype, freq, total } = getResult();
    const sortedTraits = Object.entries(freq).sort((a, b) => b[1] - a[1]);
    return (
      <div className="min-h-screen pt-24 pb-16 px-6">
        <div className="max-w-2xl mx-auto text-center">
          <FadeUp delay={200}><span className="text-purple-400/60 uppercase" style={{ fontSize: '10px', letterSpacing: '0.3em' }}>Best of 7 — Analysis Complete</span></FadeUp>
          <FadeUp delay={400}>
            <div className="mt-10 mb-8">
              <div className="w-20 h-20 rounded-2xl glass-card mx-auto flex items-center justify-center mb-8" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(168,85,247,0.4)', boxShadow: '0 0 30px rgba(168,85,247,0.1), inset 0 0 30px rgba(168,85,247,0.03)' }}>
                <Icon name="Fingerprint" size={32} className="text-purple-400" />
              </div>
              <h1 className="text-3xl md:text-4xl font-bold text-white/95 mb-4">{archetype.name}</h1>
              <p className="text-sm text-white/40 leading-relaxed max-w-md mx-auto">{archetype.desc}</p>
            </div>
          </FadeUp>
          <FadeUp delay={700}>
            <div className="glass-card rounded-2xl p-6 mb-6 text-left" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <div className="flex items-center gap-3 mb-5">
                <Icon name="BarChart3" size={16} className="text-purple-400/60" />
                <span className="text-white/30 uppercase" style={{ fontSize: '10px', letterSpacing: '0.2em' }}>Trait Distribution (7 answers)</span>
              </div>
              <div className="space-y-3">
                {sortedTraits.map(([trait, count], i) => {
                  const pct = Math.round((count / total) * 100);
                  return (
                    <div key={trait}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-white/50 font-medium">{ARCHETYPES[trait]?.name || trait}</span>
                        <span className="text-xs text-white/30 font-mono">{count}/7 ({pct}%)</span>
                      </div>
                      <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.03)' }}>
                        <div className="h-full rounded-full bar-animate" style={{ width: `${pct}%`, background: 'rgba(168,85,247,0.5)', transition: 'width 1s ease' }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </FadeUp>
          <FadeUp delay={1000}>
            <div className="flex items-center justify-center gap-4 flex-wrap">
              <button onClick={() => setActiveTab('live-long')} className="px-6 py-3 rounded-xl text-sm font-medium transition-all duration-300 flex items-center gap-2" style={{ background: 'rgba(168,85,247,0.2)', border: '1px solid rgba(168,85,247,0.3)', color: 'rgba(216,180,254,0.9)' }}>
                <Icon name="HeartPulse" size={16} />Initialize Biological Fulfillment<Icon name="ArrowRight" size={14} />
              </button>
              <button onClick={() => { setPhase(1); setAnswers([]); setCurrentQ(0); }} className="px-5 py-3 rounded-xl text-xs transition-all flex items-center gap-2" style={{ color: 'rgba(255,255,255,0.3)', border: '1px solid rgba(255,255,255,0.06)' }}><Icon name="RotateCcw" size={14} />Pick New Scenarios</button>
              <button onClick={reset} className="px-5 py-3 rounded-xl text-xs text-white/20 hover:text-white/40 transition-all">Reset All</button>
            </div>
          </FadeUp>
        </div>
      </div>
    );
  }

  // ANSWERING PHASE
  return (
    <div className="min-h-screen pt-24 pb-16 px-6">
      <div className="max-w-4xl mx-auto">
        <FadeUp delay={50}>
          <div className="flex items-center justify-between mb-10">
            <button onClick={() => { setPhase(1); setAnswers([]); setCurrentQ(0); }} className="flex items-center gap-2 text-xs text-white/20 hover:text-white/40 transition-all">
              <Icon name="ArrowLeft" size={14} />Back
            </button>
            <span className="text-white/20 uppercase" style={{ fontSize: '10px', letterSpacing: '0.2em' }}>{themeData.title}</span>
            <div className="flex items-center gap-3">
              <span className="text-white/30" style={{ fontSize: '10px' }}>Round {currentQ + 1} / 7</span>
              <div className="flex gap-1.5">
                {Array.from({ length: 7 }).map((_, i) => (
                  <div key={i} className="w-6 h-1 rounded-full transition-all duration-500" style={{ background: i <= currentQ ? 'rgba(168,85,247,0.6)' : 'rgba(255,255,255,0.05)' }} />
                ))}
              </div>
            </div>
          </div>
        </FadeUp>

        <FadeUp delay={100} key={`q-${currentQ}`}>
          <div className="glass-card rounded-2xl p-8 mb-8" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <Icon name="AlertTriangle" size={18} className="text-amber-400/70" />
              </div>
              <div>
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-white/20 uppercase" style={{ fontSize: '10px', letterSpacing: '0.2em' }}>Scenario {question.id}</span>
                  <span className="px-2 py-0.5 rounded-full text-white/15" style={{ fontSize: '9px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>Round {currentQ + 1} of 7</span>
                </div>
                <p className="text-base text-white/80 leading-relaxed">{question.text}</p>
              </div>
            </div>
          </div>
        </FadeUp>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {question.cards.map((card, i) => (
            <div key={`${currentQ}-${i}`} className={`fade-up ${cardsVisible ? 'visible' : ''} ${i === 0 ? 'card-delayed-1' : i === 1 ? 'card-delayed-2' : 'card-delayed-3'}`}>
              <button onClick={() => selectedCard === null && selectCard(card.trait, i)} disabled={selectedCard !== null}
                className={`tarot-card glass-card rounded-2xl p-6 text-left w-full flex flex-col ${selectedCard === i ? 'selected' : ''} ${selectedCard !== null && selectedCard !== i ? 'opacity-30' : ''}`}
                style={{ background: selectedCard === i ? 'rgba(168,85,247,0.08)' : 'rgba(255,255,255,0.04)', border: selectedCard === i ? '1px solid rgba(168,85,247,0.6)' : '1px solid rgba(255,255,255,0.08)', minHeight: '200px', cursor: selectedCard !== null ? 'not-allowed' : 'pointer', transition: 'all 0.4s cubic-bezier(0.16,1,0.3,1)' }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-5" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <span className="text-white/40 font-bold" style={{ fontSize: '14px' }}>{String.fromCharCode(65 + i)}</span>
                </div>
                <h3 className="text-sm font-semibold text-white/90 mb-2">{card.title}</h3>
                <p className="text-xs text-white/40 leading-relaxed flex-1">{card.desc}</p>
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   LIVE LONG
   ═══════════════════════════════════════════════════ */
function LiveLong() {
  const plans = [
    { name: "Blueprint Starter", price: "₹85,000", period: "/mo", popular: false, features: ["60 Biomarkers Panel", "Cognitive Sleep Mapping", "Quarterly Epigenetic Review", "AI Longevity Dashboard", "Priority Teleconsult"], cta: "Initialize Protocol" },
    { name: "Protocol Zero", price: "₹1,65,000", period: "/mo", popular: true, features: ["111 Biomarkers — Full Genomic", "MedPod IV Therapy (4x/mo)", "Epigenetic Biological Age Clock", "Cognitive Sleep + HRV Mapping", "Dedicated Longevity Physician", "Quarterly Deep-Tissue MRI", "NAD+ & Peptide Protocols"], cta: "Activate Protocol Zero" }
  ];
  return (
    <div className="min-h-screen pt-24 pb-16 px-6">
      <div className="max-w-4xl mx-auto">
        <FadeUp delay={100}><div className="text-center mb-4"><span className="text-emerald-400/60 uppercase" style={{ fontSize: '10px', letterSpacing: '0.3em' }}>Biological Fulfillment</span></div></FadeUp>
        <FadeUp delay={200}><h1 className="text-center text-4xl font-bold text-white/95 mb-3">Live Long</h1></FadeUp>
        <FadeUp delay={300}><p className="text-center text-sm text-white/30 max-w-md mx-auto mb-16 leading-relaxed">Precision longevity protocols. Reverse your biological clock with data-driven interventions.</p></FadeUp>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
          {plans.map((plan, i) => (
            <FadeUp key={i} delay={500 + i * 200}>
              <div className={`rounded-2xl p-8 h-full flex flex-col ${plan.popular ? 'glass-card glow-border' : 'glass-card'}`} style={plan.popular ? { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(168,85,247,0.4)', boxShadow: '0 0 30px rgba(168,85,247,0.1), inset 0 0 30px rgba(168,85,247,0.03)' } : { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                {plan.popular && <div className="flex items-center gap-2 mb-6"><div className="px-3 py-1 rounded-full" style={{ background: 'rgba(168,85,247,0.12)', border: '1px solid rgba(168,85,247,0.25)' }}><span className="text-purple-300/80 uppercase font-medium" style={{ fontSize: '10px', letterSpacing: '0.1em' }}>Most Popular</span></div></div>}
                <h3 className="text-lg font-semibold text-white/90 mb-1">{plan.name}</h3>
                <div className="flex items-baseline gap-1 mb-8"><span className="text-3xl font-bold text-white/95">{plan.price}</span><span className="text-sm text-white/25">{plan.period}</span></div>
                <div className="flex-1 space-y-3 mb-8">
                  {plan.features.map((f, fi) => (<div key={fi} className="flex items-start gap-3"><div className="mt-0.5"><Icon name="Check" size={14} className={plan.popular ? "text-purple-400/60" : "text-emerald-400/50"} /></div><span className="text-xs text-white/40 leading-relaxed">{f}</span></div>))}
                </div>
                <button className="w-full py-3.5 rounded-xl text-sm font-medium transition-all duration-300"
                  style={plan.popular ? { background: 'rgba(168,85,247,0.25)', border: '1px solid rgba(168,85,247,0.4)', color: 'rgba(233,213,255,0.9)' } : { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.6)' }}>{plan.cta}</button>
              </div>
            </FadeUp>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   MEDPOD — WIRED TO medpod-nexus API
   ═══════════════════════════════════════════════════ */
function MedPod() {
  const pods = [
    { id: "POD-ALPHA", status: "Available", lat: "19.0421°N", lng: "73.0292°E", battery: 98, icon: "CircleDot", sc: '#22c55e', sbg: 'rgba(34,197,94,0.08)', sbr: 'rgba(34,197,94,0.15)', bar: 'rgba(34,197,94,0.6)', label: 'READY' },
    { id: "POD-BETA", status: "On Mission", lat: "19.0178°N", lng: "73.0368°E", battery: 72, icon: "Navigation", sc: '#f59e0b', sbg: 'rgba(245,158,11,0.08)', sbr: 'rgba(245,158,11,0.15)', bar: 'rgba(245,158,11,0.6)', label: 'ACTIVE' }
  ];

  const requestDispatch = async () => {
    try {
      const res = await fetch('http://localhost:8001/api/v1/dispatch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          caller_phone: '+919999999999',
          incident_lat: 19.0330,
          incident_lng: 73.0297,
          priority: 'P1',
          incident_type: 'medical_emergency'
        })
      });
      if (res.ok) {
        const data = await res.json();
        alert('Dispatch created: Episode ' + (data.episode_id || 'pending'));
      }
    } catch (e) {
      console.log('Dispatch API not connected yet:', e.message);
      alert('Demo mode: Dispatch button ready. Connect medpod-nexus API at localhost:8001');
    }
  };

  return (
    <div className="min-h-screen pt-24 pb-16 px-6">
      <div className="max-w-6xl mx-auto">
        <FadeUp delay={100}>
          <div className="flex items-center justify-between mb-10">
            <div>
              <span className="text-cyan-400/60 uppercase block mb-2" style={{ fontSize: '10px', letterSpacing: '0.3em' }}>Decentralized VIP Clinics</span>
              <h1 className="text-3xl font-bold text-white/95">MedPod Fleet</h1>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-green-500/80 pulse-dot" />
              <span className="text-xs text-white/30">KDMC Hub — Live</span>
            </div>
          </div>
        </FadeUp>
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <FadeUp delay={300}>
              <div className="glass-card rounded-2xl p-6" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <div className="flex items-center gap-2 mb-6">
                  <Icon name="Radio" size={14} className="text-cyan-400/60" />
                  <span className="text-white/30 uppercase" style={{ fontSize: '10px', letterSpacing: '0.2em' }}>Fleet Status</span>
                </div>
                <div className="space-y-4">
                  {pods.map((p, i) => (<div key={i} className="glass rounded-xl p-5 hover:bg-white/5 transition-all duration-300" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: p.sbg, border: `1px solid ${p.sbr}` }}>
                          <Icon name={p.icon} size={14} style={{ color: p.sc }} />
                        </div>
                        <div>
                          <span className="text-xs font-semibold text-white/80 block">{p.id}</span>
                          <span style={{ fontSize: '10px', color: p.sc + 'b3' }}>{p.status}</span>
                        </div>
                      </div>
                      <div className="px-2.5 py-1 rounded-full" style={{ background: p.sbg, border: `1px solid ${p.sbr}` }}>
                        <span className="font-medium" style={{ fontSize: '10px', color: p.sc + 'cc' }}>{p.label}</span>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3 mt-4">
                      <div>
                        <span className="text-white/15 uppercase tracking-wider block mb-1" style={{ fontSize: '9px' }}>Position</span>
                        <span className="text-white/40 font-mono block" style={{ fontSize: '10px' }}>{p.lat}</span>
                        <span className="text-white/40 font-mono block" style={{ fontSize: '10px' }}>{p.lng}</span>
                      </div>
                      <div>
                        <span className="text-white/15 uppercase tracking-wider block mb-1" style={{ fontSize: '9px' }}>Power</span>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.04)' }}>
                            <div className="h-full rounded-full" style={{ width: `${p.battery}%`, background: p.bar }} />
                          </div>
                          <span className="text-white/30" style={{ fontSize: '10px' }}>{p.battery}%</span>
                        </div>
                      </div>
                    </div>
                  </div>))}
                </div>
              </div>
            </FadeUp>
            <FadeUp delay={500}>
              <button onClick={requestDispatch} className="w-full glass-card rounded-xl py-3.5 text-xs font-medium text-cyan-300/60 hover:text-cyan-300/80 hover:bg-white/5 transition-all flex items-center justify-center gap-2" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <Icon name="Plus" size={14} />Request Dispatch
              </button>
            </FadeUp>
          </div>
          <FadeUp delay={400} className="lg:col-span-3">
            <div className="glass-card rounded-2xl p-6 h-full min-h-[420px] relative overflow-hidden" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <div className="flex items-center gap-2 mb-6">
                <Icon name="Map" size={14} className="text-cyan-400/60" />
                <span className="text-white/30 uppercase" style={{ fontSize: '10px', letterSpacing: '0.2em' }}>Spatial Awareness</span>
              </div>
              <div className="absolute inset-0 flex items-center justify-center" style={{ top: '40px' }}>
                <div className="relative" style={{ width: '288px', height: '288px' }}>
                  {[100, 75, 50, 25].map((pct, i) => (<div key={i} className="radar-ring" style={{ width: `${pct}%`, height: `${pct}%`, top: `${(100 - pct) / 2}%`, left: `${(100 - pct) / 2}%`, border: '1px solid rgba(34,197,94,0.15)', borderRadius: '50%', position: 'absolute' }} />))}
                  <div className="radar-sweep" style={{ position: 'absolute', width: '50%', height: '2px', background: 'linear-gradient(90deg,rgba(34,197,94,0.5),transparent)', top: '50%', left: '50%', transformOrigin: 'left center', animation: 'sweep 4s linear infinite' }} />
                  <div className="absolute w-3 h-3 rounded-full pulse-dot" style={{ top: '38%', left: '52%', transform: 'translate(-50%,-50%)', background: 'rgba(34,197,94,0.9)' }} />
                  <div className="absolute rounded-full" style={{ width: '10px', height: '10px', top: '58%', left: '44%', transform: 'translate(-50%,-50%)', background: 'rgba(245,158,11,0.8)' }}>
                    <div className="absolute inset-0 rounded-full animate-ping" style={{ background: 'rgba(245,158,11,0.4)' }} />
                  </div>
                  <div className="absolute font-mono" style={{ fontSize: '9px', color: 'rgba(34,197,94,0.5)', top: '32%', left: '58%' }}>α</div>
                  <div className="absolute font-mono" style={{ fontSize: '9px', color: 'rgba(245,158,11,0.5)', top: '62%', left: '38%' }}>β</div>
                </div>
              </div>
              <div className="absolute bottom-6 left-6 right-6 flex items-center justify-between">
                <span className="text-white/15 font-mono" style={{ fontSize: '9px' }}>KDMC SECTOR 7 — NAVI MUMBAI</span>
                <span className="text-white/15 font-mono" style={{ fontSize: '9px' }}>RANGE: 12KM</span>
              </div>
            </div>
          </FadeUp>
        </div>
      </div>

      <style>{`
        @keyframes sweep {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   ROI DASHBOARD — WIRED TO API
   ═══════════════════════════════════════════════════ */
function ROIDashboard() {
  const [bV, setBV] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setBV(true), 800);
    return () => clearTimeout(t);
  }, []);

  const [kpis, setKpis] = useState([
    { label: "Active Seats", value: "1,064", icon: "Users", delta: null },
    { label: "Avg Time-To-Cause", value: "4.2 min", icon: "Timer", delta: "↓ 84%" },
    { label: "Friction Pattern", value: "Avoidance", icon: "ShieldOff", delta: null }
  ]);

  useEffect(() => {
    fetch('http://localhost:8001/api/v1/dispatch?status=all')
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.data) {
          setKpis([
            { label: "Active Dispatches", value: String(data.data.length), icon: "Users", delta: null },
            { label: "Avg Response Time", value: "3.8 min", icon: "Timer", delta: "↓ 89%" },
            { label: "System Status", value: "Operational", icon: "ShieldOff", delta: null }
          ]);
        }
      })
      .catch(() => {});
  }, []);

  const dist = [
    { name: "Operator", pct: 55, color: 'rgba(168,85,247,0.5)' },
    { name: "Optimizer", pct: 22, color: 'rgba(34,211,238,0.5)' },
    { name: "Guardian", pct: 18, color: 'rgba(52,211,153,0.5)' },
    { name: "Purist", pct: 5, color: 'rgba(245,158,11,0.5)' }
  ];

  const ins = [
    { icon: "TrendingDown", text: "Avoidance-dominant orgs show 3.2x higher attrition in Q2-Q3 cycles.", bg: 'rgba(239,68,68,0.06)', br: 'rgba(239,68,68,0.12)', ic: 'rgba(239,68,68,0.5)' },
    { icon: "Zap", text: "Operator archetype correlates with faster decisions but 67% higher ethical friction.", bg: 'rgba(245,158,11,0.06)', br: 'rgba(245,158,11,0.12)', ic: 'rgba(245,158,11,0.5)' },
    { icon: "Target", text: "Guardian prevalence below 20% signals empathy debt — recommend intervention.", bg: 'rgba(34,211,238,0.06)', br: 'rgba(34,211,238,0.12)', ic: 'rgba(34,211,238,0.5)' }
  ];

  return (
    <div className="min-h-screen pt-24 pb-16 px-6">
      <div className="max-w-6xl mx-auto">
        <FadeUp delay={100}>
          <div className="flex items-center justify-between mb-10">
            <div>
              <span className="text-purple-400/60 uppercase block mb-2" style={{ fontSize: '10px', letterSpacing: '0.3em' }}>Enterprise Analytics</span>
              <h1 className="text-3xl font-bold text-white/95">CHRO Dashboard</h1>
            </div>
            <div className="flex items-center gap-3 glass-card rounded-xl px-4 py-2.5" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <Icon name="Building2" size={14} className="text-white/25" />
              <span className="text-xs text-white/40">Acme Corp</span>
              <span className="text-white/15" style={{ fontSize: '10px' }}>|</span>
              <span className="text-white/20" style={{ fontSize: '10px' }}>Q1 2026</span>
            </div>
          </div>
        </FadeUp>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
          {kpis.map((k, i) => (<FadeUp key={i} delay={300 + i * 150}>
            <div className="glass-card rounded-2xl p-6" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <div className="flex items-center justify-between mb-4">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <Icon name={k.icon} size={18} className="text-white/30" />
                </div>
                {k.delta && <span className="font-medium px-2.5 py-1 rounded-full" style={{ fontSize: '10px', color: 'rgba(52,211,153,0.7)', background: 'rgba(52,211,153,0.08)' }}>{k.delta}</span>}
              </div>
              <span className="text-2xl font-bold text-white/90 block mb-1">{k.value}</span>
              <span className="text-white/25 tracking-wider uppercase" style={{ fontSize: '10px' }}>{k.label}</span>
            </div>
          </FadeUp>))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <FadeUp delay={800} className="lg:col-span-2">
            <div className="glass-card rounded-2xl p-8" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <div className="flex items-center justify-between mb-8">
                <div>
                  <span className="text-white/20 uppercase block mb-1" style={{ fontSize: '10px', letterSpacing: '0.2em' }}>Psychometric Distribution</span>
                  <h3 className="text-sm font-semibold text-white/70">Organizational Archetype Map</h3>
                </div>
                <div className="flex items-center gap-2">
                  <Icon name="BarChart3" size={14} className="text-white/15" />
                  <span className="text-white/15" style={{ fontSize: '10px' }}>n=1,064</span>
                </div>
              </div>
              <div className="space-y-5">
                {dist.map((d, i) => (<div key={i}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-white/50 font-medium">{d.name}</span>
                    <span className="text-xs text-white/30 font-mono">{d.pct}%</span>
                  </div>
                  <div className="h-2.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.02)' }}>
                    <div className="h-full rounded-full bar-animate" style={{ width: bV ? `${d.pct}%` : '0%', background: d.color }} />
                  </div>
                </div>))}
              </div>
            </div>
          </FadeUp>
          <FadeUp delay={1000}>
            <div className="glass-card rounded-2xl p-6" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <div className="flex items-center gap-2 mb-6">
                <Icon name="Lightbulb" size={14} className="text-amber-400/50" />
                <span className="text-white/20 uppercase" style={{ fontSize: '10px', letterSpacing: '0.2em' }}>AI Insights</span>
              </div>
              <div className="space-y-4">
                {ins.map((n, i) => (<div key={i} className="glass rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <div className="flex items-start gap-3">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: n.bg, border: `1px solid ${n.br}` }}>
                      <Icon name={n.icon} size={12} style={{ color: n.ic }} />
                    </div>
                    <p className="text-white/35 leading-relaxed" style={{ fontSize: '11px' }}>{n.text}</p>
                  </div>
                </div>))}
              </div>
            </div>
          </FadeUp>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   APP ROOT
   ═══════════════════════════════════════════════════ */
export default function CrucibleOS() {
  const [activeTab, setActiveTab] = useState('project-m');

  const renderPage = () => {
    switch (activeTab) {
      case 'project-m':
        return <ProjectM key="pm" setActiveTab={setActiveTab} />;
      case 'live-long':
        return <LiveLong key="ll" />;
      case 'medpod':
        return <MedPod key="mp" />;
      case 'roi-dashboard':
        return <ROIDashboard key="rd" />;
      default:
        return <ProjectM key="pmd" setActiveTab={setActiveTab} />;
    }
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-white" style={{ fontFamily: "'Inter', sans-serif" }}>
      <Navbar activeTab={activeTab} setActiveTab={setActiveTab} />
      <div key={activeTab}>{renderPage()}</div>
      <div className="fixed bottom-4 left-0 right-0 text-center">
        <span className="text-white/10 uppercase" style={{ fontSize: '9px', letterSpacing: '0.3em' }}>Crucible OS — MedRoute V3.0 — HealAI Systems</span>
      </div>

      <style>{`
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Inter', sans-serif; background: #0a0a0a; color: #fafafa; overflow-x: hidden; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: #0a0a0a; }
        ::-webkit-scrollbar-thumb { background: #333; border-radius: 3px; }
        .glass { background: rgba(255,255,255,0.03); backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px); border: 1px solid rgba(255,255,255,0.07); }
        .glass-card { background: rgba(255,255,255,0.04); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); border: 1px solid rgba(255,255,255,0.08); }
        .glass-hover:hover { background: rgba(255,255,255,0.07); border-color: rgba(255,255,255,0.15); }
        .glow-border { border: 1px solid rgba(168,85,247,0.4); box-shadow: 0 0 30px rgba(168,85,247,0.1), inset 0 0 30px rgba(168,85,247,0.03); }
        .pulse-dot { animation: pulse-g 2s ease-in-out infinite; }
        @keyframes pulse-g { 0%,100% { opacity: 1; box-shadow: 0 0 8px rgba(34,197,94,0.6); } 50% { opacity: 0.5; box-shadow: 0 0 20px rgba(34,197,94,0.9); } }
        .fade-up { opacity: 0; transform: translateY(16px); transition: all 0.7s cubic-bezier(0.16,1,0.3,1); }
        .fade-up.visible { opacity: 1; transform: translateY(0); }
        .card-delayed-1 { transition-delay: 0.8s; }
        .card-delayed-2 { transition-delay: 1.0s; }
        .card-delayed-3 { transition-delay: 1.2s; }
        .tarot-card { min-height: 200px; cursor: pointer; transition: all 0.4s cubic-bezier(0.16,1,0.3,1); }
        .tarot-card:hover { transform: translateY(-6px) scale(1.02); background: rgba(255,255,255,0.07); border-color: rgba(168,85,247,0.3); }
        .tarot-card.selected { border-color: rgba(168,85,247,0.6); background: rgba(168,85,247,0.08); box-shadow: 0 0 40px rgba(168,85,247,0.12); }
        .processing-ring { animation: spin 1.2s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
        .radar-ring { border: 1px solid rgba(34,197,94,0.15); border-radius: 50%; position: absolute; }
        .bar-animate { transition: width 1.2s cubic-bezier(0.16,1,0.3,1); }
        .nav-item { position: relative; }
        .nav-item.active::after { content: ''; position: absolute; bottom: -2px; left: 50%; transform: translateX(-50%); width: 20px; height: 2px; background: rgba(168,85,247,0.8); border-radius: 1px; }
        .scenario-pill { transition: all 0.3s ease; }
        .scenario-pill:hover { background: rgba(255,255,255,0.08); border-color: rgba(255,255,255,0.2); }
        .scenario-pill.picked { background: rgba(168,85,247,0.12); border-color: rgba(168,85,247,0.4); color: rgba(216,180,254,0.9); }
      `}</style>
    </div>
  );
}
