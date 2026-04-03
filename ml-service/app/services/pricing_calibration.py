"""
Creator Pricing Calibration Layer v2 — "Power Law Fix"
======================================================
Kills the Linear Trap by recognizing that reaching 78M people at once
is exponentially more valuable than reaching 1M people 78 times.

Implements 5 calibration steps:
  1. AdSense Floor Price (sponsorship ≥ 2-3x AdSense)
  2. Non-Linear Scarcity Multiplier (Power Law)
  3. Geographic CPM Correction (geo_weight)
  4. Niche Weighting
  5. Exponential Authenticity Premium — (auth_score / 50)²

Hard constraint: Global Icons (50M+) are never priced below ₹10 Crores.
"""

import math
from dataclasses import dataclass, field
from typing import Dict, Optional, List

# ─────────────────────────────────────────────────────────────
# Constants
# ─────────────────────────────────────────────────────────────
ONE_CRORE = 10_000_000  # ₹1 Cr
GLOBAL_ICON_FLOOR_INR = 10 * ONE_CRORE  # ₹10 Crores

# AdSense CPM ranges by region (per 1,000 views, in INR)
ADSENSE_CPM: Dict[str, tuple] = {
    "india":  (80, 400),       # ₹80-₹400 per 1K views
    "global": (400, 1200),     # ₹400-₹1,200
    "usa":    (600, 1500),     # ₹600-₹1,500
    "uk":     (500, 1300),     # ₹500-₹1,300
}

# Sponsorship CPM ranges by region (per 1,000 views, in INR)
# These are the rates brands actually pay for sponsored integrations
SPONSORSHIP_CPM: Dict[str, tuple] = {
    "india":  (200, 600),
    "global": (1500, 3000),
    "usa":    (1500, 3000),
    "uk":     (1500, 3000),
}

# Niche multipliers (2026 Indian + global market rates)
NICHE_MULTIPLIERS: Dict[str, float] = {
    "finance":       1.5,
    "fintech":       1.5,
    "investing":     1.5,
    "tech":          1.5,
    "technology":    1.5,
    "saas":          1.5,
    "ai":            1.5,
    "crypto":        1.4,
    "edtech":        1.3,
    "education":     1.3,
    "health":        1.3,
    "fitness":       1.2,
    "gaming":        1.2,
    "beauty":        1.2,
    "fashion":       1.1,
    "lifestyle":     1.0,
    "food":          1.0,
    "travel":        1.1,
    "sports":        1.1,
    "entertainment": 0.8,
    "comedy":        0.8,
    "memes":         0.8,
    "general":       0.8,
    "vlog":          0.9,
    "music":         0.9,
    "global icon":   1.5,   # Icons transcend niche — brand value premium
}

# Historical brand deal data as a floor for known mega-creators (INR)
# This acts as the final "guardrail" for household names
KNOWN_ICON_FLOORS: Dict[str, int] = {
    "cristiano":      50 * ONE_CRORE,   # Ronaldo: $5-10M per post
    "ronaldo":        50 * ONE_CRORE,
    "virat.kohli":    15 * ONE_CRORE,   # Kohli: ₹15-25 Cr per deal
    "viratkohli":     15 * ONE_CRORE,
    "mrbeast":        25 * ONE_CRORE,   # MrBeast: $2-3M per integration
    "pewdiepie":      12 * ONE_CRORE,
    "tseriesofficial": 10 * ONE_CRORE,
    "tseries":        10 * ONE_CRORE,
    "carryminati":     5 * ONE_CRORE,   # Top Indian YT
    "bfrhanofficial":  3 * ONE_CRORE,
    "khaby.lame":     20 * ONE_CRORE,
    "kyliejenner":    25 * ONE_CRORE,
    "selenagomez":    20 * ONE_CRORE,
    "therock":        25 * ONE_CRORE,
}


# ─────────────────────────────────────────────────────────────
# Data classes
# ─────────────────────────────────────────────────────────────
@dataclass
class CalibrationInput:
    """All variables the calibration layer considers."""
    follower_count: int
    average_views: int  # Average views on last 10 videos
    auth_score: int     # Credibility score 0-100
    niche: str          # e.g., "Finance", "Gaming", "Global Icon"
    audience_region: str  # e.g., "India", "Global", "USA"
    handle: str = ""    # For known-icon lookup
    campaign_type: str = "sponsored_video"  # video, reel, story, post
    platform: str = "youtube"  # youtube or instagram
    base_estimate: int = 0  # ML model's raw price output (if available)


@dataclass
class CalibrationBreakdown:
    """Detailed breakdown of how the price was derived."""
    adsense_floor: int = 0
    sponsorship_floor: int = 0
    scarcity_multiplier: float = 1.0
    geographic_cpm_used: float = 0.0
    niche_multiplier: float = 1.0
    auth_premium_applied: bool = False
    auth_premium_pct: float = 0.0
    global_icon_override: bool = False
    known_icon_override: bool = False
    base_calibrated_price: int = 0


@dataclass
class CalibratedPricing:
    """The three-tier output."""
    conservative: int = 0
    market_average: int = 0
    premium: int = 0
    currency: str = "INR"
    breakdown: CalibrationBreakdown = field(default_factory=CalibrationBreakdown)
    justification: str = ""


# ─────────────────────────────────────────────────────────────
# Core Calibration Engine
# ─────────────────────────────────────────────────────────────
class PricingCalibrationEngine:
    """
    Senior Influencer Marketing Strategist — 2026 Global & Indian rates.
    Transforms raw follower-based estimates into market-realistic fees.
    """

    @staticmethod
    def calibrate(inp: CalibrationInput) -> CalibratedPricing:
        bd = CalibrationBreakdown()
        reasons: List[str] = []

        region = inp.audience_region.lower().strip()
        niche = inp.niche.lower().strip()
        handle_key = inp.handle.lower().strip().lstrip("@")

        # ─── Step 1: The AdSense Floor ───────────────────────
        adsense_cpm_low, adsense_cpm_high = ADSENSE_CPM.get(region, ADSENSE_CPM["india"])
        adsense_cpm_mid = (adsense_cpm_low + adsense_cpm_high) / 2.0

        # AdSense revenue per video = (avg_views / 1000) * CPM
        # Only ~55% of views are monetizable (ad-block, non-served, etc.)
        monetizable_views = inp.average_views * 0.55
        adsense_per_video = (monetizable_views / 1000.0) * adsense_cpm_mid
        bd.adsense_floor = int(adsense_per_video)

        # Sponsorship must be at least 2x–3x the AdSense floor
        sponsorship_floor = adsense_per_video * 2.5  # Use midpoint (2.5x)
        bd.sponsorship_floor = int(sponsorship_floor)

        reasons.append(
            f"Step 1 — AdSense Floor: {inp.average_views:,} avg views × "
            f"₹{adsense_cpm_mid:.0f} CPM (55% monetizable) = ₹{adsense_per_video:,.0f}/video. "
            f"Sponsorship floor (2.5x): ₹{sponsorship_floor:,.0f}"
        )

        # ─── Step 2: Scarcity Multiplier (Non-Linear) ────────
        scarcity = PricingCalibrationEngine._scarcity_multiplier(inp.follower_count)
        bd.scarcity_multiplier = scarcity

        reasons.append(
            f"Step 2 — Scarcity Multiplier: {inp.follower_count:,} followers → {scarcity:.1f}x "
            f"(attention monopoly premium)"
        )

        # ─── Step 3: Geographic Correction ────────────────────
        # We report the region's actual sponsorship CPM for transparency,
        # but use INDIA rates as the baseline. The geo_weight (5.5x for 20M+)
        # handles the global premium separately — this avoids double-counting.
        spon_cpm_low, spon_cpm_high = SPONSORSHIP_CPM.get(region, SPONSORSHIP_CPM["india"])
        spon_cpm_mid = (spon_cpm_low + spon_cpm_high) / 2.0
        bd.geographic_cpm_used = spon_cpm_mid

        # Base estimate always uses India rates (geo_weight corrects upward)
        india_cpm_low, india_cpm_high = SPONSORSHIP_CPM["india"]
        india_cpm_mid = (india_cpm_low + india_cpm_high) / 2.0
        geo_base = (inp.average_views / 1000.0) * india_cpm_mid

        reasons.append(
            f"Step 3 — Base CPM: Using India baseline CPM ₹{india_cpm_low:,}–₹{india_cpm_high:,} "
            f"(mid: ₹{india_cpm_mid:,.0f}). Region '{inp.audience_region}' actual CPM: "
            f"₹{spon_cpm_mid:,.0f} (corrected via geo_weight). Geo base: ₹{geo_base:,.0f}"
        )

        # ─── Step 4: Niche Weighting ─────────────────────────
        niche_mult = NICHE_MULTIPLIERS.get(niche, 1.0)
        bd.niche_multiplier = niche_mult

        reasons.append(
            f"Step 4 — Niche Weighting: '{inp.niche}' → {niche_mult:.1f}x multiplier"
        )

        # ─── Step 5: Exponential Auth Premium (Power Law Fix) ─
        # Formula: (auth_score / 50)² — rewards elite creators exponentially
        # Score 100 → 4.0x, Score 85 → 2.89x, Score 50 → 1.0x, Score 30 → 0.36x
        trust_factor = (inp.auth_score / 50.0) ** 2
        trust_factor = max(trust_factor, 0.25)  # Floor at 0.25x to avoid near-zero

        auth_premium = trust_factor
        bd.auth_premium_applied = trust_factor > 1.0
        bd.auth_premium_pct = round((trust_factor - 1.0) * 100, 1)

        reasons.append(
            f"Step 5 — Exponential Auth Premium: Score {inp.auth_score}/100 → "
            f"(score/50)² = {trust_factor:.2f}x trust factor "
            f"({'premium' if trust_factor > 1.0 else 'discount'})"
        )

        # ─── Geographic Weight (Power Law Fix) ────────────────
        # Global audiences command 5.5x CPM premium over local rates
        geo_weight = 5.5 if inp.follower_count > 20_000_000 else 1.0
        reasons.append(
            f"Step 5b — Geographic Weight: {inp.follower_count:,} followers → "
            f"{geo_weight}x geo premium ({'global audience' if geo_weight > 1 else 'local rates'})"
        )

        # ─── Composite Calculation (Power Law Formula) ────────
        # The formula: calibrated = base_estimate × scarcity × geo_weight × trust_factor
        #
        # base_estimate source priority:
        #   1. ML model output (if provided via inp.base_estimate)
        #   2. Fallback: max(sponsorship_floor, geo_base)
        if inp.base_estimate > 0:
            base_estimate = inp.base_estimate
            source = "ML Model output"
        else:
            base_estimate = max(sponsorship_floor, geo_base)
            source = f"max(₹{sponsorship_floor:,.0f}, ₹{geo_base:,.0f})"

        reasons.append(
            f"Composite — Base Estimate: {source} = ₹{base_estimate:,.0f}"
        )

        # Apply POWER LAW: base × scarcity × geo_weight × trust × niche
        calibrated = base_estimate * scarcity * geo_weight * auth_premium * niche_mult

        # Campaign type adjustment
        ct_mult = PricingCalibrationEngine._campaign_type_multiplier(inp.campaign_type)
        calibrated *= ct_mult

        base_price = calibrated
        bd.base_calibrated_price = int(base_price)

        # ─── Guardrail: Global Icon Constraint ───────────────
        # Check known icons first (historical data override)
        known_floor = KNOWN_ICON_FLOORS.get(handle_key, 0)
        if known_floor > 0 and base_price < known_floor:
            base_price = known_floor
            bd.known_icon_override = True
            reasons.append(
                f"⚠ Known Icon Override: '{inp.handle}' historical brand deal floor = "
                f"₹{known_floor / ONE_CRORE:.1f} Cr applied"
            )

        # Generic global icon constraint
        if inp.follower_count >= 50_000_000 and base_price < GLOBAL_ICON_FLOOR_INR:
            base_price = GLOBAL_ICON_FLOOR_INR
            bd.global_icon_override = True
            reasons.append(
                f"⚠ Global Icon Guardrail: {inp.follower_count:,} followers (≥50M) → "
                f"Floor enforced at ₹{GLOBAL_ICON_FLOOR_INR / ONE_CRORE:.0f} Crores"
            )

        # ─── Three-Tier Output ───────────────────────────────
        conservative = int(base_price * 0.70)
        market_avg   = int(base_price)
        premium      = int(base_price * 1.50)

        # Ensure minimum sanity for any creator
        conservative = max(conservative, 5000)   # ₹5,000 absolute minimum
        market_avg   = max(market_avg, 8000)
        premium      = max(premium, 12000)

        justification = " | ".join(reasons)

        return CalibratedPricing(
            conservative=conservative,
            market_average=market_avg,
            premium=premium,
            currency="INR",
            breakdown=bd,
            justification=justification,
        )

    # ─── Helper: Non-Linear Scarcity Multiplier (Power Law Fix) ─
    @staticmethod
    def _scarcity_multiplier(followers: int) -> float:
        """
        THE POWER LAW FIX:
        Most models fail because they don't account for the monopoly on attention.
        Reaching 78M people at once ≠ reaching 1M people 78 times.
        It's exponentially more valuable because of the scarcity of
        someone commanding that much attention simultaneously.
        """
        if followers >= 50_000_000:    # 50M+ → Global Icon (Ronaldo, MrBeast)
            # Smooth interpolation: 35x at 50M → 50x at 200M+
            ratio = min((followers - 50_000_000) / 150_000_000, 1.0)
            return 35.0 + (15.0 * ratio)
        elif followers >= 10_000_000:  # 10M+ → Mega-Star
            # 8x at 10M → 35x at 50M (logarithmic curve)
            ratio = math.log10(followers / 10_000_000) / math.log10(5)
            return 8.0 + (27.0 * ratio)
        elif followers >= 1_000_000:   # 1M+ → Macro-Creator
            # 2.5x at 1M → 8x at 10M
            ratio = (followers - 1_000_000) / 9_000_000
            return 2.5 + (5.5 * ratio)
        elif followers >= 100_000:     # 100K+ → Mid-Tier
            ratio = (followers - 100_000) / 900_000
            return 1.2 + (1.3 * ratio)
        elif followers >= 10_000:      # 10K+ → Micro
            return 1.0
        else:                          # Nano
            return 0.8

    # ─── Helper: Campaign Type Multiplier ────────────────────
    @staticmethod
    def _campaign_type_multiplier(campaign_type: str) -> float:
        ct = campaign_type.lower().strip()
        multipliers = {
            "sponsored_video":    1.0,
            "video":              1.0,
            "dedicated_video":    1.8,   # Entire video about brand
            "integration":       1.2,   # Mid-roll mention
            "reel":              0.6,   # Short-form
            "short":             0.6,
            "story":             0.3,   # Ephemeral
            "post":              0.5,   # Static image post
            "carousel":          0.6,
            "live":              1.5,   # Live stream integration
            "podcast":           1.3,
            "series":            3.0,   # Multi-video series deal
        }
        return multipliers.get(ct, 1.0)


# ─────────────────────────────────────────────────────────────
# Convenience function
# ─────────────────────────────────────────────────────────────
def calibrate_creator_price(
    follower_count: int,
    average_views: int,
    auth_score: int,
    niche: str,
    audience_region: str,
    handle: str = "",
    campaign_type: str = "sponsored_video",
    platform: str = "youtube",
    base_estimate: int = 0,
) -> CalibratedPricing:
    """Top-level convenience function."""
    inp = CalibrationInput(
        follower_count=follower_count,
        average_views=average_views,
        auth_score=auth_score,
        niche=niche,
        audience_region=audience_region,
        handle=handle,
        campaign_type=campaign_type,
        platform=platform,
        base_estimate=base_estimate,
    )
    return PricingCalibrationEngine.calibrate(inp)
