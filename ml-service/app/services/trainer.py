import pandas as pd
import numpy as np
import joblib
import os
from sklearn.ensemble import RandomForestClassifier, RandomForestRegressor
from sklearn.model_selection import train_test_split

# 1. Paths
# Absolute paths for local development
BASE_DIR = r"z:\CodeBase\MIH\ml-service"
DATASET_DIR = os.path.join(BASE_DIR, "dataset")
MODEL_BIN_DIR = os.path.join(BASE_DIR, "app", "models", "bin")

if not os.path.exists(MODEL_BIN_DIR):
    os.makedirs(MODEL_BIN_DIR)

# ----------------------------------------------------------------------
# 2. Train Authenticity Model
# ----------------------------------------------------------------------
def train_authenticity_model():
    print("\n[Stage 1] Training Authenticity Model...")
    train_file = os.path.join(DATASET_DIR, "DATASET 1", "train.csv")
    if not os.path.exists(train_file):
        print(f"Error: {train_file} not found")
        return

    df = pd.read_csv(train_file)
    # We use all provided features for maximum accuracy
    X = df.drop("fake", axis=1)
    y = df["fake"]
    
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    
    # Using RandomForestClassifier for high-dimensional feature importance
    model = RandomForestClassifier(n_estimators=100, random_state=42)
    model.fit(X_train, y_train)
    
    accuracy = model.score(X_test, y_test)
    print(f"Authenticity Model Accuracy: {accuracy*100:.2f}%")
    
    joblib.dump(model, os.path.join(MODEL_BIN_DIR, "auth_classifier.joblib"))
    print(f"Artifact Saved: auth_classifier.joblib")

# ----------------------------------------------------------------------
# 3. Train Pricing Model
# ----------------------------------------------------------------------
def train_pricing_model():
    print("\n[Stage 2] Training Pricing Model...")
    data_file = os.path.join(DATASET_DIR, "DATASET 1", "top_1000_instagrammers.csv")
    agg_file = os.path.join(DATASET_DIR, "aggregated_engagement.csv")
    
    if not os.path.exists(data_file):
        print(f"Error: {data_file} not found")
        return

    # Load base dataset
    df = pd.read_csv(data_file)
    
    # Data Cleaning utilities
    def clean_number(x):
        if isinstance(x, str):
            x = x.replace("M", "e6").replace("K", "e3").replace(",", "")
            try:
                return float(x)
            except:
                return 0.0
        return float(x)

    df["Followers"] = df["Followers"].apply(clean_number)
    df["Engagement Avg."] = df["Engagement Avg."].apply(clean_number)
    
    # Generate realistic base price target for grounding
    np.random.seed(42)
    noise = np.random.normal(1.0, 0.05, len(df))
    # Pricing formula: $0.005 per follower + bonus for high engagement
    df["Suggested_Price"] = (df["Followers"] * 0.005) * (1 + (df["Engagement Avg."].clip(lower=1) / df["Followers"].clip(lower=1)) * 10) * noise
    
    # Potential Enrichment from DATASET 2 (Aggregated from 700k posts)
    if os.path.exists(agg_file):
        print(f"Found aggregated dataset: {agg_file}. Enriching training set...")
        agg_df = pd.read_csv(agg_file)
        
        # Since agg_df lacks follower counts, we'll infer synthetic followers 
        # based on the distribution seen in our known top influencers.
        avg_er = (df["Engagement Avg."] / df["Followers"]).mean()
        agg_df["Followers"] = (agg_df["avg_likes"] / avg_er).clip(lower=1000)
        
        # Calculate suggested price for synthetic users
        agg_noise = np.random.normal(1.0, 0.1, len(agg_df))
        agg_df["Suggested_Price"] = (agg_df["Followers"] * 0.005) * (1 + (agg_df["avg_likes"] / agg_df["Followers"]) * 10) * agg_noise
        
        # Mapping to feature space
        agg_features = pd.DataFrame({
            "Followers": agg_df["Followers"],
            "Engagement Avg.": agg_df["avg_likes"]
        })
        agg_target = agg_df["Suggested_Price"]
        
        # Combine base and enriched data
        X_base = df[["Followers", "Engagement Avg."]]
        y_base = df["Suggested_Price"]
        
        X = pd.concat([X_base, agg_features], ignore_index=True)
        y = pd.concat([y_base, agg_target], ignore_index=True)
        print(f"Training dataset expanded to {len(X)} entries.")
    else:
        print("Note: No aggregated data found. Training on base dataset only.")
        X = df[["Followers", "Engagement Avg."]]
        y = df["Suggested_Price"]
        
    # Standardize Tier (proxy feature for the current logic)
    X["Tier"] = X["Followers"].apply(lambda x: 3 if x > 1000000 else (2 if x > 100000 else 1))
    X = X[["Followers", "Tier", "Engagement Avg."]]
    
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.15, random_state=42)
    
    # Regression model tuning
    model = RandomForestRegressor(n_estimators=150, max_depth=10, random_state=42)
    model.fit(X_train, y_train)
    
    r2 = model.score(X_test, y_test)
    print(f"Pricing Model R2 Score: {r2*100:.2f}%")
    
    joblib.dump(model, os.path.join(MODEL_BIN_DIR, "pricing_regressor.joblib"))
    print(f"Artifact Saved: pricing_regressor.joblib")

# ----------------------------------------------------------------------
# 4. Main Execution
# ----------------------------------------------------------------------
if __name__ == "__main__":
    print("-" * 30)
    print("MIH ML RE-TRAINING ENGINE")
    print("-" * 30)
    train_authenticity_model()
    train_pricing_model()
    print("-" * 30)
    print("All models successfully updated!")
