from app.models.schemas import CalibratedPricingRequest
from app.services.logic import suggest_calibrated_pricing

req = CalibratedPricingRequest(
    followerCount=630_000_000,
    averageViews=20_000_000,
    authenticityScore=95,
    niche="sports",
    audienceRegion="global",
    handle="cristiano",
    campaignType="sponsored_video",
    platform="instagram"
)

res = suggest_calibrated_pricing(req)
print("--- Ronaldo Test ---")
print(f"Conservative: ₹{res.conservative:,}")
print(f"Market Avg  : ₹{res.marketAverage:,}")
print(f"Premium     : ₹{res.premium:,}")
print(f"Justification:\n{res.justification}")
print(f"Known Override: {res.breakdown.knownIconOverride}")

req2 = CalibratedPricingRequest(
    followerCount=5_000_000,
    averageViews=200_000,
    authenticityScore=80,
    niche="finance",
    audienceRegion="india",
    handle="random_finance",
    campaignType="integration",
    platform="youtube"
)

res2 = suggest_calibrated_pricing(req2)
print("\n--- Mid-Tier Finance Creator Test ---")
print(f"Market Avg  : ₹{res2.marketAverage:,}")
print(f"Justification:\n{res2.justification}")
