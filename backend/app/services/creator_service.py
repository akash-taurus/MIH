import csv
import os
import re

from app.models.schemas import (
    CreatorAnalysisResponse,
    FrontendCreator,
    FrontendCreatorListResponse,
    MLPricingResponse,
)
from app.services.ml_client import search_youtube_creators


def _mk_creator(
    creator_id: int,
    handle: str,
    niche: str,
    platform: str,
    followers: int,
    score: int,
    campaigns: int,
) -> FrontendCreator:
    fake = round((1 - score / 100) * 28 + 2)
    engagement = round(2 + (score / 100) * 7, 1)
    
    # --- Power Law Pricing (kills the Linear Trap) ---
    base_estimate = followers * 0.001  # Raw base: ₹1 per 1K followers
    
    # Scarcity multiplier (attention monopoly)
    if followers >= 50_000_000:
        scarcity = 35.0
    elif followers >= 10_000_000:
        scarcity = 8.0
    elif followers >= 1_000_000:
        scarcity = 2.5
    else:
        scarcity = 1.0
    
    # Geographic weight: global audiences command premium CPM
    geo_weight = 5.5 if followers > 20_000_000 else 1.0
    
    # Exponential auth premium: (score / 50)²
    trust_factor = max((score / 50) ** 2, 0.25)
    
    # Niche multiplier
    niche_mult = {
        "Finance": 1.5, "Tech": 1.5, "Fitness": 1.2, "Beauty": 1.2,
        "Fashion": 1.1, "Food": 1.0, "Travel": 1.1, "Gaming": 1.2,
    }.get(niche, 1.0)
    
    calibrated = base_estimate * scarcity * geo_weight * trust_factor * niche_mult
    price_min = max(5000, round(calibrated * 0.7, -3))
    price_max = max(8000, round(calibrated * 1.5, -3))
    
    return FrontendCreator(
        id=creator_id,
        handle=handle,
        niche=niche,
        platform=platform,
        followers=followers,
        score=score,
        fake=fake,
        eng=engagement,
        reach=round(followers * (engagement / 100) * 0.6),
        price_min=int(price_min),
        price_max=int(price_max),
        campaigns=campaigns,
        trust="Elite" if score >= 80 else "Verified" if score >= 65 else "Moderate",
    )


def _parse_multiplier(val_str: str) -> float:
    v = val_str.replace('M', '').replace('K', '').strip()
    try:
        n = float(v)
    except Exception:
        return 0.0
    if 'M' in val_str:
        return n * 1000000
    if 'K' in val_str:
        return n * 1000
    return n

def _load_real_creators() -> list[FrontendCreator]:
    creators = []
    # Relative path from this file's location to ml-service/tmp_influencers.csv
    csv_path = os.path.join(os.path.dirname(__file__), "..", "..", "..", "ml-service", "tmp_influencers.csv")
    csv_path = os.path.abspath(csv_path)

    if not os.path.exists(csv_path):
        # Fallback if csv not found
        return [
            _mk_creator(1, "@rahulfit_", "Fitness", "Instagram", 142000, 87, 12),
            _mk_creator(2, "@techbyte_in", "Tech", "YouTube", 298000, 79, 15)
        ]
        
    with open(csv_path, encoding='utf-8') as f:
        reader = csv.DictReader(f)
        idx = 1
        for row in reader:
            name_col = row.get('NAME', '')
            handle_match = re.search(r'(@[\w\.]+)', name_col)
            handle = handle_match.group(1) if handle_match else name_col.split()[-1]
            if not handle.startswith('@'):
                handle = '@' + handle
                
            followers = int(_parse_multiplier(row.get('FOLLOWERS', '0')))
            if followers == 0: continue
            
            topics = row.get('TOPIC OF INFLUENCE', '').replace(',', ' ').split()
            niche = topics[0] if topics else 'Lifestyle'
            n_lower = niche.lower()
            if 'beauty' in n_lower or 'fashion' in n_lower or 'model' in n_lower:
                niche = 'Fashion'
            elif 'sport' in n_lower or 'soccer' in n_lower or 'basketball' in n_lower:
                niche = 'Fitness'
            elif 'music' in n_lower or 'singer' in n_lower or 'actor' in n_lower or 'art' in n_lower:
                niche = 'Beauty' # Mapped for filter compatibility
            elif 'finance' in n_lower or 'business' in n_lower:
                niche = 'Finance'
            elif 'food' in n_lower or 'chef' in n_lower:
                niche = 'Food'
            else:
                niche = 'Travel' # Mapped for filter compatibility

            er_str = row.get('ER', '0')
            try:
                if er_str == '-':
                    er = 0.5
                else:
                    er = float(er_str) * 100
            except:
                er = 1.0

            score = min(99, max(40, int(60 + (er * 5) + (followers / 10000000))))
            
            reach = int(_parse_multiplier(row.get('POTENTIAL REACH', '0')))
            if reach == 0:
                reach = int(followers * (er / 100) * 0.8)
                
            platform = "Instagram" if idx % 3 != 0 else "YouTube"
            campaigns = idx % 10

            c = _mk_creator(
                creator_id=idx,
                handle=handle,
                niche=niche,
                platform=platform,
                followers=followers,
                score=score,
                campaigns=campaigns
            )
            c.eng = round(float(er), 2)
            c.reach = reach
            creators.append(c)
            idx += 1
            if idx > 100:
                break
    return creators

CREATORS: list[FrontendCreator] = _load_real_creators()


async def list_creators(
    query: str = "",
    platform: str = "All",
    niche: str = "All",
    sort_by: str = "score",
) -> FrontendCreatorListResponse:
    query_lower = query.strip().lower()
    
    # Dynamic search for YouTube if platform is YouTube or searching
    yt_creators = []
    if (platform == "YouTube" or platform == "All") and (query or niche != "All"):
        search_q = query.strip()
        if not search_q and niche != "All":
            search_q = f"{niche} creators"
        
        raw_yt = await search_youtube_creators(search_q, limit=10)
        for i, item in enumerate(raw_yt):
            handle = item.get("username", "Unknown").lower().replace(" ", "")
            if not handle.startswith('@'): handle = "@" + handle
            
            yt_followers = item.get("subscriber_count", 0)
            yt_score = min(99, max(40, int(60 + (item.get('engagement_rate', 0) * 5))))
            yt_niche = niche if niche != "All" else "Lifestyle"
            
            # Power Law pricing for YouTube results
            yt_base = yt_followers * 0.001
            if yt_followers >= 50_000_000: yt_scarcity = 35.0
            elif yt_followers >= 10_000_000: yt_scarcity = 8.0
            elif yt_followers >= 1_000_000: yt_scarcity = 2.5
            else: yt_scarcity = 1.0
            yt_geo = 5.5 if yt_followers > 20_000_000 else 1.0
            yt_trust = max((yt_score / 50) ** 2, 0.25)
            yt_calibrated = yt_base * yt_scarcity * yt_geo * yt_trust
            
            yt_creators.append(FrontendCreator(
                id=f"yt-{item.get('username', i)}",
                handle=handle,
                avatar=item.get("profile_pic"),
                niche=yt_niche,
                platform="YouTube",
                followers=yt_followers,
                score=yt_score,
                fake=round((1 - 80/100) * 28 + 2),
                eng=item.get("engagement_rate", 0),
                reach=item.get("view_count", 0) // 100,
                priceMin=int(max(5000, round(yt_calibrated * 0.7, -3))),
                priceMax=int(max(8000, round(yt_calibrated * 1.5, -3))),
                campaigns=i % 5,
                trust="Verified" if i < 5 else "Moderate",
            ))

    filtered = [
        creator
        for creator in CREATORS
        if (
            not query_lower
            or query_lower in creator.handle.lower()
            or query_lower in creator.niche.lower()
            or query_lower in creator.platform.lower()
        )
        and (platform == "All" or creator.platform == platform)
        and (niche == "All" or creator.niche == niche)
    ]
    
    # Merge results
    all_results = filtered + yt_creators
    # Dedup by handle if needed, or just unique IDs
    
    sorters = {
        "score": lambda creator: creator.score,
        "reach": lambda creator: creator.reach,
        "followers": lambda creator: creator.followers,
        "engagement": lambda creator: creator.eng,
    }
    sorter = sorters.get(sort_by, sorters["score"])
    all_results.sort(key=sorter, reverse=True)

    return FrontendCreatorListResponse(
        creators=all_results,
        total=len(all_results),
        query=query,
        sortBy=sort_by,
        platform=platform,
        niche=niche,
    )


def get_creator_by_id(creator_id: int | str | None) -> FrontendCreator | None:
    if creator_id is None:
        return None

    creator_id_str = str(creator_id)
    for creator in CREATORS:
        if str(creator.id) == creator_id_str:
            return creator
    return None


def get_creator_by_handle(handle: str) -> FrontendCreator | None:
    normalized = handle.strip().lower()
    for creator in CREATORS:
        if creator.handle.lower() == normalized:
            return creator
    return None


def build_frontend_creator_from_analysis(
    analysis: CreatorAnalysisResponse,
    followers: int,
    niche: str,
    existing_creator: FrontendCreator | None = None,
) -> FrontendCreator:
    score = analysis.authenticity_score
    if existing_creator:
        creator_id = existing_creator.id
        campaigns = existing_creator.campaigns
        platform = existing_creator.platform
    else:
        creator_id = f"analyzed-{analysis.platform.lower()}-{analysis.handle.lower().lstrip('@')}"
        campaigns = 0
        platform = analysis.platform

    fake = round((1 - score / 100) * 28 + 2)
    engagement = round(2 + (score / 100) * 7, 1)

    return FrontendCreator(
        id=creator_id,
        handle=analysis.handle,
        niche=niche,
        platform=platform,
        followers=followers,
        score=score,
        fake=fake,
        eng=engagement,
        reach=round(followers * (engagement / 100) * 0.6),
        price_min=analysis.pricing.min_price,
        price_max=analysis.pricing.max_price,
        campaigns=campaigns,
        trust="Elite" if score >= 80 else "Verified" if score >= 65 else "Moderate",
        scoring_factors=analysis.scoring_factors,
        score_explanation=analysis.score_explanation,
        ml_service_status=analysis.ml_service_status,
    )
