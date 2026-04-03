from web3 import Web3
import json
import os
from app.config import settings

# --- DYNAMIC PATH LOGIC ---
# 1. Get the absolute path of the directory where THIS file (blockchain_service.py) is located
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))

# 2. Navigate up to the backend root (up from services, then up from app)
# Structure: backend/app/services/blockchain_service.py -> go up twice to reach backend/
BACKEND_ROOT = os.path.abspath(os.path.join(CURRENT_DIR, "..", ".."))

# 3. Target the abis folder we created
ABI_PATH = os.path.join(BACKEND_ROOT, "abis", "CampaignEscrow.json")
# --------------------------

class BlockchainService:
    _instance = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(BlockchainService, cls).__new__(cls)
            
            # Use the environment variable for the RPC URL
            cls._instance.w3 = Web3(Web3.HTTPProvider(settings.blockchain_service_base_url))
            cls._instance.escrow_address = Web3.to_checksum_address(settings.escrow_address)
            
            # Safety check: ensure the file exists before opening
            if not os.path.exists(ABI_PATH):
                raise FileNotFoundError(f"CRITICAL: ABI file not found at {ABI_PATH}. Check your 'abis' folder.")

            with open(ABI_PATH, 'r') as f:
                artifact = json.load(f)
                cls._instance.abi = artifact['abi']
                
            cls._instance.contract = cls._instance.w3.eth.contract(
                address=cls._instance.escrow_address, 
                abi=cls._instance.abi
            )
        return cls._instance

    def check_campaign_on_chain(self, on_chain_id: int):
        """Verified that the campaign actually exists on the smart contract."""
        try:
            campaign = self.contract.functions.campaigns(on_chain_id).call()
            # struct Campaign returns (brand, creator, budget, depositedAmount, isDisputed, isResolved, isPaused, exists)
            # exists is at index 7
            return {
                "exists": campaign[7],
                "isPaused": campaign[6],
                "isDisputed": campaign[4],
                "isResolved": campaign[5],
                "budget": campaign[2],
                "deposited": campaign[3]
            }
        except Exception as e:
            print(f"Blockchain Verification Error: {e}")
            return None

    def get_milestones_on_chain(self, on_chain_id: int):
        """Retrieves milestone statuses from the smart contract."""
        try:
            milestones = self.contract.functions.getMilestones(on_chain_id).call()
            # Milestone struct: description, requiredAction, targetValue, paymentAmount, currentProgress, deadline, isCompleted, isPaid
            return [
                {
                    "isCompleted": m[6],
                    "isPaid": m[7],
                    "paymentAmount": m[3]
                }
                for m in milestones
            ]
        except Exception as e:
            print(f"Blockchain Milestones Error: {e}")
            return None

# Initialize the singleton
blockchain_service = BlockchainService()