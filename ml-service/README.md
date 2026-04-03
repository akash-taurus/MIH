# MIH ML Service (Role 1)

AI-driven service for influencer authenticity scoring and fair pricing recommendations.

## Features
- **Authenticity Scoring:** Evaluates social media profiles (Instagram, TikTok, YouTube).
- **Pricing Engine:** Suggests min/max and suggested prices based on engagement and niche.
- **FastAPI:** High-performance, auto-documented REST API.
- **Dockerized:** Ready for containerized deployment.

## Getting Started

### Local Setup (without Docker)
1. Install dependencies:
   ```bash
   cd ml-service
   pip install -r requirements.txt
   ```
2. Run the application:
   ```bash
   uvicorn app.main:app --reload
   ```
3. Open documentation: [http://localhost:8000/docs](http://localhost:8000/docs)

### Using Docker
1. Build the image:
   ```bash
   docker build -t mih-ml-service .
   ```
2. Run the container:
   ```bash
   docker run -p 8000:8000 mih-ml-service
   ```

## API Endpoints

### 1. Authenticity Scoring
**POST** `/api/score`
- **Request:** `{ "platform": "instagram", "handle": "john_doe" }`
- **Response:** Detailed JSON with score (0-100) and analysis factors.

### 2. Pricing Recommendation
**POST** `/api/pricing`
- **Request:** `{ "authenticityScore": 78, "followerCount": 50000, "niche": "fitness", "campaignType": "instagram_post" }`
- **Response:** `{ "minPrice": 300, "maxPrice": 500, "suggestedPrice": 400 }`

## 🚀 Training Pipeline

Transitioned from static data to high-fidelity training on real social media distributions.

### Local Workflow
1. **Prepare Data**: Aggregates `DATASET 2` (700k+ posts) into user-level engagement profiles.
   ```bash
   python app/services/prepare_dataset.py
   ```
2. **Retrain Models**: Updates `.joblib` artifacts with enriched pricing and authenticity logic.
   ```bash
   python app/services/trainer.py
   ```

### Kaggle Support
For massive datasets, use `training_on_kaggle.ipynb`.
- **Upload**: The notebook and `dataset/` folder to Kaggle.
- **Scale**: Leverages higher compute for parallel JSON processing.

## 📊 Models
- `auth_classifier.joblib`: Detects fake accounts using high-dimensional feature importance.
- `pricing_regressor.joblib`: R2-validated pricing engine based on real engagement distributions.

## Future Roadmap (Updated)
- ✅ Integration with official Social Media APIs (Graph API, YouTube Data API).
- ✅ Implementation of trained ML models.
- ✅ High-performance dataset aggregation pipeline.
- [ ] Integration with TikTok API.
- [ ] Multi-region Redis caching.
