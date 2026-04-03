import json
import redis.asyncio as redis
import numpy as np
import joblib
import os
import pandas as pd
from typing import List, Dict, Any
from sklearn.ensemble import RandomForestRegressor, RandomForestClassifier

from ..models.schemas import (
    ScoringResponse, ScoringFactor, PricingResponse, 
    CalibratedPricingRequest, CalibratedPricingResponse, CalibrationBreakdownResponse
)
from .instagram_fetcher import InstagramFetcher
from .youtube_fetcher import YouTubeFetcher
from .pricing_calibration import PricingCalibrationEngine, CalibrationInput

# -------------------------------------------------------------
# 1. Path Configuration
# -------------------------------------------------------------
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MODEL_BIN_DIR = os.path.join(BASE_DIR, "models", "bin")
AUTH_MODEL_PATH = os.path.join(MODEL_BIN_DIR, "auth_classifier.joblib")
PRICE_MODEL_PATH = os.path.join(MODEL_BIN_DIR, "pricing_regressor.joblib")

# -------------------------------------------------------------
# 2. Load Models
# -------------------------------------------------------------
try:
    if os.path.exists(AUTH_MODEL_PATH):
        auth_model = joblib.load(AUTH_MODEL_PATH)
        print(f"Loaded Authenticity Model from {AUTH_MODEL_PATH}")
    else:
        auth_model = None
except Exception as e:
    print(f"Error loading auth model: {e}")
    auth_model = None

try:
    if os.path.exists(PRICE_MODEL_PATH):
        price_model = joblib.load(PRICE_MODEL_PATH)
        print(f"Loaded Pricing Model from {PRICE_MODEL_PATH}")
    else:
        price_model = None
except Exception as e:
    print(f"Error loading price model: {e}")
    price_model = None

# Fallback Models
X_auth_fallback = np.array([[50000, 4.5, 150], [100000, 3.8, 200], [75000, 5.2, 180], [10000, 0.3, 20]])
y_auth_fallback = np.array([85, 92, 88, 25])
auth_fallback = RandomForestRegressor(n_estimators=10, random_state=42).fit(X_auth_fallback, y_auth_fallback)

# -------------------------------------------------------------
# 3. Core Logic
# -------------------------------------------------------------

AUTH_COLUMNS = [
    "profile pic", "nums/length username", "fullname words", "nums/length fullname", 
    "name==username", "description length", "external URL", "private", 
    "#posts", "#followers", "#follows"
]

def _extract_auth_features(pd_data: Dict[str, Any]) -> pd.DataFrame:
    username = pd_data.get("username", "")
    name = pd_data.get("name", "")
    biography = pd_data.get("biography", "")
    website = pd_data.get("website", "")
    profile_pic = pd_data.get("profile_pic", "")
    
    features = {
        "profile pic": 1 if profile_pic else 0,
        "nums/length username": (sum(c.isdigit() for c in username) / len(username)) if username else 0,
        "fullname words": len(name.split()) if name else 0,
        "nums/length fullname": (sum(c.isdigit() for c in name) / len(name)) if name else 0,
        "name==username": 1 if name.lower() == username.lower() else 0,
        "description length": len(biography),
        "external URL": 1 if website else 0,
        "private": 0,
        "#posts": pd_data.get("media_count") or pd_data.get("video_count") or 0,
        "#followers": pd_data.get("followers_count") or pd_data.get("subscriber_count") or 0,
        "#follows": pd_data.get("follows_count", 0)
    }
    return pd.DataFrame([features], columns=AUTH_COLUMNS)

def _predict_authenticity(profile_data: Dict[str, Any]) -> int:
    if auth_model:
        df_features = _extract_auth_features(profile_data)
        try:
            if hasattr(auth_model, "predict_proba"):
                prob_fake = auth_model.predict_proba(df_features)[0][1]
                return int((1 - prob_fake) * 100)
            else:
                pred = auth_model.predict(df_features)[0]
                return 0 if pred == 1 else 100
        except Exception as e:
            print(f"ML Auth Model Prediction Error: {e}")
            
    # Fallback
    followers = profile_data.get("followers_count") or profile_data.get("subscriber_count") or 0
    er = profile_data.get("engagement_rate", 0)
    media = profile_data.get("media_count") or profile_data.get("video_count") or 0
    f_fallback = np.array([[followers, er, media]])
    return int(auth_fallback.predict(f_fallback)[0])

async def calculate_authenticity_score(platform: str, handle: str) -> ScoringResponse:
    platform_lower = platform.lower()
    try:
        redis_host = os.getenv("REDIS_HOST", "localhost")
        redis_port = int(os.getenv("REDIS_PORT", 6379))
        r = redis.Redis(host=redis_host, port=redis_port, db=0, decode_responses=True)
    except Exception:
        r = None
        
    cache_key = f"auth_score:{platform_lower}:{handle}"
    if r:
        try:
            cached = await r.get(cache_key)
            if cached:
                await r.close()
                return ScoringResponse(**json.loads(cached))
        except:
            pass
    
    profile_data = None
    try:
        if platform_lower == "instagram":
            profile_data = await InstagramFetcher.get_user_data(handle)
        elif platform_lower == "youtube":
            profile_data = await YouTubeFetcher.get_channel_data(handle)
    except Exception as e:
        print(f"Fetcher API Error: {e}")
    
    if profile_data:
        score = _predict_authenticity(profile_data)
        er = profile_data.get("engagement_rate", 0)
        growth = profile_data.get("growth_rate", 0)
        
        data = {
            "score": score,
            "factors": [
                {"name": "follower_growth", "value": float(growth), "impact": "positive" if growth >= 0 else "negative"},
                {"name": "engagement_rate", "value": float(er), "impact": "positive" if er > 2.0 else "negative"},
                {"name": "ml_confidence", "value": 0.91 if auth_model else 0.70, "impact": "positive"}
            ],
            "explanation": f"Profile evaluated by MIH v2 Ensemble Model. Authenticity score: {score}/100."
        }
    else:
        data = {
            "score": 50,
            "factors": [{"name": "supported_platform", "value": 0.0, "impact": "negative"}],
            "explanation": "Platform data not available."
        }
    
    if r:
        try:
            await r.setex(cache_key, 86400, json.dumps(data))
            await r.close()
        except:
            pass

    return ScoringResponse(**data)

PRICE_COLUMNS = ["Followers", "Tier", "Engagement Avg."]

def suggest_pricing(score: int, followers: int, niche: str, campaign_type: str) -> PricingResponse:
    tier = 3 if followers > 500000 else (2 if followers > 50000 else 1)
    
    if price_model:
        eng_avg = (followers * 0.03) # Approximate from 3% default
        df_features = pd.DataFrame([[followers, tier, eng_avg]], columns=PRICE_COLUMNS)
        try:
            base_suggested = price_model.predict(df_features)[0]
        except:
            base_suggested = followers * 0.02 # fallback if prediction fails
    else:
        # Simple fallback
        base_suggested = followers * 0.02
    
    niche_multiplier = {
        "fitness": 1.2, "tech": 1.5, "lifestyle": 1.0, "fashion": 1.1, "finance": 1.8
    }.get(niche.lower(), 1.0)
    
    ct_multiplier = 1.5 if any(x in campaign_type.lower() for x in ["video", "reel", "story"]) else 1.0
    
    # Power Law Fix: Exponential auth premium (score/50)²
    # Score 100 → 4.0x, Score 85 → 2.89x, Score 50 → 1.0x, Score 30 → 0.36x
    trust_factor = max((score / 50.0) ** 2, 0.25)
    
    # Scarcity multiplier (attention monopoly)
    if followers > 50_000_000:
        scarcity = 35.0
    elif followers > 10_000_000:
        scarcity = 8.0
    elif followers > 1_000_000:
        scarcity = 2.5
    else:
        scarcity = 1.0
    
    # Geographic weight: global audiences command higher CPM
    geo_weight = 5.5 if followers > 20_000_000 else 1.0
    
    suggested = int(base_suggested * niche_multiplier * ct_multiplier * trust_factor * scarcity * geo_weight)
    suggested = max(suggested, 10)
    
    return PricingResponse(
        minPrice=int(suggested * 0.8),
        maxPrice=int(suggested * 1.2),
        suggestedPrice=suggested
    )

def suggest_calibrated_pricing(req: CalibratedPricingRequest) -> CalibratedPricingResponse:
    # 1. Get the ML model's raw base estimate (before Power Law multipliers)
    #    This is the "linear" output that the calibration formula will transform.
    tier = 3 if req.followerCount > 500000 else (2 if req.followerCount > 50000 else 1)
    if price_model:
        eng_avg = req.followerCount * 0.03
        df_features = pd.DataFrame([[req.followerCount, tier, eng_avg]], columns=PRICE_COLUMNS)
        try:
            ml_base_estimate = int(price_model.predict(df_features)[0])
        except Exception:
            ml_base_estimate = int(req.followerCount * 0.02)
    else:
        ml_base_estimate = int(req.followerCount * 0.02)
    
    # 2. Prepare input for calibration engine — feed ML model output as base
    inp = CalibrationInput(
        follower_count=req.followerCount,
        average_views=req.averageViews,
        auth_score=req.authenticityScore,
        niche=req.niche,
        audience_region=req.audienceRegion,
        handle=req.handle,
        campaign_type=req.campaignType,
        platform=req.platform,
        base_estimate=ml_base_estimate,
    )
    
    # 2. Run the strategy engine
    calibrated = PricingCalibrationEngine.calibrate(inp)
    
    # 3. Map to response schema
    bd = CalibrationBreakdownResponse(
        adsenseFloor=calibrated.breakdown.adsense_floor,
        sponsorshipFloor=calibrated.breakdown.sponsorship_floor,
        scarcityMultiplier=calibrated.breakdown.scarcity_multiplier,
        geographicCpmUsed=calibrated.breakdown.geographic_cpm_used,
        nicheMultiplier=calibrated.breakdown.niche_multiplier,
        authPremiumApplied=calibrated.breakdown.auth_premium_applied,
        authPremiumPct=calibrated.breakdown.auth_premium_pct,
        globalIconOverride=calibrated.breakdown.global_icon_override,
        knownIconOverride=calibrated.breakdown.known_icon_override,
        baseCalibratedPrice=calibrated.breakdown.base_calibrated_price
    )
    
    return CalibratedPricingResponse(
        conservative=calibrated.conservative,
        marketAverage=calibrated.market_average,
        premium=calibrated.premium,
        currency=calibrated.currency,
        breakdown=bd,
        justification=calibrated.justification,
        minPrice=calibrated.conservative,
        maxPrice=calibrated.premium,
        suggestedPrice=calibrated.market_average
    )

