export const GENRES = ["Drama", "Comedy", "Thriller", "Sci-Fi", "Horror", "Romance", "Action", "Documentary"];
export const FORMATS = ["Feature Film", "Short Film", "TV Pilot", "TV Episode", "Stage Play", "Podcast Script"];

export const WRITERS = [
  {
    id: "tarantino", name: "Tarantino", fullName: "Quentin Tarantino",
    emoji: "🩸", color: "#e05252",
    films: "Pulp Fiction · Kill Bill · Inglourious Basterds",
    description: "Pop-culture dialogue, nonlinear chapters, operatic violence",
    traits: ["Verbose pop-culture dialogue", "Chapter title cards", "Non-linear structure", "Casual extreme violence", "Rhythmic profanity"],
    style: `TARANTINO TECHNIQUES (influence: {WEIGHT}%):
- Dialogue is EVERYTHING — long, rhythmic, pop-culture-saturated conversations that seem mundane but reveal character
- Characters discuss trivial things right before/after extreme violence
- Chapter/title cards to break into non-linear segments (use more at higher weights)
- Anti-heroes with strict personal codes; charming verbose villains
- Action lines are punchy, direct, present tense with attitude
- Reference specific songs, brands, eras — hyper-real pop culture
- Profanity used rhythmically as punctuation (more at higher weights)
- Long monologues that ARE the movie`,
  },
  {
    id: "sorkin", name: "Sorkin", fullName: "Aaron Sorkin",
    emoji: "⚡", color: "#5298e0",
    films: "The Social Network · A Few Good Men · The West Wing",
    description: "Walk-and-talk, rapid-fire wit, idealistic speeches",
    traits: ["Walk-and-talk momentum", "Overlapping rapid dialogue", "Idealistic monologues", "Moral complexity", "Callback structure"],
    style: `SORKIN TECHNIQUES (influence: {WEIGHT}%):
- Walk-and-talk: characters in constant motion, dialogue flowing as they move
- Rapid-fire overlapping dialogue, characters finishing each other's sentences
- Articulate characters who speak in complete sentences even under pressure
- Big themes: ethics, democracy, truth, the price of being right
- Callbacks — earlier lines return with new devastating meaning
- The smartest person in the room is always the most alone
- Stichomythia: rapid one-line volleys that escalate
- Passionate idealistic speeches (more at higher weights)`,
  },
  {
    id: "kaufman", name: "Kaufman", fullName: "Charlie Kaufman",
    emoji: "🌀", color: "#9b52e0",
    films: "Being John Malkovich · Eternal Sunshine · Synecdoche NY",
    description: "Meta-fiction, existential dread, unreliable reality",
    traits: ["Meta-fictional layers", "Unreliable reality", "Existential interiority", "Non-linear memory", "Comedy-tragedy fusion"],
    style: `KAUFMAN TECHNIQUES (influence: {WEIGHT}%):
- Reality is permeable — it can fold in on itself (more at higher weights)
- Deep interiority — we live inside the protagonist's anxious consciousness
- Self-loathing protagonists who are painfully self-aware but unable to change
- Time non-linear, memory reconstructed and wrong
- Mundane settings slowly revealing themselves as labyrinthine
- Meta-fiction: art consuming its creator (at higher weights)
- Longing — always longing — for connection, meaning
- Action lines introspective, essayistic, noticing tiny things that mean everything`,
  },
  {
    id: "nolan", name: "Nolan", fullName: "Christopher Nolan",
    emoji: "⏳", color: "#52c0e0",
    films: "Memento · Inception · Interstellar · Oppenheimer",
    description: "Non-linear time, puzzle-box structure, emotional restraint",
    traits: ["Non-linear timelines", "Puzzle-box structure", "Technical precision", "Buried grief", "IMAX-scale emotion"],
    style: `NOLAN TECHNIQUES (influence: {WEIGHT}%):
- TIME is the subject — non-linear structure, timelines that fold (more at higher weights)
- Big philosophical ideas embedded in genre spectacle
- Emotional restraint on surface; massive grief erupting in single moments
- Male protagonists defined by an unprocessed loss driving everything
- Structure is a puzzle — scenes read differently on second viewing
- Intercutting between timelines at maximum tension
- Action described with technical, almost engineering precision`,
  },
  {
    id: "coen", name: "Coens", fullName: "Coen Brothers",
    emoji: "🤠", color: "#c0a030",
    films: "Fargo · No Country for Old Men · The Big Lebowski",
    description: "Dark nihilism, regional vernacular, grotesque dark comedy",
    traits: ["Hyper-accurate vernacular", "Sudden grotesque violence", "Nihilism with warmth", "Banal evil", "Landscape as character"],
    style: `COEN BROTHERS TECHNIQUES (influence: {WEIGHT}%):
- Regional vernacular is EVERYTHING — hyper-accurate specific dialects
- Violence erupts suddenly, grotesquely, accidentally — never glamorous
- Nihilism with warmth: universe indifferent, people achingly human
- Dark comedy threaded through genuine menace
- Every character has a specific verbal tic, a strange particularity
- Evil is banal and bureaucratic, not dramatic
- Small crimes escalate into catastrophes through stupidity and greed
- Action lines laconic, almost Biblical: short sentences, enormous weight`,
  },
  {
    id: "diablo", name: "Diablo Cody", fullName: "Diablo Cody",
    emoji: "💋", color: "#e052a0",
    films: "Juno · Jennifer's Body · Tully",
    description: "Hyper-stylized slang, fierce women, subversive genre twists",
    traits: ["Invented slang & wit", "Fierce female protagonists", "Horror-comedy fusion", "Suburban subversion", "Snarky action lines"],
    style: `DIABLO CODY TECHNIQUES (influence: {WEIGHT}%):
- Dialogue HYPER-STYLIZED — invented slang, pop-culture mashups, ironic formality
- Female protagonists fierce, complicated, funny, deeply uncool in the coolest way
- Horror and comedy blended — scenes terrifying and hilarious simultaneously
- Suburban settings both loved and loathed
- Characters speak in quips but feel real loneliness underneath
- Action lines have personality — snarky, opinionated
- Coming-of-age that doesn't sanitize`,
  },
  {
    id: "phoebe", name: "Waller-Bridge", fullName: "Phoebe Waller-Bridge",
    emoji: "🔪", color: "#e08852",
    films: "Fleabag · Killing Eve · Crashing",
    description: "Fourth-wall breaks, dark comedy, grief under wit",
    traits: ["Fourth-wall breaks", "Grief hidden in humor", "Female rage", "Suppressed emotion", "Confessional monologues"],
    style: `PHOEBE WALLER-BRIDGE TECHNIQUES (influence: {WEIGHT}%):
- Fourth wall breaks — protagonist speaks directly to audience (more at higher weights)
- The audience is her only honest relationship
- Grief and trauma hidden under wit — every joke is a wound
- Female rage specific: quiet devastation of a brilliant trapped woman
- Dialogue crackles with suppressed emotion — characters say opposite of what they feel
- Dark comedy earns its darkness: laughs make the pain worse
- Structure loops back — callbacks recontextualize humor as tragedy`,
  },
  {
    id: "villeneuve", name: "Villeneuve", fullName: "Denis Villeneuve",
    emoji: "🪐", color: "#52e0a0",
    films: "Arrival · Blade Runner 2049 · Dune",
    description: "Visual poetry, contemplative silence, philosophical weight",
    traits: ["Silence as language", "Visual poetry descriptions", "Meditative pacing", "Cosmic awe", "Sparse weighty dialogue"],
    style: `VILLENEUVE TECHNIQUES (influence: {WEIGHT}%):
- SILENCE is a character — long wordless sequences carrying enormous meaning
- Visual poetry: light, texture, scale, composition described cinematically
- Meditative pacing — let scenes breathe and accumulate weight
- Big ideas: time, language, consciousness, humanity — approached with awe
- Grief as engine: protagonists processing loss through the sublime
- Sparse dialogue — when characters speak, every word weighs a ton
- Women who are quietly the most powerful people in the room`,
  },
  {
    id: "pta", name: "P.T. Anderson", fullName: "Paul Thomas Anderson",
    emoji: "🎭", color: "#e0c052",
    films: "There Will Be Blood · Magnolia · Boogie Nights",
    description: "Epic character studies, American mythology, operatic emotion",
    traits: ["Epic character arcs", "American mythology", "Ensemble fate webs", "Father-son damage", "Operatic climaxes"],
    style: `PAUL THOMAS ANDERSON TECHNIQUES (influence: {WEIGHT}%):
- Epic scope, intimate focus — America told through one flawed magnificent character
- Long fluid takes described: circling characters, finding new angles
- Ensemble casts where every character is protagonist of their own tragedy
- Fathers and sons: the damage men do to boys who become men
- Capitalism and religion as twin corruptions promising transcendence
- Magnolia-style coincidence: characters whose lives rhyme without knowing each other
- Emotional climaxes almost operatic — characters finally saying the unsayable
- Dialogue erupting from long silences`,
  },
  {
    id: "kashyap", name: "Kashyap", fullName: "Anurag Kashyap",
    emoji: "🚬", color: "#c0392b",
    films: "Gangs of Wasseypur · Black Friday · Dev.D",
    description: "Gritty realism, dark comedy, nonlinear narratives, raw dialogue",
    traits: ["Raw abusive dialogue", "Gritty realism", "Nonlinear sprawling epics", "Dark situational comedy", "Systemic corruption"],
    style: `ANURAG KASHYAP TECHNIQUES (influence: {WEIGHT}%):
- Gritty, unvarnished realism — North Indian heartland aesthetics, dusty and chaotic
- Dialogue is raw, unapologetic, highly localized, and casually abusive
- Humor emerges purely from absurdly bleak or intense situations
- Sprawling, multigenerational epics driven by revenge and systemic social rot
- Characters who are fundamentally flawed and driven by base instincts
- Violence is messy, sudden, and completely devoid of glamour
- Deeply entrenched local political/social dynamics driving the plot`,
  },
  {
    id: "salimjaved", name: "Salim-Javed", fullName: "Salim-Javed",
    emoji: "🐅", color: "#f39c12",
    films: "Sholay · Deewaar · Don",
    description: "Angry Young Man, high-stakes drama, heroic monologues, masala",
    traits: ["Angry Young Man archetype", "High-stakes melodrama", "Iconic punchlines", "Themes of justice", "Larger-than-life heroes"],
    style: `SALIM-JAVED TECHNIQUES (influence: {WEIGHT}%):
- The creation of the 'Angry Young Man' — brooding, cynical anti-heroes fighting a corrupt system
- High-stakes, emotionally charged melodrama that feels deeply earned
- Dialogue that doubles as iconic punchlines (heavy use of heroic monologues and clap-trap moments)
- Themes of justice, honor, and deep familial duty
- Larger-than-life villains facing undeniably magnetic protagonists
- Perfectly structured commercial pacing blending intense action, emotion, and tragedy`,
  },
  {
    id: "zoya", name: "Zoya", fullName: "Zoya Akhtar",
    emoji: "🌆", color: "#8e44ad",
    films: "Zindagi Na Milegi Dobara · Gully Boy · Dil Dhadakne Do",
    description: "Urban angst, ensemble casts, layered emotional conflicts",
    traits: ["Urban bourgeois angst", "Ensemble relationship webs", "Poetic introspection", "Class disparity", "Effortless casual banter"],
    style: `ZOYA AKHTAR TECHNIQUES (influence: {WEIGHT}%):
- Focus on urban, often entirely privileged characters dealing with profound existential angst
- Ensemble casts with incredibly tangled, layered interpersonal histories
- Dialogue is effortlessly casual, deeply observant, and sharply modern
- The sudden injection of poetry or spoken word to capture internal emotional states
- Sharp observations on class disparity and societal hypocrisy
- Finding claustrophobia and emotional repression within beautiful aesthetics`,
  },
  {
    id: "ray", name: "Ray", fullName: "Satyajit Ray",
    emoji: "📽️", color: "#27ae60",
    films: "Pather Panchali · Charulata · The Apu Trilogy",
    description: "Poetic realism, deep humanism, nuanced character studies",
    traits: ["Poetic realism", "Deep humanism", "Silence over dialogue", "Nature as mirror", "Subtle psychological shifts"],
    style: `SATYAJIT RAY TECHNIQUES (influence: {WEIGHT}%):
- Masterful poetic realism grounding epic emotion in simple mundane daily rituals
- Deep, unrelenting humanism with empathy for every character's flawed nature
- The unspoken is more important than the spoken — immense use of silence and gazes
- Nature and the environment actively mirror the protagonist's psychological shifts
- Extremely nuanced, hyper-subtle character studies focusing on internal transformation
- Elegant visual storytelling over heavy exposition`,
  },
];

export const BASE_FORMAT = `
SCREENPLAY FORMAT (always follow):
- SCENE HEADINGS: INT./EXT. LOCATION - DAY/NIGHT (all caps)
- Action lines: vivid present tense, no camera directions
- CHARACTER NAME in caps before dialogue
- (parentheticals) only when essential
- Keep scenes punchy and cinematic
- When continuing, pick up naturally from where the script ended
- When revising, apply notes and return the full revised script
`;

export function buildBlendPrompt(writerWeights) {
  const active = Object.entries(writerWeights).filter(([, v]) => v > 0);
  if (active.length === 0) {
    return "You are a professional Hollywood screenwriter. Write compelling, professional scripts in clean industry-standard format." + BASE_FORMAT;
  }

  const total = active.reduce((s, [, v]) => s + v, 0);
  const normalized = active
    .map(([id, v]) => ({ id, pct: Math.round((v / total) * 100) }))
    .sort((a, b) => b.pct - a.pct);

  let prompt = "You are a master screenwriter who has deeply internalized multiple distinctive voices. Your style blend for this script:\n\n";

  for (const { id, pct } of normalized) {
    const w = WRITERS.find(w => w.id === id);
    if (w) {
      prompt += `=== ${w.fullName.toUpperCase()} — ${pct}% ===\n`;
      prompt += w.style.replace("{WEIGHT}", pct) + "\n\n";
    }
  }

  prompt += `=== BLEND INSTRUCTIONS ===\n`;
  prompt += `The dominant voice (${normalized[0].pct}%) sets fundamental tone, rhythm, and structure.\n`;
  prompt += `Secondary voices appear as flavoring in specific scenes, specific characters, or specific moments:\n`;
  prompt += `60%+: pervades the entire script\n30-59%: shapes key scenes and overall rhythm\n10-29%: notable moments or one character's speech\nUnder 10%: subtle undertone\n`;
  prompt += `The blend must feel INTENTIONAL and COHERENT — like a filmmaker who has genuinely internalized multiple masters.\n`;
  prompt += `Find unexpected harmonies between styles. Let them amplify each other.\n\n`;
  prompt += BASE_FORMAT;

  return prompt;
}

export function blendLabel(writerWeights) {
  const writers = WRITERS.filter(w => (writerWeights[w.id] || 0) > 0);
  if (writers.length === 0) return "No style";
  const total = Object.values(writerWeights).reduce((s, v) => s + v, 0);
  return writers
    .sort((a, b) => (writerWeights[b.id] || 0) - (writerWeights[a.id] || 0))
    .map(w => `${w.name} ${Math.round(((writerWeights[w.id] || 0) / total) * 100)}%`)
    .join(" · ");
}

export const PRESET_BLENDS = [
  { label: "Pulp Intellect", desc: "Tarantino × Sorkin", blend: { tarantino: 60, sorkin: 40 } },
  { label: "Fractured Memory", desc: "Nolan × Kaufman", blend: { nolan: 55, kaufman: 45 } },
  { label: "Nihilist Confessional", desc: "Coen Bros × Waller-Bridge", blend: { coen: 50, phoebe: 50 } },
  { label: "American Sublime", desc: "Villeneuve × PTA", blend: { villeneuve: 45, pta: 55 } },
  { label: "Cult Classic", desc: "Diablo Cody + Sorkin + Tarantino", blend: { diablo: 40, sorkin: 35, tarantino: 25 } },
  { label: "Cosmic Dread", desc: "Kaufman × Villeneuve × Nolan", blend: { kaufman: 40, villeneuve: 35, nolan: 25 } },
  { label: "Gangs of Mumbai", desc: "Kashyap × Salim-Javed", blend: { kashyap: 60, salimjaved: 40 } },
  { label: "Urban Poetry", desc: "Zoya × Ray", blend: { zoya: 55, ray: 45 } },
];
