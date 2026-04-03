# ML Service Testing Guide

This guide provides comprehensive instructions for testing the ML service to ensure it works correctly with real data.

## Quick Start Testing

### 1. Basic Verification (No API Keys Required)
Run the verification script to test core functionality:
```bash
cd ml-service
python test_verification.py
```

This tests:
- Module imports
- ML model functionality
- Pydantic schemas
- Error handling structure

### 2. Unit Tests (Mocked API Calls)
Run the unit tests with mocked API responses:
```bash
cd ml-service
PYTHONPATH=. python -m pytest tests/test_logic.py -v
```

This tests:
- Authenticity scoring with realistic data
- Pricing calculations for different influencer tiers
- Error handling scenarios
- Edge cases

## API Testing

### 3. Local API Testing (Requires API Keys)

#### Setup Environment Variables
Create a `.env` file in the `ml-service` directory:
```bash
cp .env.example .env
```

Edit `.env` with your API keys:
```
INSTAGRAM_ACCESS_TOKEN=your_facebook_page_access_token
INSTAGRAM_BUSINESS_ACCOUNT_ID=your_ig_business_account_id
YOUTUBE_API_KEY=your_youtube_data_api_key
REDIS_HOST=localhost
REDIS_PORT=6379
USE_REDIS=True
```

#### Start the Service
```bash
cd ml-service
python -m uvicorn app.main:app --reload --port 8000
```

#### Test Endpoints

**Authenticity Scoring:**
```bash
# Test Instagram
curl -X POST "http://localhost:8000/api/score" \
  -H "Content-Type: application/json" \
  -d '{"platform": "instagram", "handle": "natgeo"}'

# Test YouTube
curl -X POST "http://localhost:8000/api/score" \
  -H "Content-Type: application/json" \
  -d '{"platform": "youtube", "handle": "@YouTube"}'
```

**Pricing Recommendations:**
```bash
curl -X POST "http://localhost:8000/api/pricing" \
  -H "Content-Type: application/json" \
  -d '{
    "authenticityScore": 85,
    "followerCount": 100000,
    "niche": "fitness",
    "campaignType": "instagram_post"
  }'
```

### 4. Interactive API Testing

Open your browser and navigate to:
- **API Documentation**: http://localhost:8000/docs
- **Alternative UI**: http://localhost:8000/redoc

Use the interactive Swagger UI to test endpoints with different parameters.

## Integration Testing

### 5. End-to-End Testing Script

Create a test script to verify the complete workflow:

```python
# test_e2e.py
import requests
import json

BASE_URL = "http://localhost:8000"

def test_authenticity_scoring():
    """Test authenticity scoring with real handles"""
    test_cases = [
        {"platform": "instagram", "handle": "natgeo"},
        {"platform": "youtube", "handle": "@YouTube"},
    ]
    
    for case in test_cases:
        print(f"Testing {case['platform']} handle: {case['handle']}")
        response = requests.post(f"{BASE_URL}/api/score", json=case)
        print(f"Status: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(f"Score: {data['score']}")
            print(f"Factors: {len(data['factors'])}")
        print("-" * 50)

def test_pricing():
    """Test pricing recommendations"""
    test_cases = [
        {
            "authenticityScore": 90,
            "followerCount": 50000,
            "niche": "fitness",
            "campaignType": "instagram_post"
        },
        {
            "authenticityScore": 75,
            "followerCount": 500000,
            "niche": "tech",
            "campaignType": "instagram_reel"
        }
    ]
    
    for case in test_cases:
        print(f"Testing pricing for {case['niche']} niche")
        response = requests.post(f"{BASE_URL}/api/pricing", json=case)
        print(f"Status: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(f"Price Range: ${data['minPrice']} - ${data['maxPrice']}")
            print(f"Suggested: ${data['suggestedPrice']}")
        print("-" * 50)

if __name__ == "__main__":
    test_authenticity_scoring()
    test_pricing()
```

Run with:
```bash
python test_e2e.py
```

## Testing Without API Keys

### 6. Mock Testing

If you don't have API keys, you can still test the logic:

```python
# test_mock.py
from unittest.mock import patch, AsyncMock
from app.services import logic

async def test_with_mock_data():
    """Test with mocked API responses"""
    
    # Mock Instagram data
    with patch('app.services.logic.InstagramFetcher.get_user_data') as mock_instagram:
        mock_instagram.return_value = {
            "username": "test_influencer",
            "followers_count": 100000,
            "media_count": 200,
            "engagement_rate": 3.5,
            "growth_rate": 0.05
        }
        
        result = await logic.calculate_authenticity_score("instagram", "test_influencer")
        print(f"Authenticity Score: {result.score}")
        print(f"Factors: {[f.name for f in result.factors]}")
    
    # Test pricing
    pricing = logic.suggest_pricing(85, 100000, "fitness", "instagram_post")
    print(f"Pricing: ${pricing.minPrice} - ${pricing.maxPrice} (suggested: ${pricing.suggestedPrice})")

# Run the test
import asyncio
asyncio.run(test_with_mock_data())
```

## Performance Testing

### 7. Load Testing

Test the service under load:
```bash
# Install load testing tool
pip install locust

# Create locustfile.py
from locust import HttpUser, task

class MLServiceUser(HttpUser):
    @task
    def test_score(self):
        self.client.post("/api/score", json={
            "platform": "instagram",
            "handle": "test_handle"
        })
    
    @task
    def test_pricing(self):
        self.client.post("/api/pricing", json={
            "authenticityScore": 80,
            "followerCount": 50000,
            "niche": "lifestyle",
            "campaignType": "instagram_post"
        })

# Run load test
locust -f locustfile.py --host=http://localhost:8000
```

## Error Testing

### 8. Error Scenario Testing

Test various error conditions:
```bash
# Test invalid platform
curl -X POST "http://localhost:8000/api/score" \
  -H "Content-Type: application/json" \
  -d '{"platform": "invalid", "handle": "test"}'

# Test missing API keys (should return appropriate errors)
# Test rate limiting
# Test invalid handles
```

## Redis Testing

### 9. Cache Testing

Verify Redis caching works:
```bash
# First request (should hit API)
curl -X POST "http://localhost:8000/api/score" \
  -H "Content-Type: application/json" \
  -d '{"platform": "instagram", "handle": "test_handle"}'

# Second request (should use cache)
curl -X POST "http://localhost:8000/api/score" \
  -H "Content-Type: application/json" \
  -d '{"platform": "instagram", "handle": "test_handle"}'
```

## Docker Testing

### 10. Container Testing

Build and test in Docker:
```bash
# Build the image
docker build -t mih-ml-service .

# Run container
docker run -p 8000:8000 mih-ml-service

# Test endpoints as described above
```

## Expected Results

### Authenticity Scores
- **High Quality**: 80-95 (good engagement, organic growth)
- **Medium Quality**: 60-79 (decent metrics, some concerns)
- **Low Quality**: 30-59 (suspicious patterns, low engagement)
- **Very Low**: 0-29 (likely bots, very poor metrics)

### Pricing Ranges
- **Micro Influencers** (10k-50k): $100-$500
- **Mid-tier** (50k-500k): $500-$2000
- **Macro** (500k+): $2000-$10000+

### Error Responses
- 400: Invalid input
- 401: Authentication failed
- 403: Access forbidden
- 429: Rate limit exceeded
- 500: Internal server error

## Troubleshooting

### Common Issues
1. **Import Errors**: Ensure all dependencies are installed
2. **API Key Errors**: Verify environment variables are set correctly
3. **Redis Connection**: Ensure Redis is running locally
4. **Rate Limiting**: Add delays between requests if testing extensively

### Debug Mode
Enable debug mode in `app/main.py`:
```python
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, debug=True)
```

This comprehensive testing guide ensures your ML service works correctly with real data and handles all edge cases properly.