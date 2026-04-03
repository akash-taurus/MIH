import asyncio
import os
from app.services.youtube_fetcher import YouTubeFetcher

async def test():
    print("Testing YouTube Search for @PhotoOwl...")
    res = await YouTubeFetcher.search_channels("@PhotoOwl")
    if res:
        print(f"SUCCESS: Found {res[0].get('name')} (Handle: {res[0].get('username')})")
        print(f"Stats: {res[0].get('subscriber_count')} subs")
    else:
        print("FAILURE: No results found for @PhotoOwl")

    print("\nTesting YouTube Search for 'MrBeast'...")
    res = await YouTubeFetcher.search_channels("MrBeast")
    if res:
        print(f"SUCCESS: Found {res[0].get('name')}")
    else:
        print("FAILURE: No results found for MrBeast")

if __name__ == "__main__":
    asyncio.run(test())
