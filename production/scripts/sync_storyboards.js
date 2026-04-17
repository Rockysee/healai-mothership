const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');

const CURRICULUM_DIR = "/Users/hemantithackeray/Desktop/Hemant's Stack/Framegen/framegen/server/curriculum";
const API_URL = "http://127.0.0.1:3002/api/projects";
const USER_ID = "b6e30c65-238b-4c89-ad0e-8c0aa7b35b71";

function generateBlueprint(chapter, subject) {
  const scenes = [];
  const sceneCount = 4; 
  
  for (let i = 1; i <= sceneCount; i++) {
    const topic = (chapter.topics && chapter.topics[i % chapter.topics.length]) || "General Topic";
    const fact = (chapter.key_facts && chapter.key_facts[i % chapter.key_facts.length]) || "Educational detail";
    
    scenes.push({
      id: i,
      title: `${topic} - Part ${i}`,
      durationSec: 8,
      shotType: i % 2 === 0 ? "WIDE" : "MEDIUM",
      cameraMove: i % 2 === 0 ? "SLOW DOLLY IN" : "STATIC",
      videoPrompt: `Mothership Intelligence Protocol: Healing Vision. Cinematic educational film about ${subject}: ${topic}. ${chapter.hero_hook || ""}. ${fact}. High-fidelity illustration, clinical yet artistic, anamorphic lens, film grain, deep shadows, professional color grade.`,
      negativePrompt: "text, watermark, blurry, low quality, static, distorted, artifacts",
      narration: fact,
      transition: "dissolve",
      genStatus: "idle",
      videoUrl: null,
      progressLog: ""
    });
  }

  return {
    title: chapter.title,
    logline: `${chapter.hero_hook || ""}. Healing through knowledge in ${subject}.`,
    colorGrade: "Deep amber and bronze tones, high contrast shadows, warm film grain",
    soundtrack: "Mystical sitar mixed with ethereal synth",
    scenes: scenes
  };
}

async function sync() {
  console.log("🚀 Starting Storyboard Alignment Pipeline (API v5)...");
  
  // 1. Get existing projects
  let existingTitles = new Set();
  try {
    console.log(`🔍 Fetching existing projects for ${USER_ID} from ${API_URL}...`);
    const res = await fetch(API_URL, { headers: { "x-user-id": USER_ID } });
    if (res.ok) {
       const data = await res.json();
       data.projects.forEach(p => existingTitles.add(p.title));
       console.log(`📊 Found ${existingTitles.size} existing projects on server.`);
    } else {
       console.error(`❌ Server returned ${res.status}`);
    }
  } catch (err) {
    console.warn("⚠️ Could not connect to Framegen server:", err.message);
    process.exit(1);
  }

  const files = fs.readdirSync(CURRICULUM_DIR).filter(f => f.endsWith('.json'));
  
  let totalAdded = 0;
  
  for (const file of files) {
    const subject = file.replace('icse_', '').replace('.json', '');
    const data = JSON.parse(fs.readFileSync(path.join(CURRICULUM_DIR, file), 'utf8'));
    
    for (const classKey in data) {
      if (classKey === 'meta') continue;
      
      const chapters = data[classKey].chapters || [];
      for (const chapter of chapters) {
        if (existingTitles.has(chapter.title)) {
           // console.log(`⏭️ Skipping existing: ${chapter.title}`);
           continue;
        }
        
        console.log(`🎬 Syncing: ${chapter.title} [${subject}]...`);
        const blueprint = generateBlueprint(chapter, subject);
        
        const payload = {
          title: chapter.title,
          style: "cinematic",
          mood: "Epic",
          duration: "30s",
          status: "draft",
          blueprint: blueprint,
          scenes: blueprint.scenes
        };
        
        try {
          const res = await fetch(API_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json", "x-user-id": USER_ID },
            body: JSON.stringify(payload)
          });
          
          if (res.ok) {
            totalAdded++;
            // console.log(`✅ Success`);
          } else {
            const errBody = await res.json();
            console.error(`❌ Failed to sync ${chapter.title}:`, errBody.error);
          }
        } catch (err) {
           console.error(`❌ Request error: ${err.message}`);
        }
      }
    }
  }
  
  console.log(`✅ Alignment Complete! Total added: ${totalAdded}`);
}

sync().catch(console.error);
