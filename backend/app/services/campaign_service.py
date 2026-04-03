import json
import os
from uuid import uuid4

from app.models.schemas import (
    BlockchainPreparationResponse,
    CampaignCreateRequest,
    CampaignMilestone,
    CampaignResponse,
    FrontendCampaignCreateRequest,
    FrontendCampaignListResponse,
    FrontendCampaignSummary,
    FrontendContractResponse,
    FrontendMilestone,
    FrontendVerificationResponse,
)
from app.services.ml_client import build_creator_analysis, get_predicted_reach
from app.services.blockchain_service import blockchain_service
from app.services.coinbase_service import coinbase_service

DB_FILE = os.path.join(os.path.dirname(__file__), "..", "campaigns_db.json")

def load_db():
    if os.path.exists(DB_FILE):
        try:
            with open(DB_FILE, "r") as f:
                data = json.load(f)
                return data.get("CAMPAIGNS", {}), data.get("FRONTEND_CAMPAIGNS", {})
        except:
            pass
    return {}, {}

def save_db():
    with open(DB_FILE, "w") as f:
        # We need to serialize Pydantic models
        json.dump({
            "CAMPAIGNS": {k: v.model_dump(mode="json") if hasattr(v, 'model_dump') else v for k,v in CAMPAIGNS.items()},
            "FRONTEND_CAMPAIGNS": {k: v.model_dump(mode="json") if hasattr(v, 'model_dump') else v for k,v in FRONTEND_CAMPAIGNS.items()}
        }, f)

# Load existing state
raw_c, raw_fc = load_db()

# Reconstruct Pydantic models from loaded dicts
CAMPAIGNS: dict[str, CampaignResponse] = {k: CampaignResponse(**v) for k, v in raw_c.items()}
FRONTEND_CAMPAIGNS: dict[str, FrontendCampaignSummary] = {k: FrontendCampaignSummary(**v) for k, v in raw_fc.items()}


async def create_campaign(request: CampaignCreateRequest) -> CampaignResponse:
    analysis = await build_creator_analysis(request.creator_profile)
    campaign_id = str(uuid4())

    milestones = [
        CampaignMilestone(
            milestone_id=f"{campaign_id}-m1",
            title="Campaign created",
            status="completed",
        ),
        CampaignMilestone(
            milestone_id=f"{campaign_id}-m2",
            title="Deliverable verification pending",
            status="pending",
        ),
        CampaignMilestone(
            milestone_id=f"{campaign_id}-m3",
            title="Payment release pending",
            status="pending",
        ),
    ]

    campaign = CampaignResponse(
        campaign_id=campaign_id,
        brand_name=request.brand_name,
        creator_name=request.creator_name,
        status="draft",
        analysis=analysis,
        deliverables=request.deliverables,
        milestones=milestones,
        contract_status="awaiting_blockchain_integration",
    )
    CAMPAIGNS[campaign_id] = campaign
    save_db()
    return campaign


def get_campaign(campaign_id: str) -> CampaignResponse | None:
    return CAMPAIGNS.get(campaign_id)


def list_frontend_campaigns() -> FrontendCampaignListResponse:
    campaign_list = list(FRONTEND_CAMPAIGNS.values())
    return FrontendCampaignListResponse(campaigns=campaign_list, total=len(campaign_list))


async def create_frontend_campaign(request: FrontendCampaignCreateRequest) -> FrontendCampaignSummary:
    campaign_id = str(uuid4())
    
    score = 0
    platform = "Unknown"
    followers = 0
    if request.creatorData:
        score = request.creatorData.get("score", 0)
        platform = request.creatorData.get("platform", "Unknown")
        # Try to find the creator for more data
        from app.services.creator_service import get_creator_by_handle
        creator = get_creator_by_handle(request.creator)
        if creator:
            followers = creator.followers
            
    # Real ML-service integration during campaign creation
    predicted_reach = 0
    if followers > 0:
        ml_req = {
            "platform": platform.lower(),
            "followerCount": followers,
            "authenticityScore": score,
            "deliverables": [{"format": m.title, "count": 1} for m in request.milestones] if request.milestones else []
        }
        try:
           res = await get_predicted_reach(ml_req)
           predicted_reach = res.get("totalPredictedReach", 0)
        except:
           pass

    new_campaign = FrontendCampaignSummary(
        id=campaign_id,
        name=f"{request.type} for {request.brand}",
        creator=request.creator,
        status="Pending",
        score=score,
        budget=f"₹{request.budget:,}",
        platform=platform,
        progress=0,
        blockchain_tx=request.blockchainData.txHash if request.blockchainData else None,
        on_chain_id=request.blockchainData.onChainId if request.blockchainData else None,
        milestones=request.milestones if request.milestones else [],
        brief=request.brief,
        predicted_reach=predicted_reach
    )
    
    # Initialize a Coinbase CDP Wallet for Escrow Management
    cdp_wallet = coinbase_service.create_campaign_escrow_wallet(campaign_id)
    # Simulate an initial deposit into the newly created Escrow CDP Wallet
    coinbase_service.fund_escrow(campaign_id, str(request.budget))

    FRONTEND_CAMPAIGNS[campaign_id] = new_campaign
    save_db()
    return new_campaign


def get_frontend_campaign(campaign_id: str) -> FrontendCampaignSummary | None:
    return FRONTEND_CAMPAIGNS.get(campaign_id)


def get_frontend_contract(campaign_id: str) -> FrontendContractResponse | None:
    campaign = FRONTEND_CAMPAIGNS.get(campaign_id)
    if not campaign:
        return None
        
    # === REAL BLOCKCHAIN SYNC ===
    is_paused = campaign.is_paused
    status = campaign.status
    on_chain_id = campaign.on_chain_id
    
    if on_chain_id:
        on_chain_data = blockchain_service.check_campaign_on_chain(int(on_chain_id))
        if on_chain_data:
            is_paused = on_chain_data["isPaused"]
            if on_chain_data["isDisputed"]:
                status = "Disputed"
            elif on_chain_data["isResolved"]:
                status = "Resolved"
            elif on_chain_data["deposited"] > 0:
                if status == "Pending": status = "In Progress"
            
            # Sync back to memory
            campaign.is_paused = is_paused
            campaign.status = status

            # SYNC MILESTONES ON-CHAIN
            on_chain_ms = blockchain_service.get_milestones_on_chain(int(on_chain_id))
            if on_chain_ms and campaign.milestones:
                for idx, m in enumerate(campaign.milestones):
                    if idx < len(on_chain_ms):
                        if on_chain_ms[idx]["isPaid"]:
                            m.status = "Paid"
                        elif on_chain_ms[idx]["isCompleted"] and m.status != "Paid":
                            m.status = "Completed"
    
    milestones = campaign.milestones if campaign.milestones else [
        FrontendMilestone(
            id="ms-default-1",
            title="Deliverable verification pending",
            amount=campaign.budget,
            status="Pending",
            deadline="Oct 2026"
        )
    ]
    
    # CALCULATE REMAINING FUNDS
    total_remaining = 0
    for m in milestones:
        if m.status != "Paid":
            # Extract number from "₹10,000"
            try:
                numeric_amt = int("".join(filter(str.isdigit, m.amount)))
                total_remaining += numeric_amt
            except:
                pass
    
    funds_locked = f"₹{total_remaining:,}"

    return FrontendContractResponse(
        campaign_id=campaign_id,
        address=settings.escrow_address,
        steps=["Initiated", "Escrow Funded", "Milestones Active", "Resolved"],
        current_step_index=2 if status == "In Progress" else (3 if status in ["Paid", "Resolved"] else 1),
        funds_locked=funds_locked,
        status=status,
        creator_handle=campaign.creator,
        on_chain_id=on_chain_id,
        is_paused=is_paused,
        milestones=milestones,
    )


def verify_frontend_campaign(campaign_id: str) -> FrontendVerificationResponse | None:
    campaign = FRONTEND_CAMPAIGNS.get(campaign_id)
    if not campaign:
        return None
        
    # Find first pending milestone to pay out
    amt_released = campaign.budget
    if campaign.milestones:
        for m in campaign.milestones:
            if m.status != "Paid":
                m.status = "Paid"
                amt_released = m.amount
                break
    
    # Check if all paid
    all_paid = True
    if campaign.milestones:
        all_paid = all(m.status == "Paid" for m in campaign.milestones)
    
    if all_paid:
        campaign.status = "Paid"
        campaign.progress = 100
    else:
        campaign.status = "In Progress"
        # Dummy progress calculation
        paid_count = sum(1 for m in campaign.milestones if m.status == "Paid")
        campaign.progress = int((paid_count / len(campaign.milestones)) * 100)

    # Execute On-Chain / CDP Transfer via Coinbase Service
    # In production, amounts are parsed and converted to raw asset units securely.
    demo_amount = 0.001 
    creator_address = "0xDemoCreatorAddress0000000000000000000"
    cdp_res = coinbase_service.transfer_to_creator(
        campaign_id=campaign_id,
        creator_address=creator_address,
        amount=demo_amount,
        asset_id="eth" # Demo asset
    )
    tx_hash = cdp_res.get("tx_hash", "0x" + uuid4().hex)

    save_db()
    return FrontendVerificationResponse(
        campaign_id=campaign_id,
        status="Released",
        amount=amt_released,
        tx_hash=tx_hash,
    )


def hold_frontend_campaign(campaign_id: str) -> dict | None:
    """Toggle the paused state of a campaign (backend-only action for demo mode)."""
    campaign = FRONTEND_CAMPAIGNS.get(campaign_id)
    if not campaign:
        return None
    if campaign.status in ("Disputed", "Resolved", "Paid"):
        return {"error": "Cannot pause/resume a campaign in state: " + campaign.status}
    campaign.is_paused = not campaign.is_paused
    save_db()
    return {"is_paused": campaign.is_paused, "status": campaign.status}


def dispute_frontend_campaign(campaign_id: str) -> dict | None:
    """Mark a campaign as disputed (backend-only action for demo mode)."""
    campaign = FRONTEND_CAMPAIGNS.get(campaign_id)
    if not campaign:
        return None
    if campaign.status in ("Disputed", "Resolved", "Paid", "Pending"):
        return {"error": "Cannot dispute a campaign in state: " + campaign.status}
    campaign.status = "Disputed"
    save_db()
    return {"status": campaign.status}


def transfer_frontend_campaign(campaign_id: str) -> FrontendVerificationResponse | None:
    """Release payment for the next pending milestone (backend-only action for demo mode)."""
    campaign = FRONTEND_CAMPAIGNS.get(campaign_id)
    if not campaign:
        return None
    if campaign.is_paused:
        return None  # silently fail; frontend guards against this
    if campaign.status in ("Disputed", "Resolved", "Paid"):
        return None

    # If Pending, auto-advance to In Progress first
    if campaign.status == "Pending":
        campaign.status = "In Progress"

    return verify_frontend_campaign(campaign_id)


def prepare_blockchain_payload(campaign_id: str) -> BlockchainPreparationResponse | None:
    campaign = CAMPAIGNS.get(campaign_id)
    if not campaign:
        return None

    # Future blockchain integration:
    # Replace this placeholder response with a real API call to the teammate-owned
    # smart contract service. The payload should include creator identity, pricing,
    # milestones, and release conditions.
    return BlockchainPreparationResponse(
        campaign_id=campaign_id,
        contract_status="ready_for_blockchain_service",
        next_step="Send this campaign payload to the blockchain role for contract creation.",
        comment=(
            "Backend is prepared. Connect this flow to your smart contract deployment "
            "service when the blockchain module is available."
        ),
    )
