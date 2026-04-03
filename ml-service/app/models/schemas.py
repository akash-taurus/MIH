from pydantic import BaseModel, Field
from typing import List, Optional

# --- Scoring Schemas ---
class ScoringRequest(BaseModel):
    platform: str = Field(..., example="instagram")
    handle: str = Field(..., example="john_doe")

class ScoringFactor(BaseModel):
    name: str
    value: float
    impact: str  # "positive" or "negative"

class ScoringResponse(BaseModel):
    score: int
    factors: List[ScoringFactor]
    explanation: str

# --- Legacy Pricing Schemas (backward-compatible) ---
class PricingRequest(BaseModel):
    authenticityScore: int
    followerCount: int
    niche: str
    campaignType: str

class PricingResponse(BaseModel):
    minPrice: int
    maxPrice: int
    suggestedPrice: int

# --- Calibrated Pricing Schemas (v2) ---
class CalibratedPricingRequest(BaseModel):
    """
    Full-featured pricing request with all calibration variables.
    """
    followerCount: int = Field(..., description="Total follower/subscriber count", example=630000000)
    averageViews: int = Field(..., description="Average views on last 10 videos/posts", example=20000000)
    authenticityScore: int = Field(75, description="Auth credibility score 0-100", ge=0, le=100)
    niche: str = Field("general", description="Creator niche (e.g., Finance, Gaming, Lifestyle, Global Icon)", example="Sports")
    audienceRegion: str = Field("india", description="Primary audience region (India, Global, USA, UK)", example="Global")
    handle: str = Field("", description="Creator handle for known-icon lookups", example="@cristiano")
    campaignType: str = Field("sponsored_video", description="Type of campaign (video, reel, story, post, series, etc.)", example="sponsored_video")
    platform: str = Field("youtube", description="Platform (youtube, instagram)", example="instagram")

class CalibrationBreakdownResponse(BaseModel):
    """Detailed breakdown of how the price was derived."""
    adsenseFloor: int = Field(0, description="Estimated AdSense revenue per video (INR)")
    sponsorshipFloor: int = Field(0, description="2.5x AdSense floor — minimum sponsorship charge")
    scarcityMultiplier: float = Field(1.0, description="Non-linear attention monopoly multiplier")
    geographicCpmUsed: float = Field(0.0, description="Sponsorship CPM used for region (INR per 1K views)")
    nicheMultiplier: float = Field(1.0, description="Niche-based price weighting")
    authPremiumApplied: bool = Field(False, description="Whether auth score premium was applied")
    authPremiumPct: float = Field(0.0, description="Auth premium percentage (+40%, +15%, or discount)")
    globalIconOverride: bool = Field(False, description="Whether global icon floor was enforced")
    knownIconOverride: bool = Field(False, description="Whether historical deal data overrode the price")
    baseCalibratedPrice: int = Field(0, description="Final base price before three-tier split")

class CalibratedPricingResponse(BaseModel):
    """
    Three-tier pricing output: Conservative, Market Average, Premium.
    All prices in INR.
    """
    conservative: int = Field(..., description="Conservative estimate (0.7x market avg)")
    marketAverage: int = Field(..., description="Market-realistic average sponsorship fee")
    premium: int = Field(..., description="Premium/Exclusive rate (1.5x market avg)")
    currency: str = Field("INR", description="Currency code")
    breakdown: CalibrationBreakdownResponse = Field(..., description="Step-by-step calibration breakdown")
    justification: str = Field(..., description="Human-readable reasoning for each multiplier")

    # Also expose legacy fields for backward compatibility
    minPrice: int = Field(0, description="Alias for conservative (backward compat)")
    maxPrice: int = Field(0, description="Alias for premium (backward compat)")
    suggestedPrice: int = Field(0, description="Alias for marketAverage (backward compat)")

# --- Reach Prediction Schemas ---
class DeliverableCount(BaseModel):
    format: str = Field(..., description="E.g. Instagram_Reel, YouTube_Video")
    count: int = Field(..., description="Number of deliverables of this format", ge=1)

class ReachPredictionRequest(BaseModel):
    platform: str = Field(..., description="instagram or youtube")
    followerCount: int = Field(..., description="Creator's subscriber/follower count")
    authenticityScore: int = Field(..., description="Authenticator score 0-100")
    deliverables: List[DeliverableCount]

class ReachFormatBreakdown(BaseModel):
    format: str
    count: int
    predictedReach: int

class ReachPredictionResponse(BaseModel):
    totalPredictedReach: int
    breakdown: List[ReachFormatBreakdown]
