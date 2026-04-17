import fetch from "node-fetch";

const TARGET_PHOTOS = [
  "img_0314_7489444728_o.jpg",
  "valentines-day-special---1_8479269810_o.jpg",
  "valentines-day-special---2_8478180833_o.jpg"
];

const STYLES = ["zoom-in", "pan-right", "drift-up"];

async function pilotBatchRender() {
  console.log("🎬 Initiating Pilot Batch Pre-Render Engine...");
  console.log(`Executing ${TARGET_PHOTOS.length} test photos locally using FFmpeg Pipeline.`);

  let successCount = 0;
  
  for (let i = 0; i < TARGET_PHOTOS.length; i++) {
    const photo = TARGET_PHOTOS[i];
    const style = STYLES[i % STYLES.length];
    
    console.log(`\n[${i + 1}/${TARGET_PHOTOS.length}] Pre-rendering: ${photo}`);
    console.log(`   └─ Camera Style: ${style}`);
    
    try {
      const res = await fetch("http://localhost:3002/api/ken-burns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          photoFile: photo,
          cameraMove: style,
          durationSec: 5
        })
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        console.error(`   ❌ Failed: ${err.error || res.statusText}`);
        continue;
      }

      const data = await res.json();
      console.log(`   ✅ Success! Saved to: ${data.videoUrl}`);
      successCount++;
    } catch (e) {
      console.error(`   ❌ Critical Network Catch:`, e.message);
    }
  }

  console.log(`\n🎉 Pilot Batch Render Complete! Processed ${successCount}/${TARGET_PHOTOS.length} scenes completely free with 0 API calls.`);
}

pilotBatchRender();
