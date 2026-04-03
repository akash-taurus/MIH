import joblib
import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestRegressor
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error, r2_score
import os

print("Generating synthetic training data for Reach Prediction...")

def generate_reach_data(n_samples=20000):
    np.random.seed(42)
    
    # 1. Base Variables
    # Followers: log-uniform distribution from 1,000 to 100,000,000
    followers = 10 ** np.random.uniform(3, 8, n_samples)
    
    # Authenticity Score: normal distribution around 75
    scores = np.random.normal(75, 12, n_samples)
    scores = np.clip(scores, 0, 100)
    
    # Formats & Yields
    formats = ["Instagram_Post", "Instagram_Reel", "Instagram_Story", 
               "YouTube_Short", "YouTube_Video", "YouTube_Stream"]
    format_base_yields = [0.12, 0.85, 0.05, 0.45, 1.25, 0.25]
    
    # Randomly select a format for each sample
    format_indices = np.random.randint(0, len(formats), n_samples)
    selected_formats = [formats[i] for i in format_indices]
    base_yields = np.array([format_base_yields[i] for i in format_indices])
    
    # Counts
    counts = np.random.randint(1, 10, n_samples)
    
    # 2. Realistic Algorithm Simulation (This is what the ML will learn to predict)
    # Target Reach simulation
    resonance = scores / 100
    follower_log_scale = np.log10(followers)
    organic_base = followers * (resonance / (follower_log_scale * 3))
    
    # Audience saturation
    cumulative_count_factor = 1 + (0.4 * (counts - 1))
    
    target_reach = organic_base * base_yields * cumulative_count_factor
    
    # Add noise +/- 5%
    noise = np.random.uniform(0.95, 1.05, n_samples)
    target_reach = np.floor(target_reach * noise)
    
    df = pd.DataFrame({
        "followers": followers.astype(int),
        "authenticity_score": scores.astype(int),
        "format": selected_formats,
        "count": counts,
        "actual_reach": target_reach.astype(int)
    })
    
    return df

df = generate_reach_data()

# Prepare features
print("Preparing dataset...")
X = df[["followers", "authenticity_score", "count"]].copy()

# One-hot encode formats
format_dummies = pd.get_dummies(df["format"], prefix="fmt")
X = pd.concat([X, format_dummies], axis=1)

# Ensure consistent columns
expected_cols = [
    "followers", "authenticity_score", "count",
    "fmt_Instagram_Post", "fmt_Instagram_Reel", "fmt_Instagram_Story",
    "fmt_YouTube_Short", "fmt_YouTube_Video", "fmt_YouTube_Stream"
]

# Add missing columns with 0
for col in expected_cols:
    if col not in X.columns:
        X[col] = 0

X = X[expected_cols]
y = df["actual_reach"]

X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

print("\nTraining Random Forest Regressor...")
model = RandomForestRegressor(n_estimators=100, max_depth=15, random_state=42, n_jobs=-1)
model.fit(X_train, y_train)

# Evaluate
y_pred = model.predict(X_test)
mae = mean_absolute_error(y_test, y_pred)
r2 = r2_score(y_test, y_pred)

print(f"\nModel Evaluation:")
print(f"MAE: {mae:,.0f} reach")
print(f"R² Score: {r2:.4f}")

# Save the model
model_dir = os.path.join("app", "models")
os.makedirs(model_dir, exist_ok=True)
model_path = os.path.join(model_dir, "reach_predictor.pkl")
joblib.dump(model, model_path)
print(f"\nModel successfully saved to {model_path}")

# Sanity check
test_sample = pd.DataFrame([{
    "followers": 1000000,
    "authenticity_score": 90,
    "count": 2,
    "fmt_Instagram_Post": 0, "fmt_Instagram_Reel": 1, "fmt_Instagram_Story": 0,
    "fmt_YouTube_Short": 0, "fmt_YouTube_Video": 0, "fmt_YouTube_Stream": 0
}])
print("\nTest Prediction (1M followers, Score 90, 2 IG Reels):")
pred = model.predict(test_sample)[0]
print(f"Predicted Reach: {int(pred):,}")
