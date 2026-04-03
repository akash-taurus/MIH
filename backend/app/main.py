from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.models.schemas import (
    BlockchainPreparationResponse,
    CampaignCreateRequest,
    CampaignResponse,
    CreatorAnalysisRequest,
    CreatorAnalysisResponse,
    FrontendCampaignCreateRequest,
    FrontendCampaignListResponse,
    FrontendCampaignSummary,
    FrontendContractResponse,
    FrontendCreator,
    FrontendCreatorAnalysisRequest,
    FrontendCreatorListResponse,
    FrontendVerificationResponse,
)
from app.services.campaign_service import (
    create_campaign,
    create_frontend_campaign,
    dispute_frontend_campaign,
    get_campaign,
    get_frontend_campaign,
    get_frontend_contract,
    hold_frontend_campaign,
    list_frontend_campaigns,
    prepare_blockchain_payload,
    transfer_frontend_campaign,
    verify_frontend_campaign,
)
from app.services.creator_service import (
    build_frontend_creator_from_analysis,
    get_creator_by_handle,
    list_creators,
)
from app.services.ml_client import build_creator_analysis

app = FastAPI(
    title=settings.app_name,
    description=(
        "Backend orchestration layer for frontend discovery, ML scoring, pricing, "
        "and future blockchain integration."
    ),
    version=settings.app_version,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def read_root() -> dict[str, str]:
    return {
        "message": "InfluenceIQ backend is running",
        "mlServiceBaseUrl": settings.ml_service_base_url,
        "frontendApiBase": "/api/frontend",
    }


@app.get("/health")
def health_check() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/api/frontend/creators", response_model=FrontendCreatorListResponse)
async def list_frontend_creators(
    query: str = "",
    sort_by: str = Query(default="score", alias="sortBy"),
    platform: str = "All",
    niche: str = "All",
) -> FrontendCreatorListResponse:
    return await list_creators(query=query, platform=platform, niche=niche, sort_by=sort_by)


@app.post("/api/frontend/analysis", response_model=FrontendCreator)
async def analyze_frontend_creator(
    request: FrontendCreatorAnalysisRequest,
) -> FrontendCreator:
    analysis = await build_creator_analysis(
        CreatorAnalysisRequest(
            platform=request.platform,
            handle=request.handle,
            follower_count=request.followers,
            niche=request.niche,
            campaign_type=request.campaign,
        )
    )
    existing = get_creator_by_handle(request.handle)
    return build_frontend_creator_from_analysis(
        analysis=analysis,
        followers=request.followers,
        niche=request.niche,
        existing_creator=existing,
    )

from fastapi import Request
@app.post("/api/frontend/reach")
async def proxy_reach_prediction(request: Request):
    from app.services.ml_client import get_predicted_reach
    req_data = await request.json()
    return await get_predicted_reach(req_data)

@app.get("/api/frontend/campaigns", response_model=FrontendCampaignListResponse)
def list_frontend_campaigns_endpoint() -> FrontendCampaignListResponse:
    return list_frontend_campaigns()


@app.post("/api/frontend/campaigns", response_model=FrontendCampaignSummary)
async def create_frontend_campaign_endpoint(
    request: FrontendCampaignCreateRequest,
) -> FrontendCampaignSummary:
    return await create_frontend_campaign(request)


@app.get("/api/frontend/campaigns/{campaign_id}", response_model=FrontendCampaignSummary)
def get_frontend_campaign_endpoint(campaign_id: str) -> FrontendCampaignSummary:
    campaign = get_frontend_campaign(campaign_id)
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found.")
    return campaign


@app.get(
    "/api/frontend/campaigns/{campaign_id}/contract",
    response_model=FrontendContractResponse,
)
def get_frontend_contract_endpoint(campaign_id: str) -> FrontendContractResponse:
    contract = get_frontend_contract(campaign_id)
    if not contract:
        raise HTTPException(status_code=404, detail="Campaign not found.")
    return contract


@app.post(
    "/api/frontend/campaigns/{campaign_id}/verify",
    response_model=FrontendVerificationResponse,
)
def verify_frontend_campaign_endpoint(campaign_id: str) -> FrontendVerificationResponse:
    receipt = verify_frontend_campaign(campaign_id)
    if not receipt:
        raise HTTPException(status_code=404, detail="Campaign not found.")
    return receipt


@app.post("/api/frontend/campaigns/{campaign_id}/hold")
def hold_frontend_campaign_endpoint(campaign_id: str) -> dict:
    result = hold_frontend_campaign(campaign_id)
    if result is None:
        raise HTTPException(status_code=404, detail="Campaign not found.")
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
    return result


@app.post("/api/frontend/campaigns/{campaign_id}/dispute")
def dispute_frontend_campaign_endpoint(campaign_id: str) -> dict:
    result = dispute_frontend_campaign(campaign_id)
    if result is None:
        raise HTTPException(status_code=404, detail="Campaign not found.")
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
    return result


@app.post(
    "/api/frontend/campaigns/{campaign_id}/transfer",
    response_model=FrontendVerificationResponse,
)
def transfer_frontend_campaign_endpoint(campaign_id: str) -> FrontendVerificationResponse:
    receipt = transfer_frontend_campaign(campaign_id)
    if not receipt:
        raise HTTPException(status_code=400, detail="Transfer failed. Campaign may be paused, disputed, or fully paid.")
    return receipt


@app.post("/api/campaigns", response_model=CampaignResponse)
async def create_campaign_endpoint(request: CampaignCreateRequest) -> CampaignResponse:
    return await create_campaign(request)


@app.get("/api/campaigns/{campaign_id}", response_model=CampaignResponse)
def get_campaign_endpoint(campaign_id: str) -> CampaignResponse:
    campaign = get_campaign(campaign_id)
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found.")
    return campaign


@app.post(
    "/api/campaigns/{campaign_id}/blockchain/prepare",
    response_model=BlockchainPreparationResponse,
)
def prepare_blockchain_endpoint(campaign_id: str) -> BlockchainPreparationResponse:
    payload = prepare_blockchain_payload(campaign_id)
    if not payload:
        raise HTTPException(status_code=404, detail="Campaign not found.")
    return payload


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
