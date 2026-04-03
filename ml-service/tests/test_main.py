import pytest
from httpx import AsyncClient
from app.main import app

@pytest.mark.asyncio
async def test_read_root():
    async with AsyncClient(app=app, base_url="http://test") as ac:
        response = await ac.get("/")
    assert response.status_code == 200
    assert response.json() == {"message": "Welcome to the MIH ML Service API"}

@pytest.mark.asyncio
async def test_get_score_endpoint():
    async with AsyncClient(app=app, base_url="http://test") as ac:
        payload = {"platform": "instagram", "handle": "john_doe"}
        response = await ac.post("/api/score", json=payload)
    
    assert response.status_code == 200
    data = response.json()
    assert "score" in data
    assert "factors" in data
    assert isinstance(data["score"], int)

@pytest.mark.asyncio
async def test_get_pricing_endpoint():
    async with AsyncClient(app=app, base_url="http://test") as ac:
        payload = {
            "authenticityScore": 78,
            "followerCount": 50000,
            "niche": "fitness",
            "campaignType": "instagram_post"
        }
        response = await ac.post("/api/pricing", json=payload)
    
    assert response.status_code == 200
    data = response.json()
    assert "suggestedPrice" in data
    assert data["suggestedPrice"] > 0
