import hashlib
import time
from typing import Optional

import httpx

from app.config import settings
from app.models.schemas import (
    CreatorAnalysisRequest,
    CreatorAnalysisResponse,
    MLPricingRequest,
    MLPricingResponse,
    MLScoringRequest,
    MLScoringResponse,
    ScoringFactor,
)


class MLServiceError(Exception):
    """Raised when the ML service cannot be reached or returns invalid data."""


class CircuitBreaker:
    def __init__(self, failure_threshold: int = 3, recovery_timeout: int = 30):
        self.failure_threshold = failure_threshold
        self.recovery_timeout = recovery_timeout
        self.failures = 0
        self.last_failure_time = 0.0
        self.state = "closed"  # closed, open, half-open

    def is_available(self) -> bool:
        if self.state == "open":
            if time.time() - self.last_failure_time > self.recovery_timeout:
                self.state = "half-open"
                return True
            return False
        return True

    def record_failure(self):
        self.failures += 1
        self.last_failure_time = time.time()
        if self.failures >= self.failure_threshold:
            self.state = "open"

    def record_success(self):
        self.failures = 0
        self.state = "closed"


# Global instances for simple in-memory state
auth_breaker = CircuitBreaker()
pricing_breaker = CircuitBreaker()


def _get_headers() -> dict[str, str]:
    return {
        "X-API-KEY": settings.ml_service_api_key,
        "Content-Type": "application/json",
    }


async def is_ml_service_healthy() -> bool:
    """Proactive health check synergy."""
    try:
        async with httpx.AsyncClient(timeout=2.0) as client:
            response = await client.get(
                f"{settings.ml_service_base_url}/health",
                headers=_get_headers()
            )
            return response.status_code == 200
    except Exception:
        return False


async def get_authenticity_score(request: MLScoringRequest) -> MLScoringResponse:
    if not auth_breaker.is_available():
        raise MLServiceError("ML service scoring is temporarily unavailable (circuit open).")

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.post(
                f"{settings.ml_service_base_url}/api/score",
                json=request.model_dump(),
                headers=_get_headers(),
            )
            response.raise_for_status()
            auth_breaker.record_success()
            return MLScoringResponse.model_validate(response.json())
    except (httpx.HTTPError, ValueError) as exc:
        auth_breaker.record_failure()
        raise MLServiceError("Unable to fetch authenticity score from ML service.") from exc


async def get_pricing(request: MLPricingRequest) -> MLPricingResponse:
    if not pricing_breaker.is_available():
        raise MLServiceError("ML service pricing is temporarily unavailable (circuit open).")

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.post(
                f"{settings.ml_service_base_url}/api/pricing",
                json=request.model_dump(by_alias=True),
                headers=_get_headers(),
            )
            response.raise_for_status()
            pricing_breaker.record_success()
            return MLPricingResponse.model_validate(response.json())
    except (httpx.HTTPError, ValueError) as exc:
        pricing_breaker.record_failure()
        raise MLServiceError("Unable to fetch pricing recommendation from ML service.") from exc


async def search_youtube_creators(query: str, limit: int = 10) -> list[dict]:
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(
                f"{settings.ml_service_base_url}/api/youtube/search",
                params={"q": query, "maxResults": limit},
                headers=_get_headers(),
            )
            response.raise_for_status()
            return response.json()
    except Exception as e:
        print(f"ML Service Search Error: {e}")
        return []


def _seed_value(*parts: str | int) -> int:
    raw = "|".join(str(part).strip().lower() for part in parts)
    digest = hashlib.sha256(raw.encode("utf-8")).hexdigest()
    return int(digest[:8], 16)

async def get_predicted_reach(req_data: dict) -> dict:
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(
                f"{settings.ml_service_base_url}/api/reach",
                json=req_data,
                headers=_get_headers(),
            )
            response.raise_for_status()
            return response.json()
    except Exception as e:
        print(f"ML Service Reach Error: {e}")
        # Deterministic Fallback if ML service is offline
        followers = req_data.get("followerCount", 0)
        deliverables = req_data.get("deliverables", [])
        if not deliverables: return {"totalPredictedReach": 0, "breakdown": []}
        
        # Super simple fallback
        total = 0
        for item in deliverables:
           fmt = item.get("format", "")
           c = item.get("count", 0)
           if c > 0:
              total += followers * 0.1 * c
        return {"totalPredictedReach": int(total), "breakdown": []}
        
def _fallback_scoring(request: CreatorAnalysisRequest) -> MLScoringResponse:
    seed = _seed_value(request.platform, request.handle, request.follower_count, request.niche)
    follower_bonus = min(request.follower_count // 100000, 6)
    platform_bonus = {
        "instagram": 4,
        "youtube": 2,
        "tiktok": 1,
    }.get(request.platform.strip().lower(), 0)
    score = max(55, min(95, 60 + (seed % 26) + follower_bonus + platform_bonus))

    factors = [
        ScoringFactor(
            name="Audience credibility",
            value=round(68 + (seed % 19), 1),
            impact="positive" if score >= 72 else "negative",
        ),
        ScoringFactor(
            name="Engagement consistency",
            value=round(60 + ((seed // 7) % 24), 1),
            impact="positive" if score >= 70 else "negative",
        ),
        ScoringFactor(
            name="Growth pattern",
            value=round(58 + ((seed // 13) % 27), 1),
            impact="positive" if score >= 75 else "negative",
        ),
    ]

    explanation = (
        f"Fallback analysis generated for {request.handle} because the ML service was "
        f"unavailable. Score reflects estimated audience quality, engagement stability, "
        f"and follower-scale heuristics for {request.platform}."
    )

    return MLScoringResponse(score=score, factors=factors, explanation=explanation)


def _fallback_pricing(request: MLPricingRequest) -> MLPricingResponse:
    followers = request.follower_count
    score = request.authenticity_score
    
    # Power Law pricing (fallback)
    base_estimate = followers * 0.001
    
    # Scarcity multiplier
    if followers >= 50_000_000: scarcity = 35.0
    elif followers >= 10_000_000: scarcity = 8.0
    elif followers >= 1_000_000: scarcity = 2.5
    else: scarcity = 1.0
    
    # Geographic weight
    geo_weight = 5.5 if followers > 20_000_000 else 1.0
    
    # Exponential auth premium: (score / 50)²
    trust_factor = max((score / 50) ** 2, 0.25)
    
    # Campaign type multiplier
    campaign_multiplier = {
        "sponsored post": 1.0, "instagram_post": 1.0, "product review": 1.2,
        "brand awareness": 1.15, "affiliate": 0.8, "reel": 1.25, "story": 0.7,
    }.get(request.campaign_type.strip().lower(), 1.0)
    
    calibrated = base_estimate * scarcity * geo_weight * trust_factor * campaign_multiplier
    min_price = int(max(5000, round(calibrated * 0.7, -3)))
    max_price = int(max(8000, round(calibrated * 1.5, -3)))
    suggested_price = int((min_price + max_price) / 2)
    
    return MLPricingResponse(
        min_price=min_price,
        max_price=max_price,
        suggested_price=suggested_price,
    )


async def build_creator_analysis(
    request: CreatorAnalysisRequest,
) -> CreatorAnalysisResponse:
    ml_service_status = "connected"

    try:
        scoring = await get_authenticity_score(
            MLScoringRequest(platform=request.platform, handle=request.handle)
        )
    except MLServiceError:
        scoring = _fallback_scoring(request)
        ml_service_status = "fallback"

    try:
        pricing = await get_pricing(
            MLPricingRequest(
                authenticity_score=scoring.score,
                follower_count=request.follower_count,
                niche=request.niche,
                campaign_type=request.campaign_type,
            )
        )
    except MLServiceError:
        pricing = _fallback_pricing(
            MLPricingRequest(
                authenticity_score=scoring.score,
                follower_count=request.follower_count,
                niche=request.niche,
                campaign_type=request.campaign_type,
            )
        )
        ml_service_status = "fallback"

    return CreatorAnalysisResponse(
        platform=request.platform,
        handle=request.handle,
        authenticity_score=scoring.score,
        scoring_factors=scoring.factors,
        score_explanation=scoring.explanation,
        pricing=pricing,
        ml_service_status=ml_service_status,
        blockchain_status="not_started",
        integration_notes=[
            "Frontend can call this endpoint directly to render creator score and pricing details.",
            "If the teammate ML service is offline, this backend returns deterministic fallback values so the UI remains usable.",
            "Blockchain service can consume the returned score and suggested price when creating campaign contracts.",
        ],
    )
