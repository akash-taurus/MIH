import os
import joblib
import pandas as pd
from ..models.schemas import ReachPredictionRequest, ReachPredictionResponse, ReachFormatBreakdown

# Lazy-loaded model to avoid overhead at import time
_model = None

def get_reach_model():
    global _model
    if _model is None:
        model_path = os.path.join(os.path.dirname(__file__), "..", "models", "reach_predictor.pkl")
        if not os.path.exists(model_path):
            raise FileNotFoundError(f"Reach prediction model not found at {model_path}. Run train_reach.py first.")
        _model = joblib.load(model_path)
    return _model

def predict_reach(request: ReachPredictionRequest) -> ReachPredictionResponse:
    """Predicts realistic reach using the trained Random Forest model."""
    model = get_reach_model()
    
    total_reach = 0
    breakdown = []
    
    platform_cap = request.platform.title()
    if platform_cap.lower() == "youtube":
        platform_cap = "YouTube" 
    
    for item in request.deliverables:
        # Construct feature vector
        features = {
            "followers": request.followerCount,
            "authenticity_score": request.authenticityScore,
            "count": item.count,
            "fmt_Instagram_Post": 0, "fmt_Instagram_Reel": 0, "fmt_Instagram_Story": 0,
            "fmt_YouTube_Short": 0, "fmt_YouTube_Video": 0, "fmt_YouTube_Stream": 0
        }
        
        fmt_name = item.format.title()
        if fmt_name == "Short": fmt_name = "Short"
        if fmt_name == "Video": fmt_name = "Video"
        if fmt_name == "Stream": fmt_name = "Stream"
        if fmt_name == "Reel": fmt_name = "Reel"
        if fmt_name == "Story": fmt_name = "Story"
        if fmt_name == "Post": fmt_name = "Post"
        
        full_fmt_key = f"fmt_{platform_cap}_{fmt_name}"
        
        if full_fmt_key in features:
            features[full_fmt_key] = 1
            
        df = pd.DataFrame([features])
        predicted = model.predict(df)[0]
        reach_val = max(0, int(predicted))
        
        total_reach += reach_val
        breakdown.append(ReachFormatBreakdown(
            format=item.format,
            count=item.count,
            predictedReach=reach_val
        ))
        
    return ReachPredictionResponse(
        totalPredictedReach=int(total_reach),
        breakdown=breakdown
    )

