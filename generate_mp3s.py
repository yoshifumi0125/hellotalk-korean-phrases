import json
import os
from gtts import gTTS
import time

json_path = "src/data/phrases.json"
audio_dir = "public/audio"

if not os.path.exists(audio_dir):
    os.makedirs(audio_dir)

with open(json_path, "r", encoding="utf-8") as f:
    data = json.load(f)

phrases = data.get("phrases", [])
print(f"Generating mp3 files for {len(phrases)} phrases...")

for i, p in enumerate(phrases):
    ko_text = p.get("ko", "").strip()
    clean_text = ko_text.replace("?", "").replace("!", "")
    
    if not clean_text:
        continue
        
    file_name = f"phrase_{i}.mp3"
    file_path = os.path.join(audio_dir, file_name)
    
    # Store ID in json to fetch later (or we can just guess the path by index in frontend)
    p["audioPath"] = f"/audio/{file_name}"
    
    if not os.path.exists(file_path):
        try:
            tts = gTTS(text=clean_text, lang='ko')
            tts.save(file_path)
            print(f"[{i+1}/{len(phrases)}] Saved {file_path}")
            time.sleep(0.5) # Prevent rate limiting
        except Exception as e:
            print(f"Error generating {file_path}: {e}")
    else:
        print(f"[{i+1}/{len(phrases)}] {file_path} already exists")

# Update json to include the paths
with open(json_path, "w", encoding="utf-8") as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

print("Finished generating all MP3s and updated phrases.json")
