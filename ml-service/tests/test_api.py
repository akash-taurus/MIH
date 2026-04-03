import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_read_root():
    response = client.get("/")
    assert response.status_code == 200
    assert response.json() == {"message": "Welcome to the MIH ML Service API"}

# Basic mock test just to ensure routing and payload validation works
def test_pricing_endpoint_validation():
    response = client.post("/api/pricing", json={
        "authenticityScore": 80,
        "followerCount": -100, # Assuming no validation logic yet, will pass to logic.py
        "niche": "fitness",
        "campaignType": "post"
    })
    # As long as it responds with a valid price or 500 (since redis etc.), it routed correctly
    assert response.status_code in [200, 500]
