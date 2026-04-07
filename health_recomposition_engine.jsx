import { useState, useEffect } from "react";

// ─── OPEN API LAYER ─────────────────────────────────────────────────────────
const HealthAPI = {
  version: "2.0.0",
  baseEndpoint: "/api/v1",
  bodyComposition: {
    age: 46, height_cm: 161.0, gender: "MALE", weight_kg: 90.15, bmi: 34.80,
    body_fat_pct: 34.84, muscle_rate_pct: 61.90, body_water_pct: 47.05,
    bone_mass_kg: 2.94, bmr_kcal: 1638, metabolic_age: 53, visceral_fat_pct: 16.99,
    subcutaneous_fat_pct: 29.88, protein_mass_kg: 14.86, muscle_mass_kg: 55.81,
    weight_without_fat_kg: 58.74, obesity_level: "Fat", skeletal_muscle_mass_kg: 42.09,
  },
  targets: {
    weight_kg: { min: 52, max: 65, ideal: 58 }, bmi: { min: 18.5, max: 24.9, ideal: 22 },
    body_fat_pct: { min: 14, max: 24, ideal: 18 }, body_water_pct: { min: 50, max: 65, ideal: 55 },
    bone_mass_kg: { min: 3.2, max: 3.8, ideal: 3.5 }, visceral_fat_pct: { min: 1, max: 12, ideal: 8 },
    subcutaneous_fat_pct: { min: 15, max: 22, ideal: 18 }, protein_mass_kg: { min: 16, max: 20, ideal: 18 },
    muscle_mass_kg: { min: 55, max: 65, ideal: 60 }, metabolic_age: { ideal: 46 },
  },
  assessRisk(metric, value) {
    const t = this.targets[metric];
    if (!t || (!t.min && !t.max)) return { level: "info", score: 0.7 };
    if (value >= t.min && value <= t.max) return { level: "normal", score: 1 };
    if (value < t.min) { const d = ((t.min - value) / t.min) * 100; return { level: d > 20 ? "danger" : "low", score: d > 20 ? 0.2 : 0.5 }; }
    const d = ((value - t.max) / t.max) * 100;
    return { level: d > 30 ? "danger" : "high", score: d > 30 ? 0.2 : 0.4 };
  },
  calculateHealthScore() {
    const bc = this.bodyComposition;
    const m = ["weight_kg","bmi","body_fat_pct","body_water_pct","bone_mass_kg","visceral_fat_pct","subcutaneous_fat_pct","protein_mass_kg","muscle_mass_kg"];
    const s = m.map(k => this.assessRisk(k, bc[k]).score);
    return Math.round((s.reduce((a, b) => a + b, 0) / s.length) * 100);
  },
  generatePlan() {
    return [
      { id:1, title:"Foundation Reset", weeks:"1–4", color:"#FF6B35",
        goals:[{text:"Lose 3 kg (90 to 87 kg)",priority:"critical"},{text:"Visceral fat down 2% via walking",priority:"critical"},{text:"Hydration to 50%+ (3L/day)",priority:"high"}],
        nutrition:{calories:1800,protein_g:120,carbs_g:150,fat_g:60,rules:["No processed sugar","No fried food","Last meal by 7 PM","30g fiber daily","No soft drinks"]},
        exercise:{weekly_minutes:150,plan:["Brisk walk 30min x 5d","Bodyweight 15min x 3d","Stretch 10min daily"]},
        sleep:{target_hours:7,bedtime:"10:30 PM",rules:["No screens 1hr before bed","Dark cool room"]}},
      { id:2, title:"Fat Burn Acceleration", weeks:"5–12", color:"#F7C948",
        goals:[{text:"Total loss 8 kg (reach 82 kg)",priority:"critical"},{text:"Body fat to ~30%",priority:"critical"},{text:"Protein mass to 16+ kg",priority:"high"},{text:"Muscle mass to 58+ kg",priority:"medium"}],
        nutrition:{calories:1700,protein_g:140,carbs_g:130,fat_g:55,rules:["High-protein breakfast","Complex carbs only","Track every meal","Meal-prep Sundays","Blueprint nutrient density"]},
        exercise:{weekly_minutes:240,plan:["Strength 45min x 3d","HIIT/Cardio 30min x 3d","Yoga 20min x 2d","10K steps daily"]},
        sleep:{target_hours:7.5,bedtime:"10:00 PM",rules:["Consistent wake time","No caffeine after 2 PM"]}},
      { id:3, title:"Body Recomposition", weeks:"13–24", color:"#2EC4B6",
        goals:[{text:"Reach 75 kg (minus 15 kg total)",priority:"critical"},{text:"BMI below 29 (from 34.8)",priority:"critical"},{text:"Visceral fat below 12%",priority:"critical"},{text:"Metabolic age to 48",priority:"high"},{text:"Bone density to 3.2+ kg",priority:"medium"}],
        nutrition:{calories:1650,protein_g:150,carbs_g:120,fat_g:55,rules:["IF 16:8","Anti-inflammatory foods","Omega-3 supplement","No alcohol","Weekly refeed meal"]},
        exercise:{weekly_minutes:300,plan:["Progressive overload x 4d","Zone 2 cardio 40min x 3d","Mobility daily","VO2max target"]},
        sleep:{target_hours:7.5,bedtime:"10:00 PM",rules:["Track with wearable","Optimise environment"]}},
      { id:4, title:"Longevity Protocol", weeks:"25+", color:"#7B61FF",
        goals:[{text:"Target weight 65 kg",priority:"critical"},{text:"BMI below 25",priority:"critical"},{text:"Body fat to 20%",priority:"critical"},{text:"Metabolic age 44 (vs 46)",priority:"high"},{text:"Hydration 55%+",priority:"high"}],
        nutrition:{calories:1700,protein_g:140,carbs_g:140,fat_g:55,rules:["Blueprint meal structure","Longevity supplements","Blood work quarterly","Whole-food focus","Anti-aging nutrition"]},
        exercise:{weekly_minutes:360,plan:["Compound lifts x 4/wk","Zone 2 cardio x 3/wk","Flex+balance daily","Full biomarker tracking"]},
        sleep:{target_hours:8,bedtime:"9:30 PM",rules:["Don't Die Score tracking","Full sleep protocol"]}},
    ];
  },
  webhooks: [
    {method:"POST",path:"/api/v1/body-composition",desc:"Submit body-scan data"},
    {method:"GET",path:"/api/v1/health-score",desc:"Get health score"},
    {method:"GET",path:"/api/v1/plan",desc:"Get personalised plan"},
    {method:"GET",path:"/api/v1/meal-plan/{phase}",desc:"Veg meal plan for phase"},
    {method:"GET",path:"/api/v1/recipes",desc:"Browse recipe database"},
    {method:"GET",path:"/api/v1/recipes/{id}",desc:"Get recipe with macros"},
    {method:"POST",path:"/api/v1/food-log",desc:"Log food intake with calories"},
    {method:"GET",path:"/api/v1/calories/today",desc:"Today's calorie summary"},
    {method:"POST",path:"/api/v1/progress",desc:"Log daily progress"},
    {method:"POST",path:"/api/v1/wearable/sync",desc:"Sync wearable data"},
    {method:"GET",path:"/api/v1/insights",desc:"AI health insights"},
    {method:"POST",path:"/api/v1/webhook/register",desc:"Register callback webhook"},
  ],
};

// ─── VEGETARIAN RECIPE & MEAL DATABASE ──────────────────────────────────────
const RECIPES = {
  breakfast: [
    { id:"b1", name:"Moong Dal Chilla", emoji:"\uD83E\uDED3", time:"15 min", cal:220, protein:14, carbs:22, fat:8, fiber:6,
      ingredients:["1 cup moong dal (soaked, ground)","1/2 cup spinach (chopped)","1 green chilli","1/2 tsp cumin","Salt to taste","1 tsp oil"],
      steps:["Soak moong dal 4 hours, grind to batter","Mix in spinach, chilli, cumin, salt","Heat tawa, spread thin like dosa","Cook both sides with minimal oil","Serve with mint chutney"],
      why:"High protein, low GI. Moong dal is a complete protein source — ideal for fat loss and muscle preservation.",tags:["high-protein","low-gi","gluten-free"]},
    { id:"b2", name:"Paneer Bhurji (No Oil)", emoji:"\uD83E\uDDC0", time:"12 min", cal:280, protein:22, carbs:8, fat:18, fiber:2,
      ingredients:["200g low-fat paneer (crumbled)","1 tomato (chopped)","1 onion (chopped)","1/2 tsp turmeric","1 green chilli","Coriander leaves"],
      steps:["Dry-roast onion in non-stick pan","Add tomato, turmeric, chilli — cook 3 min","Add crumbled paneer, mix well","Cook 5 min on medium heat","Garnish with coriander"],
      why:"22g protein per serving. Paneer is the richest vegetarian protein — critical given your low protein mass (14.86 kg).",tags:["high-protein","keto-friendly","quick"]},
    { id:"b3", name:"Overnight Oats + Seeds", emoji:"\uD83E\uDD63", time:"5 min prep", cal:310, protein:12, carbs:42, fat:10, fiber:8,
      ingredients:["1/2 cup rolled oats","1 cup low-fat curd","1 tbsp chia seeds","1 tbsp flaxseeds","1/2 cup mixed berries","5 almonds (sliced)"],
      steps:["Mix oats, curd, chia, flax in jar","Refrigerate overnight (8+ hrs)","Top with berries and almonds","Add stevia if needed"],
      why:"Fiber-rich, omega-3 from seeds. Slow-digesting carbs keep you full till lunch. Chia boosts hydration (body water low at 47%).",tags:["meal-prep","omega-3","fiber-rich"]},
    { id:"b4", name:"Sprouts Salad Bowl", emoji:"\uD83C\uDF31", time:"10 min", cal:195, protein:12, carbs:28, fat:4, fiber:9,
      ingredients:["1.5 cups mixed sprouts","1 cucumber (diced)","1 tomato (diced)","Lemon juice","Chaat masala","Coriander and mint"],
      steps:["Steam sprouts lightly (3 min)","Toss with cucumber, tomato","Squeeze lemon, add chaat masala","Top with fresh herbs"],
      why:"Sprouts have 2x the protein of raw legumes. Alkaline food reduces inflammation — helps lower visceral fat.",tags:["raw","alkaline","anti-inflammatory"]},
    { id:"b5", name:"Ragi Dosa + Sambar", emoji:"\uD83E\uDED3", time:"20 min", cal:260, protein:10, carbs:38, fat:7, fiber:7,
      ingredients:["1 cup ragi flour","1/4 cup rice flour","Salt, cumin","Water to batter","1 cup sambar (dal-based)"],
      steps:["Mix ragi, rice flour, salt, cumin with water","Rest batter 30 min","Make thin dosa on hot tawa","Serve with sambar"],
      why:"Ragi is calcium-rich — critical for your low bone mass (2.94 kg vs 3.2 target). High fiber reduces subcutaneous fat.",tags:["calcium-rich","bone-health","south-indian"]},
    { id:"b6", name:"Besan Omelette", emoji:"\uD83C\uDF73", time:"10 min", cal:230, protein:15, carbs:20, fat:9, fiber:5,
      ingredients:["1/2 cup besan","1/4 cup water","1 onion (sliced thin)","1 tomato (chopped)","Turmeric, chilli flakes","Coriander leaves, salt"],
      steps:["Whisk besan, water, turmeric, salt into thin batter","Fold in onion, tomato, coriander","Pour on hot non-stick pan","Cook both sides till golden","Serve with green chutney"],
      why:"15g protein without eggs. High in folate and iron — supports muscle protein synthesis.",tags:["high-protein","egg-free","iron-rich"]},
  ],
  lunch: [
    { id:"l1", name:"Rajma Brown Rice Bowl", emoji:"\uD83C\uDF5B", time:"30 min", cal:420, protein:18, carbs:58, fat:10, fiber:14,
      ingredients:["1 cup rajma (cooked)","3/4 cup brown rice (cooked)","1 tomato gravy","Cumin, turmeric, garam masala","Onion, ginger-garlic paste","Coriander for garnish"],
      steps:["Pressure-cook rajma (or use pre-soaked)","Saute onion, ginger-garlic in 1 tsp oil","Add tomato, spices — cook 5 min","Add rajma, simmer 15 min","Serve over brown rice"],
      why:"Rajma + rice = complete protein (all amino acids). Brown rice has 3x the fiber of white — controls blood sugar and reduces BMI.",tags:["complete-protein","high-fiber","meal-prep"]},
    { id:"l2", name:"Palak Paneer + Roti", emoji:"\uD83E\uDD6C", time:"25 min", cal:385, protein:24, carbs:35, fat:16, fiber:6,
      ingredients:["200g paneer cubes","3 cups spinach (blanched)","1 onion, 2 tomatoes","Ginger-garlic paste","2 whole wheat roti","Spices: cumin, garam masala"],
      steps:["Blanch spinach, blend smooth","Saute onion, ginger-garlic, tomato","Add spinach puree, spices","Add paneer cubes, simmer 10 min","Serve with 2 whole wheat roti"],
      why:"Spinach is iron + calcium dense — targets both your low bone mass and protein mass. Paneer adds 24g protein.",tags:["iron-rich","calcium","high-protein"]},
    { id:"l3", name:"Chana Masala + Quinoa", emoji:"\uD83E\uDED8", time:"25 min", cal:395, protein:20, carbs:52, fat:10, fiber:12,
      ingredients:["1 cup chickpeas (cooked)","3/4 cup quinoa (cooked)","Onion-tomato masala","Cumin, coriander, amchur","Ginger, green chilli","Lemon, fresh coriander"],
      steps:["Cook quinoa as per packet","Saute onion, ginger till golden","Add tomatoes, all spices","Add chickpeas, 1 cup water, simmer","Serve over quinoa with lemon"],
      why:"Quinoa is a rare plant-based complete protein. Combined with chickpeas = 20g protein. Lowers visceral fat via soluble fiber.",tags:["complete-protein","quinoa","anti-inflammatory"]},
    { id:"l4", name:"Dal Tadka + Cauliflower Rice", emoji:"\uD83C\uDF72", time:"20 min", cal:320, protein:16, carbs:30, fat:12, fiber:8,
      ingredients:["1 cup toor dal (cooked)","1 small cauliflower (riced)","Ghee 1 tsp for tadka","Cumin, mustard, curry leaves","Garlic, dry red chilli","Turmeric, salt, lemon"],
      steps:["Rice the cauliflower in food processor","Cook toor dal till soft","Make tadka: ghee + cumin, mustard, garlic, curry leaves","Pour tadka over dal","Serve over cauliflower rice"],
      why:"Cauliflower rice cuts carbs by 80% vs regular rice — accelerates fat loss. Dal provides sustained protein. Only 320 cal.",tags:["low-carb","fat-loss","gut-health"]},
    { id:"l5", name:"Tofu Tikka Wrap", emoji:"\uD83C\uDF2F", time:"20 min", cal:350, protein:22, carbs:32, fat:14, fiber:5,
      ingredients:["200g firm tofu (cubed)","2 whole wheat wrap","Hung curd marinade","Tikka masala spice","Bell peppers, onion","Mint chutney, lettuce"],
      steps:["Marinate tofu in hung curd + tikka spice 30 min","Grill or air-fry till charred","Warm wraps, spread mint chutney","Fill with tofu, grilled veggies, lettuce","Roll tight and serve"],
      why:"Tofu delivers 22g protein with minimal fat. Soy isoflavones help reduce visceral fat specifically — backed by clinical studies.",tags:["high-protein","soy","portable"]},
  ],
  dinner: [
    { id:"d1", name:"Mixed Dal Khichdi", emoji:"\uD83C\uDF5A", time:"25 min", cal:340, protein:14, carbs:48, fat:8, fiber:8,
      ingredients:["1/3 cup moong dal","1/3 cup masoor dal","1/2 cup brown rice","Turmeric, cumin, ghee 1 tsp","Mixed veggies (carrot, beans, peas)","Ginger, green chilli"],
      steps:["Wash dals and rice together","Pressure cook with veggies, turmeric, salt","3 whistles, let pressure release","Tadka with ghee, cumin, ginger","Serve with pickle and curd"],
      why:"Ayurvedic healing food — easy to digest for dinner. Multi-dal combination improves amino acid profile. Light enough for 7 PM cutoff.",tags:["easy-digest","ayurvedic","comfort"]},
    { id:"d2", name:"Grilled Paneer Salad", emoji:"\uD83E\uDD57", time:"15 min", cal:295, protein:20, carbs:12, fat:18, fiber:4,
      ingredients:["150g paneer (sliced thick)","Mixed greens, rocket","Cherry tomatoes, cucumber","Olive oil 1 tsp + lemon dressing","Walnuts 5-6 pieces","Black pepper, chaat masala"],
      steps:["Slice paneer into thick fingers","Grill on tawa with black pepper","Arrange greens, tomato, cucumber","Top with warm paneer","Dress with olive oil + lemon, add walnuts"],
      why:"Low-carb, high-protein dinner. Walnuts add omega-3 for heart health. Under 300 cal — perfect for weight-loss dinner.",tags:["low-carb","omega-3","light-dinner"]},
    { id:"d3", name:"Lauki Kofta Curry", emoji:"\uD83C\uDF5B", time:"30 min", cal:280, protein:10, carbs:28, fat:14, fiber:5,
      ingredients:["2 cups lauki (grated, squeezed)","2 tbsp besan","Spices for kofta","Onion-tomato gravy","Cashew paste (4-5 cashews)","1 whole wheat roti"],
      steps:["Mix grated lauki, besan, spices — form balls","Bake or air-fry kofta till firm","Make onion-tomato gravy with cashew paste","Add kofta to gravy, simmer 10 min","Serve with 1 roti"],
      why:"Lauki is 96% water — directly boosts your low body water %. Extremely low calorie but filling. Baked kofta avoids oil.",tags:["hydrating","low-cal","water-rich"]},
    { id:"d4", name:"Masoor Dal Soup + Toast", emoji:"\uD83C\uDF5C", time:"20 min", cal:260, protein:16, carbs:34, fat:6, fiber:10,
      ingredients:["1 cup masoor dal","2 tomatoes","Ginger, garlic, cumin","Turmeric, black pepper","Lemon juice","2 slices multigrain bread (toasted)"],
      steps:["Cook masoor dal with tomato, ginger, garlic, turmeric","Blend smooth when done","Season with cumin, black pepper, lemon","Serve with multigrain toast"],
      why:"Masoor dal has the highest protein-to-calorie ratio among dals. Soup increases satiety. Black pepper boosts turmeric absorption 2000%.",tags:["high-protein","anti-inflammatory","soup"]},
    { id:"d5", name:"Vegetable Stir-Fry + Tofu", emoji:"\uD83E\uDD58", time:"15 min", cal:275, protein:18, carbs:20, fat:12, fiber:6,
      ingredients:["200g firm tofu (cubed)","Broccoli, bell pepper, mushroom","Soy sauce 1 tbsp","Ginger-garlic, sesame oil 1 tsp","Sesame seeds","Chilli flakes"],
      steps:["Press tofu dry, cube it","Stir-fry veggies in sesame oil on high heat","Add tofu, soy sauce, ginger-garlic","Toss 3-4 min till slightly charred","Top with sesame seeds"],
      why:"High protein (18g), very low calorie (275). Broccoli is anti-cancer and anti-inflammatory. Mushrooms boost immunity.",tags:["high-protein","anti-cancer","quick"]},
  ],
  snacks: [
    { id:"s1", name:"Roasted Chana", emoji:"\uD83E\uDED8", cal:130, protein:8, carbs:18, fat:3, fiber:5, portion:"1/4 cup",
      why:"Crunchy, portable, 8g protein. Replaces chips and namkeen. Low GI snack." },
    { id:"s2", name:"Greek Yogurt + Flax", emoji:"\uD83E\uDD5B", cal:120, protein:14, carbs:8, fat:4, fiber:2, portion:"1 cup + 1 tbsp",
      why:"14g protein! Probiotics for gut health. Flax adds omega-3 for heart protection." },
    { id:"s3", name:"Mixed Nuts (Measured)", emoji:"\uD83E\uDD5C", cal:180, protein:6, carbs:6, fat:16, fiber:3, portion:"20g mix",
      why:"Healthy fats reduce inflammation. MUST measure — 20g only. Almonds best for bone calcium." },
    { id:"s4", name:"Paneer Tikka Bites", emoji:"\uD83E\uDDC0", cal:150, protein:12, carbs:4, fat:10, fiber:1, portion:"100g paneer",
      why:"12g protein snack. Grill with spices, no oil. Satisfies cravings without sugar spike." },
    { id:"s5", name:"Makhana (Fox Nuts)", emoji:"\u26AA", cal:100, protein:4, carbs:18, fat:1, fiber:2, portion:"1 cup dry-roasted",
      why:"Ultra-low calorie, high volume. Rich in calcium and magnesium — targets bone mass deficit." },
    { id:"s6", name:"Sprouts Chaat", emoji:"\uD83C\uDF31", cal:140, protein:10, carbs:20, fat:2, fiber:7, portion:"1 cup",
      why:"Living food with max enzyme activity. 10g protein, 7g fiber. Add lemon + chaat masala." },
    { id:"s7", name:"Buttermilk (Chaas)", emoji:"\uD83E\uDD5B", cal:45, protein:3, carbs:4, fat:1, fiber:0, portion:"1 tall glass",
      why:"Almost zero calories. Probiotics + electrolytes. Directly improves body water % (your weak point)." },
    { id:"s8", name:"Cucumber + Hummus", emoji:"\uD83E\uDD52", cal:110, protein:5, carbs:10, fat:6, fiber:3, portion:"1 cup + 2 tbsp",
      why:"Hydrating + satisfying. Hummus adds chickpea protein. Perfect 4 PM snack." },
  ],
};

const MEAL_PLANS = {
  1: { phase:"Foundation", cal:1800, meals:[
    {slot:"6:30 AM",name:"Warm Lemon Water",cal:5,note:"Kickstart metabolism + hydration"},
    {slot:"7:30 AM",name:"Moong Dal Chilla x 2",cal:440,recipe:"b1",note:"High protein start"},
    {slot:"10:30 AM",name:"Buttermilk + Roasted Chana",cal:175,recipe:"s7",note:"Hydration + protein snack"},
    {slot:"1:00 PM",name:"Rajma Brown Rice Bowl",cal:420,recipe:"l1",note:"Complete protein lunch"},
    {slot:"4:00 PM",name:"Greek Yogurt + Flax",cal:120,recipe:"s2",note:"Probiotics + omega-3"},
    {slot:"6:30 PM",name:"Mixed Dal Khichdi + Curd",cal:390,recipe:"d1",note:"Easy-digest dinner"},
    {slot:"8:00 PM",name:"Turmeric Milk (Haldi Doodh)",cal:80,note:"Anti-inflammatory, sleep aid"},
  ]},
  2: { phase:"Fat Burn", cal:1700, meals:[
    {slot:"6:30 AM",name:"Black Coffee / Green Tea",cal:5,note:"Fat oxidation boost"},
    {slot:"7:30 AM",name:"Paneer Bhurji + 1 Roti",cal:380,recipe:"b2",note:"22g protein breakfast"},
    {slot:"10:30 AM",name:"Makhana + Green Tea",cal:105,recipe:"s5",note:"Low-cal, calcium-rich"},
    {slot:"1:00 PM",name:"Palak Paneer + 2 Roti",cal:385,recipe:"l2",note:"Iron + calcium + protein"},
    {slot:"4:00 PM",name:"Sprouts Chaat",cal:140,recipe:"s6",note:"Living protein snack"},
    {slot:"6:30 PM",name:"Grilled Paneer Salad",cal:295,recipe:"d2",note:"Light, high-protein dinner"},
    {slot:"8:00 PM",name:"Chamomile Tea",cal:0,note:"Calming, supports sleep quality"},
  ]},
  3: { phase:"Recomposition", cal:1650, meals:[
    {slot:"7:00 AM",name:"Black Coffee (IF opens 12 PM)",cal:5,note:"16:8 intermittent fasting"},
    {slot:"12:00 PM",name:"Chana Masala + Quinoa",cal:395,recipe:"l3",note:"Break fast with complete protein"},
    {slot:"3:00 PM",name:"Paneer Tikka Bites + Nuts",cal:330,recipe:"s4",note:"Protein + healthy fats"},
    {slot:"5:00 PM",name:"Overnight Oats + Seeds",cal:310,recipe:"b3",note:"Omega-3, slow carbs"},
    {slot:"7:30 PM",name:"Vegetable Stir-Fry + Tofu",cal:275,recipe:"d5",note:"Last meal — high protein, low cal"},
    {slot:"8:30 PM",name:"Turmeric Milk",cal:80,note:"Anti-inflammatory close"},
  ]},
  4: { phase:"Longevity", cal:1700, meals:[
    {slot:"6:00 AM",name:"Warm Water + Supplements",cal:10,note:"Omega-3, Vit D, Magnesium"},
    {slot:"7:00 AM",name:"Besan Omelette + Sprouts",cal:370,recipe:"b6",note:"Iron + folate + protein"},
    {slot:"10:00 AM",name:"Mixed Nuts + Chaas",cal:225,recipe:"s3",note:"Healthy fats + probiotics"},
    {slot:"1:00 PM",name:"Tofu Tikka Wrap + Dal Soup",cal:610,recipe:"l5",note:"Complete meal — all macros"},
    {slot:"4:00 PM",name:"Cucumber + Hummus",cal:110,recipe:"s8",note:"Hydration snack"},
    {slot:"6:30 PM",name:"Masoor Dal Soup + Toast",cal:260,recipe:"d4",note:"Anti-inflammatory dinner"},
    {slot:"8:00 PM",name:"Golden Milk + Ashwagandha",cal:85,note:"Longevity and recovery"},
  ]},
};

// ─── SMALL COMPONENTS ────────────────────────────────────────────────────────
const Badge = ({ level }) => {
  const c = { danger:{bg:"#FF3B3018",fg:"#FF6B6B",bd:"#FF3B3030"}, obese:{bg:"#FF3B3018",fg:"#FF6B6B",bd:"#FF3B3030"},
    high:{bg:"#FF950018",fg:"#FFB347",bd:"#FF950030"}, low:{bg:"#FF950018",fg:"#FFB347",bd:"#FF950030"},
    normal:{bg:"#34C75918",fg:"#6EE7A0",bd:"#34C75930"}, excellent:{bg:"#34C75918",fg:"#6EE7A0",bd:"#34C75930"},
    info:{bg:"#7B61FF18",fg:"#A78BFA",bd:"#7B61FF30"} }[level.toLowerCase()] || {bg:"#ffffff10",fg:"#aaa",bd:"#ffffff20"};
  return <span style={{fontSize:10,fontWeight:700,letterSpacing:"0.08em",textTransform:"uppercase",padding:"3px 8px",borderRadius:4,background:c.bg,color:c.fg,border:`1px solid ${c.bd}`}}>{level}</span>;
};
const Metric = ({ label, value, unit, status, target }) => (
  <div style={{background:"rgba(255,255,255,0.025)",border:"1px solid rgba(255,255,255,0.05)",borderRadius:12,padding:16,display:"flex",flexDirection:"column",gap:5}}>
    <div style={{fontSize:10,color:"#6B7280",letterSpacing:"0.08em",textTransform:"uppercase",fontWeight:600}}>{label}</div>
    <div style={{display:"flex",alignItems:"baseline",gap:4}}>
      <span style={{fontSize:26,fontWeight:800,color:"#F0F0F0",fontFamily:"'DM Sans',sans-serif"}}>{value}</span>
      {unit&&<span style={{fontSize:12,color:"#555"}}>{unit}</span>}
    </div>
    <div style={{display:"flex",alignItems:"center",gap:6,flexWrap:"wrap"}}>
      <Badge level={status}/>{target&&<span style={{fontSize:10,color:"#444"}}>Target: {target}</span>}
    </div>
  </div>
);
const Dot = ({priority}) => <div style={{width:6,height:6,borderRadius:"50%",marginTop:6,flexShrink:0,background:priority==="critical"?"#FF3B30":priority==="high"?"#FF9500":"#34C759"}}/>;
const Tag = ({text,color}) => <span style={{fontSize:10,padding:"3px 8px",borderRadius:4,background:color?`${color}12`:"rgba(255,255,255,0.04)",color:color||"#888",whiteSpace:"nowrap"}}>{text}</span>;
const MacroBar = ({label, value, max, color, unit="g"}) => {
  const pct = Math.min((value/max)*100, 100);
  return (<div style={{marginBottom:6}}>
    <div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}>
      <span style={{fontSize:10,color:"#888",fontWeight:600}}>{label}</span>
      <span style={{fontSize:10,color:"#aaa"}}>{value}{unit} / {max}{unit}</span>
    </div>
    <div style={{height:4,borderRadius:2,background:"rgba(255,255,255,0.06)"}}>
      <div style={{height:4,borderRadius:2,background:color,width:`${pct}%`,transition:"width 0.6s ease"}}/>
    </div>
  </div>);
};
const PhaseDetail = ({ phase }) => (
  <div style={{display:"flex",flexDirection:"column",gap:14,marginTop:14}}>
    <div>
      <div style={{fontSize:10,fontWeight:700,color:"#6B7280",letterSpacing:"0.12em",textTransform:"uppercase",marginBottom:6}}>GOALS</div>
      {phase.goals.map((g,i)=>(<div key={i} style={{display:"flex",gap:8,marginBottom:6}}><Dot priority={g.priority}/><span style={{fontSize:13,color:"#C0C0C0",lineHeight:1.45}}>{g.text}</span></div>))}
    </div>
    <div style={{background:"rgba(0,0,0,0.25)",borderRadius:10,padding:14}}>
      <div style={{fontSize:10,fontWeight:700,color:"#6B7280",letterSpacing:"0.12em",marginBottom:10}}>NUTRITION</div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:6,marginBottom:10}}>
        {[["Cal",phase.nutrition.calories],["Pro",phase.nutrition.protein_g+"g"],["Carb",phase.nutrition.carbs_g+"g"],["Fat",phase.nutrition.fat_g+"g"]].map(([l,v],i)=>(<div key={i} style={{textAlign:"center"}}><div style={{fontSize:17,fontWeight:800,color:phase.color}}>{v}</div><div style={{fontSize:10,color:"#555"}}>{l}</div></div>))}
      </div>
      <div style={{display:"flex",flexWrap:"wrap",gap:4}}>{phase.nutrition.rules.map((r,i)=><Tag key={i} text={r}/>)}</div>
    </div>
    <div style={{background:"rgba(0,0,0,0.25)",borderRadius:10,padding:14}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
        <span style={{fontSize:10,fontWeight:700,color:"#6B7280",letterSpacing:"0.12em"}}>EXERCISE</span>
        <span style={{fontSize:12,color:phase.color,fontWeight:700}}>{phase.exercise.weekly_minutes} min/wk</span>
      </div>
      {phase.exercise.plan.map((p,i)=>(<div key={i} style={{fontSize:12,color:"#A0A0A0",padding:"4px 0",borderBottom:i<phase.exercise.plan.length-1?"1px solid rgba(255,255,255,0.03)":"none"}}>&#9656; {p}</div>))}
    </div>
    <div style={{background:"rgba(0,0,0,0.25)",borderRadius:10,padding:14}}>
      <div style={{fontSize:10,fontWeight:700,color:"#6B7280",letterSpacing:"0.12em",marginBottom:8}}>SLEEP</div>
      <div style={{display:"flex",gap:14,marginBottom:8,alignItems:"baseline"}}>
        <span style={{fontSize:20,fontWeight:800,color:"#7B61FF"}}>{phase.sleep.target_hours}h</span>
        <span style={{fontSize:13,color:"#888"}}>Bed by {phase.sleep.bedtime}</span>
      </div>
      <div style={{display:"flex",flexWrap:"wrap",gap:4}}>{phase.sleep.rules.map((r,i)=><Tag key={i} text={r} color="#7B61FF"/>)}</div>
    </div>
  </div>
);

// ─── RECIPE DETAIL MODAL ────────────────────────────────────────────────────
const RecipeModal = ({recipe, onClose, onLog}) => {
  if (!recipe) return null;
  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.85)",zIndex:999,display:"flex",alignItems:"flex-end",justifyContent:"center"}} onClick={onClose}>
      <div onClick={e=>e.stopPropagation()} style={{background:"#12131A",borderRadius:"20px 20px 0 0",maxWidth:480,width:"100%",maxHeight:"85vh",overflowY:"auto",padding:"24px 20px 32px"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:16}}>
          <div>
            <div style={{fontSize:28,marginBottom:4}}>{recipe.emoji}</div>
            <h2 style={{fontSize:18,fontWeight:800,color:"#F0F0F0",margin:0}}>{recipe.name}</h2>
            <div style={{fontSize:12,color:"#666",marginTop:4}}>{recipe.time||recipe.portion} &middot; {recipe.cal} kcal</div>
          </div>
          <button onClick={onClose} style={{background:"rgba(255,255,255,0.06)",border:"none",color:"#888",fontSize:18,width:32,height:32,borderRadius:8,cursor:"pointer"}}>&#10005;</button>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8,marginBottom:16}}>
          {[["Protein",recipe.protein,"g","#2EC4B6"],["Carbs",recipe.carbs,"g","#F7C948"],["Fat",recipe.fat,"g","#FF6B35"],["Fiber",recipe.fiber,"g","#7B61FF"]].map(([l,v,u,c],i)=>(
            <div key={i} style={{textAlign:"center",padding:"10px 6px",borderRadius:10,background:`${c}10`,border:`1px solid ${c}20`}}>
              <div style={{fontSize:18,fontWeight:800,color:c}}>{v}<span style={{fontSize:11}}>{u}</span></div>
              <div style={{fontSize:10,color:"#666"}}>{l}</div>
            </div>
          ))}
        </div>
        <div style={{background:"rgba(46,196,182,0.08)",border:"1px solid rgba(46,196,182,0.15)",borderRadius:10,padding:12,marginBottom:16}}>
          <div style={{fontSize:10,fontWeight:700,color:"#2EC4B6",letterSpacing:"0.1em",marginBottom:4}}>WHY THIS RECIPE FOR YOU</div>
          <div style={{fontSize:12,color:"#A0C4C0",lineHeight:1.5}}>{recipe.why}</div>
        </div>
        {recipe.tags&&<div style={{display:"flex",flexWrap:"wrap",gap:4,marginBottom:16}}>{recipe.tags.map((t,i)=><Tag key={i} text={`#${t}`} color="#7B61FF"/>)}</div>}
        {recipe.ingredients&&<>
          <div style={{fontSize:10,fontWeight:700,color:"#6B7280",letterSpacing:"0.12em",marginBottom:8}}>INGREDIENTS</div>
          {recipe.ingredients.map((ing,i)=>(<div key={i} style={{fontSize:13,color:"#B0B0B0",padding:"5px 0",borderBottom:"1px solid rgba(255,255,255,0.03)",display:"flex",gap:8}}><span style={{color:"#2EC4B6"}}>&#9679;</span>{ing}</div>))}
        </>}
        {recipe.steps&&<>
          <div style={{fontSize:10,fontWeight:700,color:"#6B7280",letterSpacing:"0.12em",marginTop:16,marginBottom:8}}>STEPS</div>
          {recipe.steps.map((s,i)=>(<div key={i} style={{display:"flex",gap:10,marginBottom:10,alignItems:"flex-start"}}>
            <div style={{width:22,height:22,borderRadius:6,background:"rgba(123,97,255,0.15)",color:"#7B61FF",fontSize:11,fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>{i+1}</div>
            <span style={{fontSize:13,color:"#B0B0B0",lineHeight:1.5}}>{s}</span>
          </div>))}
        </>}
        <button onClick={()=>{onLog(recipe);onClose();}} style={{width:"100%",padding:"14px",borderRadius:12,border:"none",background:"linear-gradient(135deg,#2EC4B6,#7B61FF)",color:"#fff",fontSize:14,fontWeight:700,cursor:"pointer",marginTop:16,letterSpacing:"0.04em"}}>
          + Log This Meal ({recipe.cal} kcal)
        </button>
      </div>
    </div>
  );
};

// ─── MAIN APP ────────────────────────────────────────────────────────────────
export default function App() {
  const [tab, setTab] = useState("dashboard");
  const [openPhase, setOpenPhase] = useState(1);
  const [mealPhase, setMealPhase] = useState(1);
  const [recipeFilter, setRecipeFilter] = useState("breakfast");
  const [selectedRecipe, setSelectedRecipe] = useState(null);
  const [foodLog, setFoodLog] = useState([]);
  const [ready, setReady] = useState(false);
  useEffect(() => { setTimeout(() => setReady(true), 80); }, []);

  const bc = HealthAPI.bodyComposition;
  const plan = HealthAPI.generatePlan();
  const score = HealthAPI.calculateHealthScore();
  const currentMealPlan = MEAL_PLANS[mealPhase];

  const loggedCal = foodLog.reduce((s, f) => s + f.cal, 0);
  const loggedP = foodLog.reduce((s, f) => s + (f.protein||0), 0);
  const loggedC = foodLog.reduce((s, f) => s + (f.carbs||0), 0);
  const loggedF = foodLog.reduce((s, f) => s + (f.fat||0), 0);
  const targetCal = currentMealPlan.cal;

  const addToLog = (item) => {
    setFoodLog(prev => [...prev, { name: item.name, cal: item.cal, protein: item.protein||0, carbs: item.carbs||0, fat: item.fat||0, time: new Date().toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'}) }]);
  };
  const clearLog = () => setFoodLog([]);
  const allRecipes = [...RECIPES.breakfast,...RECIPES.lunch,...RECIPES.dinner,...RECIPES.snacks];
  const findRecipe = (id) => allRecipes.find(r => r.id === id);

  const tabDefs = [
    {id:"dashboard",label:"Dashboard",icon:"\u25C9"},
    {id:"plan",label:"Plan",icon:"\u25C8"},
    {id:"nutrition",label:"Nutrition",icon:"\uD83E\uDD57"},
    {id:"api",label:"API",icon:"\u27D0"},
  ];

  const Gauge = ({value,max,color,size=82}) => {
    const pct = Math.min(value/max,1); const r=(size-10)/2; const circ=Math.PI*r;
    return (<svg width={size} height={size/2+8} viewBox={`0 0 ${size} ${size/2+8}`}>
      <path d={`M 5 ${size/2+3} A ${r} ${r} 0 0 1 ${size-5} ${size/2+3}`} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={8} strokeLinecap="round"/>
      <path d={`M 5 ${size/2+3} A ${r} ${r} 0 0 1 ${size-5} ${size/2+3}`} fill="none" stroke={color} strokeWidth={8} strokeLinecap="round" strokeDasharray={`${pct*circ} ${circ}`} style={{transition:"stroke-dasharray 1s ease"}}/>
      <text x={size/2} y={size/2-2} textAnchor="middle" fill="#F0F0F0" fontSize={size/4} fontWeight="800" fontFamily="'DM Sans',sans-serif">{value}</text>
      <text x={size/2} y={size/2+14} textAnchor="middle" fill="#555" fontSize={9} fontWeight="600">/ {max}</text>
    </svg>);
  };

  const wrap = {maxWidth:480,margin:"0 auto",padding:0,opacity:ready?1:0,transition:"opacity 0.5s ease"};

  return (
    <div style={{minHeight:"100vh",background:"#08090C",color:"#E0E0E0",fontFamily:"'DM Sans',-apple-system,sans-serif"}}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,300;9..40,500;9..40,700;9..40,800&family=JetBrains+Mono:wght@400;600&display=swap" rel="stylesheet"/>
      <div style={wrap}>

        {/* HEADER */}
        <div style={{background:"linear-gradient(180deg,#0F1015,#08090C)",borderBottom:"1px solid rgba(255,255,255,0.04)",padding:"18px 20px 0"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:16}}>
            <div>
              <div style={{fontSize:9,letterSpacing:"0.25em",color:"#444",fontWeight:600,textTransform:"uppercase",marginBottom:3}}>Hemant &middot; Vegetarian Protocol</div>
              <h1 style={{fontSize:20,fontWeight:800,margin:0,background:"linear-gradient(135deg,#FF6B35,#F7C948,#2EC4B6,#7B61FF)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>RECOMPOSITION ENGINE v2</h1>
            </div>
            <div style={{textAlign:"center"}}><Gauge value={score} max={100} color={score<40?"#FF3B30":score<60?"#FF9500":"#34C759"}/></div>
          </div>
          <div style={{display:"flex",gap:2}}>
            {tabDefs.map(t=>(<button key={t.id} onClick={()=>setTab(t.id)} style={{flex:1,padding:"10px 0",border:"none",cursor:"pointer",borderRadius:"6px 6px 0 0",background:tab===t.id?"rgba(255,255,255,0.04)":"transparent",color:tab===t.id?"#F0F0F0":"#444",fontSize:11,fontWeight:700,letterSpacing:"0.04em",borderBottom:tab===t.id?"2px solid #7B61FF":"2px solid transparent",transition:"all 0.25s ease"}}><span style={{marginRight:4}}>{t.icon}</span>{t.label}</button>))}
          </div>
        </div>

        {/* DASHBOARD */}
        {tab==="dashboard"&&(
          <div style={{padding:"16px 20px 32px"}}>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:16}}>
              {[["Age",bc.age,"yrs"],["Height",bc.height_cm,"cm"],["Weight",bc.weight_kg,"kg"]].map(([l,v,u],i)=>(
                <div key={i} style={{background:"rgba(255,255,255,0.025)",borderRadius:10,padding:"12px 10px",textAlign:"center"}}>
                  <div style={{fontSize:10,color:"#555",letterSpacing:"0.08em",fontWeight:600,textTransform:"uppercase"}}>{l}</div>
                  <div style={{fontSize:22,fontWeight:800,color:"#F0F0F0"}}>{v}<span style={{fontSize:11,color:"#555",marginLeft:2}}>{u}</span></div>
                </div>
              ))}
            </div>
            <div style={{background:"#FF3B3010",border:"1px solid #FF3B3025",borderRadius:12,padding:14,marginBottom:16}}>
              <div style={{fontSize:10,fontWeight:700,letterSpacing:"0.12em",color:"#FF6B6B",marginBottom:8}}>&#9888;  CRITICAL ALERTS</div>
              {["Visceral Fat 16.99% — DANGER (safe <12%). Heart disease and diabetes risk.","BMI 34.80 — OBESE Class I. Need to lose ~25 kg.","Body Fat 34.84% — OBESE. Healthy range 14-24%.","Metabolic Age 53 — 7 years older than actual (46)."].map((a,i)=>(
                <div key={i} style={{fontSize:12,color:"#E0A0A0",marginBottom:6,paddingLeft:12,borderLeft:"2px solid #FF3B3040",lineHeight:1.45}}>{a}</div>
              ))}
            </div>
            <div style={{fontSize:10,fontWeight:700,letterSpacing:"0.12em",color:"#555",marginBottom:8,textTransform:"uppercase"}}>All Metrics</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
              <Metric label="BMI" value={bc.bmi} status="obese" target="<25"/><Metric label="Body Fat" value={bc.body_fat_pct} unit="%" status="obese" target="14-24%"/>
              <Metric label="Visceral Fat" value={bc.visceral_fat_pct} unit="%" status="danger" target="<12%"/><Metric label="Subcut. Fat" value={bc.subcutaneous_fat_pct} unit="%" status="high" target="15-22%"/>
              <Metric label="Muscle Rate" value={bc.muscle_rate_pct} unit="%" status="normal"/><Metric label="Muscle Mass" value={bc.muscle_mass_kg} unit="kg" status="normal" target="60 kg"/>
              <Metric label="Body Water" value={bc.body_water_pct} unit="%" status="low" target=">50%"/><Metric label="Bone Mass" value={bc.bone_mass_kg} unit="kg" status="low" target="3.2+ kg"/>
              <Metric label="Protein Mass" value={bc.protein_mass_kg} unit="kg" status="low" target="16+ kg"/><Metric label="BMR" value={bc.bmr_kcal} unit="kcal" status="excellent"/>
              <Metric label="Metabolic Age" value={bc.metabolic_age} unit="yrs" status="high" target="46 or less"/><Metric label="Skeletal Muscle" value={bc.skeletal_muscle_mass_kg} unit="kg" status="normal"/>
            </div>
          </div>
        )}

        {/* PLAN */}
        {tab==="plan"&&(
          <div style={{padding:"16px 20px 32px"}}>
            <div style={{display:"flex",gap:3,marginBottom:18}}>{plan.map(p=>(<div key={p.id} style={{flex:1,height:4,borderRadius:2,background:p.id<=openPhase?p.color:"rgba(255,255,255,0.06)",transition:"background 0.4s ease"}}/>))}</div>
            <div style={{fontSize:10,fontWeight:700,letterSpacing:"0.12em",color:"#555",marginBottom:4,textTransform:"uppercase"}}>24-Week Transformation + Longevity</div>
            <div style={{fontSize:12,color:"#666",marginBottom:16,lineHeight:1.5}}>4-phase plan from your Dr Trust scan. Tap a phase to expand.</div>
            <div style={{display:"flex",flexDirection:"column",gap:10}}>
              {plan.map(p=>(
                <div key={p.id} onClick={()=>setOpenPhase(openPhase===p.id?null:p.id)} style={{background:openPhase===p.id?`linear-gradient(135deg,${p.color}10,${p.color}05)`:"rgba(255,255,255,0.02)",border:`1px solid ${openPhase===p.id?p.color+"40":"rgba(255,255,255,0.04)"}`,borderRadius:14,padding:"16px 18px",cursor:"pointer",transition:"all 0.35s cubic-bezier(0.4,0,0.2,1)"}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                    <div style={{display:"flex",alignItems:"center",gap:10}}>
                      <div style={{width:30,height:30,borderRadius:8,background:`${p.color}20`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:800,color:p.color}}>{p.id}</div>
                      <div><div style={{fontSize:14,fontWeight:700,color:"#E0E0E0"}}>{p.title}</div><div style={{fontSize:11,color:"#555"}}>Weeks {p.weeks}</div></div>
                    </div>
                    <div style={{fontSize:10,fontWeight:600,color:p.color,padding:"3px 9px",borderRadius:5,background:`${p.color}12`,border:`1px solid ${p.color}25`}}>{p.goals.length} goals</div>
                  </div>
                  {openPhase===p.id&&<PhaseDetail phase={p}/>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* NUTRITION */}
        {tab==="nutrition"&&(
          <div style={{padding:"16px 20px 32px"}}>
            {/* Calorie Ring */}
            <div style={{background:"linear-gradient(135deg,rgba(123,97,255,0.08),rgba(46,196,182,0.06))",border:"1px solid rgba(123,97,255,0.15)",borderRadius:14,padding:16,marginBottom:16}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
                <div style={{fontSize:10,fontWeight:700,letterSpacing:"0.12em",color:"#7B61FF",textTransform:"uppercase"}}>Today's Intake</div>
                {foodLog.length>0&&<button onClick={clearLog} style={{fontSize:10,color:"#555",background:"rgba(255,255,255,0.05)",border:"none",padding:"3px 8px",borderRadius:4,cursor:"pointer"}}>Clear</button>}
              </div>
              <div style={{display:"flex",alignItems:"center",gap:16,marginBottom:14}}>
                <div style={{position:"relative",width:90,height:90}}>
                  <svg width={90} height={90} viewBox="0 0 90 90">
                    <circle cx={45} cy={45} r={38} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={7}/>
                    <circle cx={45} cy={45} r={38} fill="none" stroke={loggedCal>targetCal?"#FF3B30":"#2EC4B6"} strokeWidth={7} strokeLinecap="round"
                      strokeDasharray={`${Math.min(loggedCal/targetCal,1)*238.76} 238.76`} transform="rotate(-90 45 45)" style={{transition:"stroke-dasharray 0.6s ease"}}/>
                  </svg>
                  <div style={{position:"absolute",inset:0,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center"}}>
                    <div style={{fontSize:18,fontWeight:800,color:"#F0F0F0"}}>{loggedCal}</div>
                    <div style={{fontSize:9,color:"#666"}}>/ {targetCal}</div>
                  </div>
                </div>
                <div style={{flex:1}}>
                  <MacroBar label="Protein" value={loggedP} max={plan[mealPhase-1].nutrition.protein_g} color="#2EC4B6"/>
                  <MacroBar label="Carbs" value={loggedC} max={plan[mealPhase-1].nutrition.carbs_g} color="#F7C948"/>
                  <MacroBar label="Fat" value={loggedF} max={plan[mealPhase-1].nutrition.fat_g} color="#FF6B35"/>
                </div>
              </div>
              <div style={{fontSize:11,color:"#666",textAlign:"center"}}>{targetCal-loggedCal>0?`${targetCal-loggedCal} kcal remaining`:"Over target!"} &middot; Phase {mealPhase}: {currentMealPlan.phase}</div>
            </div>

            {/* Phase Selector */}
            <div style={{display:"flex",gap:4,marginBottom:16}}>
              {[1,2,3,4].map(p=>(
                <button key={p} onClick={()=>setMealPhase(p)} style={{flex:1,padding:"8px 0",border:"none",borderRadius:8,cursor:"pointer",fontSize:10,fontWeight:700,
                  background:mealPhase===p?plan[p-1].color+"20":"rgba(255,255,255,0.03)",color:mealPhase===p?plan[p-1].color:"#555",
                  border: `1px solid ${mealPhase===p?plan[p-1].color+"30":"rgba(255,255,255,0.04)"}`,transition:"all 0.3s ease"}}>P{p}</button>
              ))}
            </div>

            {/* Meal Timeline */}
            <div style={{fontSize:10,fontWeight:700,letterSpacing:"0.12em",color:"#555",marginBottom:10,textTransform:"uppercase"}}>Phase {mealPhase} Daily Meal Plan &middot; {currentMealPlan.cal} kcal</div>
            <div style={{display:"flex",flexDirection:"column",gap:6,marginBottom:20}}>
              {currentMealPlan.meals.map((m,i)=>{
                const isLogged = foodLog.some(f=>f.name===m.name);
                const recipe = m.recipe ? findRecipe(m.recipe) : null;
                return (
                  <div key={i} style={{display:"flex",gap:10,padding:"10px 12px",background:isLogged?"rgba(46,196,182,0.06)":"rgba(255,255,255,0.02)",border:`1px solid ${isLogged?"rgba(46,196,182,0.15)":"rgba(255,255,255,0.04)"}`,borderRadius:10,alignItems:"center",transition:"all 0.3s ease"}}>
                    <div style={{minWidth:52}}><div style={{fontSize:11,fontWeight:700,color:"#7B61FF"}}>{m.slot}</div></div>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:13,fontWeight:600,color:"#D0D0D0"}}>{m.name}</div>
                      <div style={{fontSize:10,color:"#555",lineHeight:1.4}}>{m.note}</div>
                    </div>
                    <div style={{display:"flex",gap:4,alignItems:"center",flexShrink:0}}>
                      <span style={{fontSize:12,fontWeight:700,color:"#F7C948"}}>{m.cal}</span>
                      <span style={{fontSize:9,color:"#555"}}>cal</span>
                    </div>
                    <div style={{display:"flex",gap:3,flexShrink:0}}>
                      {recipe&&<button onClick={()=>setSelectedRecipe(recipe)} style={{width:26,height:26,borderRadius:6,border:"none",background:"rgba(123,97,255,0.15)",color:"#7B61FF",fontSize:12,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}} title="View Recipe">&#128214;</button>}
                      {!isLogged&&<button onClick={()=>addToLog({name:m.name,cal:m.cal,protein:recipe?.protein||0,carbs:recipe?.carbs||0,fat:recipe?.fat||0})} style={{width:26,height:26,borderRadius:6,border:"none",background:"rgba(46,196,182,0.15)",color:"#2EC4B6",fontSize:13,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}} title="Log meal">+</button>}
                      {isLogged&&<div style={{width:26,height:26,borderRadius:6,background:"rgba(46,196,182,0.2)",color:"#2EC4B6",fontSize:13,display:"flex",alignItems:"center",justifyContent:"center"}}>&#10003;</div>}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Food Log */}
            {foodLog.length>0&&(<div style={{marginBottom:20}}>
              <div style={{fontSize:10,fontWeight:700,letterSpacing:"0.12em",color:"#555",marginBottom:8,textTransform:"uppercase"}}>Food Log</div>
              {foodLog.map((f,i)=>(<div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"6px 10px",background:"rgba(255,255,255,0.02)",borderRadius:6,marginBottom:3,fontSize:12}}>
                <span style={{color:"#A0A0A0"}}>{f.time} &middot; {f.name}</span>
                <span style={{color:"#F7C948",fontWeight:700}}>{f.cal} cal</span>
              </div>))}
            </div>)}

            {/* Recipe Browser */}
            <div style={{fontSize:10,fontWeight:700,letterSpacing:"0.12em",color:"#555",marginBottom:10,textTransform:"uppercase"}}>Vegetarian Recipe Database</div>
            <div style={{display:"flex",gap:4,marginBottom:14}}>
              {["breakfast","lunch","dinner","snacks"].map(f=>(
                <button key={f} onClick={()=>setRecipeFilter(f)} style={{flex:1,padding:"7px 0",border:"none",borderRadius:8,cursor:"pointer",fontSize:10,fontWeight:600,textTransform:"capitalize",
                  background:recipeFilter===f?"rgba(46,196,182,0.15)":"rgba(255,255,255,0.03)",color:recipeFilter===f?"#2EC4B6":"#555",
                  border: `1px solid ${recipeFilter===f?"rgba(46,196,182,0.25)":"rgba(255,255,255,0.04)"}`,transition:"all 0.3s ease"}}>{f}</button>
              ))}
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:8}}>
              {RECIPES[recipeFilter].map(r=>(
                <div key={r.id} onClick={()=>setSelectedRecipe(r)} style={{display:"flex",gap:12,padding:"12px 14px",background:"rgba(255,255,255,0.02)",border:"1px solid rgba(255,255,255,0.04)",borderRadius:12,cursor:"pointer",transition:"all 0.3s ease",alignItems:"center"}}>
                  <div style={{fontSize:28,flexShrink:0}}>{r.emoji}</div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:14,fontWeight:700,color:"#E0E0E0"}}>{r.name}</div>
                    <div style={{fontSize:11,color:"#555",marginTop:2}}>{r.time||r.portion} &middot; {r.cal} kcal</div>
                    <div style={{display:"flex",gap:8,marginTop:4}}>
                      <span style={{fontSize:10,color:"#2EC4B6",fontWeight:600}}>P:{r.protein}g</span>
                      <span style={{fontSize:10,color:"#F7C948",fontWeight:600}}>C:{r.carbs}g</span>
                      <span style={{fontSize:10,color:"#FF6B35",fontWeight:600}}>F:{r.fat}g</span>
                      <span style={{fontSize:10,color:"#7B61FF",fontWeight:600}}>Fb:{r.fiber}g</span>
                    </div>
                  </div>
                  <div onClick={(e)=>{e.stopPropagation();addToLog(r);}} style={{width:32,height:32,borderRadius:8,background:"rgba(46,196,182,0.12)",border:"1px solid rgba(46,196,182,0.2)",color:"#2EC4B6",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,cursor:"pointer",flexShrink:0}} title="Log this">+</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* API */}
        {tab==="api"&&(
          <div style={{padding:"16px 20px 32px",fontFamily:"'JetBrains Mono','DM Sans',monospace"}}>
            <div style={{fontSize:10,fontWeight:700,letterSpacing:"0.12em",color:"#555",marginBottom:14,textTransform:"uppercase",fontFamily:"'DM Sans',sans-serif"}}>Open API &middot; v{HealthAPI.version}</div>
            <div style={{background:"rgba(255,255,255,0.02)",border:"1px solid rgba(255,255,255,0.05)",borderRadius:12,overflow:"hidden",marginBottom:16}}>
              <div style={{padding:"10px 14px",borderBottom:"1px solid rgba(255,255,255,0.04)",fontSize:11,fontWeight:700,color:"#7B61FF",letterSpacing:"0.08em",fontFamily:"'DM Sans',sans-serif"}}>ENDPOINTS ({HealthAPI.webhooks.length})</div>
              {HealthAPI.webhooks.map((ep,i)=>{
                const mc={GET:"#34C759",POST:"#FF9500"}[ep.method]||"#888";
                return (<div key={i} style={{display:"flex",alignItems:"center",gap:8,padding:"8px 14px",borderBottom:i<HealthAPI.webhooks.length-1?"1px solid rgba(255,255,255,0.03)":"none"}}>
                  <span style={{fontSize:9,fontWeight:700,color:mc,background:`${mc}18`,padding:"2px 6px",borderRadius:3,minWidth:36,textAlign:"center"}}>{ep.method}</span>
                  <span style={{fontSize:10,color:"#C0C0C0",flex:1}}>{ep.path}</span>
                  <span style={{fontSize:9,color:"#444",fontFamily:"'DM Sans',sans-serif"}}>{ep.desc}</span>
                </div>);
              })}
            </div>
            <div style={{fontSize:11,fontWeight:700,color:"#555",marginBottom:6,letterSpacing:"0.08em",fontFamily:"'DM Sans',sans-serif"}}>SAMPLE: GET MEAL PLAN</div>
            <div style={{background:"#0D0E12",border:"1px solid rgba(255,255,255,0.06)",borderRadius:10,padding:14,fontSize:10,lineHeight:1.7,color:"#A0A0A0",overflowX:"auto",whiteSpace:"pre",marginBottom:16}}>
{`GET /api/v1/meal-plan/1
Authorization: Bearer <token>

{
  "phase": "Foundation",
  "target_calories": 1800,
  "diet_type": "vegetarian",
  "meals": [
    {
      "slot": "7:30 AM",
      "name": "Moong Dal Chilla x 2",
      "calories": 440,
      "protein_g": 28,
      "carbs_g": 44,
      "fat_g": 16,
      "recipe_id": "b1"
    }
  ]
}`}</div>
            <div style={{fontSize:11,fontWeight:700,color:"#555",marginBottom:6,letterSpacing:"0.08em",fontFamily:"'DM Sans',sans-serif"}}>SAMPLE: LOG FOOD</div>
            <div style={{background:"#0D0E12",border:"1px solid rgba(255,255,255,0.06)",borderRadius:10,padding:14,fontSize:10,lineHeight:1.7,color:"#A0A0A0",overflowX:"auto",whiteSpace:"pre",marginBottom:16}}>
{`POST /api/v1/food-log
{
  "name": "Paneer Bhurji",
  "calories": 280,
  "protein_g": 22,
  "recipe_id": "b2",
  "meal_slot": "breakfast"
}

Response:
{
  "logged": true,
  "daily_total": {
    "calories": 720,
    "remaining": 1080,
    "protein_g": 36,
    "target_protein_g": 120
  }
}`}</div>
            <div style={{fontSize:11,fontWeight:700,color:"#555",marginBottom:8,letterSpacing:"0.08em",fontFamily:"'DM Sans',sans-serif"}}>INTEGRATIONS</div>
            <div style={{display:"flex",flexDirection:"column",gap:6}}>
              {[
                {name:"Wearable Sync",desc:"Apple HealthKit / WHOOP / Garmin / Google Health Connect",color:"#2EC4B6"},
                {name:"AI Coaching",desc:"Claude MCP — insights from wearable + body-comp + food log",color:"#7B61FF"},
                {name:"Recipe APIs",desc:"Spoonacular / Edamam — extend veg recipe DB with 365K+ recipes",color:"#FF6B35"},
                {name:"Calorie Database",desc:"USDA FoodData Central — accurate macros for Indian foods",color:"#F7C948"},
                {name:"CRM Pipeline",desc:"Salesforce / HubSpot — health milestones as CRM events",color:"#3B82F6"},
                {name:"Webhooks",desc:"score_change / food_logged / milestone_hit / risk_alert",color:"#EC4899"},
              ].map((t,i)=>(
                <div key={i} style={{display:"flex",gap:10,alignItems:"flex-start",padding:"10px 12px",background:"rgba(255,255,255,0.02)",borderRadius:8,border:"1px solid rgba(255,255,255,0.04)"}}>
                  <div style={{width:4,minHeight:32,borderRadius:2,background:t.color,flexShrink:0}}/>
                  <div><div style={{fontSize:12,fontWeight:700,color:"#D0D0D0",fontFamily:"'DM Sans',sans-serif"}}>{t.name}</div><div style={{fontSize:11,color:"#666",fontFamily:"'DM Sans',sans-serif",lineHeight:1.4}}>{t.desc}</div></div>
                </div>
              ))}
            </div>
          </div>
        )}

        <RecipeModal recipe={selectedRecipe} onClose={()=>setSelectedRecipe(null)} onLog={addToLog}/>
      </div>
    </div>
  );
}
