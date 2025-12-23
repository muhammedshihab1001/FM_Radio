import json

INPUT_FILE = "data/station.json"
OUTPUT_FILE = "data/stations_clean.json"

BAD_EXTENSIONS = (".pls", ".m3u", ".m3u8")

def is_valid_station(st):
    # Required fields
    if not st.get("name") or not st.get("url"):
        return False

    url = st["url"].lower()

    # Remove playlist files
    if url.endswith(BAD_EXTENSIONS):
        return False

    return True


with open(INPUT_FILE, "r", encoding="utf-8") as f:
    data = json.load(f)

cleaned = []

for st in data:
    if is_valid_station(st):
        cleaned.append({
            "name": st["name"].strip(),
            "url": st["url"].strip(),
            "country": st.get("country", "").strip(),
            "bitrate": int(st.get("bitrate", 0) or 0),
            "codec": st.get("codec", "UNKNOWN").strip()
        })

with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
    json.dump(cleaned, f, indent=2, ensure_ascii=False)

print(f"Original stations : {len(data)}")
print(f"Cleaned stations  : {len(cleaned)}")
print("✔ stations_clean.json is ready for the website")
