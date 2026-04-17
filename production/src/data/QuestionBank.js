// ═══════════════════════════════════════════════════════════════════════════════
// QUESTION BANK  v1.0
// Age groups: junior (Grade 3-5) · middle (Grade 6-8) · teen (Grade 9-11) · senior (Grade 12+)
// Tests: EQ · IQ · Personality (Explorer / Builder / Connector / Achiever)
// ═══════════════════════════════════════════════════════════════════════════════

// ─── helpers ────────────────────────────────────────────────────────────────
export function getAgeGroup(grade) {
  const g = parseInt(grade, 10);
  if (isNaN(g))   return 'teen';          // fallback
  if (g <= 5)     return 'junior';
  if (g <= 8)     return 'middle';
  if (g <= 11)    return 'teen';
  return 'senior';
}

// ══════════════════════════════════════════════════════════════════════════════
// EQ QUESTIONS
// Each item: { id, domain, q, opts, correct, pts }
// pts[] maps to opts[] index; correct = index of best answer
// ══════════════════════════════════════════════════════════════════════════════

export const EQ_QUESTIONS = {

  // ── Junior (Grade 3-5) ─────────────────────────────────────────────────────
  junior: [
    { id:1, domain:'Self-Awareness',  q:'You feel angry when your friend takes your eraser without asking. What do you do first?',
      opts:['Snatch it back', 'Take a deep breath', 'Start crying', 'Tell the teacher immediately'], correct:1, pts:[0,3,1,1] },
    { id:2, domain:'Self-Regulation', q:'You really want to watch TV but homework is due tomorrow. You decide to…',
      opts:['Skip homework', 'Finish homework first, then TV', 'Forget both', 'Ask mum to do it'], correct:1, pts:[0,3,0,0] },
    { id:3, domain:'Empathy',         q:'Your classmate trips and spills their lunch. You…',
      opts:['Laugh with others', 'Help pick it up and check if they\'re okay', 'Walk away', 'Tell a teacher only'], correct:1, pts:[0,3,0,1] },
    { id:4, domain:'Social Skills',   q:'A new student doesn\'t know anyone. What do you do?',
      opts:['Ignore them', 'Wave from far away', 'Go and say hello and invite them to play', 'Let someone else handle it'], correct:2, pts:[0,1,3,1] },
    { id:5, domain:'Motivation',      q:'You fail a spelling test. Next time you will…',
      opts:['Give up spelling', 'Practise the words you got wrong', 'Cheat', 'Ask to skip the test'], correct:1, pts:[0,3,0,0] },
    { id:6, domain:'Self-Awareness',  q:'After shouting at your friend you feel bad. Why do you feel that way?',
      opts:['Because I\'m always right', 'Because I know I hurt their feelings', 'I don\'t know', 'Because they started it'], correct:1, pts:[0,3,0,0] },
    { id:7, domain:'Self-Regulation', q:'You are playing a game and losing. You feel like throwing the board. You should…',
      opts:['Throw it anyway', 'Count to five and breathe', 'Quit and leave', 'Blame teammates'], correct:1, pts:[0,3,1,0] },
    { id:8, domain:'Empathy',         q:'Your little sibling is scared of thunder. You…',
      opts:['Tell them not to be silly', 'Sit with them and say it\'s okay', 'Ignore them', 'Cover your own ears'], correct:1, pts:[0,3,0,0] },
    { id:9, domain:'Social Skills',   q:'Two friends are arguing. You can help by…',
      opts:['Taking sides immediately', 'Quietly walking away', 'Listening to both and suggesting they talk calmly', 'Telling the whole class'], correct:2, pts:[0,1,3,0] },
    { id:10, domain:'Motivation',     q:'Learning to ride a bike is hard and you keep falling. You…',
      opts:['Never try again', 'Ask for help and keep practising', 'Tell everyone bikes are silly', 'Watch others instead'], correct:1, pts:[0,3,0,0] },
  ],

  // ── Middle (Grade 6-8) ────────────────────────────────────────────────────
  middle: [
    { id:1, domain:'Self-Awareness',  q:'You notice you always get nervous before group presentations. What\'s the most useful thing you can do?',
      opts:['Avoid all group work', 'Acknowledge the nerves and practise breathing', 'Pretend you\'re fine', 'Ask to be excused every time'], correct:1, pts:[0,3,1,0] },
    { id:2, domain:'Self-Regulation', q:'Your group chat blows up with criticism of something you did. You…',
      opts:['Reply aggressively right away', 'Mute and respond thoughtfully later', 'Leave the group', 'Screenshot and share elsewhere'], correct:1, pts:[0,3,1,0] },
    { id:3, domain:'Empathy',         q:'A classmate seems withdrawn after their parents divorced. You…',
      opts:['Ask them loudly in front of others', 'Privately check in and just listen', 'Spread the news to help', 'Leave it—it\'s not your business'], correct:1, pts:[0,3,0,1] },
    { id:4, domain:'Social Skills',   q:'You disagree with the captain\'s strategy during a school event. You…',
      opts:['Refuse to participate', 'Suggest your idea calmly with reasons', 'Complain to others instead', 'Do whatever and say nothing'], correct:1, pts:[0,3,1,1] },
    { id:5, domain:'Motivation',      q:'You score 40 % on a maths test despite studying. You…',
      opts:['Decide maths isn\'t for you', 'Analyse which topics tripped you up and rework them', 'Copy from a topper next time', 'Blame the teacher'], correct:1, pts:[0,3,0,0] },
    { id:6, domain:'Self-Awareness',  q:'You realise you interrupted your friend three times in a row. You…',
      opts:['Justify it — you were excited', 'Apologise and make a conscious effort to listen more', 'Feel bad but say nothing', 'Blame the conversation topic'], correct:1, pts:[1,3,1,0] },
    { id:7, domain:'Self-Regulation', q:'A teacher gives you harsh feedback in front of the class. You feel humiliated. Best response?',
      opts:['Argue back loudly', 'Stay quiet and ask for clarification privately later', 'Refuse to attend that class', 'Post about it online'], correct:1, pts:[0,3,1,0] },
    { id:8, domain:'Empathy',         q:'Your usually cheerful friend seems sad but says "I\'m fine." You…',
      opts:['Accept it and move on', 'Say "I\'m here if you want to talk" and don\'t push', 'Tell others they\'re in a bad mood', 'Demand they open up now'], correct:1, pts:[1,3,0,0] },
    { id:9, domain:'Social Skills',   q:'You want to join a study group that seems closed. You…',
      opts:['Give up on the idea', 'Introduce yourself and offer something specific you can contribute', 'Complain they\'re elitist', 'Wait for them to invite you forever'], correct:1, pts:[0,3,0,1] },
    { id:10, domain:'Motivation',     q:'You get a big project with a month\'s deadline. You…',
      opts:['Start the night before', 'Break it into weekly milestones and start today', 'Ask someone to do it for you', 'Panic and avoid it'], correct:1, pts:[0,3,0,0] },
  ],

  // ── Teen (Grade 9-11) — original set, kept verbatim ──────────────────────
  teen: [
    { id:1, domain:'Self-Awareness',  q:'Aang notices frustration rising mid-project. Best first step?',
      opts:['Push through it','Recognize and pause','Blame teammates','Walk away'], correct:1, pts:[0,3,0,1] },
    { id:2, domain:'Self-Regulation', q:'Tanjiro feels panic during a timed exam. He should...',
      opts:['Abandon hard questions','Breathe and refocus','Rush randomly','Request to leave'], correct:1, pts:[1,3,0,1] },
    { id:3, domain:'Empathy',         q:'Jinwoo spots a classmate sitting alone and upset. He...',
      opts:['Walks past',"Asks if they're okay",'Tells others','Waves from afar'], correct:1, pts:[0,3,0,1] },
    { id:4, domain:'Social Skills',   q:'Midoriya disagrees with the team majority. He...',
      opts:['Stays silent','Presents evidence calmly','Argues loudly','Quits the debate'], correct:1, pts:[1,3,0,0] },
    { id:5, domain:'Motivation',      q:'After failing his first test, Naruto...',
      opts:['Gives up','Blames others','Analyses and retries','Copies a friend'], correct:2, pts:[0,0,3,1] },
    { id:6, domain:'Self-Awareness',  q:'Luffy realises his decision hurt a friend. He...',
      opts:['Denies it','Apologises and reflects','Gets defensive','Avoids them'], correct:1, pts:[0,3,1,0] },
    { id:7, domain:'Self-Regulation', q:'Gojo receives unfair public criticism. He...',
      opts:['Explodes','Responds calmly later','Cries publicly','Retaliates'], correct:1, pts:[0,3,1,0] },
    { id:8, domain:'Empathy',         q:"Itadori's friend is stressed about family. He...",
      opts:['Gives advice unprompted','Listens and validates','Shares his own problems','Changes topic'], correct:1, pts:[1,3,0,1] },
    { id:9, domain:'Social Skills',   q:'A new student joins the group. Eren...',
      opts:['Ignores them','Actively includes them','Tests them first','Lets others handle it'], correct:1, pts:[0,3,1,1] },
    { id:10, domain:'Motivation',     q:'Erwin sets a near-impossible long-term goal. He...',
      opts:['Waits indefinitely','Breaks it into steps now',"Announces but doesn't act",'Quits at first failure'], correct:1, pts:[0,3,1,0] },
  ],

  // ── Senior (Grade 12+) ────────────────────────────────────────────────────
  senior: [
    { id:1, domain:'Self-Awareness',  q:'You notice a pattern — you always feel drained after certain social situations. The emotionally intelligent response is to…',
      opts:['Dismiss it as introversion and do nothing','Reflect on which interactions cost vs replenish you','Avoid all social events','Blame other people for your exhaustion'], correct:1, pts:[0,3,1,0] },
    { id:2, domain:'Self-Regulation', q:'During a high-stakes competitive exam you hit a question block. You…',
      opts:['Freeze for the remaining time','Skip strategically, breathe, return with fresh eyes','Rush all remaining answers randomly','Leave early in frustration'], correct:1, pts:[0,3,1,0] },
    { id:3, domain:'Empathy',         q:'A team member\'s performance dips after a personal setback. As the lead, you…',
      opts:['Publicly call out the dip','Privately acknowledge the situation and offer flexible support','Ignore it and let HR deal with it','Tell the rest of the team'], correct:1, pts:[0,3,0,1] },
    { id:4, domain:'Social Skills',   q:'You need to give critical feedback to a peer without destroying the relationship. You…',
      opts:['Avoid it to preserve harmony','Focus on behaviours not character, in private, with care','Give it bluntly so they "get it"','Do it over text so it\'s less awkward'], correct:1, pts:[0,3,1,1] },
    { id:5, domain:'Motivation',      q:'You\'re rejected from your top-choice college. Your emotionally intelligent move is…',
      opts:['Declare college applications meaningless','Process the disappointment, then review what you can control','Apply to no alternatives out of pride','Blame the system entirely'], correct:1, pts:[0,3,0,0] },
    { id:6, domain:'Self-Awareness',  q:'Midway through a group project you realise your communication style is creating tension. You…',
      opts:['Wait for others to adjust','Adapt your style to the team\'s needs while staying authentic','Confront the most vocal person','Withdraw from the project'], correct:1, pts:[0,3,1,0] },
    { id:7, domain:'Self-Regulation', q:'A mentor gives you feedback you believe is factually wrong. You…',
      opts:['Dismiss the mentor entirely','Pause, consider the possibility you\'re wrong, then ask clarifying questions','Immediately post a rebuttal','Silently agree while planning to ignore it'], correct:1, pts:[0,3,0,1] },
    { id:8, domain:'Empathy',         q:'A close friend shares a viewpoint you fundamentally disagree with. You…',
      opts:['End the friendship','Seek to understand their reasoning before responding','Lecture them at length','Passive-aggressively distance yourself'], correct:1, pts:[0,3,0,1] },
    { id:9, domain:'Social Skills',   q:'You\'re in a networking event and feel out of place. You…',
      opts:['Stand in a corner and leave early','Find one genuine curiosity question and open conversations around it','Only approach people you already know','Stay on your phone the whole time'], correct:1, pts:[0,3,1,0] },
    { id:10, domain:'Motivation',     q:'Your long-term goal requires sacrificing some short-term social activities. You…',
      opts:['Abandon the goal','Communicate your priorities honestly to friends and maintain key relationships','Cut off all social contact','Resent the goal and procrastinate'], correct:1, pts:[0,3,0,0] },
  ],
};

// ══════════════════════════════════════════════════════════════════════════════
// IQ QUESTIONS
// ══════════════════════════════════════════════════════════════════════════════

export const IQ_QUESTIONS = {

  // ── Junior (Grade 3-5) ────────────────────────────────────────────────────
  junior: [
    { id:1, domain:'Pattern', q:'What comes next? ★ ★ ☆ ★ ★ ☆ ★ ★ ___',
      opts:['★','☆','●','▲'], correct:1, pts:[0,10,0,0] },
    { id:2, domain:'Spatial',  q:'A square piece of paper is folded in half. How many equal parts are there?',
      opts:['1','2','3','4'], correct:1, pts:[0,10,0,0] },
    { id:3, domain:'Memory',   q:'Look: 🍎 🐶 🌟 🚗 🍎. Which picture appeared twice?',
      opts:['🐶','🌟','🍎','🚗'], correct:2, pts:[0,0,10,0] },
    { id:4, domain:'Pattern',  q:'2, 4, 6, 8 — what number comes next?',
      opts:['9','10','11','12'], correct:1, pts:[0,15,0,0] },
    { id:5, domain:'Spatial',  q:'How many corners does a triangle have?',
      opts:['2','3','4','5'], correct:1, pts:[0,15,0,0] },
    { id:6, domain:'Logic',    q:'All cats have fur. Milo is a cat. Does Milo have fur?',
      opts:['Yes','No','Maybe','Not enough info'], correct:0, pts:[15,0,0,0] },
    { id:7, domain:'Memory',   q:'Cat · Ball · Sun · Hat. Which word was second?',
      opts:['Cat','Ball','Sun','Hat'], correct:1, pts:[0,15,0,0] },
    { id:8, domain:'Pattern',  q:'1, 3, 5, 7 — what comes next?',
      opts:['8','9','10','11'], correct:1, pts:[0,20,0,0] },
    { id:9, domain:'Spatial',  q:'You hold a mirror in front of the letter "b". What do you see?',
      opts:['b','d','p','q'], correct:1, pts:[0,20,0,0] },
    { id:10, domain:'Logic',   q:'A ball costs ₹10. A bat costs ₹100 more than the ball. How much is the bat?',
      opts:['₹100','₹110','₹90','₹120'], correct:1, pts:[0,20,0,0] },
  ],

  // ── Middle (Grade 6-8) ────────────────────────────────────────────────────
  middle: [
    { id:1, domain:'Pattern',  q:'Complete: 2, 6, 18, 54, ___',
      opts:['108','162','72','216'], correct:1, pts:[0,10,0,0] },
    { id:2, domain:'Spatial',  q:'A cube is painted red on all faces then cut into 27 equal smaller cubes. How many small cubes have NO red faces?',
      opts:['1','6','8','9'], correct:0, pts:[10,0,0,0] },
    { id:3, domain:'Memory',   q:'Sequence: 4 → 7 → 2 → 9 → 5 → 1. What was the 4th number?',
      opts:['2','7','9','5'], correct:2, pts:[0,0,10,0] },
    { id:4, domain:'Pattern',  q:'ABBA : BAAB :: CDDC : ?',
      opts:['DCCD','CCDD','DDCC','CDCD'], correct:0, pts:[15,0,0,0] },
    { id:5, domain:'Spatial',  q:'A rectangle has length 8 cm and width 4 cm. What is its area?',
      opts:['24 cm²','32 cm²','16 cm²','48 cm²'], correct:1, pts:[0,15,0,0] },
    { id:6, domain:'Logic',    q:'BOOK : SHELF :: PAINTING : ?',
      opts:['Artist','Canvas','Wall','Museum'], correct:2, pts:[0,0,15,0] },
    { id:7, domain:'Memory',   q:'Memorise: Mars · Venus · Earth · Jupiter. Which was third?',
      opts:['Mars','Venus','Earth','Jupiter'], correct:2, pts:[0,0,15,0] },
    { id:8, domain:'Pattern',  q:'Prime numbers: 2, 3, 5, 7, 11, ___',
      opts:['12','13','14','15'], correct:1, pts:[0,20,0,0] },
    { id:9, domain:'Spatial',  q:'A clock shows 3:00. What is the angle between the hands?',
      opts:['45°','60°','90°','120°'], correct:2, pts:[0,0,20,0] },
    { id:10, domain:'Logic',   q:'Some athletes are students. All students study hard. Therefore:',
      opts:['All athletes study hard','Some athletes study hard','No athletes study','Cannot determine'], correct:1, pts:[0,20,0,0] },
  ],

  // ── Teen (Grade 9-11) — original set ─────────────────────────────────────
  teen: [
    { id:1, domain:'Pattern', q:'Complete: ○ ■ △ ○ ■ ___',
      opts:['○','■','△','★'], correct:2, pts:[0,0,10,0] },
    { id:2, domain:'Spatial',  q:'A cube has how many faces?',
      opts:['4','5','6','8'], correct:2, pts:[0,0,10,0] },
    { id:3, domain:'Memory',   q:'Sequence: 7 → 3 → 9 → 1 → 5. What was the 3rd number?',
      opts:['3','7','9','1'], correct:2, pts:[0,0,10,0] },
    { id:4, domain:'Pattern',  q:'2, 4, 8, 16 — next number?',
      opts:['24','32','30','20'], correct:1, pts:[0,15,0,0] },
    { id:5, domain:'Spatial',  q:'Pyramid with square base: how many edges?',
      opts:['6','7','8','9'], correct:2, pts:[0,0,15,0] },
    { id:6, domain:'Logic',    q:'FIRE : HEAT :: LIGHT : ?',
      opts:['Dark','Shadow','Energy','Sight'], correct:2, pts:[0,0,15,0] },
    { id:7, domain:'Memory',   q:'3×3 grid shown: K M P / R T W / B N X. Row 2, Col 2?',
      opts:['R','T','W','M'], correct:1, pts:[0,15,0,0] },
    { id:8, domain:'Pattern',  q:'Fibonacci: 1, 1, 2, 3, 5 — next?',
      opts:['6','7','8','9'], correct:2, pts:[0,0,20,0] },
    { id:9, domain:'Spatial',  q:'Two L-shaped tiles — one rotated 90°. Same shape?',
      opts:['Yes','No'], correct:0, pts:[20,0] },
    { id:10, domain:'Logic',   q:'All commanders study. Some students are commanders. Therefore:',
      opts:['All students study','No students study','Some students study','Cannot determine'], correct:2, pts:[0,0,20,0] },
  ],

  // ── Senior (Grade 12+) ────────────────────────────────────────────────────
  senior: [
    { id:1, domain:'Pattern',  q:'What comes next in the series: 1, 4, 9, 16, 25, ___?',
      opts:['30','36','32','34'], correct:1, pts:[0,10,0,0] },
    { id:2, domain:'Spatial',  q:'A sphere is cut by a plane through its centre. The cross-section is…',
      opts:['Ellipse','Square','Circle','Parabola'], correct:2, pts:[0,0,10,0] },
    { id:3, domain:'Memory',   q:'Series: 3, 1, 4, 1, 5, 9. What was position 5?',
      opts:['4','1','5','9'], correct:2, pts:[0,0,10,0] },
    { id:4, domain:'Pattern',  q:'If the pattern is 1, 1, 2, 3, 5, 8, 13 — the ratio of consecutive terms approaches…',
      opts:['2','√2','φ (golden ratio)','π'], correct:2, pts:[0,0,15,0] },
    { id:5, domain:'Spatial',  q:'A regular hexagon has how many lines of symmetry?',
      opts:['3','4','6','8'], correct:2, pts:[0,0,15,0] },
    { id:6, domain:'Logic',    q:'If P → Q and Q → R, which must be true?',
      opts:['R → P','P → R','Q → P','None'], correct:1, pts:[0,15,0,0] },
    { id:7, domain:'Memory',   q:'Digits: 8 5 2 7 4 9 3. What was the 5th digit?',
      opts:['7','4','2','9'], correct:1, pts:[0,15,0,0] },
    { id:8, domain:'Pattern',  q:'CMYK and RGB are colour models. What does the K in CMYK stand for?',
      opts:['Khaki','Key (black)','Krypton','Kindred'], correct:1, pts:[0,20,0,0] },
    { id:9, domain:'Spatial',  q:'How many faces does a dodecahedron have?',
      opts:['8','10','12','20'], correct:2, pts:[0,0,20,0] },
    { id:10, domain:'Logic',   q:'All philosophers question assumptions. No scientist questions assumptions. Therefore:',
      opts:['All scientists are philosophers','No scientist is a philosopher','Some philosophers are scientists','Cannot determine'], correct:1, pts:[0,20,0,0] },
  ],
};

// ══════════════════════════════════════════════════════════════════════════════
// PERSONALITY QUESTIONS
// Type mapping: E=Explorer · B=Builder · C=Connector · A=Achiever
// Each answer maps to a type; pts[] maps to opts[].
// Use domainKey (E/B/C/A) — tally the most-selected to determine type.
// ══════════════════════════════════════════════════════════════════════════════

export const PERSONALITY_QUESTIONS = {

  // ── Junior (Grade 3-5) ────────────────────────────────────────────────────
  junior: [
    { id:1, q:'You have free time at school. You would most like to…',
      opts:['Try out a new game nobody has played before','Build something with blocks or craft materials','Play with a big group of friends','Practise something until you\'re really good at it'],
      types:['E','B','C','A'] },
    { id:2, q:'Your class gets to choose a project topic. You vote for…',
      opts:['Something mysterious we\'ve never studied','Making or building a model','An interview with a real person','Achieving the highest score on a quiz'] ,
      types:['E','B','C','A'] },
    { id:3, q:'In a team game you like to be the person who…',
      opts:['Comes up with new ideas','Makes sure the plan actually works','Keeps everyone happy and together','Pushes the team to win'],
      types:['E','B','C','A'] },
    { id:4, q:'When you grow up, which sounds most exciting?',
      opts:['Travelling to explore new places','Inventing something useful','Helping people and making friends','Being the best at something'],
      types:['E','B','C','A'] },
    { id:5, q:'Your favourite type of story is about…',
      opts:['Adventures in unknown lands','A hero who builds or fixes things','Friends helping each other','Someone who trains super hard and wins'],
      types:['E','B','C','A'] },
    { id:6, q:'When something breaks, you want to…',
      opts:['Figure out why it broke (experiment)','Fix it yourself','Ask for help together','Get it working as fast as possible'],
      types:['E','B','C','A'] },
    { id:7, q:'You feel proudest when you…',
      opts:['Discover something surprising','Finish making something with your own hands','Help a friend feel better','Beat your own previous score'],
      types:['E','B','C','A'] },
    { id:8, q:'In class you prefer to…',
      opts:['Ask lots of "why" and "what if" questions','Draw diagrams and make things','Work in pairs or groups','Be the first to answer correctly'],
      types:['E','B','C','A'] },
  ],

  // ── Middle (Grade 6-8) ────────────────────────────────────────────────────
  middle: [
    { id:1, q:'When you have a free weekend, you\'re most likely to…',
      opts:['Try something completely new and random','Start a side project or build something','Hang out and plan something with friends','Grind towards a personal skill goal'],
      types:['E','B','C','A'] },
    { id:2, q:'In a group project, your natural role is…',
      opts:['The idea generator who spots unusual angles','The organiser who makes the plan real','The one who keeps team morale up','The driver who pushes for quality and deadlines'],
      types:['E','B','C','A'] },
    { id:3, q:'When you learn something new, you prefer to…',
      opts:['Experiment and see what happens','Follow a structured method step-by-step','Discuss it with others','Set a goal and measure how well you\'re improving'],
      types:['E','B','C','A'] },
    { id:4, q:'The compliment that means the most to you is…',
      opts:['"You\'re so creative and original"','"You\'re reliable and actually deliver"','"You make everyone feel welcome"','"You\'re seriously dedicated and disciplined"'],
      types:['E','B','C','A'] },
    { id:5, q:'What frustrates you most in a team?',
      opts:['When nobody wants to try new ideas','When nothing actually gets done','When people are cold or don\'t collaborate','When standards are low and mediocrity is accepted'],
      types:['E','B','C','A'] },
    { id:6, q:'Your dream career at this age leans toward…',
      opts:['Explorer, journalist, scientist, or inventor','Engineer, developer, architect, or entrepreneur','Counsellor, teacher, event organiser, or diplomat','Athlete, performer, researcher, or specialist'],
      types:['E','B','C','A'] },
    { id:7, q:'When making a decision, you mostly…',
      opts:['Follow your gut and see what happens','Lay out the pros, cons, and plan','Talk it through with people you trust','Benchmark it against a clear goal or standard'],
      types:['E','B','C','A'] },
    { id:8, q:'What kind of recognition motivates you most?',
      opts:['Being known for original ideas','Seeing your work actually make an impact','Positive feedback from people you care about','Hitting a measurable milestone or rank'],
      types:['E','B','C','A'] },
    { id:9, q:'What\'s your natural reaction when plans change suddenly?',
      opts:['Excited — now we can try something different','Mildly annoyed — I had a system','Okay as long as the group is still together','Frustrated — I had a target and timeline'],
      types:['E','B','C','A'] },
    { id:10, q:'After a challenging task, you feel most satisfied when…',
      opts:['You discovered something unexpected along the way','You executed the plan cleanly','Your team grew closer through it','You exceeded your own expectations'],
      types:['E','B','C','A'] },
  ],

  // ── Teen (Grade 9-11) ─────────────────────────────────────────────────────
  teen: [
    { id:1, q:'Your idea of a productive Saturday is…',
      opts:['Deep-diving into a topic nobody told you to study','Building a working prototype of your idea','Organising a study group or helping a friend','Logging hours on a deliberate practice goal'],
      types:['E','B','C','A'] },
    { id:2, q:'In a debate or group work, others see you as…',
      opts:['The unconventional thinker with surprising angles','The one who turns talk into actual plans','The mediator who keeps the team aligned','The competitor who raises the bar for everyone'],
      types:['E','B','C','A'] },
    { id:3, q:'When a subject is boring to you, you tend to…',
      opts:['Find weird connections to things you love','Look for practical applications','Connect it to a peer and study together','Break the syllabus into measurable chunks and grind'],
      types:['E','B','C','A'] },
    { id:4, q:'What type of project energises you?',
      opts:['Open-ended research into something nobody fully understands','Engineering, coding, or building something tangible','Something that helps or involves your community','A ranked or scored challenge where you compete'],
      types:['E','B','C','A'] },
    { id:5, q:'Which environment do you perform best in?',
      opts:['Unstructured, free to explore ideas','Structured with clear milestones and deliverables','Collaborative where trust is high','High-pressure with a clear win/lose metric'],
      types:['E','B','C','A'] },
    { id:6, q:'What\'s your biggest self-identified weakness?',
      opts:['I lose focus when things become routine','I overthink systems and miss the big picture','I prioritise relationships over efficiency','I push myself so hard I burn out'],
      types:['E','B','C','A'] },
    { id:7, q:'The legacy you want to leave in school is…',
      opts:['The most original mind in the class','The person who actually made things happen','The glue that held the group together','The most dedicated, disciplined student'],
      types:['E','B','C','A'] },
    { id:8, q:'When stressed, your first instinct is to…',
      opts:['Escape into a completely different intellectual tangent','Make a plan and a list','Call or message someone you trust','Refocus on the goal and push harder'],
      types:['E','B','C','A'] },
    { id:9, q:'Future-you in 10 years is most likely…',
      opts:['A researcher, founder, or creative','A product manager, engineer, or operator','A teacher, therapist, community builder, or diplomat','An elite specialist, athlete, artist, or executive'],
      types:['E','B','C','A'] },
    { id:10, q:'What line best describes your relationship with rules?',
      opts:['"Rules are starting points — I question their premises"','"Rules are useful scaffolding if they help me ship"','"Rules matter when they protect people"','"Rules are the discipline system that separates winners from the rest"'],
      types:['E','B','C','A'] },
  ],

  // ── Senior (Grade 12+) ────────────────────────────────────────────────────
  senior: [
    { id:1, q:'When choosing a college major or career path, the most important factor for you is…',
      opts:['Intellectual novelty and depth of inquiry','Tangible real-world impact and creation','Relationships, mentorship, and human connection','Prestige, mastery, and measurable achievement'],
      types:['E','B','C','A'] },
    { id:2, q:'In a high-performing team, the contribution you most naturally make is…',
      opts:['Reframing the problem in a way nobody else did','Designing systems that make execution reliable','Creating psychological safety so everyone contributes','Setting a standard of excellence others aspire to'],
      types:['E','B','C','A'] },
    { id:3, q:'How do you relate to ambiguity?',
      opts:['I seek it — ambiguity means there\'s something to discover','I structure it — I build frameworks to reduce ambiguity','I navigate it through dialogue and shared sense-making','I resolve it fast — I need a clear target to be effective'],
      types:['E','B','C','A'] },
    { id:4, q:'What drives you at a deep level?',
      opts:['Curiosity — I need to understand things at their root','Agency — I need to see my ideas become real','Belonging — I need meaningful connections to thrive','Excellence — I need to know I\'m performing at my best'],
      types:['E','B','C','A'] },
    { id:5, q:'Your academic or work style is best described as…',
      opts:['Exploratory — I range widely before going deep','Systematic — I break complexity into reliable processes','Relational — I learn and do best in tight collaboration','Focused — I pick a priority and go deep until mastery'],
      types:['E','B','C','A'] },
    { id:6, q:'Under pressure, your default mode is…',
      opts:['Reframe the problem — maybe the question is wrong','Build a new system to handle the pressure more efficiently','Rally people and distribute the load relationally','Double down — pressure reveals what you\'re really made of'],
      types:['E','B','C','A'] },
    { id:7, q:'The type of reading you gravitate to is…',
      opts:['Philosophy, cognitive science, or first-principles breakdowns','Biographies of builders, product essays, or systems thinking','Memoirs, social psychology, or community stories','Performance psychology, competitive memoirs, or peak-states'],
      types:['E','B','C','A'] },
    { id:8, q:'If you were advising a younger student, you\'d most likely say…',
      opts:['"Stay curious — question what everyone assumes is true"','"Start building things — real projects beat theory every time"','"Invest in relationships — your network and trust are compounding assets"','"Be relentless — the gap between you and the best is just reps"'],
      types:['E','B','C','A'] },
    { id:9, q:'When you imagine your most fulfilled future self, you see…',
      opts:['A thinker or creator at the frontier of a field','A founder or maker whose work outlives them','A connector whose relationships span generations','An elite who redefined what\'s possible in their domain'],
      types:['E','B','C','A'] },
    { id:10, q:'What would you sacrifice most to achieve your goals?',
      opts:['Structure and routine — I need freedom to wander','Comfort — I\'ll build through chaos if I have to','Solitude — I\'ll give everything to the people around me','Balance — I\'ll outwork everyone if that\'s what it takes'],
      types:['E','B','C','A'] },
  ],
};

// ══════════════════════════════════════════════════════════════════════════════
// PERSONALITY TYPE PROFILES
// ══════════════════════════════════════════════════════════════════════════════

export const PERSONALITY_TYPES = {
  E: {
    id: 'E',
    label: 'Explorer',
    emoji: '🔭',
    tagline: 'Curiosity is your compass.',
    color: '#8b5cf6',
    gradient: 'linear-gradient(135deg, #3b0764, #7c3aed, #a78bfa)',
    description: 'You are driven by questions more than answers. You thrive in open-ended environments, love connecting unexpected ideas, and often see angles others miss entirely.',
    strengths: ['Original thinking', 'Comfort with ambiguity', 'Cross-domain curiosity', 'Independent inquiry'],
    growthArea: 'Channelling exploration into finished outcomes',
    guruMatch: 'Richard Feynman energy — curiosity as a superpower',
  },
  B: {
    id: 'B',
    label: 'Builder',
    emoji: '⚙️',
    tagline: 'You make things real.',
    color: '#3b82f6',
    gradient: 'linear-gradient(135deg, #1e3a5f, #2563eb, #60a5fa)',
    description: 'You bridge ideas and execution. You have a bias for action, love systems and processes, and feel most alive when you see a plan become a finished product.',
    strengths: ['Execution discipline', 'Systems thinking', 'Reliability', 'Turning ideas into reality'],
    growthArea: 'Balancing building speed with stepping back to question the larger vision',
    guruMatch: 'Elon Musk energy — execution and systems at scale',
  },
  C: {
    id: 'C',
    label: 'Connector',
    emoji: '🤝',
    tagline: 'People are your superpower.',
    color: '#10b981',
    gradient: 'linear-gradient(135deg, #064e3b, #059669, #34d399)',
    description: 'You build trust and belonging naturally. You understand what people need, create environments where others thrive, and are at your best when the team is aligned.',
    strengths: ['Emotional intelligence', 'Team cohesion', 'Active listening', 'Inspiring trust'],
    growthArea: 'Setting boundaries and prioritising your own goals alongside others\'',
    guruMatch: 'Brené Brown energy — connection and vulnerability as strength',
  },
  A: {
    id: 'A',
    label: 'Achiever',
    emoji: '🏆',
    tagline: 'You raise the bar.',
    color: '#f59e0b',
    gradient: 'linear-gradient(135deg, #78350f, #d97706, #fcd34d)',
    description: 'You are goal-obsessed in the best way. You outwork, out-prepare, and out-focus. You thrive on clear metrics and push yourself — and everyone around you — to the next level.',
    strengths: ['Relentless focus', 'High standards', 'Competitive drive', 'Deliberate practice'],
    growthArea: 'Avoiding burnout and celebrating progress, not just the final win',
    guruMatch: 'Kobe Bryant energy — the Mamba Mentality applied to learning',
  },
};

// ══════════════════════════════════════════════════════════════════════════════
// SELF-DISCOVERY (SD) QUESTIONS  — kept identical for all age groups
// ══════════════════════════════════════════════════════════════════════════════

export const SD_QUESTIONS = {
  fox: [
    { id:1, q:'Your learning style?', opts:['Visual diagrams', 'Hands-on practice', 'Discussion', 'Reading'], domain:'style' },
    { id:2, q:'Peak energy time?', opts:['Early morning', 'Mid-morning', 'Afternoon', 'Late night'], domain:'rhythm' },
    { id:3, q:'Study environment?', opts:['Dead silent', 'Background music', 'Cafe sounds', 'Nature sounds'], domain:'env' },
    { id:4, q:'Memory trigger?', opts:['Colour coding', 'Storytelling', 'Repetition', 'Mind maps'], domain:'memory' },
    { id:5, q:'Stress response?', opts:['Get organised', 'Take a walk', 'Talk it out', 'Sleep on it'], domain:'stress' },
  ],
  werner: [
    { id:1, q:'How do you best absorb complex ideas?', opts:['Visualise the whole system', 'Break into parts', 'Teach someone else', 'Find analogies'], domain:'cognition' },
    { id:2, q:'What breaks your flow most?', opts:['Notifications', 'Unclear goals', 'Social interruptions', 'Physical discomfort'], domain:'focus' },
    { id:3, q:'How do you recover after a setback?', opts:['Analyse what went wrong', 'Take a full break', 'Seek support', 'Get back to work immediately'], domain:'resilience' },
    { id:4, q:'Your ideal feedback style?', opts:['Blunt and direct', 'Structured and written', 'Warm and conversational', 'Self-assessed'], domain:'growth' },
    { id:5, q:'What motivates long-term effort?', opts:['Mastery and depth', 'Tangible results', 'Recognition from others', 'Personal values'], domain:'drive' },
  ],
};
