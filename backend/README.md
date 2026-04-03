# InfluenceIQ Backend Service

This FastAPI service now supports both:

- the original ML-orchestration endpoints
- a frontend-ready API surface for the React UI you shared

## Run locally

```bash
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

Set the external ML service URL if you have it:

```bash
set ML_SERVICE_BASE_URL=http://localhost:8001
```

If the ML service is offline, the backend now returns deterministic fallback analysis/pricing values so the frontend still works.

## Frontend-facing endpoints

### `GET /api/frontend/creators`

Supports query params:

- `query`
- `sortBy` = `score | reach | followers | engagement`
- `platform`
- `niche`

Returns creator rows in the same shape used by the frontend:

```json
{
  "creators": [
    {
      "id": 1,
      "handle": "@rahulfit_",
      "niche": "Fitness",
      "platform": "Instagram",
      "followers": 142000,
      "score": 87,
      "fake": 6,
      "eng": 8.1,
      "reach": 6901,
      "priceMin": 994,
      "priceMax": 2130,
      "campaigns": 12,
      "trust": "Elite"
    }
  ],
  "total": 1
}
```

### `POST /api/frontend/analysis`

Request body:

```json
{
  "platform": "Instagram",
  "handle": "@newcreator",
  "followers": 85000,
  "niche": "Fitness",
  "campaign": "Sponsored Post"
}
```

Returns one creator object in the same frontend shape, enriched with scoring factors and explanation.

### `GET /api/frontend/campaigns`

Returns the campaigns list for the campaigns page.

### `POST /api/frontend/campaigns`

Request body:

```json
{
  "brand": "Acme Corp",
  "creator": "@rahulfit_",
  "budget": 5500,
  "type": "Sponsored Post",
  "deliverable": "Reel",
  "deadline": "2026-05-30",
  "creatorData": {
    "...": "creator object from discover/analyze response"
  }
}
```

### `GET /api/frontend/campaigns/{campaign_id}/contract`

Returns the contract/timeline data for the contract page.

### `POST /api/frontend/campaigns/{campaign_id}/verify`

Returns a payment receipt payload for the verify page and marks the campaign as paid.

## Original endpoints still available

- `POST /api/analysis`
- `POST /api/campaigns`
- `GET /api/campaigns/{campaign_id}`
- `POST /api/campaigns/{campaign_id}/blockchain/prepare`

## Integration notes for your React code

- Replace `ALL_CREATORS` in the discover screen with `GET /api/frontend/creators`.
- Replace the `AnalyzePage` timeout logic with `POST /api/frontend/analysis`.
- Replace the `CreateCampaign` timeout logic with `POST /api/frontend/campaigns`.
- Replace the contract and verify hardcoded values with:
  - `GET /api/frontend/campaigns/{campaign_id}/contract`
  - `POST /api/frontend/campaigns/{campaign_id}/verify`
