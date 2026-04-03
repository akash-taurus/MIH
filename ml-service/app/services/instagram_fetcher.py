import httpx
from ..core.config import settings
from typing import Dict, Any
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type

class InstagramFetcher:
    BASE_URL = "https://graph.facebook.com/v19.0"

    @classmethod
    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=2, max=10),
        retry=retry_if_exception_type((httpx.RequestError, httpx.HTTPStatusError))
    )
    async def get_user_data(cls, handle: str) -> Dict[str, Any]:
        """
        Fetches Instagram profile data using Graph API.
        """
        access_token = settings.INSTAGRAM_ACCESS_TOKEN
        
        # Validate inputs
        if not handle or not handle.strip():
            raise ValueError("Instagram handle cannot be empty")
        
        if not access_token:
            raise ValueError("Instagram access token not configured")
        
        # Normally you'd query the specific IG Business Account ID connected to the page.
        # Fallback to "me" for Sandbox/testing environments.
        ig_account_id = settings.INSTAGRAM_BUSINESS_ACCOUNT_ID or "me"
        
        params = {
            "access_token": access_token,
            "fields": f"business_discovery.username({handle}){{username,name,biography,website,profile_picture_url,followers_count,follows_count,media_count,media.limit(10){{like_count,comments_count,timestamp}}}}"
        }
        
        url = f"{cls.BASE_URL}/{ig_account_id}"
        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(url, params=params, timeout=30.0)
                response.raise_for_status()
                data = response.json()
                
                # Check for API errors
                if "error" in data:
                    error_msg = data["error"].get("message", "Unknown API error")
                    error_code = data["error"].get("code", 0)
                    raise httpx.HTTPStatusError(
                        f"Instagram API Error: {error_msg} (Code: {error_code})",
                        request=response.request,
                        response=response
                    )
                
                if "business_discovery" in data:
                    bd = data["business_discovery"]
                    
                    # Check if handle exists
                    if not bd:
                        raise ValueError(f"Instagram handle '{handle}' not found or is private")
                    
                    # Calculate engagement rate from recent posts
                    followers_count = bd.get("followers_count", 0)
                    follows_count = bd.get("follows_count", 0)
                    media_count = bd.get("media_count", 0)
                    engagement_rate = 0
                    
                    if followers_count > 0 and "media" in bd:
                        media_data = bd["media"].get("data", [])
                        if media_data:
                            total_engagement = 0
                            valid_posts = 0
                            
                            for post in media_data:
                                likes = post.get("like_count", 0)
                                comments = post.get("comments_count", 0)
                                total_engagement += likes + comments
                                valid_posts += 1
                            
                            if valid_posts > 0:
                                avg_engagement = total_engagement / valid_posts
                                # Instagram engagement rate formula: (avg_engagement / followers_count) * 100
                                engagement_rate = round((avg_engagement / followers_count) * 100, 2)
                                
                                # Normalize to reasonable Instagram engagement rates (typically 1-5%)
                                if engagement_rate > 10:
                                    engagement_rate = 10  # Cap at 10% to avoid outliers
                                elif engagement_rate < 0.05:
                                    engagement_rate = 0.05  # Minimum floor
                    
                    return {
                        "username": bd.get("username", handle),
                        "name": bd.get("name", ""),
                        "biography": bd.get("biography", ""),
                        "website": bd.get("website", ""),
                        "profile_pic": bd.get("profile_picture_url", ""),
                        "followers_count": followers_count,
                        "follows_count": follows_count,
                        "media_count": media_count,
                        "engagement_rate": engagement_rate,
                        "growth_rate": 0
                    }
                
                # Fallback if the payload doesn't map but the request succeeds
                return {
                    "username": handle,
                    "followers_count": 0,
                    "follows_count": 0,
                    "media_count": 0,
                    "engagement_rate": 0,
                    "growth_rate": 0
                }
        except httpx.TimeoutException:
            raise ValueError("Instagram API request timed out")
        except httpx.HTTPStatusError as e:
            if e.response.status_code == 400:
                raise ValueError(f"Invalid Instagram handle: {handle}")
            elif e.response.status_code == 401:
                raise ValueError("Instagram API authentication failed - check access token")
            elif e.response.status_code == 403:
                raise ValueError("Instagram API access forbidden - check permissions")
            elif e.response.status_code == 429:
                raise ValueError("Instagram API rate limit exceeded")
            else:
                raise ValueError(f"Instagram API error: {e}")
        except Exception as e:
            raise ValueError(f"Failed to fetch Instagram data: {str(e)}")
