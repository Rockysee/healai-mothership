import cv2
import glob
import os

# 5-Pillar Configuration
LOGO_PATH = 'logo.png' 
THRESHOLD = 0.7  # 70% match to account for compression artifacts

def run_audit():
    video_files = glob.glob("*.mp4")
    if not video_files:
        print("❌ Error: No .mp4 files found.")
        return

    # First Principles: Check for the reference asset
    template = cv2.imread(LOGO_PATH, 0)
    if template is None:
        print(f"❌ Error: {LOGO_PATH} not found. Please add it to this folder.")
        return

    print(f"--- Silicon Siddhanta: High-Velocity Audit Initialized ---")
    print(f"Analyzing {len(video_files)} assets...\n")

    for video in video_files:
        cap = cv2.VideoCapture(video)
        logo_detected = False
        frame_count = 0
        
        while cap.isOpened():
            ret, frame = cap.read()
            if not ret: break
            
            # Speed: Audit every 2 seconds (assuming 30fps)
            if frame_count % 60 == 0:
                gray_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
                res = cv2.matchTemplate(gray_frame, template, cv2.TM_CCOEFF_NORMED)
                if (res >= THRESHOLD).any():
                    logo_detected = True
                    break # Pass found, move to next video
            frame_count += 1
        
        status = "✅ PASS" if logo_detected else "❌ FAIL (Logo Missing/Clipped)"
        print(f"{status}: {video}")
        cap.release()

if __name__ == "__main__":
    run_audit()
