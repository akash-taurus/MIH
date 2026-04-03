from datetime import date
from typing import Literal, Optional

from pydantic import BaseModel, ConfigDict, Field


class MLScoringRequest(BaseModel):
    platform: str = Field(..., examples=["instagram"])
    handle: str = Field(..., examples=["john_doe"])


class ScoringFactor(BaseModel):
    name: str
    value: float
    impact: Literal["positive", "negative"]


class MLScoringResponse(BaseModel):
    score: int = Field(..., ge=0, le=100)
    factors: list[ScoringFactor]
    explanation: str


class MLPricingRequest(BaseModel):
    authenticity_score: int = Field(..., alias="authenticityScore", ge=0, le=100)
    follower_count: int = Field(..., alias="followerCount", ge=0)
    niche: str
    campaign_type: str = Field(..., alias="campaignType")

    model_config = ConfigDict(populate_by_name=True)


class MLPricingResponse(BaseModel):
    min_price: int = Field(..., alias="minPrice", ge=0)
    max_price: int = Field(..., alias="maxPrice", ge=0)
    suggested_price: int = Field(..., alias="suggestedPrice", ge=0)

    model_config = ConfigDict(populate_by_name=True)


class CreatorAnalysisRequest(BaseModel):
    platform: str = Field(..., examples=["instagram"])
    handle: str = Field(..., examples=["john_doe"])
    follower_count: int = Field(..., alias="followerCount", ge=0, examples=[50000])
    niche: str = Field(..., examples=["fitness"])
    campaign_type: str = Field(..., alias="campaignType", examples=["instagram_post"])

    model_config = ConfigDict(populate_by_name=True)


class CreatorAnalysisResponse(BaseModel):
    platform: str
    handle: str
    authenticity_score: int = Field(..., alias="authenticityScore")
    scoring_factors: list[ScoringFactor] = Field(..., alias="scoringFactors")
    score_explanation: str = Field(..., alias="scoreExplanation")
    pricing: MLPricingResponse
    ml_service_status: str = Field(..., alias="mlServiceStatus")
    blockchain_status: str = Field(..., alias="blockchainStatus")
    integration_notes: list[str] = Field(..., alias="integrationNotes")

    model_config = ConfigDict(populate_by_name=True)


class FrontendCreator(BaseModel):
    id: int | str
    handle: str
    niche: str
    platform: str
    avatar: Optional[str] = None
    followers: int = Field(..., ge=0)
    score: int = Field(..., ge=0, le=100)
    fake: int = Field(..., ge=0, le=100)
    eng: float = Field(..., ge=0)
    reach: int = Field(..., ge=0)
    price_min: int = Field(..., alias="priceMin", ge=0)
    price_max: int = Field(..., alias="priceMax", ge=0)
    campaigns: int = Field(..., ge=0)
    trust: str
    scoring_factors: list[ScoringFactor] = Field(default_factory=list, alias="scoringFactors")
    score_explanation: str = Field(default="", alias="scoreExplanation")
    ml_service_status: str = Field(default="connected", alias="mlServiceStatus")

    model_config = ConfigDict(populate_by_name=True)


class FrontendCreatorAnalysisRequest(BaseModel):
    platform: str
    handle: str
    followers: int = Field(..., ge=0)
    niche: str
    campaign: str


class FrontendCreatorListResponse(BaseModel):
    creators: list[FrontendCreator]
    total: int
    query: str = ""
    sort_by: str = Field(default="score", alias="sortBy")
    platform: str = "All"
    niche: str = "All"

    model_config = ConfigDict(populate_by_name=True)


class CampaignMilestone(BaseModel):
    milestone_id: str
    title: str
    status: Literal["pending", "completed"]


class FrontendMilestone(BaseModel):
    id: str
    title: str
    amount: str
    status: Literal["Pending", "In Progress", "Completed", "Paid"]
    deadline: str


class CampaignResponse(BaseModel):
    campaign_id: str
    brand_name: str
    creator_name: str
    status: str
    analysis: CreatorAnalysisResponse
    deliverables: list[str]
    milestones: list[CampaignMilestone]
    contract_status: str


class CampaignCreateRequest(BaseModel):
    brand_name: str = Field(..., alias="brandName")
    creator_name: str = Field(..., alias="creatorName")
    creator_profile: CreatorAnalysisRequest = Field(..., alias="creatorProfile")
    deliverables: list[str]

    model_config = ConfigDict(populate_by_name=True)


class BlockchainData(BaseModel):
    txHash: str
    onChainId: str
    creatorWallet: Optional[str] = None
    budgetInETH: Optional[str] = None


class FrontendCampaignCreateRequest(BaseModel):
    brand: str
    creator: str
    budget: int
    type: str
    deliverable: Optional[str] = None
    deadline: Optional[str] = None
    creatorData: Optional[dict] = None
    blockchainData: Optional[BlockchainData] = None
    milestones: Optional[list[FrontendMilestone]] = None
    brief: Optional[str] = None


class FrontendCampaignSummary(BaseModel):
    id: str
    name: str
    creator: str
    status: str
    score: int
    budget: str
    platform: str
    progress: int
    blockchain_tx: Optional[str] = None
    on_chain_id: Optional[int] = None
    is_paused: bool = False
    milestones: Optional[list[FrontendMilestone]] = None
    brief: Optional[str] = None


class FrontendCampaignListResponse(BaseModel):
    campaigns: list[FrontendCampaignSummary]
    total: int


class FrontendContractResponse(BaseModel):
    campaign_id: str
    address: str
    steps: list[str]
    current_step_index: int
    funds_locked: str
    status: str
    creator_handle: str
    on_chain_id: Optional[int] = None
    is_paused: bool = False
    milestones: list[FrontendMilestone]


class FrontendVerificationResponse(BaseModel):
    campaign_id: str
    status: str
    amount: str
    tx_hash: str


class BlockchainPreparationResponse(BaseModel):
    campaign_id: str
    contract_status: str
    next_step: str
    comment: str