# MIH Local Run Guide

This project has been set up to run locally in `MIH_LOCAL`.

## Prerequisites
- Node.js (v18 or v20 recommended)
- Python 3.10+
- `pip`

## Setup Instructions

1.  **Install Dependencies**
    From the root `MIH_LOCAL` directory, run:
    ```bash
    npm install
    npm run install:all
    ```

2.  **Start Services**
    You can start all services (Blockchain, ML Service, Backend, and Frontend) concurrently:
    ```bash
    npm run dev
    ```

3.  **Deploy Smart Contracts** (Required once Blockchain is running)
    Open a new terminal and run:
    ```bash
    npm run blockchain:deploy
    ```
    Note: This will deploy the contracts to the local hardhat node and generate a `deployments.json` in the `blockchain` folder.

## Manual Execution (If Concurrent Run Fails)

### Blockchain
```bash
cd blockchain
npm install
npx hardhat node
```
*In another terminal:*
```bash
npx hardhat run scripts/deploy.js --network localhost
```

### ML Service
```bash
cd ml-service
pip install -r requirements.txt
python -m uvicorn app.main:app --host 0.0.0.0 --port 8001 --reload
```

### Backend
```bash
cd backend
pip install -r requirements.txt
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

## Local Configuration
The services are pre-configured to talk to each other on `localhost`:
- Frontend: `http://localhost:5173`
- Backend: `http://localhost:8000`
- ML Service: `http://localhost:8001`
- Blockchain RPC: `http://localhost:8545`

The default API Key for ML Service communication is `dev_shared_key_abcd1234`.
