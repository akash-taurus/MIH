import httpx
from ..core.config import settings
from typing import Dict, Any
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type

class YouTubeFetcher:
    BASE_URL = "https://www.googleapis.com/youtube/v3"

    @classmethod
    async def search_channels(cls, query: str, max_results: int = 10) -> list[Dict[str, Any]]:
        api_key = settings.YOUTUBE_API_KEY
        if not api_key: raise ValueError("YouTube API key not configured")

        # If it looks like a handle, try identifying it directly first
        clean_q = query.strip()
        if clean_q.startswith('@'):
            try:
                direct = await cls.get_channel_data(clean_q)
                if direct: return [direct]
            except Exception as e:
                print(f"Direct Lookup Failed for {clean_q}: {e}")
        
        # Strip @ for search q
        search_q = clean_q.lstrip('@')
        
        params = {
            "key": api_key,
            "q": search_q,
            "part": "snippet",
            "type": "channel",
            "maxResults": 25, # Fetch more to filter down to top ones
            "relevanceLanguage": "en",
        }

        url = f"{cls.BASE_URL}/search"
        async with httpx.AsyncClient() as client:
            try:
                response = await client.get(url, params=params, timeout=30.0)
                response.raise_for_status()
                data = response.json()
                
                results = []
                for item in data.get("items", []):
                    try:
                        detail = await cls.get_channel_data(item["snippet"]["channelId"])
                        # Filter for Top Creators: Skip if less than 10,000 subscribers 
                        # unless it's a direct handle match
                        if detail.get("subscriber_count", 0) < 10000:
                            continue
                        results.append(detail)
                        if len(results) >= max_results: break
                    except: continue
                
                # Sort by subscriber count to ensure top ones per niche come first
                results.sort(key=lambda x: x.get("subscriber_count", 0), reverse=True)
                return results
            except Exception as e:
                print(f"DEBUG: Search Error {e}")
                return []

    @classmethod
    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=2, max=10),
        retry=retry_if_exception_type((httpx.RequestError, httpx.HTTPStatusError))
    )
    async def get_channel_data(cls, handle_or_id: str) -> Dict[str, Any]:
        if not handle_or_id: raise ValueError("YouTube identifier cannot be empty")
        api_key = settings.YOUTUBE_API_KEY
        params = {"key": api_key, "part": "statistics,snippet"}
        if handle_or_id.startswith('UC'):
            params["id"] = handle_or_id
        else:
            params["forHandle"] = handle_or_id if handle_or_id.startswith('@') else f"@{handle_or_id}"
        
        url = f"{cls.BASE_URL}/channels"

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
                        f"YouTube API Error: {error_msg} (Code: {error_code})",
                        request=response.request,
                        response=response
                    )
                
                if data.get("items"):
                    item = data["items"][0]
                    snippet = item.get("snippet", {})
                    stats = item.get("statistics", {})
                    
                    sub_count = int(stats.get("subscriberCount", 0))
                    video_count = int(stats.get("videoCount", 0))
                    view_count = int(stats.get("viewCount", 0))
                    
                    # Engagement Rate logic already exists...
                    if sub_count > 0 and video_count > 0:
                        er = round(((view_count / video_count) / sub_count) * 100, 2)
                        er = min(max(er, 0.1), 15.0)
                    else:
                        er = 0
                    
                    # Extract handle from snippet if possible, else use identifier
                    handle = snippet.get("customUrl", handle_or_id)
                    if not handle.startswith('@') and not handle.startswith('UC'):
                        handle = f"@{handle}"

                    return {
                        "username": handle,
                        "name": snippet.get("title", ""),
                        "biography": snippet.get("description", ""),
                        "profile_pic": snippet.get("thumbnails", {}).get("default", {}).get("url", ""),
                        "subscriber_count": sub_count,
                        "video_count": video_count,
                        "view_count": view_count,
                        "engagement_rate": er,
                        "growth_rate": 0
                    }
                
                # Channel not found
                raise ValueError(f"YouTube channel '{handle_or_id}' not found")
                
        except httpx.TimeoutException:
            raise ValueError("YouTube API request timed out")
        except httpx.HTTPStatusError as e:
            if e.response.status_code == 400:
                raise ValueError(f"Invalid YouTube handle: {handle}")
            elif e.response.status_code == 401:
                raise ValueError("YouTube API authentication failed - check API key")
            elif e.response.status_code == 403:
                if "quota" in str(e).lower():
                    raise ValueError("YouTube API quota exceeded")
                else:
                    raise ValueError("YouTube API access forbidden - check permissions")
            elif e.response.status_code == 429:
                raise ValueError("YouTube API rate limit exceeded")
            else:
                raise ValueError(f"YouTube API error: {e}")
        except Exception as e:
            raise ValueError(f"Failed to fetch YouTube data: {str(e)}")
