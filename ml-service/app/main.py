import os
from fastapi import FastAPI, HTTPException, Header, Depends
from .models.schemas import (
    ScoringRequest, ScoringResponse, PricingRequest, PricingResponse,
    CalibratedPricingRequest, CalibratedPricingResponse,
    ReachPredictionRequest, ReachPredictionResponse
)
from .services import logic
from .services import reach_predictor

# Shared secret for mutual auth
ML_SERVICE_API_KEY = os.getenv("ML_SERVICE_API_KEY", "dev_shared_key_abcd1234")

from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(
    title="MIH ML Service",
    description="Authenticity Scoring & Pricing Engine for Influencers",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, specify the actual frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

async def verify_api_key(x_api_key: str = Header(None)):
    if x_api_key != ML_SERVICE_API_KEY:
        raise HTTPException(status_code=403, detail="Invalid or missing API Key")
    return x_api_key

@app.get("/")
def read_root():
    return {"message": "Welcome to the MIH ML Service API"}

@app.get("/health")
def health_check():
    """Health endpoint for backend synergy."""
    return {"status": "ok", "service": "ml-service"}

@app.post("/api/score", response_model=ScoringResponse, dependencies=[Depends(verify_api_key)])
async def get_score(request: ScoringRequest):
    """
    Computes authenticity score based on social media handle.
    """
    try:
        # In the future, we will call external APIs or scrape data here.
        # For now, we use a rule-based logic to mock it.
        result = await logic.calculate_authenticity_score(request.platform, request.handle)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/pricing", response_model=PricingResponse, dependencies=[Depends(verify_api_key)])
async def get_pricing(request: PricingRequest):
    """
    Suggests fair pricing based on follower count, niche, and authenticity score.
    """
    try:
        result = logic.suggest_pricing(
            request.authenticityScore, 
            request.followerCount, 
            request.niche, 
            request.campaignType
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/pricing/calibrate", response_model=CalibratedPricingResponse, dependencies=[Depends(verify_api_key)])
async def get_calibrated_pricing(request: CalibratedPricingRequest):
    """
    Transforms a raw follower-based estimate into a market-realistic sponsorship fee
    using the 5-step ML Calibration Layer.
    """
    try:
        return logic.suggest_calibrated_pricing(request)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/reach", response_model=ReachPredictionResponse, dependencies=[Depends(verify_api_key)])
async def get_reach_prediction(request: ReachPredictionRequest):
    """
    Predicts achievable campaign reach using a trained Random Forest regressor.
    Considers audience saturation and algorithmic format multipliers.
    """
    try:
        from .services.reach_predictor import predict_reach
        return predict_reach(request)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/youtube/search", dependencies=[Depends(verify_api_key)])
async def search_youtube(q: str = "creators", maxResults: int = 10):
    from .services.youtube_fetcher import YouTubeFetcher
    try:
        return await YouTubeFetcher.search_channels(q, max_results=maxResults)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001) # Backend expects 8001
