// ─── Crucible OS Genre Templates (ESM) ───────────────────────────────────────

const GENRES = {
  marvel: {
    id: "marvel",
    label: "Marvel / Superhero",
    emoji: "⚡",
    tone: "epic, action, empowerment",
    color: "#e62429",
    description: "Science becomes a superpower. The student/hero discovers their biological ability through conflict and mastery.",
    protagonist: "A young student who discovers biological superpowers linked to the concept",
    narrativeArc: [
      "ORDINARY WORLD — Hero doesn't understand the phenomenon (hook with a real-world problem)",
      "CALL TO ADVENTURE — A biological event threatens the world (microscopic villain, disease outbreak, ecosystem collapse)",
      "POWER AWAKENING — Hero learns the science concept as their superpower revealed",
      "TRAINING ARC — Key facts and mechanisms explained through power training montage",
      "CLIMAX — Hero applies the science to defeat the villain / solve the crisis",
      "REVELATION — The science principle is stated clearly as the lesson",
    ],
    leftBrainHooks: ["Equation/formula overlaid on screen as power activation", "Diagram cutaway during 'training' phase", "Technical terms spoken by mentor figure"],
    rightBrainHooks: ["Emotional stakes (save the city / the loved one)", "Music crescendo at revelation", "Visual metaphor for the biological process"],
    systemPrompt: (concept, facts, classLevel) => `You are writing a Marvel-style superhero origin story for a Class ${classLevel} ICSE Biology lesson on "${concept}".

The science MUST be 100% accurate. Every biological fact must be woven naturally into the narrative.

HERO SETUP: A young Indian student discovers they have powers connected to "${concept}".
VILLAIN: A threat that can only be defeated by understanding "${concept}".
SCIENCE INTEGRATION: These facts MUST appear clearly in the story:
${facts.map((f, i) => `${i + 1}. ${f}`).join('\n')}

Write a 3-scene screenplay:
- Scene 1 (HOOK): Show the problem/conflict dramatically. Introduce the concept as a mystery.
- Scene 2 (LEARNING): The hero learns the science through action. Explain ALL key facts through the narrative.
- Scene 3 (RESOLUTION): Apply the science to win. State the core principle as the hero's final realization.

Format: Screenplay style. Include "FACT FLASH:" moments where facts appear on screen as text overlays.
Keep dialogue natural for Class ${classLevel} student understanding.
Length: 3-4 minutes spoken (approximately 450-600 words).`,
  },

  disney: {
    id: "disney",
    label: "Disney / Magical World",
    emoji: "✨",
    tone: "wonder, warmth, discovery",
    color: "#1e3a8a",
    description: "Biology as a magical kingdom. Journey through the organism/cell/ecosystem as a wondrous land full of characters.",
    protagonist: "A small character journeying through a biological world (inside a cell, inside a body, through an ecosystem)",
    narrativeArc: [
      "MAGICAL WORLD INTRODUCTION — Establish the biological world as a beautiful, living place",
      "MEET THE CHARACTERS — Organelles/cells/organisms as lovable characters with personalities",
      "THE PROBLEM — Something is wrong in the world (disease, imbalance, missing element)",
      "THE JOURNEY — Hero travels through the biological system learning how each part works",
      "THE SOLUTION — Understanding all parts together restores harmony",
      "THE LESSON — The harmony of life depends on every part doing its role",
    ],
    leftBrainHooks: ["Character name cards with scientific labels", "Song/chant that encodes key facts", "Cutaway to real microscope footage"],
    rightBrainHooks: ["Friendship and belonging themes", "Magical visual metaphors for biological processes", "Emotional music at moments of understanding"],
    systemPrompt: (concept, facts, classLevel) => `You are writing a Disney-style animated film script for a Class ${classLevel} ICSE Biology lesson on "${concept}".

Imagine the world of "${concept}" as a magical kingdom. Every biological component is a character.

WORLD: The living world of "${concept}" — make it beautiful, wondrous, and alive.
PROBLEM: Something is out of balance in this world that needs the main character's help.
SCIENCE: These facts MUST appear naturally as aspects of this magical world:
${facts.map((f, i) => `${i + 1}. ${f}`).join('\n')}

Write a 3-scene screenplay:
- Scene 1 (WONDER): Introduce the magical biological world vividly. Make students WANT to explore it.
- Scene 2 (DISCOVERY): Journey through the system. Each character/location teaches one key fact.
- Scene 3 (HARMONY): The world comes back into balance. Summarize how all parts work together.

Include "✨ MAGIC LABEL:" moments where character names appear with their scientific labels.
Keep language warm, imaginative, and accessible for Class ${classLevel}.
Length: 3-4 minutes (approximately 450-600 words).`,
  },

  bollywood: {
    id: "bollywood",
    label: "Bollywood / Drama",
    emoji: "🎭",
    tone: "emotional, dramatic, relatable",
    color: "#f59e0b",
    description: "Indian family drama where a biological crisis tests relationships, and science becomes the path to resolution.",
    protagonist: "A relatable Indian student/family member who experiences the biological concept through a personal crisis",
    narrativeArc: [
      "SETUP — A close-knit Indian family/community faces a biological problem",
      "CONFLICT — The crisis deepens because they don't understand the science",
      "INTERVENTION — A knowledgeable character (teacher/doctor/grandparent) explains the concept",
      "DRAMATIC REVEAL — The science explanation changes everything",
      "RESOLUTION — Family unites using their new understanding",
      "MORAL — Science is the bridge between love and action",
    ],
    leftBrainHooks: ["Doctor/teacher character delivers precise facts", "Newspaper headlines with scientific terms", "Explanation scenes with visual diagrams"],
    rightBrainHooks: ["Family bond and emotional stakes", "Indian cultural context (food, festivals, traditions) linked to biology", "Music that swells at the moment of understanding"],
    systemPrompt: (concept, facts, classLevel) => `You are writing a Bollywood drama screenplay for a Class ${classLevel} ICSE Biology lesson on "${concept}".

Use an emotionally resonant Indian family story to teach the concept. The biology MUST be central to solving the family's problem.

SETTING: Contemporary India — a family or community is affected by "${concept}".
CONFLICT: A personal/family crisis rooted in misunderstanding or encountering "${concept}".
RESOLUTION: A knowledgeable character explains the science, saving the situation.

Key facts to integrate naturally:
${facts.map((f, i) => `${i + 1}. ${f}`).join('\n')}

Write a 3-scene screenplay:
- Scene 1 (CRISIS): Show the problem emotionally. Make viewers care about the characters.
- Scene 2 (EXPLANATION): The science is explained by a trusted character — make it feel like a gift of knowledge.
- Scene 3 (RESOLUTION): Apply the science. End with the family stronger and wiser.

Include "📋 DR'S NOTES:" moments where key facts flash on screen.
Use Indian names, foods, festivals as metaphors where appropriate.
Keep dialogue warm and emotionally resonant for Class ${classLevel}.
Length: 3-4 minutes (approximately 450-600 words).`,
  },

  hollywood: {
    id: "hollywood",
    label: "Hollywood / Thriller",
    emoji: "🔍",
    tone: "suspense, investigation, intellectual",
    color: "#6366f1",
    description: "A biological mystery thriller where the student-detective solves a case using scientific reasoning.",
    protagonist: "A sharp student or young scientist who must solve a biological mystery using the concept as their investigative tool",
    narrativeArc: [
      "THE MYSTERY — A puzzling biological observation or crisis that defies explanation",
      "INVESTIGATION BEGINS — Gather clues (biological evidence and data)",
      "DEAD END — Initial hypothesis fails (reveals common misconception)",
      "BREAKTHROUGH — The correct scientific concept reveals the answer",
      "EVIDENCE MOUNTS — Each key fact slots into place like pieces of a puzzle",
      "CASE CLOSED — The full scientific truth is revealed",
    ],
    leftBrainHooks: ["Evidence board with labeled biological terms", "Hypothesis statements on screen", "Lab results and data presented as case files"],
    rightBrainHooks: ["Ticking clock / rising stakes", "Twists that reveal common misconceptions are wrong", "Satisfying 'aha' moment at resolution"],
    systemPrompt: (concept, facts, classLevel) => `You are writing a Hollywood-style mystery thriller screenplay for a Class ${classLevel} ICSE Biology lesson on "${concept}".

A brilliant young detective must solve a biological mystery using "${concept}" as their primary investigative tool.

MYSTERY: Something unexplained that can only be solved by understanding "${concept}" fully.
MISDIRECTION: One common misconception acts as a red herring that is debunked scientifically.
SOLUTION: The correct science solves the mystery definitively.

Facts that MUST be the key evidence in the case:
${facts.map((f, i) => `${i + 1}. ${f}`).join('\n')}

Write a 3-scene screenplay:
- Scene 1 (THE MYSTERY): Present the puzzling biological problem. Build intrigue. Reveal the misconception.
- Scene 2 (INVESTIGATION): Detective works through the science step by step. Each fact is a clue.
- Scene 3 (REVELATION): The case is solved. State each scientific fact as confirmed evidence.

Include "🔬 EVIDENCE LOG:" moments where facts appear as case file text on screen.
Keep the intellectual tension building throughout for Class ${classLevel}.
Length: 3-4 minutes (approximately 450-600 words).`,
  },
};

// Left Brain / Right Brain Overlay Config
const BRAIN_TRACKS = {
  right: {
    label: "Right Brain",
    description: "Narrative, emotion, visual drama",
    elements: ["Hero journey", "Emotional stakes", "Visual metaphors", "Music cues"],
  },
  left: {
    label: "Left Brain",
    description: "Logic, data, precision",
    elements: ["Equation overlays", "Diagram cutaways", "Technical terminology", "Fact flash cards"],
  },
};

export { GENRES, BRAIN_TRACKS };

