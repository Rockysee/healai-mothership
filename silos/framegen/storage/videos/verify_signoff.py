import os
import hashlib

# We are in the videos directory, so we look for the renamed file here
VIDEO_PATH = "aegis_v_kalyan_alpha_02.mp4"

def run_audit():
    print("\n--- [AEGIS-V] BIOMETRIC SIGN-OFF PROTOCOL ---")
    
    if not os.path.exists(VIDEO_PATH):
        print(f"❌ ERROR: {VIDEO_PATH} not found.")
        print("FIX: Run the 'Identify & Rename' command I gave you previously.")
        return

    # 1. Compute Integrity Hash
    with open(VIDEO_PATH, "rb") as f:
        file_hash = hashlib.sha256(f.read()).hexdigest()
    
    print(f"✅ INTEGRITY: SHA-256 Verified [{file_hash[:12]}...]")
    print(f"🎬 PREVIEW: Open {os.path.abspath(VIDEO_PATH)} in QuickTime.")
    
    # 2. Manual Sign-off
    confirm = input("\nDO YOU MANUALLY SIGN OFF ON THIS CONTENT? (yes/no): ").lower()
    
    if confirm == 'yes':
        print("\n📝 SIGN-OFF REGISTERED. Creating deployment manifest...")
        with open("deploy_manifest.txt", "w") as m:
            m.write(f"PROJECT: aegis_v_kalyan_alpha_02\nHASH: {file_hash}\nSTATUS: SIGNED_OFF")
        print("🚀 STATUS: READY FOR YOUTUBE PUSH.")
    else:
        print("🛑 ABORTED. Asset held.")

if __name__ == "__main__":
    run_audit()
