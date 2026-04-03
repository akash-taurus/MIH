from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

print("--- Testing /api/score (YouTube) ---")
try:
    resp1 = client.post("/api/score", json={"platform": "youtube", "handle": "mkbhd"})
    print("Status:", resp1.status_code)
    print("Response:", resp1.json())
except Exception as e:
    print("Exception thrown:", str(e))

print("\n--- Testing /api/score (Instagram) ---")
try:
    resp2 = client.post("/api/score", json={"platform": "instagram", "handle": "cristiano"})
    print("Status:", resp2.status_code)
    print("Response:", resp2.json())
except Exception as e:
    print("Exception thrown:", str(e))

print("\n--- Testing /api/pricing ---")
try:
    resp3 = client.post("/api/pricing", json={
        "authenticityScore": 90,
        "followerCount": 20800000,
        "niche": "tech",
        "campaignType": "video"
    })
    print("Status:", resp3.status_code)
    print("Response:", resp3.json())
except Exception as e:
    print("Exception thrown:", str(e))
