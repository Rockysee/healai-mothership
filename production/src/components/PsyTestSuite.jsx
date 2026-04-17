"use client";
import { useState, useEffect, useRef, useCallback } from "react";

// ══════════════════════════════════════════════════════════════════════════════
// RESPONSE SCALES
// ══════════════════════════════════════════════════════════════════════════════
const RS = {
  FREQ_4: [
    { v: 0, l: "Not at all" }, { v: 1, l: "Several days" },
    { v: 2, l: "More than half the days" }, { v: 3, l: "Nearly every day" },
  ],
  LIKERT_4: [
    { v: 0, l: "Not at all true" }, { v: 1, l: "Just a little true" },
    { v: 2, l: "Pretty much true" }, { v: 3, l: "Very much true" },
  ],
  SCARED_3: [
    { v: 0, l: "Not true / Hardly ever" }, { v: 1, l: "Somewhat true / Sometimes" },
    { v: 2, l: "Very true / Often true" },
  ],
  NEO_5: [
    { v: 1, l: "Strongly Disagree" }, { v: 2, l: "Disagree" }, { v: 3, l: "Neutral" },
    { v: 4, l: "Agree" }, { v: 5, l: "Strongly Agree" },
  ],
  AGREE_4: [
    { v: 0, l: "Never" }, { v: 1, l: "Sometimes" }, { v: 2, l: "Often" }, { v: 3, l: "Always" },
  ],
  YES_NO: [{ v: 1, l: "Yes / True" }, { v: 0, l: "No / False" }],
  BDI_3: [{ v: 0, l: "Not at all" }, { v: 1, l: "Mildly" }, { v: 2, l: "Moderately" }, { v: 3, l: "Severely" }],
};

// ══════════════════════════════════════════════════════════════════════════════
// TEST BANK
// ══════════════════════════════════════════════════════════════════════════════
const TESTS = [
  // ── GAD-7 ──────────────────────────────────────────────────────────────────
  {
    id: "GAD7", name: "Generalised Anxiety Disorder – 7 Items (GAD-7)",
    shortName: "GAD-7", category: "anxiety", icon: "😰",
    ageGroups: ["adolescent", "adult"], minAge: 12,
    description: "7-item public domain screening tool for Generalised Anxiety Disorder. Validated and widely used in primary care, schools, and telehealth.",
    time: "2–3 min", approvedBy: ["APA", "WHO", "NICE"], isPublicDomain: true,
    instructions: "Over the last 2 weeks, how often have you been bothered by the following problems?",
    raterType: "self", responseScale: "FREQ_4",
    items: [
      { id: "g1", text: "Feeling nervous, anxious, or on edge" },
      { id: "g2", text: "Not being able to stop or control worrying" },
      { id: "g3", text: "Worrying too much about different things" },
      { id: "g4", text: "Trouble relaxing" },
      { id: "g5", text: "Being so restless that it is hard to sit still" },
      { id: "g6", text: "Becoming easily annoyed or irritable" },
      { id: "g7", text: "Feeling afraid as if something awful might happen" },
    ],
    scoring: (r) => {
      const total = sum(r);
      if (total <= 4)  return mk(total, 21, "Minimal Anxiety",         "green",  "Analytical / No Impairment",   "No clinical action. Re-screen in 3 months if concern persists.");
      if (total <= 9)  return mk(total, 21, "Mild Anxiety",            "yellow", "Avoidant (emerging)",          "Watchful waiting. Discuss stress management and lifestyle.");
      if (total <= 14) return mk(total, 21, "Moderate Anxiety",        "orange", "Avoidant — Anxiety-Driven",    "Further assessment indicated. Consider CBT referral.");
      return             mk(total, 21, "Severe Anxiety",               "red",    "Avoidant — Anxiety-Driven",    "Immediate referral. Medication evaluation may be warranted.");
    },
  },

  // ── PHQ-9 ──────────────────────────────────────────────────────────────────
  {
    id: "PHQ9", name: "Patient Health Questionnaire – 9 Items (PHQ-9)",
    shortName: "PHQ-9", category: "depression", icon: "😔",
    ageGroups: ["adolescent", "adult"], minAge: 12,
    description: "Gold-standard 9-item depression screening tool. Directly maps all 9 DSM-5 MDD criteria. Sensitivity 88%, Specificity 88% at cutoff ≥ 10.",
    time: "2–3 min", approvedBy: ["APA", "WHO", "NICE"], isPublicDomain: true,
    instructions: "Over the last 2 weeks, how often have you been bothered by any of the following problems?",
    raterType: "self", responseScale: "FREQ_4",
    criticalItem: { id: "p9", label: "⚠️ Safety Alert", msg: "Any score > 0 on Item 9 requires immediate clinical risk assessment regardless of total score." },
    items: [
      { id: "p1", text: "Little interest or pleasure in doing things" },
      { id: "p2", text: "Feeling down, depressed, or hopeless" },
      { id: "p3", text: "Trouble falling or staying asleep, or sleeping too much" },
      { id: "p4", text: "Feeling tired or having little energy" },
      { id: "p5", text: "Poor appetite or overeating" },
      { id: "p6", text: "Feeling bad about yourself — or that you are a failure, or have let yourself or your family down" },
      { id: "p7", text: "Trouble concentrating on things, such as reading the newspaper or watching television" },
      { id: "p8", text: "Moving or speaking so slowly that other people could have noticed? Or being so fidgety or restless that you have been moving around a lot more than usual" },
      { id: "p9", text: "Thoughts that you would be better off dead, or thoughts of hurting yourself in some way" },
    ],
    scoring: (r) => {
      const total = sum(r); const si = (r["p9"] || 0) > 0;
      let res;
      if (total <= 4)  res = mk(total, 27, "Minimal / None",        "green",  "No Impairment",          "No treatment indicated. Support as needed.");
      else if (total <= 9)  res = mk(total, 27, "Mild Depression",        "yellow", "Avoidant (emerging)",    "Watchful waiting. Follow up in 1 month.");
      else if (total <= 14) res = mk(total, 27, "Moderate Depression",    "orange", "Avoidant — Fatalistic",  "Probable MDD. Initiate treatment planning and therapy referral.");
      else if (total <= 19) res = mk(total, 27, "Moderately Severe MDD",  "red",    "Avoidant — Fatalistic",  "Active MDD. Begin treatment promptly.");
      else                  res = mk(total, 27, "Severe MDD",             "red",    "Avoidant — Fatalistic",  "Urgent psychiatric assessment. Safety planning required.");
      if (si) { res.severity += " ⚠️ SI"; res.color = "red"; res.safetyAlert = true; res.action = "SAFETY ASSESSMENT REQUIRED — Suicidal ideation endorsed on Item 9. Immediate clinical risk evaluation."; }
      return res;
    },
  },

  // ── SCARED ─────────────────────────────────────────────────────────────────
  {
    id: "SCARED", name: "Screen for Child Anxiety Related Disorders (SCARED)",
    shortName: "SCARED", category: "anxiety", icon: "😨",
    ageGroups: ["child", "adolescent"], minAge: 8, maxAge: 18,
    description: "41-item public domain anxiety screener for children and adolescents. Covers Panic Disorder, GAD, Separation Anxiety, Social Anxiety, and School Avoidance.",
    time: "5–10 min", approvedBy: ["APA"], isPublicDomain: true,
    instructions: "Read each phrase and decide how true it is for you. Mark the best answer.",
    raterType: "self", responseScale: "SCARED_3",
    subscaleDef: [
      { id: "panic",  name: "Panic / Somatic",       items: ["sc1","sc6","sc9","sc12","sc15","sc18","sc19","sc22","sc24","sc27","sc30","sc34","sc38"], cutoff: 7 },
      { id: "gad",    name: "Generalised Anxiety",   items: ["sc7","sc14","sc21","sc23","sc28","sc33","sc35","sc37"], cutoff: 9 },
      { id: "sep",    name: "Separation Anxiety",    items: ["sc4","sc8","sc13","sc16","sc25","sc29","sc31"], cutoff: 5 },
      { id: "social", name: "Social Anxiety",        items: ["sc3","sc5","sc10","sc26","sc32","sc39","sc40","sc41"], cutoff: 8 },
      { id: "school", name: "School Avoidance",      items: ["sc11","sc17","sc36"], cutoff: 3 },
    ],
    items: [
      { id:"sc1", text:"When I feel frightened, it is hard to breathe" },
      { id:"sc2", text:"I get headaches when I am at school" },
      { id:"sc3", text:"I don't like to be with people I don't know well" },
      { id:"sc4", text:"I get scared if I sleep away from home" },
      { id:"sc5", text:"I worry about other people liking me" },
      { id:"sc6", text:"When I get frightened, I feel like passing out" },
      { id:"sc7", text:"I am nervous" },
      { id:"sc8", text:"I follow my mother or father wherever they go" },
      { id:"sc9", text:"People tell me that I look nervous" },
      { id:"sc10", text:"I feel nervous with people I don't know well" },
      { id:"sc11", text:"I get stomachaches at school" },
      { id:"sc12", text:"When I get frightened, I feel like I am going crazy" },
      { id:"sc13", text:"I worry about sleeping alone" },
      { id:"sc14", text:"I worry about being as good as other kids" },
      { id:"sc15", text:"When I get frightened, I feel like things are not real" },
      { id:"sc16", text:"I have nightmares about something bad happening to my parents" },
      { id:"sc17", text:"I worry about going to school" },
      { id:"sc18", text:"When I get frightened, my heart beats fast" },
      { id:"sc19", text:"I get shaky" },
      { id:"sc20", text:"I have nightmares about something bad happening to me" },
      { id:"sc21", text:"I worry about things working out for me" },
      { id:"sc22", text:"When I get frightened, I sweat a lot" },
      { id:"sc23", text:"I am a worrier" },
      { id:"sc24", text:"I get really frightened for no reason at all" },
      { id:"sc25", text:"I am afraid to be alone in the house" },
      { id:"sc26", text:"It is hard for me to talk with people I don't know well" },
      { id:"sc27", text:"When I get frightened, I feel like I am choking" },
      { id:"sc28", text:"People tell me that I worry too much" },
      { id:"sc29", text:"I don't like to be away from my family" },
      { id:"sc30", text:"I am afraid of having anxiety or panic attacks" },
      { id:"sc31", text:"I worry that something bad might happen to my parents" },
      { id:"sc32", text:"I feel shy with people I don't know well" },
      { id:"sc33", text:"I worry about what is going to happen in the future" },
      { id:"sc34", text:"When I get frightened, I feel like throwing up" },
      { id:"sc35", text:"I worry about how well I do things" },
      { id:"sc36", text:"I am scared to go to school" },
      { id:"sc37", text:"I worry about things that have already happened" },
      { id:"sc38", text:"When I get frightened, I feel dizzy" },
      { id:"sc39", text:"I feel nervous when I have to do something while others watch me (e.g., read aloud, play a sport)" },
      { id:"sc40", text:"I feel nervous when going to parties or places where there will be people I don't know well" },
      { id:"sc41", text:"I am shy" },
    ],
    scoring: (r, test) => {
      const total = sum(r);
      const subscales = test.subscaleDef.map(s => ({
        ...s, score: s.items.reduce((a, i) => a + (r[i] || 0), 0),
        elevated: s.items.reduce((a, i) => a + (r[i] || 0), 0) >= s.cutoff,
      }));
      const elevated = subscales.filter(s => s.elevated).map(s => s.name).join(", ");
      const anyEl = subscales.some(s => s.elevated);
      const color = total >= 25 ? "red" : anyEl ? "orange" : "green";
      const severity = total >= 25 ? "Screen Positive — Any Anxiety Disorder" : anyEl ? `Subscale Elevated: ${elevated}` : "Within Normal Range";
      const action = total >= 25 ? "Comprehensive anxiety evaluation indicated. Structured diagnostic interview recommended." : anyEl ? "Monitor specific subscale areas. Administer parent form." : "No clinically elevated anxiety. Re-screen as needed.";
      return { total, max: 82, severity, color, action, profile: anyEl ? "Avoidant — Anxiety-Driven" : "No Impairment", subscales };
    },
  },

  // ── Conners-3 ADHD Training ────────────────────────────────────────────────
  {
    id: "CONNERS3", name: "ADHD Rating Scale — Conners-3 Style (Training)",
    shortName: "Conners-3 Style", category: "adhd", icon: "⚡",
    ageGroups: ["child", "adolescent"], minAge: 6, maxAge: 18,
    description: "27-item ADHD screening tool based on Conners-3 subscale structure. Covers Inattention, Hyperactivity/Impulsivity, Executive Function, and Peer Relations. TRAINING EXAMPLES ONLY.",
    time: "8–12 min", approvedBy: ["APA", "NASP"], isPublicDomain: false, isTraining: true,
    instructions: "Using the rating scale below, indicate how often this person has shown each of these behaviours over the past month.",
    raterType: "parent-teacher", responseScale: "LIKERT_4",
    subscaleDef: [
      { id: "inatt",  name: "Inattention",                    items: ["c1","c2","c3","c4","c5","c6","c7","c8","c9","c10"], cutoff: 65 },
      { id: "hyper",  name: "Hyperactivity / Impulsivity",    items: ["c11","c12","c13","c14","c15","c16","c17","c18","c19"], cutoff: 65 },
      { id: "ef",     name: "Executive Function / Learning",  items: ["c20","c21","c22","c23","c24","c25"], cutoff: 65 },
      { id: "peers",  name: "Peer Relations",                 items: ["c26","c27"], cutoff: 65 },
    ],
    items: [
      { id:"c1",  text:"Has difficulty keeping attention on tasks or play activities", sub:"inatt" },
      { id:"c2",  text:"Makes careless mistakes in schoolwork or other activities", sub:"inatt" },
      { id:"c3",  text:"Does not seem to listen when spoken to directly", sub:"inatt" },
      { id:"c4",  text:"Does not follow through on instructions and fails to finish work", sub:"inatt" },
      { id:"c5",  text:"Has difficulty organising tasks and activities", sub:"inatt" },
      { id:"c6",  text:"Avoids or dislikes tasks that require sustained mental effort", sub:"inatt" },
      { id:"c7",  text:"Loses things necessary for tasks (pencils, books, homework)", sub:"inatt" },
      { id:"c8",  text:"Is easily distracted by unrelated sounds or activity", sub:"inatt" },
      { id:"c9",  text:"Is forgetful in daily activities and routines", sub:"inatt" },
      { id:"c10", text:"Loses track of what they are doing mid-task", sub:"inatt" },
      { id:"c11", text:"Fidgets with hands or feet or squirms in seat", sub:"hyper" },
      { id:"c12", text:"Leaves seat in situations where staying seated is expected", sub:"hyper" },
      { id:"c13", text:"Runs or climbs excessively in inappropriate situations", sub:"hyper" },
      { id:"c14", text:"Has difficulty engaging in activities quietly", sub:"hyper" },
      { id:"c15", text:"Is often 'on the go' or acts as if 'driven by a motor'", sub:"hyper" },
      { id:"c16", text:"Talks excessively", sub:"hyper" },
      { id:"c17", text:"Blurts out answers before questions are complete", sub:"hyper" },
      { id:"c18", text:"Has difficulty waiting their turn in games or activities", sub:"hyper" },
      { id:"c19", text:"Interrupts or intrudes on others' conversations or games", sub:"hyper" },
      { id:"c20", text:"Has trouble planning and organising multi-step tasks", sub:"ef" },
      { id:"c21", text:"Has difficulty getting started on tasks even when motivated", sub:"ef" },
      { id:"c22", text:"Struggles to shift between tasks or activities flexibly", sub:"ef" },
      { id:"c23", text:"Does not monitor own work for errors", sub:"ef" },
      { id:"c24", text:"Forgets steps in a sequence after being taught them", sub:"ef" },
      { id:"c25", text:"Struggles to complete homework without step-by-step guidance", sub:"ef" },
      { id:"c26", text:"Has difficulty making and keeping friends", sub:"peers" },
      { id:"c27", text:"Does not understand unwritten social rules or norms", sub:"peers" },
    ],
    scoring: (r, test) => {
      const subscales = test.subscaleDef.map(s => {
        const raw = s.items.reduce((a, i) => a + (r[i] || 0), 0);
        const max = s.items.length * 3;
        const pct = raw / max;
        const tApprox = Math.round(50 + (pct - 0.33) / 0.067);
        const tScore = Math.max(40, Math.min(90, tApprox));
        return { ...s, score: raw, tScore, elevated: tScore >= 65 };
      });
      const anyEl = subscales.some(s => s.elevated);
      const totalRaw = sum(r); const maxRaw = test.items.length * 3;
      const dominant = subscales.find(s => s.elevated);
      const profile = subscales.find(s => s.id === "hyper" && s.elevated) ? "Impulsive" : anyEl ? "Analytical — EF Deficit" : "No Impairment";
      return { total: totalRaw, max: maxRaw, severity: anyEl ? "Clinically Elevated — ADHD Indicators Present" : "Not Elevated", color: anyEl ? "orange" : "green", action: anyEl ? "Multi-modal ADHD evaluation indicated. Obtain data from 2+ informants in 2+ settings." : "No ADHD indicators elevated. Monitor and re-assess if concerns persist.", profile, subscales };
    },
  },

  // ── NEO-PI-3 Big Five Training ─────────────────────────────────────────────
  {
    id: "NEO", name: "Big Five Personality Inventory — NEO-PI-3 Style (Training)",
    shortName: "Big Five", category: "personality", icon: "🧠",
    ageGroups: ["adolescent", "adult"], minAge: 14,
    description: "30-item Big Five personality assessment covering Neuroticism, Extraversion, Openness, Agreeableness, and Conscientiousness (6 items each). TRAINING EXAMPLES ONLY.",
    time: "8–10 min", approvedBy: ["APA", "BPS"], isPublicDomain: false, isTraining: true,
    instructions: "Rate each statement on a 1–5 scale from Strongly Disagree to Strongly Agree based on how accurately it describes you.",
    raterType: "self", responseScale: "NEO_5",
    subscaleDef: [
      { id: "N", name: "Neuroticism",       items: ["n1","n2","n3","n4","n5","n6"],       reverse: [] },
      { id: "E", name: "Extraversion",      items: ["e1","e2","e3","e4","e5","e6"],       reverse: [] },
      { id: "O", name: "Openness",          items: ["o1","o2","o3","o4","o5","o6"],       reverse: [] },
      { id: "A", name: "Agreeableness",     items: ["a1","a2","a3","a4","a5","a6"],       reverse: [] },
      { id: "C", name: "Conscientiousness", items: ["cons1","cons2","cons3","cons4","cons5","cons6"], reverse: [] },
    ],
    items: [
      { id:"n1", text:"I frequently worry about things that might go wrong", sub:"N" },
      { id:"n2", text:"I often feel frustrated and irritated", sub:"N" },
      { id:"n3", text:"I sometimes feel that life is not worth living", sub:"N", isSensitive: true },
      { id:"n4", text:"I feel embarrassed when I make mistakes in front of others", sub:"N" },
      { id:"n5", text:"I often act on impulse without thinking about the consequences", sub:"N" },
      { id:"n6", text:"When under pressure, I feel overwhelmed and helpless", sub:"N" },
      { id:"e1", text:"I genuinely enjoy meeting new people", sub:"E" },
      { id:"e2", text:"I enjoy attending parties and social gatherings", sub:"E" },
      { id:"e3", text:"I am not afraid to speak up and take charge in a group", sub:"E" },
      { id:"e4", text:"I always have plenty of energy for activities", sub:"E" },
      { id:"e5", text:"I enjoy exciting and adventurous activities", sub:"E" },
      { id:"e6", text:"I laugh easily and often feel joyful", sub:"E" },
      { id:"o1", text:"I have a vivid imagination and enjoy daydreaming", sub:"O" },
      { id:"o2", text:"I am moved by beautiful music, art, or poetry", sub:"O" },
      { id:"o3", text:"I pay attention to and value my emotional reactions", sub:"O" },
      { id:"o4", text:"I prefer variety and change to established routines", sub:"O" },
      { id:"o5", text:"I enjoy complex philosophical discussions", sub:"O" },
      { id:"o6", text:"I believe in examining and questioning my own values", sub:"O" },
      { id:"a1", text:"I believe most people are honest and well-intentioned", sub:"A" },
      { id:"a2", text:"I dislike using flattery to get what I want", sub:"A" },
      { id:"a3", text:"I enjoy helping others, even at personal cost", sub:"A" },
      { id:"a4", text:"I prefer to compromise rather than argue", sub:"A" },
      { id:"a5", text:"I don't boast about my accomplishments", sub:"A" },
      { id:"a6", text:"I am sympathetic to people who are less fortunate", sub:"A" },
      { id:"cons1", text:"I feel capable and competent in most situations", sub:"C" },
      { id:"cons2", text:"I keep my belongings neat and well-organised", sub:"C" },
      { id:"cons3", text:"I fulfil my obligations and keep my commitments", sub:"C" },
      { id:"cons4", text:"I work hard to accomplish my goals", sub:"C" },
      { id:"cons5", text:"I can resist temptations and stay focused on tasks", sub:"C" },
      { id:"cons6", text:"I think carefully before making decisions", sub:"C" },
    ],
    scoring: (r, test) => {
      const subscales = test.subscaleDef.map(s => {
        const raw = s.items.reduce((a, i) => a + (r[i] || 3), 0);
        const mean = raw / s.items.length;
        const level = mean >= 4.0 ? "High" : mean <= 2.0 ? "Low" : "Average";
        return { ...s, score: raw, mean: mean.toFixed(1), level };
      });
      const nScore = subscales.find(s=>s.id==="N");
      const cScore = subscales.find(s=>s.id==="C");
      const eScore = subscales.find(s=>s.id==="E");
      const aScore = subscales.find(s=>s.id==="A");
      let profile;
      if (nScore?.level==="High" && cScore?.level==="Low") profile = "Impulsive";
      else if (nScore?.level==="High" && aScore?.level==="High") profile = "Avoidant — Anxiety-Driven";
      else if (aScore?.level==="High" && eScore?.level==="High") profile = "Socially Influenced";
      else if (cScore?.level==="High" && nScore?.level==="Low") profile = "Deliberate / Analytical";
      else profile = "Mixed / Balanced";
      return { total: sum(r), max: 150, severity: "Personality Profile Complete", color: "blue", action: "Review domain scores against high/low descriptors. Use for treatment planning and psychoeducation.", profile, subscales };
    },
  },

  // ── BDI-II Style ───────────────────────────────────────────────────────────
  {
    id: "BDI2", name: "Depression Inventory — BDI-II Style (Training)",
    shortName: "BDI-II Style", category: "depression", icon: "🌧️",
    ageGroups: ["adolescent", "adult"], minAge: 13,
    description: "21-item measure of depressive symptom severity. Training items based on BDI-II criterion structure. TRAINING EXAMPLES ONLY.",
    time: "5–10 min", approvedBy: ["APA", "WHO"], isPublicDomain: false, isTraining: true,
    instructions: "Please read each group of statements and rate how you have been feeling over the past two weeks, including today.",
    raterType: "self", responseScale: "BDI_3",
    items: [
      { id:"b1",  text:"Sadness (feeling sad, empty, or hopeless)" },
      { id:"b2",  text:"Pessimism (feeling discouraged about the future)" },
      { id:"b3",  text:"Past failure (feelings of having failed yourself or others)" },
      { id:"b4",  text:"Loss of pleasure (inability to get pleasure from activities)" },
      { id:"b5",  text:"Guilty feelings (feeling particularly guilty about things)" },
      { id:"b6",  text:"Punishment feelings (feeling that you are being punished)" },
      { id:"b7",  text:"Self-dislike (feeling disappointed in yourself)" },
      { id:"b8",  text:"Self-criticalness (criticising or blaming yourself for everything)" },
      { id:"b9",  text:"Suicidal thoughts or wishes", isSensitive: true },
      { id:"b10", text:"Crying (crying more than you used to)" },
      { id:"b11", text:"Agitation (feeling more restless or wound up than usual)" },
      { id:"b12", text:"Loss of interest (feeling less interested in other people or things)" },
      { id:"b13", text:"Indecisiveness (difficulty making decisions)" },
      { id:"b14", text:"Worthlessness (feeling very worthless or having no value)" },
      { id:"b15", text:"Loss of energy (having less energy than usual)" },
      { id:"b16", text:"Changes in sleeping pattern (sleeping noticeably more or less)" },
      { id:"b17", text:"Irritability (being more irritable or annoyed than usual)" },
      { id:"b18", text:"Changes in appetite (appetite noticeably greater or lesser)" },
      { id:"b19", text:"Concentration difficulty (difficulty concentrating on things)" },
      { id:"b20", text:"Tiredness or fatigue (getting tired or fatigued more easily)" },
      { id:"b21", text:"Loss of interest in sex (less interested in sex than usual)" },
    ],
    scoring: (r) => {
      const total = sum(r); const si = (r["b9"] || 0) > 0;
      let res;
      if (total <= 13)  res = mk(total, 63, "Minimal Depression",    "green",  "No Impairment",          "Normal functioning. No treatment indicated.");
      else if (total <= 19) res = mk(total, 63, "Mild Depression",       "yellow", "Avoidant (emerging)",    "Subclinical. Psychotherapy and lifestyle modification recommended.");
      else if (total <= 28) res = mk(total, 63, "Moderate Depression",   "orange", "Avoidant — Fatalistic",  "Clinical depression likely. Combined therapy + medication evaluation.");
      else                  res = mk(total, 63, "Severe Depression",     "red",    "Avoidant — Fatalistic",  "MDD. Urgent treatment and safety assessment required.");
      if (si) { res.severity += " ⚠️ SI"; res.color = "red"; res.safetyAlert = true; res.action = "SAFETY ASSESSMENT REQUIRED — Suicidal ideation endorsed on Item 9."; }
      return res;
    },
  },

  // ── BAI Style ──────────────────────────────────────────────────────────────
  {
    id: "BAI", name: "Anxiety Inventory — BAI Style (Training)",
    shortName: "BAI Style", category: "anxiety", icon: "💨",
    ageGroups: ["adult"], minAge: 17,
    description: "21-item measure of anxiety symptom severity with somatic focus. Training items based on BAI structure. Discriminates anxiety from depression. TRAINING EXAMPLES ONLY.",
    time: "5–10 min", approvedBy: ["APA"], isPublicDomain: false, isTraining: true,
    instructions: "Below is a list of common symptoms of anxiety. Please carefully read each item. Rate how much you have been bothered by each symptom during the past week.",
    raterType: "self", responseScale: "BDI_3",
    items: [
      { id:"bai1",  text:"Numbness or tingling" }, { id:"bai2", text:"Feeling hot" },
      { id:"bai3",  text:"Wobbliness in legs" }, { id:"bai4", text:"Unable to relax" },
      { id:"bai5",  text:"Fear of worst happening" }, { id:"bai6", text:"Dizzy or lightheaded" },
      { id:"bai7",  text:"Heart pounding or racing" }, { id:"bai8", text:"Unsteady" },
      { id:"bai9",  text:"Terrified or afraid" }, { id:"bai10", text:"Nervous" },
      { id:"bai11", text:"Feeling of choking" }, { id:"bai12", text:"Hands trembling" },
      { id:"bai13", text:"Shaky / unsteady" }, { id:"bai14", text:"Fear of losing control" },
      { id:"bai15", text:"Difficulty breathing" }, { id:"bai16", text:"Fear of dying" },
      { id:"bai17", text:"Scared" }, { id:"bai18", text:"Indigestion" },
      { id:"bai19", text:"Faint / lightheaded" }, { id:"bai20", text:"Face flushed" },
      { id:"bai21", text:"Hot / cold sweats" },
    ],
    scoring: (r) => {
      const total = sum(r);
      if (total <= 7)  return mk(total, 63, "Minimal Anxiety", "green",  "Analytical / No Impairment",  "Normal anxiety. No clinical action.");
      if (total <= 15) return mk(total, 63, "Mild Anxiety",    "yellow", "Avoidant (emerging)",         "Mild somatic anxiety. Stress management recommended.");
      if (total <= 25) return mk(total, 63, "Moderate Anxiety","orange", "Avoidant — Anxiety-Driven",   "Moderate somatic anxiety. Further assessment indicated.");
      return             mk(total, 63, "Severe Anxiety",       "red",    "Avoidant — Anxiety-Driven",   "Severe anxiety. Referral for treatment; medication evaluation.");
    },
  },

  // ── CDI-2 Style Child Depression ──────────────────────────────────────────
  {
    id: "CDI2", name: "Child Depression Inventory — CDI-2 Style (Training)",
    shortName: "CDI-2 Style", category: "depression", icon: "🌑",
    ageGroups: ["child", "adolescent"], minAge: 7, maxAge: 17,
    description: "20-item child and adolescent depression screening tool. Training items based on CDI-2 subscale structure. TRAINING EXAMPLES ONLY.",
    time: "10–15 min", approvedBy: ["APA"], isPublicDomain: false, isTraining: true,
    instructions: "For each group of sentences below, pick the ONE sentence that best describes you for the past two weeks.",
    raterType: "self", responseScale: "BDI_3",
    subscaleDef: [
      { id: "emot", name: "Emotional Problems",   items: ["cd1","cd2","cd3","cd4","cd5","cd6","cd7","cd8","cd9","cd10"], cutoffT: 65 },
      { id: "func", name: "Functional Problems",  items: ["cd11","cd12","cd13","cd14","cd15","cd16","cd17","cd18","cd19","cd20"], cutoffT: 65 },
    ],
    items: [
      { id:"cd1",  text:"Feeling sad or unhappy (0=never, 1=sometimes, 2=often, 3=always)", sub:"emot" },
      { id:"cd2",  text:"Nothing good will happen for me in the future", sub:"emot" },
      { id:"cd3",  text:"I do most things wrong (feeling like a failure)", sub:"emot" },
      { id:"cd4",  text:"Most things bother me or make me unhappy", sub:"emot" },
      { id:"cd5",  text:"I always feel like crying", sub:"emot" },
      { id:"cd6",  text:"I have trouble falling asleep sometimes", sub:"emot" },
      { id:"cd7",  text:"I feel tired a lot", sub:"emot" },
      { id:"cd8",  text:"I do not feel hungry", sub:"emot" },
      { id:"cd9",  text:"I think about hurting myself", sub:"emot", isSensitive: true },
      { id:"cd10", text:"I am sad a lot of the time", sub:"emot" },
      { id:"cd11", text:"I don't do as well at school as I used to", sub:"func" },
      { id:"cd12", text:"I have trouble making up my mind about things", sub:"func" },
      { id:"cd13", text:"I don't have any friends", sub:"func" },
      { id:"cd14", text:"Other kids don't like me", sub:"func" },
      { id:"cd15", text:"I cannot do anything right", sub:"func" },
      { id:"cd16", text:"I am bad at games and sports", sub:"func" },
      { id:"cd17", text:"I hate myself", sub:"func" },
      { id:"cd18", text:"Nobody really loves me", sub:"func" },
      { id:"cd19", text:"I never have fun at school", sub:"func" },
      { id:"cd20", text:"I have trouble doing things with other kids", sub:"func" },
    ],
    scoring: (r, test) => {
      const total = sum(r); const si = (r["cd9"] || 0) > 0;
      const subscales = test.subscaleDef.map(s => ({ ...s, score: s.items.reduce((a,i) => a+(r[i]||0), 0), elevated: s.items.reduce((a,i) => a+(r[i]||0), 0) >= 13 }));
      let res;
      if (total <= 12) res = mk(total, 60, "No Significant Depression",  "green",  "No Impairment",          "Within normal range. Monitor and support.");
      else if (total <= 19) res = mk(total, 60, "Mild Depression",            "yellow", "Avoidant (emerging)",    "Subclinical depressive symptoms. Watchful waiting.");
      else if (total <= 29) res = mk(total, 60, "Moderate Depression",        "orange", "Avoidant — Fatalistic",  "Significant depressive symptoms. Therapy referral indicated.");
      else                  res = mk(total, 60, "Severe Depression",          "red",    "Avoidant — Fatalistic",  "Severe depression. Immediate evaluation required.");
      res.subscales = subscales;
      if (si) { res.severity += " ⚠️ SI"; res.color = "red"; res.safetyAlert = true; res.action = "SAFETY ASSESSMENT REQUIRED — Child endorsed self-harm item."; }
      return res;
    },
  },

  // ── BRIEF-2 EF Training ───────────────────────────────────────────────────
  {
    id: "BRIEF2", name: "Executive Function Rating — BRIEF-2 Style (Training)",
    shortName: "BRIEF-2 Style", category: "executive", icon: "🎯",
    ageGroups: ["child", "adolescent"], minAge: 5, maxAge: 18,
    description: "18-item executive function rating scale covering Behavioural Regulation, Emotion Regulation, and Cognitive Regulation. Training items based on BRIEF-2 structure. TRAINING EXAMPLES ONLY.",
    time: "8–10 min", approvedBy: ["APA", "NASP"], isPublicDomain: false, isTraining: true,
    instructions: "Using the rating scale, indicate how often this child has shown each of these behaviours over the past month.",
    raterType: "parent-teacher", responseScale: "LIKERT_4",
    subscaleDef: [
      { id: "bri", name: "Behavioural Regulation Index (BRI)", items: ["br1","br2","br3","br4","br5","br6"], cutoffT: 65 },
      { id: "eri", name: "Emotion Regulation Index (ERI)",     items: ["er1","er2","er3","er4","er5","er6"], cutoffT: 65 },
      { id: "cri", name: "Cognitive Regulation Index (CRI)",   items: ["cr1","cr2","cr3","cr4","cr5","cr6"], cutoffT: 65 },
    ],
    items: [
      { id:"br1", text:"Acts without thinking", sub:"bri" },
      { id:"br2", text:"Does not notice when behaviour bothers others", sub:"bri" },
      { id:"br3", text:"Says things without thinking first", sub:"bri" },
      { id:"br4", text:"Interrupts others", sub:"bri" },
      { id:"br5", text:"Has trouble controlling behaviour when upset", sub:"bri" },
      { id:"br6", text:"Needs to be reminded to stop an activity", sub:"bri" },
      { id:"er1", text:"Has explosive emotional outbursts for minor reasons", sub:"eri" },
      { id:"er2", text:"Mood changes frequently and suddenly", sub:"eri" },
      { id:"er3", text:"Has trouble moving from one activity to another", sub:"eri" },
      { id:"er4", text:"Becomes upset with transitions or changes in plan", sub:"eri" },
      { id:"er5", text:"Has trouble controlling emotions", sub:"eri" },
      { id:"er6", text:"Becomes overwhelmed by even minor tasks", sub:"eri" },
      { id:"cr1", text:"Has trouble starting tasks even when willing to do them", sub:"cri" },
      { id:"cr2", text:"Forgets what they were doing during a task", sub:"cri" },
      { id:"cr3", text:"Has difficulty planning tasks with multiple steps", sub:"cri" },
      { id:"cr4", text:"Does not check their work for mistakes", sub:"cri" },
      { id:"cr5", text:"Has difficulty keeping their work area tidy", sub:"cri" },
      { id:"cr6", text:"Needs prompting to keep tasks on track", sub:"cri" },
    ],
    scoring: (r, test) => {
      const subscales = test.subscaleDef.map(s => {
        const raw = s.items.reduce((a,i) => a+(r[i]||0), 0);
        const max = s.items.length * 3; const pct = raw / max;
        const tApprox = Math.round(50 + (pct - 0.25) / 0.083);
        const tScore = Math.max(40, Math.min(90, tApprox));
        return { ...s, score: raw, tScore, elevated: tScore >= 65 };
      });
      const gec = sum(r); const gecMax = test.items.length * 3;
      const gecPct = gec / gecMax;
      const gecT = Math.round(50 + (gecPct - 0.25) / 0.083);
      const anyEl = subscales.some(s => s.elevated);
      const dominantEl = subscales.filter(s=>s.elevated).map(s=>s.name.split("(")[0].trim());
      return { total: gec, max: gecMax, severity: anyEl ? `EF Impairment — ${dominantEl.join(", ")} Elevated` : "Within Normal Limits", color: anyEl ? "orange" : "green", action: anyEl ? "Executive function impairment indicated. Comprehensive neuropsychological evaluation recommended." : "Executive function within normal limits. No action indicated.", profile: subscales.find(s=>s.id==="bri"&&s.elevated) ? "Impulsive" : subscales.find(s=>s.id==="cri"&&s.elevated) ? "Rigid — EF Deficit" : "No Impairment", subscales };
    },
  },

  // ── MMPI-3 Training ────────────────────────────────────────────────────────
  {
    id: "MMPI3", name: "Psychopathology Screening — MMPI-3 Style (Training)",
    shortName: "MMPI-3 Style", category: "personality", icon: "🔬",
    ageGroups: ["adult"], minAge: 18,
    description: "24-item training instrument illustrating MMPI-3 Higher-Order scale constructs (EID, THD, BXD). TRAINING EXAMPLES ONLY — NOT actual MMPI-3 items.",
    time: "5–8 min", approvedBy: ["APA"], isPublicDomain: false, isTraining: true,
    instructions: "Read each statement and decide if it is TRUE or FALSE as it applies to you.",
    raterType: "self", responseScale: "YES_NO",
    subscaleDef: [
      { id: "eid", name: "Emotional / Internalising Dysfunction (EID)", items: ["m1","m2","m3","m4","m5","m6","m7","m8"], cutoff: 4 },
      { id: "thd", name: "Thought Dysfunction (THD)",                   items: ["m9","m10","m11","m12","m13"], cutoff: 3 },
      { id: "bxd", name: "Behavioural / Externalising Dysfunction (BXD)",items: ["m14","m15","m16","m17","m18","m19","m20","m21"], cutoff: 4 },
      { id: "soc", name: "Somatic / Cognitive (SC)",                    items: ["m22","m23","m24"], cutoff: 2 },
    ],
    items: [
      { id:"m1",  text:"I often feel miserable without knowing why", sub:"eid" },
      { id:"m2",  text:"Most days I feel empty inside", sub:"eid" },
      { id:"m3",  text:"I rarely feel happy about anything", sub:"eid" },
      { id:"m4",  text:"I do not enjoy activities I used to look forward to", sub:"eid" },
      { id:"m5",  text:"I worry constantly about my health", sub:"eid" },
      { id:"m6",  text:"I often feel that things are hopeless", sub:"eid" },
      { id:"m7",  text:"It is hard for me to make decisions", sub:"eid" },
      { id:"m8",  text:"I feel tense or keyed up most of the time", sub:"eid" },
      { id:"m9",  text:"I sometimes feel that others are trying to harm me", sub:"thd" },
      { id:"m10", text:"I have had experiences that others would find difficult to believe", sub:"thd" },
      { id:"m11", text:"I often feel that I am being watched or followed", sub:"thd" },
      { id:"m12", text:"My thoughts sometimes feel like they are not my own", sub:"thd" },
      { id:"m13", text:"I sometimes hear things others cannot hear", sub:"thd" },
      { id:"m14", text:"I often act on impulse without thinking first", sub:"bxd" },
      { id:"m15", text:"I have gotten into trouble with the law more than once", sub:"bxd" },
      { id:"m16", text:"I enjoy taking risks that others avoid", sub:"bxd" },
      { id:"m17", text:"I have used alcohol or drugs to cope with problems", sub:"bxd" },
      { id:"m18", text:"I often lose my temper quickly", sub:"bxd" },
      { id:"m19", text:"Rules are meant to be broken if they get in your way", sub:"bxd" },
      { id:"m20", text:"I find it hard to wait for things I want", sub:"bxd" },
      { id:"m21", text:"I do not feel guilty when I hurt others' feelings", sub:"bxd" },
      { id:"m22", text:"I often feel physically unwell even when doctors find nothing wrong", sub:"soc" },
      { id:"m23", text:"I have difficulty remembering things I once knew well", sub:"soc" },
      { id:"m24", text:"I frequently have physical complaints such as headaches or stomachaches", sub:"soc" },
    ],
    scoring: (r, test) => {
      const subscales = test.subscaleDef.map(s => ({ ...s, score: s.items.reduce((a,i) => a+(r[i]||0), 0), elevated: s.items.reduce((a,i) => a+(r[i]||0), 0) >= s.cutoff }));
      const anyEl = subscales.some(s => s.elevated);
      const eid = subscales.find(s=>s.id==="eid");
      const bxd = subscales.find(s=>s.id==="bxd");
      const thd = subscales.find(s=>s.id==="thd");
      let profile = "No Impairment";
      if (bxd?.elevated) profile = "Impulsive";
      else if (eid?.elevated) profile = "Avoidant — Anxiety-Driven";
      else if (thd?.elevated) profile = "Rigid — Thought Disorder";
      const total = sum(r);
      return { total, max: 24, severity: anyEl ? "Elevated — Clinical Evaluation Indicated" : "No Significant Elevation", color: anyEl ? "red" : "green", action: anyEl ? "Clinical evaluation with full MMPI-3 (335 items) recommended. These are training items only." : "No significant psychopathology screening indicators elevated.", profile, subscales };
    },
  },
];

// ══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ══════════════════════════════════════════════════════════════════════════════
const sum = (r) => Object.values(r).reduce((a, b) => a + (b || 0), 0);
const mk = (total, max, severity, color, profile, action) => ({ total, max, severity, color, profile, action, subscales: [], safetyAlert: false });
const pct = (score, max) => Math.round((score / max) * 100);

const COLOR_MAP = {
  green: { bg: "#dcfce7", text: "#15803d", border: "#86efac", bar: "#22c55e" },
  yellow:{ bg: "#fef9c3", text: "#854d0e", border: "#fde047", bar: "#eab308" },
  orange:{ bg: "#ffedd5", text: "#c2410c", border: "#fb923c", bar: "#f97316" },
  red:   { bg: "#fee2e2", text: "#b91c1c", border: "#fca5a5", bar: "#ef4444" },
  blue:  { bg: "#dbeafe", text: "#1d4ed8", border: "#93c5fd", bar: "#3b82f6" },
};

const CAT_COLORS = {
  anxiety:     { bg: "#dbeafe", text: "#1e40af", icon: "bg-blue-100" },
  depression:  { bg: "#ede9fe", text: "#6d28d9", icon: "bg-purple-100" },
  adhd:        { bg: "#fef3c7", text: "#b45309", icon: "bg-yellow-100" },
  personality: { bg: "#f0fdf4", text: "#166534", icon: "bg-green-100" },
  executive:   { bg: "#fdf4ff", text: "#7e22ce", icon: "bg-fuchsia-100" },
};

const DECISION_PROFILES = {
  "Impulsive": {
    icon: "⚡", color: "#b45309", bg: "#fef3c7",
    description: "Acts on immediate reward without considering long-term consequences. Poor delay of gratification. Emotional state strongly colours decisions.",
    tests: "Conners-3 H/I ≥71, MMPI-3 BXD elevated, BRIEF-2 BRI elevated",
    intervention: "DBT impulse control skills, CBT cognitive restructuring, Contingency management",
  },
  "Avoidant — Anxiety-Driven": {
    icon: "🛡️", color: "#1d4ed8", bg: "#dbeafe",
    description: "Avoids decisions carrying perceived risk. Analysis paralysis. Catastrophises outcomes. Seeks excessive reassurance before committing.",
    tests: "GAD-7 ≥15, SCARED total ≥25, BAI Severe, MMPI-3 EID elevated",
    intervention: "Exposure-based CBT, ACT — Acceptance of uncertainty, Graduated decision hierarchy",
  },
  "Avoidant — Fatalistic": {
    icon: "🌧️", color: "#7e22ce", bg: "#ede9fe",
    description: "Pessimistic future orientation. Anhedonia impairs reward-based decisions. Indecisiveness. Fatigue reduces deliberative capacity.",
    tests: "PHQ-9 ≥15, BDI-II ≥20, MMPI-3 EID/RCd elevated",
    intervention: "CBT + Behavioural Activation, Medication (SSRIs), Safety planning if SI present",
  },
  "Deliberate / Analytical": {
    icon: "🧮", color: "#166534", bg: "#f0fdf4",
    description: "Systematically weighs pros and cons. High tolerance for ambiguity. Comfortable with complex multi-variable decisions.",
    tests: "NEO-PI-3 High C+O, BAI Minimal, EQ-i High Reality Testing",
    intervention: "Strength-based. Add emotional weighting in interpersonal decisions. Time-boxing strategy.",
  },
  "Socially Influenced": {
    icon: "👥", color: "#0f766e", bg: "#f0fdfa",
    description: "Decisions heavily weighted by group norms and approval-seeking. Difficulty asserting preferences when they conflict with others.",
    tests: "NEO-PI-3 High A+E, MMPI-3 Low independence, EQ-i Low Independence",
    intervention: "Assertiveness training, Values clarification, Identity development work",
  },
  "Rigid — EF Deficit": {
    icon: "🔒", color: "#6b7280", bg: "#f9fafb",
    description: "Adheres strictly to established rules. Difficulty adapting to change. Highly resistant to updating decision framework with new data.",
    tests: "ADOS-2 High RRB, BRIEF-2 Shift elevated, D-KEFS poor switching",
    intervention: "Cognitive flexibility training, ACT, Graduated exposure to change, Rule-based decision supports",
  },
  "Rigid — Thought Disorder": {
    icon: "🔬", color: "#991b1b", bg: "#fee2e2",
    description: "Reality-distorted, idiosyncratic decisions driven by potentially delusional thinking or unusual perceptions.",
    tests: "MMPI-3 THD elevated, PAI SCZ elevated",
    intervention: "Psychiatric referral required. Antipsychotic evaluation. CBTp.",
  },
  "No Impairment": {
    icon: "✅", color: "#15803d", bg: "#dcfce7",
    description: "No significant decision-making impairment indicated. Adaptive, flexible decision-making capacity.",
    tests: "All measures within normal limits",
    intervention: "No intervention indicated. Strengths-based support.",
  },
  "Mixed / Balanced": {
    icon: "⚖️", color: "#1d4ed8", bg: "#dbeafe",
    description: "Balanced personality profile. Decisions shaped by a mix of factors; no single dominant style.",
    tests: "NEO-PI-3 mixed profile",
    intervention: "Psychoeducation about personal decision style. Leverage strengths.",
  },
};

// ══════════════════════════════════════════════════════════════════════════════
// DIGIT SPAN INTERACTIVE TASK
// ══════════════════════════════════════════════════════════════════════════════
const DS_SEQUENCES = {
  forward: [
    ["2","6"],["6","3"],["5","8","2"],["6","9","4"],
    ["3","7","2","1"],["6","1","5","8"],["4","6","8","3","1"],["3","8","2","9","6"],
    ["7","2","5","1","4","9"],["8","3","6","2","7","1"],
  ],
  backward: [
    ["2","9"],["6","3"],["5","2","8"],["3","9","4"],
    ["7","1","4","3"],["2","8","5","9"],["4","7","3","1","5"],["6","2","9","4","8"],
    ["1","8","3","7","2","6"],["5","9","4","6","1","8"],
  ],
};

// ══════════════════════════════════════════════════════════════════════════════
// SUB-COMPONENTS
// ══════════════════════════════════════════════════════════════════════════════
function ProgressBar({ value, max, color = "#2E75B6" }) {
  const p = Math.min(100, Math.round((value / max) * 100));
  return (
    <div style={{ background: "#e5e7eb", borderRadius: 8, height: 8, overflow: "hidden" }}>
      <div style={{ width: `${p}%`, background: color, height: "100%", borderRadius: 8, transition: "width 0.4s ease" }} />
    </div>
  );
}

function Badge({ text, color = "green" }) {
  const c = COLOR_MAP[color] || COLOR_MAP.green;
  return (
    <span style={{ background: c.bg, color: c.text, border: `1px solid ${c.border}`, padding: "2px 10px", borderRadius: 20, fontSize: 12, fontWeight: 700 }}>
      {text}
    </span>
  );
}

function ScoreMeter({ score, max, color = "green" }) {
  const c = COLOR_MAP[color] || COLOR_MAP.green;
  const p = Math.min(100, Math.round((score / max) * 100));
  return (
    <div style={{ textAlign: "center" }}>
      <div style={{ position: "relative", width: 100, height: 100, margin: "0 auto" }}>
        <svg viewBox="0 0 36 36" style={{ width: 100, height: 100, transform: "rotate(-90deg)" }}>
          <circle cx="18" cy="18" r="15.9" fill="none" stroke="#e5e7eb" strokeWidth="3" />
          <circle cx="18" cy="18" r="15.9" fill="none" stroke={c.bar} strokeWidth="3"
            strokeDasharray={`${p} ${100 - p}`} strokeLinecap="round" />
        </svg>
        <div style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column" }}>
          <div style={{ fontSize: 20, fontWeight: 800, color: c.text }}>{score}</div>
          <div style={{ fontSize: 10, color: "#6b7280" }}>/{max}</div>
        </div>
      </div>
    </div>
  );
}

function SafetyBanner({ message }) {
  return (
    <div style={{ background: "#fee2e2", border: "2px solid #ef4444", borderRadius: 10, padding: "16px 20px", marginBottom: 16, display: "flex", gap: 12, alignItems: "flex-start" }}>
      <span style={{ fontSize: 24 }}>🚨</span>
      <div>
        <div style={{ fontWeight: 700, color: "#b91c1c", fontSize: 15, marginBottom: 4 }}>SAFETY ALERT</div>
        <div style={{ color: "#7f1d1d", fontSize: 14, lineHeight: 1.5 }}>{message}</div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// DIGIT SPAN VIEW
// ══════════════════════════════════════════════════════════════════════════════
function DigitSpanView({ onComplete }) {
  const [phase, setPhase] = useState("intro"); // intro | showing | responding | scoring | done
  const [mode, setMode] = useState("forward");
  const [trialIdx, setTrialIdx] = useState(0);
  const [digitIdx, setDigitIdx] = useState(-1);
  const [input, setInput] = useState("");
  const [scores, setScores] = useState({ forward: [], backward: [] });
  const [feedback, setFeedback] = useState(null);
  const timerRef = useRef(null);

  const seqs = DS_SEQUENCES[mode];
  const currentSeq = seqs[trialIdx] || [];

  const startShowing = useCallback(() => {
    setPhase("showing"); setDigitIdx(0);
  }, []);

  useEffect(() => {
    if (phase !== "showing") return;
    if (digitIdx < currentSeq.length) {
      timerRef.current = setTimeout(() => setDigitIdx(d => d + 1), 1200);
    } else {
      timerRef.current = setTimeout(() => { setPhase("responding"); setInput(""); }, 500);
    }
    return () => clearTimeout(timerRef.current);
  }, [phase, digitIdx, currentSeq]);

  const submitAnswer = () => {
    const expected = mode === "backward" ? [...currentSeq].reverse().join("") : currentSeq.join("");
    const correct = input.replace(/\s/g, "") === expected;
    setFeedback({ correct, expected, got: input.trim() });
    const newScores = { ...scores, [mode]: [...scores[mode], correct ? 1 : 0] };
    setScores(newScores);
    setTimeout(() => {
      setFeedback(null);
      const nextTrial = trialIdx + 1;
      if (nextTrial >= seqs.length) {
        if (mode === "forward") { setMode("backward"); setTrialIdx(0); setPhase("intro"); }
        else { setPhase("done"); onComplete && onComplete(newScores); }
      } else { setTrialIdx(nextTrial); setPhase("ready"); }
    }, 1800);
    setPhase("feedback");
  };

  const fTotal = scores.forward.reduce((a,b)=>a+b,0);
  const bTotal = scores.backward.reduce((a,b)=>a+b,0);
  const total = fTotal + bTotal;
  const interp = total >= 18 ? { lv: "Superior", c: "green" } : total >= 14 ? { lv: "Average", c: "green" } : total >= 10 ? { lv: "Low Average", c: "yellow" } : total >= 7 ? { lv: "Below Average", c: "orange" } : { lv: "Significant Deficit", c: "red" };

  return (
    <div style={{ maxWidth: 600, margin: "0 auto", padding: 16 }}>
      <div style={{ background: "#1F3864", borderRadius: 12, padding: "20px 24px", marginBottom: 20, color: "white" }}>
        <div style={{ fontSize: 18, fontWeight: 700 }}>🔢 Digit Span — Working Memory Task</div>
        <div style={{ fontSize: 13, color: "#93c5fd", marginTop: 4 }}>WISC-V / WAIS-IV Style · Cognitive Task</div>
      </div>

      {phase === "intro" && (
        <div style={{ background: "white", borderRadius: 12, padding: 24, boxShadow: "0 1px 6px rgba(0,0,0,.08)" }}>
          <div style={{ fontWeight: 700, fontSize: 17, marginBottom: 12 }}>
            {mode === "forward" ? "Part 1: Digit Span Forward" : "Part 2: Digit Span Backward"}
          </div>
          <div style={{ background: "#f0f9ff", border: "1px solid #bae6fd", borderRadius: 8, padding: 16, marginBottom: 16, fontSize: 14 }}>
            {mode === "forward"
              ? "You will see digits one at a time on screen. After the last digit disappears, type them back in the SAME ORDER."
              : "You will see digits one at a time. After the last digit, type them back in REVERSE ORDER. E.g., if you see 3 – 7, type 7 3."}
          </div>
          {mode === "backward" && <div style={{ marginBottom: 12 }}>
            <Badge text={`Forward Score: ${fTotal}/${seqs.length}`} color="green" />
          </div>}
          <button onClick={() => { setTrialIdx(0); setPhase("ready"); }}
            style={{ background: "#2E75B6", color: "white", border: "none", borderRadius: 8, padding: "12px 24px", fontSize: 15, fontWeight: 600, cursor: "pointer", width: "100%" }}>
            Start {mode === "forward" ? "Forward" : "Backward"} Trials →
          </button>
        </div>
      )}

      {phase === "ready" && (
        <div style={{ background: "white", borderRadius: 12, padding: 24, textAlign: "center", boxShadow: "0 1px 6px rgba(0,0,0,.08)" }}>
          <div style={{ color: "#6b7280", marginBottom: 8 }}>Trial {trialIdx + 1} of {seqs.length} · {currentSeq.length} digits</div>
          <div style={{ fontSize: 15, marginBottom: 20 }}>{mode === "forward" ? "Watch and remember the digits in order." : "Watch and remember, then type them in REVERSE."}</div>
          <button onClick={startShowing}
            style={{ background: "#1F3864", color: "white", border: "none", borderRadius: 8, padding: "12px 32px", fontSize: 16, fontWeight: 700, cursor: "pointer" }}>
            Show Digits
          </button>
        </div>
      )}

      {phase === "showing" && (
        <div style={{ background: "white", borderRadius: 12, padding: 40, textAlign: "center", boxShadow: "0 1px 6px rgba(0,0,0,.08)" }}>
          <div style={{ fontSize: 80, fontWeight: 900, color: "#1F3864", minHeight: 100, display: "flex", alignItems: "center", justifyContent: "center" }}>
            {digitIdx < currentSeq.length ? currentSeq[digitIdx] : ""}
          </div>
          <div style={{ color: "#9ca3af", fontSize: 13 }}>Digit {digitIdx + 1} of {currentSeq.length}</div>
        </div>
      )}

      {phase === "responding" && (
        <div style={{ background: "white", borderRadius: 12, padding: 24, boxShadow: "0 1px 6px rgba(0,0,0,.08)" }}>
          <div style={{ fontWeight: 600, marginBottom: 16, textAlign: "center" }}>
            {mode === "forward" ? "Type the digits in the SAME order:" : "Type the digits in REVERSE order:"}
          </div>
          <input
            autoFocus type="text" value={input} onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && input.trim() && submitAnswer()}
            placeholder="e.g.  4 7 2 or 472"
            style={{ width: "100%", padding: "14px 16px", fontSize: 22, textAlign: "center", letterSpacing: 8, border: "2px solid #2E75B6", borderRadius: 8, outline: "none", boxSizing: "border-box" }} />
          <button onClick={submitAnswer} disabled={!input.trim()}
            style={{ marginTop: 16, width: "100%", background: input.trim() ? "#2E75B6" : "#e5e7eb", color: input.trim() ? "white" : "#9ca3af", border: "none", borderRadius: 8, padding: "12px 0", fontSize: 16, fontWeight: 700, cursor: input.trim() ? "pointer" : "default" }}>
            Submit Answer
          </button>
        </div>
      )}

      {phase === "feedback" && feedback && (
        <div style={{ background: feedback.correct ? "#dcfce7" : "#fee2e2", borderRadius: 12, padding: 32, textAlign: "center", boxShadow: "0 1px 6px rgba(0,0,0,.08)" }}>
          <div style={{ fontSize: 48 }}>{feedback.correct ? "✅" : "❌"}</div>
          <div style={{ fontSize: 20, fontWeight: 700, marginTop: 8, color: feedback.correct ? "#15803d" : "#b91c1c" }}>
            {feedback.correct ? "Correct!" : "Incorrect"}
          </div>
          {!feedback.correct && <div style={{ marginTop: 8, color: "#374151" }}>Expected: <strong>{feedback.expected}</strong></div>}
        </div>
      )}

      {phase === "done" && (
        <div style={{ background: "white", borderRadius: 12, padding: 24, boxShadow: "0 1px 6px rgba(0,0,0,.08)" }}>
          <div style={{ textAlign: "center", marginBottom: 20 }}>
            <div style={{ fontSize: 48 }}>🎉</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: "#1F3864", marginTop: 8 }}>Task Complete!</div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>
            {[["Forward", fTotal, seqs.length], ["Backward", bTotal, seqs.length], ["Total", total, seqs.length * 2]].map(([lbl, sc, mx]) => (
              <div key={lbl} style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8, padding: "12px 16px", textAlign: "center", gridColumn: lbl === "Total" ? "1/-1" : "auto" }}>
                <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 4 }}>{lbl} Span</div>
                <div style={{ fontSize: 28, fontWeight: 800, color: "#1F3864" }}>{sc}<span style={{ fontSize: 14, color: "#9ca3af" }}>/{mx}</span></div>
              </div>
            ))}
          </div>
          <div style={{ background: COLOR_MAP[interp.c].bg, borderRadius: 8, padding: 12, textAlign: "center", marginBottom: 16 }}>
            <div style={{ fontWeight: 700, color: COLOR_MAP[interp.c].text, fontSize: 16 }}>{interp.lv}</div>
            <div style={{ fontSize: 12, color: "#6b7280", marginTop: 4 }}>Working Memory Classification</div>
          </div>
          <div style={{ fontSize: 13, color: "#374151", background: "#f8fafc", borderRadius: 8, padding: 12, marginBottom: 16 }}>
            {total >= 18 ? "Strong working memory capacity. Well within average or above." : total >= 14 ? "Working memory within normal limits." : total >= 10 ? "Low average working memory. Monitor for learning impact." : total >= 7 ? "Working memory weakness — consider comprehensive cognitive evaluation." : "Significant working memory deficit — formal neuropsychological evaluation recommended."}
          </div>
          <button onClick={() => onComplete && onComplete(scores, { total, max: seqs.length * 2, severity: interp.lv, color: interp.c, profile: total >= 14 ? "Analytical / No Impairment" : "Avoidant — EF Deficit" })}
            style={{ width: "100%", background: "#1F3864", color: "white", border: "none", borderRadius: 8, padding: 14, fontSize: 15, fontWeight: 700, cursor: "pointer" }}>
            Save Results →
          </button>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// MAIN APP
// ══════════════════════════════════════════════════════════════════════════════
export default function PsyTestSuite({ onBack, initialTestId }) {
  const [view, setView] = useState(initialTestId ? "info" : "home"); // home | info | test | ds | results | summary
  const [activeTest, setActiveTest] = useState(null);
  const [responses, setResponses] = useState({});
  const [currentItem, setCurrentItem] = useState(0);
  const [results, setResults] = useState(null);
  const [completedTests, setCompletedTests] = useState({});
  const [ageFilter, setAgeFilter] = useState("all");
  const [catFilter, setCatFilter] = useState("all");
  const [raterType, setRaterType] = useState("self");
  const topRef = useRef(null);

  const scrollTop = () => topRef.current?.scrollIntoView({ behavior: "smooth" });

  // Auto-select a test if initialTestId is provided
  useEffect(() => {
    if (initialTestId && !activeTest) {
      const found = TESTS.find(t => t.id === initialTestId);
      if (found) { setActiveTest(found); setResponses({}); setCurrentItem(0); setView("info"); }
    }
  }, [initialTestId]);

  const handleStart = (test) => { setActiveTest(test); setResponses({}); setCurrentItem(0); setView("info"); scrollTop(); };
  const handleBeginTest = () => { setView(activeTest.id === "DS" ? "ds" : "test"); scrollTop(); };

  const handleResponse = (itemId, value) => {
    setResponses(r => ({ ...r, [itemId]: value }));
    if (currentItem < activeTest.items.length - 1) {
      setTimeout(() => { setCurrentItem(c => c + 1); scrollTop(); }, 280);
    }
  };

  const handleSubmit = () => {
    const res = activeTest.scoring(responses, activeTest);
    setResults(res);
    setCompletedTests(c => ({ ...c, [activeTest.id]: { ...res, testName: activeTest.shortName, category: activeTest.category, icon: activeTest.icon } }));
    setView("results"); scrollTop();
  };

  const handleDSComplete = (dsScores, summary) => {
    if (summary) {
      setCompletedTests(c => ({ ...c, DS: { ...summary, testName: "Digit Span", category: "cognitive", icon: "🔢" } }));
    }
    setView("home"); scrollTop();
  };

  const allItems = activeTest?.items || [];
  const answered = Object.keys(responses).length;
  const canSubmit = answered === allItems.length;
  const scale = activeTest ? RS[activeTest.responseScale] : [];

  const critItem = activeTest?.criticalItem;
  const showSafetyAlert = critItem && responses[critItem.id] > 0;

  const filteredTests = TESTS.filter(t => {
    const ageOk = ageFilter === "all" || t.ageGroups.includes(ageFilter);
    const catOk = catFilter === "all" || t.category === catFilter;
    return ageOk && catOk;
  });

  const completedCount = Object.keys(completedTests).length;
  const dominantProfile = completedCount > 0
    ? Object.values(completedTests).reduce((acc, t) => {
        acc[t.profile] = (acc[t.profile] || 0) + 1; return acc;
      }, {})
    : {};
  const topProfile = Object.entries(dominantProfile).sort((a,b)=>b[1]-a[1])[0]?.[0] || null;

  // ── STYLES ─────────────────────────────────────────────────────────────────
  const NAV_STYLE = { background: "#1F3864", color: "white", padding: "0 20px", display: "flex", alignItems: "center", justifyContent: "space-between", height: 56, position: "sticky", top: 0, zIndex: 50, boxShadow: "0 2px 8px rgba(0,0,0,.2)" };
  const MAIN_STYLE = { minHeight: "calc(100vh - 56px)", background: "#f1f5f9", padding: "20px 16px 60px" };
  const CARD_BASE = { background: "white", borderRadius: 14, boxShadow: "0 1px 6px rgba(0,0,0,.07)", overflow: "hidden" };

  return (
    <div style={{ fontFamily: "'Segoe UI', Arial, sans-serif", fontSize: 14 }} ref={topRef}>
      {/* NAV */}
      <nav style={NAV_STYLE}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }} onClick={() => setView("home")}>
          <span style={{ fontSize: 22 }}>🧠</span>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15, lineHeight: 1 }}>PsyTest Suite</div>
            <div style={{ fontSize: 10, color: "#93c5fd", lineHeight: 1 }}>Clinical Edition 2026</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {completedCount > 0 && (
            <button onClick={() => setView("summary")}
              style={{ background: "#2E75B6", border: "none", color: "white", borderRadius: 6, padding: "5px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
              📊 {completedCount} Result{completedCount !== 1 ? "s" : ""}
            </button>
          )}
          <button onClick={() => setView("home")}
            style={{ background: "rgba(255,255,255,.15)", border: "none", color: "white", borderRadius: 6, padding: "5px 12px", fontSize: 12, cursor: "pointer" }}>
            🏠 Home
          </button>
          {onBack && (
            <button onClick={onBack}
              style={{ background: "rgba(255,255,255,.15)", border: "none", color: "white", borderRadius: 6, padding: "5px 12px", fontSize: 12, cursor: "pointer" }}>
              ← Back
            </button>
          )}
        </div>
      </nav>

      <main style={MAIN_STYLE}>
        {/* ── HOME ─────────────────────────────────────────────────────────── */}
        {view === "home" && (
          <div style={{ maxWidth: 900, margin: "0 auto" }}>
            {/* Hero */}
            <div style={{ ...CARD_BASE, background: "linear-gradient(135deg, #1F3864 0%, #2E75B6 100%)", color: "white", padding: "28px 24px", marginBottom: 20 }}>
              <div style={{ fontSize: 24, fontWeight: 800, marginBottom: 6 }}>Psychological & Psychometric Test Suite</div>
              <div style={{ fontSize: 14, color: "#bfdbfe", marginBottom: 16 }}>Clinical Edition 2026 · Endorsed by APA | WHO | AAP | AERA | ITC | BPS | NASP</div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {["10 Tests","218 Items","Full Scoring","Decision Profiles"].map(l => (
                  <span key={l} style={{ background: "rgba(255,255,255,.15)", borderRadius: 20, padding: "3px 12px", fontSize: 12, fontWeight: 600 }}>{l}</span>
                ))}
              </div>
            </div>

            {/* Disclaimer */}
            <div style={{ background: "#fefce8", border: "1px solid #fde047", borderRadius: 10, padding: "12px 16px", marginBottom: 20, fontSize: 13, color: "#713f12" }}>
              <strong>⚠️ Training & Educational Use Only.</strong> GAD-7, PHQ-9, and SCARED are public domain instruments. All other items are original training examples — not actual copyrighted test content. Administer only under licensed clinical supervision. All results must be interpreted by a qualified professional.
            </div>

            {/* Digit Span shortcut */}
            <div style={{ ...CARD_BASE, padding: "16px 20px", marginBottom: 20, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ fontSize: 32 }}>🔢</span>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 15 }}>Digit Span — Interactive Working Memory Task</div>
                  <div style={{ color: "#6b7280", fontSize: 12 }}>WISC-V / WAIS-IV Style · Forward & Backward · ~5 min</div>
                </div>
              </div>
              <button onClick={() => setView("ds")}
                style={{ background: "#1F3864", color: "white", border: "none", borderRadius: 8, padding: "10px 20px", fontWeight: 700, cursor: "pointer", fontSize: 14 }}>
                Start Task →
              </button>
            </div>

            {/* Filters */}
            <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {[["all","All Ages"],["child","Child (7–12)"],["adolescent","Adolescent (13–17)"],["adult","Adult (18+)"]].map(([v,l]) => (
                  <button key={v} onClick={() => setAgeFilter(v)}
                    style={{ padding: "6px 14px", borderRadius: 20, border: `1.5px solid ${ageFilter===v?"#2E75B6":"#e5e7eb"}`, background: ageFilter===v?"#2E75B6":"white", color: ageFilter===v?"white":"#374151", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                    {l}
                  </button>
                ))}
              </div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {[["all","All"],["anxiety","Anxiety"],["depression","Depression"],["adhd","ADHD"],["personality","Personality"],["executive","Executive Fn"]].map(([v,l]) => (
                  <button key={v} onClick={() => setCatFilter(v)}
                    style={{ padding: "6px 14px", borderRadius: 20, border: `1.5px solid ${catFilter===v?"#1F3864":"#e5e7eb"}`, background: catFilter===v?"#1F3864":"white", color: catFilter===v?"white":"#374151", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                    {l}
                  </button>
                ))}
              </div>
            </div>

            {/* Test Grid */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 14 }}>
              {filteredTests.map(test => {
                const done = completedTests[test.id];
                const catC = CAT_COLORS[test.category] || CAT_COLORS.anxiety;
                return (
                  <div key={test.id} style={{ ...CARD_BASE, cursor: "pointer", transition: "transform .15s, box-shadow .15s", border: done ? "2px solid #86efac" : "2px solid transparent" }}
                    onClick={() => handleStart(test)}
                    onMouseEnter={e => { e.currentTarget.style.transform="translateY(-2px)"; e.currentTarget.style.boxShadow="0 4px 16px rgba(0,0,0,.1)"; }}
                    onMouseLeave={e => { e.currentTarget.style.transform="none"; e.currentTarget.style.boxShadow="0 1px 6px rgba(0,0,0,.07)"; }}>
                    <div style={{ padding: "14px 16px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                        <span style={{ fontSize: 28 }}>{test.icon}</span>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 700, fontSize: 13, lineHeight: 1.3, color: "#1F3864" }}>{test.shortName}</div>
                          <div style={{ fontSize: 11, color: "#6b7280" }}>{test.items.length} items · {test.time}</div>
                        </div>
                        {done && <span style={{ fontSize: 18 }}>✅</span>}
                      </div>
                      <div style={{ fontSize: 12, color: "#374151", marginBottom: 10, lineHeight: 1.5 }}>
                        {test.description.substring(0, 100)}{test.description.length > 100 ? "…" : ""}
                      </div>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                        <span style={{ background: catC.bg, color: catC.text, fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 10 }}>
                          {test.category.toUpperCase()}
                        </span>
                        {test.isPublicDomain && <span style={{ background: "#dcfce7", color: "#15803d", fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 10 }}>Public Domain</span>}
                        {test.isTraining && <span style={{ background: "#f3f4f6", color: "#6b7280", fontSize: 10, padding: "2px 8px", borderRadius: 10 }}>Training Items</span>}
                      </div>
                      {done && (
                        <div style={{ marginTop: 10, padding: "6px 10px", borderRadius: 6, background: COLOR_MAP[done.color]?.bg || "#f0f9ff" }}>
                          <div style={{ fontSize: 11, fontWeight: 700, color: COLOR_MAP[done.color]?.text }}>{done.severity}</div>
                        </div>
                      )}
                    </div>
                    <div style={{ background: "#f8fafc", borderTop: "1px solid #f1f5f9", padding: "8px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div style={{ fontSize: 11, color: "#6b7280" }}>{test.ageGroups.map(a => a.charAt(0).toUpperCase()+a.slice(1)).join(" / ")}</div>
                      <div style={{ fontSize: 11, fontWeight: 600, color: "#2E75B6" }}>{done ? "Retake →" : "Start →"}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── TEST INFO ────────────────────────────────────────────────────── */}
        {view === "info" && activeTest && (
          <div style={{ maxWidth: 680, margin: "0 auto" }}>
            <div style={{ ...CARD_BASE, overflow: "hidden" }}>
              <div style={{ background: "linear-gradient(135deg, #1F3864 0%, #2E75B6 100%)", padding: "24px 24px", color: "white" }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>{activeTest.icon}</div>
                <div style={{ fontSize: 20, fontWeight: 800 }}>{activeTest.name}</div>
                <div style={{ fontSize: 13, color: "#bfdbfe", marginTop: 4 }}>
                  {activeTest.items.length} items · {activeTest.time} · {activeTest.ageGroups.map(a=>a.charAt(0).toUpperCase()+a.slice(1)).join(" / ")}
                </div>
              </div>
              <div style={{ padding: 24 }}>
                <div style={{ marginBottom: 16, lineHeight: 1.7, color: "#374151" }}>{activeTest.description}</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>
                  {[
                    ["Approved By", activeTest.approvedBy.join(", ")],
                    ["Time Required", activeTest.time],
                    ["Age Range", `${activeTest.minAge}+ years`],
                    ["Format", activeTest.raterType === "self" ? "Self-Report" : "Parent / Teacher Rating"],
                    ["Status", activeTest.isPublicDomain ? "✅ Public Domain" : "⚠️ Training Items Only"],
                  ].map(([k,v]) => (
                    <div key={k} style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8, padding: "10px 14px" }}>
                      <div style={{ fontSize: 11, color: "#6b7280", marginBottom: 2 }}>{k}</div>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>{v}</div>
                    </div>
                  ))}
                </div>
                <div style={{ background: "#f0f9ff", border: "1px solid #bae6fd", borderRadius: 8, padding: "12px 16px", marginBottom: 20 }}>
                  <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 4, color: "#0369a1" }}>📋 Instructions</div>
                  <div style={{ fontSize: 14, color: "#374151", lineHeight: 1.6 }}>{activeTest.instructions}</div>
                </div>
                {activeTest.isTraining && (
                  <div style={{ background: "#fefce8", border: "1px solid #fde047", borderRadius: 8, padding: "10px 14px", marginBottom: 20, fontSize: 13, color: "#713f12" }}>
                    ⚠️ <strong>Training Items:</strong> These are original examples illustrating the construct measured — not actual copyrighted test items. For clinical use, obtain the licensed instrument.
                  </div>
                )}
                <div style={{ display: "flex", gap: 12 }}>
                  <button onClick={() => setView("home")}
                    style={{ flex: 1, padding: 14, border: "2px solid #e5e7eb", borderRadius: 8, background: "white", fontSize: 14, fontWeight: 600, cursor: "pointer", color: "#374151" }}>
                    ← Back
                  </button>
                  <button onClick={handleBeginTest}
                    style={{ flex: 2, padding: 14, border: "none", borderRadius: 8, background: "#2E75B6", color: "white", fontSize: 15, fontWeight: 700, cursor: "pointer" }}>
                    Begin Test →
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── TEST ─────────────────────────────────────────────────────────── */}
        {view === "test" && activeTest && (
          <div style={{ maxWidth: 680, margin: "0 auto" }}>
            {/* Header */}
            <div style={{ ...CARD_BASE, padding: "14px 20px", marginBottom: 16, display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ fontSize: 24 }}>{activeTest.icon}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 14 }}>{activeTest.shortName}</div>
                <div style={{ fontSize: 12, color: "#6b7280" }}>Item {currentItem + 1} of {allItems.length}</div>
              </div>
              <div style={{ textAlign: "right", minWidth: 60 }}>
                <div style={{ fontSize: 18, fontWeight: 800, color: "#2E75B6" }}>{answered}</div>
                <div style={{ fontSize: 10, color: "#9ca3af" }}>answered</div>
              </div>
            </div>
            <ProgressBar value={answered} max={allItems.length} color="#2E75B6" />

            {/* Safety alert */}
            {showSafetyAlert && (
              <div style={{ marginTop: 12 }}>
                <SafetyBanner message={critItem.msg} />
              </div>
            )}

            {/* Items – show current + a few ahead */}
            <div style={{ marginTop: 14 }}>
              {allItems.slice(currentItem, currentItem + 1).map((item, relIdx) => {
                const absIdx = currentItem + relIdx;
                const answered_v = responses[item.id];
                return (
                  <div key={item.id} style={{ ...CARD_BASE, padding: 20, marginBottom: 12 }}>
                    <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
                      <div style={{ background: "#1F3864", color: "white", borderRadius: "50%", width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, flexShrink: 0 }}>
                        {absIdx + 1}
                      </div>
                      <div style={{ fontSize: 15, fontWeight: item.isSensitive ? 600 : 500, lineHeight: 1.6, color: "#1F3864" }}>
                        {item.isSensitive && <span style={{ color: "#dc2626", marginRight: 6 }}>⚠️</span>}
                        {item.text}
                      </div>
                    </div>
                    {/* Response options */}
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {scale.map(opt => (
                        <button key={opt.v} onClick={() => handleResponse(item.id, opt.v)}
                          style={{
                            padding: "12px 16px", borderRadius: 8, border: `2px solid ${answered_v === opt.v ? "#2E75B6" : "#e5e7eb"}`,
                            background: answered_v === opt.v ? "#eff6ff" : "white", cursor: "pointer",
                            textAlign: "left", fontSize: 14, fontWeight: answered_v === opt.v ? 700 : 400,
                            color: answered_v === opt.v ? "#1d4ed8" : "#374151", transition: "all .15s",
                            display: "flex", alignItems: "center", gap: 10,
                          }}>
                          <span style={{ width: 20, height: 20, borderRadius: "50%", border: `2px solid ${answered_v === opt.v ? "#2E75B6" : "#d1d5db"}`, background: answered_v === opt.v ? "#2E75B6" : "white", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                            {answered_v === opt.v && <span style={{ width: 8, height: 8, borderRadius: "50%", background: "white" }} />}
                          </span>
                          <span>{opt.v !== undefined && activeTest.responseScale !== "YES_NO" && <strong style={{ color: "#9ca3af", marginRight: 8, fontSize: 12 }}>{opt.v}</strong>}{opt.l}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Navigation */}
            <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
              {currentItem > 0 && (
                <button onClick={() => setCurrentItem(c => c - 1)}
                  style={{ flex: 1, padding: 12, border: "2px solid #e5e7eb", borderRadius: 8, background: "white", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
                  ← Previous
                </button>
              )}
              {currentItem < allItems.length - 1 ? (
                <button onClick={() => setCurrentItem(c => c + 1)} disabled={!responses[allItems[currentItem]?.id]}
                  style={{ flex: 2, padding: 12, border: "none", borderRadius: 8, background: responses[allItems[currentItem]?.id] !== undefined ? "#2E75B6" : "#e5e7eb", color: responses[allItems[currentItem]?.id] !== undefined ? "white" : "#9ca3af", fontSize: 14, fontWeight: 700, cursor: responses[allItems[currentItem]?.id] !== undefined ? "pointer" : "default" }}>
                  Next →
                </button>
              ) : (
                <button onClick={handleSubmit} disabled={!canSubmit}
                  style={{ flex: 2, padding: 12, border: "none", borderRadius: 8, background: canSubmit ? "#15803d" : "#e5e7eb", color: canSubmit ? "white" : "#9ca3af", fontSize: 14, fontWeight: 700, cursor: canSubmit ? "pointer" : "default" }}>
                  {canSubmit ? "📊 View Results →" : `Answer all items (${allItems.length - answered} remaining)`}
                </button>
              )}
            </div>
          </div>
        )}

        {/* ── DIGIT SPAN ───────────────────────────────────────────────────── */}
        {view === "ds" && <DigitSpanView onComplete={handleDSComplete} />}

        {/* ── RESULTS ──────────────────────────────────────────────────────── */}
        {view === "results" && results && activeTest && (
          <div style={{ maxWidth: 680, margin: "0 auto" }}>
            <div style={{ ...CARD_BASE, overflow: "hidden" }}>
              {/* Header */}
              <div style={{ background: "linear-gradient(135deg, #1F3864 0%, #2E75B6 100%)", padding: "20px 24px", color: "white" }}>
                <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                  <span style={{ fontSize: 32 }}>{activeTest.icon}</span>
                  <div>
                    <div style={{ fontSize: 18, fontWeight: 800 }}>{activeTest.shortName} — Results</div>
                    <div style={{ fontSize: 13, color: "#bfdbfe" }}>Completed {new Date().toLocaleDateString()}</div>
                  </div>
                </div>
              </div>

              <div style={{ padding: 24 }}>
                {results.safetyAlert && <SafetyBanner message={results.action} />}

                {/* Score + severity */}
                <div style={{ display: "flex", gap: 16, marginBottom: 20, flexWrap: "wrap", alignItems: "center" }}>
                  <ScoreMeter score={results.total} max={results.max} color={results.color} />
                  <div style={{ flex: 1 }}>
                    <div style={{ marginBottom: 8 }}>
                      <Badge text={results.severity} color={results.color} />
                    </div>
                    <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 6 }}>Score: {results.total} / {results.max}</div>
                    <ProgressBar value={results.total} max={results.max} color={COLOR_MAP[results.color]?.bar || "#3b82f6"} />
                    <div style={{ fontSize: 12, color: "#6b7280", marginTop: 4 }}>{pct(results.total, results.max)}th percentile range</div>
                  </div>
                </div>

                {/* Action */}
                {!results.safetyAlert && (
                  <div style={{ background: "#f0f9ff", border: "1px solid #bae6fd", borderRadius: 8, padding: "12px 16px", marginBottom: 20 }}>
                    <div style={{ fontWeight: 700, fontSize: 13, color: "#0369a1", marginBottom: 4 }}>📋 Clinical Recommendation</div>
                    <div style={{ fontSize: 14, color: "#374151", lineHeight: 1.6 }}>{results.action}</div>
                  </div>
                )}

                {/* Decision Profile */}
                {results.profile && DECISION_PROFILES[results.profile] && (
                  <div style={{ borderRadius: 8, padding: "12px 16px", marginBottom: 20, background: DECISION_PROFILES[results.profile].bg, border: `1.5px solid ${DECISION_PROFILES[results.profile].color}30` }}>
                    <div style={{ fontWeight: 700, fontSize: 13, color: DECISION_PROFILES[results.profile].color, marginBottom: 4 }}>
                      {DECISION_PROFILES[results.profile].icon} Decision-Making Profile: {results.profile}
                    </div>
                    <div style={{ fontSize: 13, color: "#374151", lineHeight: 1.5, marginBottom: 8 }}>{DECISION_PROFILES[results.profile].description}</div>
                    <div style={{ fontSize: 12, color: "#6b7280" }}><strong>Intervention:</strong> {DECISION_PROFILES[results.profile].intervention}</div>
                  </div>
                )}

                {/* Subscales */}
                {results.subscales && results.subscales.length > 0 && (
                  <div style={{ marginBottom: 20 }}>
                    <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 12, color: "#1F3864" }}>Subscale Breakdown</div>
                    {results.subscales.map(s => (
                      <div key={s.id} style={{ marginBottom: 10 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                          <div style={{ fontSize: 13, fontWeight: 600 }}>{s.name}</div>
                          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                            <span style={{ fontSize: 13, fontWeight: 700 }}>
                              {s.score !== undefined ? s.score : ""}{s.tScore ? ` (T=${s.tScore})` : ""}{s.mean ? ` (${s.mean})` : ""}
                            </span>
                            {(s.elevated !== undefined) && <Badge text={s.elevated ? "⚠️ Elevated" : "✓ Normal"} color={s.elevated ? "orange" : "green"} />}
                            {s.level && <Badge text={s.level} color={s.level==="High"?"orange":s.level==="Low"?"blue":"green"} />}
                          </div>
                        </div>
                        <ProgressBar value={s.score || 0} max={(s.items?.length || 1) * (activeTest.responseScale==="NEO_5" ? 5 : 3)} color={s.elevated ? "#f97316" : "#2E75B6"} />
                        {s.cutoff !== undefined && <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 2 }}>Cutoff: ≥{s.cutoff}</div>}
                      </div>
                    ))}
                  </div>
                )}

                {/* Item-level breakdown toggle */}
                <details style={{ marginBottom: 20 }}>
                  <summary style={{ cursor: "pointer", fontWeight: 600, color: "#2E75B6", fontSize: 14, padding: "8px 0" }}>
                    View Item-by-Item Responses ({allItems.length} items)
                  </summary>
                  <div style={{ marginTop: 10, maxHeight: 320, overflowY: "auto", border: "1px solid #e5e7eb", borderRadius: 8 }}>
                    {allItems.map((item, i) => (
                      <div key={item.id} style={{ display: "flex", gap: 10, padding: "8px 14px", borderBottom: i < allItems.length - 1 ? "1px solid #f1f5f9" : "none", alignItems: "flex-start" }}>
                        <div style={{ minWidth: 24, fontWeight: 700, color: "#9ca3af", fontSize: 12 }}>{i+1}.</div>
                        <div style={{ flex: 1, fontSize: 13, color: "#374151" }}>{item.text}</div>
                        <div style={{ fontWeight: 700, fontSize: 13, color: "#2E75B6", minWidth: 28, textAlign: "right" }}>
                          {scale.find(s => s.v === responses[item.id])?.l?.split(" ")[0] || "–"}
                          <span style={{ fontSize: 11, color: "#9ca3af", marginLeft: 4 }}>({responses[item.id] ?? "–"})</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </details>

                {/* Buttons */}
                <div style={{ display: "flex", gap: 10 }}>
                  <button onClick={() => setView("home")}
                    style={{ flex: 1, padding: 12, border: "2px solid #e5e7eb", borderRadius: 8, background: "white", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
                    ← Home
                  </button>
                  <button onClick={() => setView("summary")}
                    style={{ flex: 2, padding: 12, border: "none", borderRadius: 8, background: "#1F3864", color: "white", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
                    📊 View All Results →
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── SUMMARY / DECISION PROFILE ───────────────────────────────────── */}
        {view === "summary" && (
          <div style={{ maxWidth: 900, margin: "0 auto" }}>
            <div style={{ ...CARD_BASE, overflow: "hidden", marginBottom: 20 }}>
              <div style={{ background: "linear-gradient(135deg, #1F3864 0%, #2E75B6 100%)", padding: "20px 24px", color: "white" }}>
                <div style={{ fontSize: 20, fontWeight: 800 }}>📊 Assessment Summary</div>
                <div style={{ fontSize: 13, color: "#bfdbfe", marginTop: 4 }}>{completedCount} test{completedCount !== 1?"s":""} completed · {new Date().toLocaleDateString()}</div>
              </div>
              {completedCount === 0 ? (
                <div style={{ padding: 40, textAlign: "center", color: "#9ca3af" }}>
                  <div style={{ fontSize: 48, marginBottom: 12 }}>📋</div>
                  <div style={{ fontSize: 16 }}>No tests completed yet.</div>
                  <button onClick={() => setView("home")} style={{ marginTop: 16, padding: "10px 24px", background: "#2E75B6", color: "white", border: "none", borderRadius: 8, fontWeight: 700, cursor: "pointer" }}>
                    Go to Test Suite
                  </button>
                </div>
              ) : (
                <div style={{ padding: 24 }}>
                  {/* Dominant Profile */}
                  {topProfile && DECISION_PROFILES[topProfile] && (
                    <div style={{ borderRadius: 10, padding: 20, marginBottom: 24, background: DECISION_PROFILES[topProfile].bg, border: `2px solid ${DECISION_PROFILES[topProfile].color}50` }}>
                      <div style={{ fontWeight: 800, fontSize: 18, color: DECISION_PROFILES[topProfile].color, marginBottom: 8 }}>
                        {DECISION_PROFILES[topProfile].icon} Primary Profile: {topProfile}
                      </div>
                      <div style={{ fontSize: 14, lineHeight: 1.7, color: "#374151", marginBottom: 12 }}>{DECISION_PROFILES[topProfile].description}</div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, fontSize: 13 }}>
                        <div style={{ background: "rgba(255,255,255,.7)", borderRadius: 8, padding: "10px 14px" }}>
                          <div style={{ fontWeight: 700, color: "#374151", marginBottom: 4 }}>Key Tests</div>
                          <div style={{ color: "#6b7280" }}>{DECISION_PROFILES[topProfile].tests}</div>
                        </div>
                        <div style={{ background: "rgba(255,255,255,.7)", borderRadius: 8, padding: "10px 14px" }}>
                          <div style={{ fontWeight: 700, color: "#374151", marginBottom: 4 }}>Intervention Focus</div>
                          <div style={{ color: "#6b7280" }}>{DECISION_PROFILES[topProfile].intervention}</div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* All completed tests */}
                  <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 14, color: "#1F3864" }}>Test Results Overview</div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 12 }}>
                    {Object.entries(completedTests).map(([id, res]) => {
                      const c = COLOR_MAP[res.color] || COLOR_MAP.green;
                      return (
                        <div key={id} style={{ border: `1.5px solid ${c.border}`, borderRadius: 10, padding: 14, background: c.bg }}>
                          <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
                            <span style={{ fontSize: 22 }}>{res.icon}</span>
                            <div style={{ fontWeight: 700, fontSize: 13, color: "#1F3864" }}>{res.testName}</div>
                          </div>
                          <div style={{ fontSize: 12, fontWeight: 700, color: c.text, marginBottom: 6 }}>{res.severity}</div>
                          {res.total !== undefined && res.max && (
                            <ProgressBar value={res.total} max={res.max} color={c.bar} />
                          )}
                          <div style={{ fontSize: 11, color: "#6b7280", marginTop: 6 }}>
                            Profile: <strong>{res.profile}</strong>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Profile distribution */}
                  {Object.keys(dominantProfile).length > 0 && (
                    <div style={{ marginTop: 24 }}>
                      <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 12, color: "#1F3864" }}>Decision-Making Profile Distribution</div>
                      {Object.entries(dominantProfile).sort((a,b)=>b[1]-a[1]).map(([prof, count]) => {
                        const dp = DECISION_PROFILES[prof] || {};
                        return (
                          <div key={prof} style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 8 }}>
                            <span style={{ width: 24, textAlign: "center" }}>{dp.icon || "•"}</span>
                            <div style={{ flex: 1, fontSize: 13, fontWeight: 600, color: dp.color || "#374151" }}>{prof}</div>
                            <div style={{ width: 140, background: "#e5e7eb", borderRadius: 6, height: 10 }}>
                              <div style={{ width: `${(count / completedCount) * 100}%`, background: dp.color || "#2E75B6", height: "100%", borderRadius: 6 }} />
                            </div>
                            <div style={{ fontSize: 12, color: "#6b7280", width: 40, textAlign: "right" }}>{count}×</div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  <div style={{ marginTop: 20, display: "flex", gap: 10, flexWrap: "wrap" }}>
                    <button onClick={() => setView("home")}
                      style={{ flex: 1, minWidth: 120, padding: 12, border: "2px solid #e5e7eb", borderRadius: 8, background: "white", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
                      ← Test Suite
                    </button>
                    <button onClick={() => window.print ? window.print() : alert("Use browser print function")}
                      style={{ flex: 1, minWidth: 120, padding: 12, border: "none", borderRadius: 8, background: "#1F3864", color: "white", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
                      🖨️ Print Report
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Five Profiles Reference */}
            <div style={{ ...CARD_BASE, padding: 20 }}>
              <div style={{ fontWeight: 700, fontSize: 15, color: "#1F3864", marginBottom: 14 }}>📚 Five Core Decision-Making Profiles — Reference</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 12 }}>
                {Object.entries(DECISION_PROFILES).slice(0,5).map(([name, dp]) => (
                  <div key={name} style={{ borderRadius: 8, padding: 14, background: dp.bg, border: `1px solid ${dp.color}30` }}>
                    <div style={{ fontWeight: 700, fontSize: 13, color: dp.color, marginBottom: 6 }}>{dp.icon} {name}</div>
                    <div style={{ fontSize: 12, color: "#374151", lineHeight: 1.5, marginBottom: 8 }}>{dp.description.substring(0,120)}…</div>
                    <div style={{ fontSize: 11, color: "#6b7280" }}><strong>Rx:</strong> {dp.intervention.split(",")[0]}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <div style={{ background: "#1F3864", color: "#93c5fd", textAlign: "center", padding: "12px 16px", fontSize: 11 }}>
        Psychological & Psychometric Test Suite · Clinical Edition 2026 · APA | WHO | AAP | AERA | ITC | BPS | NASP · For Professional Training Purposes Only
      </div>
    </div>
  );
}
