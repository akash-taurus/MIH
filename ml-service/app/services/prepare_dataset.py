import os
import json
import pandas as pd
from concurrent.futures import ThreadPoolExecutor

# Paths
DATASET_2_DIR = r"z:\CodeBase\MIH\ml-service\dataset\DATASET 2\json_files-017\json"
OUTPUT_CSV = r"z:\CodeBase\MIH\ml-service\dataset\aggregated_engagement.csv"

def extract_features(file_path):
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        owner_id = data.get("owner", {}).get("id")
        likes = data.get("edge_media_preview_like", {}).get("count", 0)
        comments = data.get("edge_media_to_comment", {}).get("count", 0)
        is_video = data.get("is_video", False)
        timestamp = data.get("taken_at_timestamp", 0)
        
        if not owner_id:
            return None
        
        return {
            "owner_id": owner_id,
            "likes": likes,
            "comments": comments,
            "is_video": 1 if is_video else 0,
            "timestamp": timestamp
        }
    except Exception:
        return None

def main():
    print(f"Scanning directory: {DATASET_2_DIR}")
    if not os.path.exists(DATASET_2_DIR):
        print(f"Directory not found: {DATASET_2_DIR}")
        return
        
    files = [os.path.join(DATASET_2_DIR, f) for f in os.listdir(DATASET_2_DIR) if f.endswith('.json')]
    total_files = len(files)
    print(f"Found {total_files} JSON files.")
    
    if total_files == 0:
        print("No files found. Exiting.")
        return

    results = []
    # Use ThreadPoolExecutor for faster I/O since we are reading many small files
    with ThreadPoolExecutor(max_workers=8) as executor:
        for i, res in enumerate(executor.map(extract_features, files)):
            if res:
                results.append(res)
            if i % 1000 == 0:
                print(f"Processed {i}/{total_files} files...")
    
    if not results:
        print("No valid data extracted.")
        return
        
    df = pd.DataFrame(results)
    
    print("Aggregating by Owner ID...")
    aggregated = df.groupby("owner_id").agg({
        "likes": ["mean", "std", "count"],
        "comments": ["mean", "std"],
        "is_video": "mean",
        "timestamp": ["min", "max"]
    }).reset_index()
    
    # Flatten columns
    aggregated.columns = [
        "owner_id", "avg_likes", "std_likes", "posts_sampled", 
        "avg_comments", "std_comments", "video_ratio", 
        "first_post_ts", "last_post_ts"
    ]
    
    # Post-processing
    # Calculate post frequency (seconds per post)
    time_span = aggregated["last_post_ts"] - aggregated["first_post_ts"]
    aggregated["post_frequency_days"] = (time_span / (86400 * (aggregated["posts_sampled"] - 1).clip(lower=1)))
    
    print(f"Saving aggregated data to {OUTPUT_CSV}")
    aggregated.to_csv(OUTPUT_CSV, index=False)
    print("Done!")

if __name__ == "__main__":
    main()
