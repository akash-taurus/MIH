# Project TODO List

Based on the provided `flow.txt.txt` (6-Developer Architecture) and `remaining tasks.txt` (ML Service Production Readiness), here is the structured development checklist.

## Phase 1: ML Service (Role 1) - Production Readiness
*These are the immediate steps required to move the existing prototype to production.*

- [x] **Real External API Integrations**
  - [x] Implement proper authentication (Facebook Page Access Token for Instagram Graph API).
  - [x] Implement proper authentication (YouTube Data API v3 key).
  - [x] Add comprehensive error handling and rate limiting.
- [x] **Enhance Authenticity Scoring**
  - [x] Replace simple math formula with real ML model (RandomForestRegressor).
  - [x] Train model using realistic dataset patterns to detect bot activity.
- [x] **Caching & Performance**
  - [x] Integrate Redis (`redis.asyncio`) for distributed caching.
  - [x] Ensure cache persists across multiple workers/containers.
- [x] **Refine Pricing Engine**
  - [x] Expand hardcoded multipliers with realistic niche and content type multipliers.
  - [x] Integrate ML model trained on real-world influencer pricing data.
- [x] **Enhanced Engagement Rate Calculations**
  - [x] Implement realistic engagement rate calculation for Instagram (from recent posts).
  - [x] Implement realistic engagement rate calculation for YouTube (average views per video).
- [x] **Comprehensive Error Handling**
  - [x] Implement robust error handling for external social media API calls.
  - [x] Add retry mechanisms using `tenacity` library.
  - [x] Handle rate limiting, authentication failures, and timeout scenarios.
- [x] **Realistic Test Data**
  - [x] Replace hardcoded test values with realistic data ranges.
  - [x] Add integration tests with proper mocking for CI/CD.

## Phase 2: Smart Contract & Escrow (Role 2)
*New service to be created. Coordinates campaign tracking and payouts.*

- [ ] Design and implement `CampaignEscrow.sol` with OpenZeppelin.
- [ ] Implement core functions (`createCampaign`, `depositFunds`, `confirmMilestone`, `releasePayment`, `disputeCampaign`, `resolveDispute`).
- [ ] Define contract events.
- [ ] Write Hardhat tests for all functions.
- [ ] Deploy to Hardhat local network and Sepolia testnet.
- [ ] Verify contract on Etherscan and export ABI.

## Phase 3: Backend API & Integration (Role 3)
*New service to be created. Central orchestrator for the platform.*

- [ ] Initialize Node.js (Express) or Python (FastAPI) backend.
- [ ] Set up PostgreSQL database with schema (Prisma or TypeORM).
- [ ] Implement JWT-based user authentication (Brands & Creators).
- [ ] Create API Endpoints for user profiles, campaigns, milestones, and payments.
- [ ] Integrate with ML Service API for scoring and pricing recommendations.
- [ ] Integrate with Smart Contract using `ethers.js` (campaign creation, events listening).
- [ ] Containerize backend with Docker.

## Phase 4: Frontend Dashboard (Role 4)
*New service to be created. User interface for brands and creators.*

- [ ] Initialize React application with Tailwind CSS.
- [ ] Implement Authentication & User Management (Signup/login, JWT storage).
- [ ] Build Creator Dashboard (score, active campaigns, wallet connection).
- [ ] Build Brand Dashboard (creator search, profile viewing, campaign creation wizard).
- [ ] Integrate Web3 for wallet connections (MetaMask) and contract interactions (`depositFunds`).
- [ ] Add data visualizations (Donut charts, timeline stepper, engagement graphs).
- [ ] Containerize frontend with Docker.

## Phase 5: DevOps & Infrastructure (Role 5)
*New role to be executed once initial services are ready.*

- [ ] Create `docker-compose.yml` for local development linking all services.
- [ ] Deploy ML service to a cloud provider (e.g., Render).
- [ ] Deploy Backend and PostgreSQL to cloud.
- [ ] Deploy Frontend to Vercel/Netlify.
- [ ] Set up GitHub Actions CI/CD pipelines.
- [ ] Configure environment variables, CORS, and logging.

## Phase 6: Testing & QA (Role 6)
*Ongoing effort to ensure system stability.*

- [ ] Write automated integration tests simulating the full user flow (Postman/Newman or Jest).
- [ ] Perform exploratory and edge-case manual testing.
- [ ] Conduct basic load testing and security vulnerability checks.
