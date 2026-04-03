import os
from typing import Dict, Any

try:
    from cdp import Cdp, Wallet
    CDP_AVAILABLE = True
except ImportError:
    CDP_AVAILABLE = False


class CoinbaseLedgerService:
    """
    Integrates with Coinbase Developer Platform (CDP) for financial ledger interactions.
    Handles wallets, simulated funding, and cross-border creator payouts.
    """
    
    def __init__(self):
        self.is_configured = False
        self.api_key_name = os.getenv("CDP_API_KEY_NAME", "")
        self.api_key_private_key = os.getenv("CDP_API_KEY_PRIVATE_KEY", "").replace("\\n", "\n")
        
        self.wallets: Dict[str, Any] = {} # campaign_id -> Wallet
        
        if CDP_AVAILABLE and self.api_key_name and self.api_key_private_key:
            try:
                Cdp.configure(api_key_name=self.api_key_name, private_key=self.api_key_private_key)
                self.is_configured = True
            except Exception as e:
                print(f"CDP Configuration Error: {e}")

    def create_campaign_escrow_wallet(self, campaign_id: str, network_id: str = "base-sepolia") -> Dict[str, Any]:
        """Creates a dedicated Coinbase-managed CDP Wallet for a specific campaign's escrow."""
        if not self.is_configured:
            return {
                "status": "simulated", 
                "address": "0xCDP_Simulated_" + campaign_id[:8], 
                "network": network_id
            }
        
        try:
            wallet = Wallet.create(network_id=network_id)
            self.wallets[campaign_id] = wallet
            return {
                "status": "success",
                "wallet_id": wallet.id,
                "address": wallet.default_address.address_id,
                "network": wallet.network_id
            }
        except Exception as e:
            return {"status": "error", "error": str(e)}

    def fund_escrow(self, campaign_id: str, amount: str, asset_id: str = "usdc") -> Dict[str, Any]:
        """Funds the escrow wallet. On testnet it can use faucet; on prod it accepts real deposits."""
        if not self.is_configured or campaign_id not in self.wallets:
            return {
                "status": "simulated", 
                "message": f"Demo: Campaign {campaign_id} funded with {amount} {asset_id}"
            }
            
        wallet = self.wallets.get(campaign_id)
        try:
            if "sepolia" in wallet.network_id:
                # Use base-sepolia ETH Faucet for demo gas
                faucet_tx = wallet.faucet()
                faucet_tx.wait()
            return {"status": "success", "message": "Funds received securely via Coinbase"}
        except Exception as e:
            return {"status": "error", "error": str(e)}

    def transfer_to_creator(self, campaign_id: str, creator_address: str, amount: float, asset_id: str = "eth") -> Dict[str, Any]:
        """Releases funds from the campaign's Coinbase-managed escrow to the creator's external wallet."""
        if not self.is_configured or campaign_id not in self.wallets:
            return {
                "status": "simulated", 
                "tx_hash": "0x" + os.urandom(16).hex(),
                "message": f"Demo: Transferred {amount} to {creator_address}"
            }
            
        wallet = self.wallets.get(campaign_id)
        try:
            transfer = wallet.transfer(amount, asset_id, creator_address)
            transfer.wait()
            return {
                "status": "success", 
                "tx_hash": transfer.transaction_hash,
                "transaction_link": transfer.transaction_link
            }
        except Exception as e:
            return {"status": "error", "error": str(e)}

    def get_wallet_balance(self, campaign_id: str, asset_id: str = "eth") -> float:
        """Fetch the real-time balance of a campaign's escrow wallet on Coinbase."""
        if not self.is_configured or campaign_id not in self.wallets:
            return 0.0
            
        wallet = self.wallets.get(campaign_id)
        try:
            return wallet.balance(asset_id)
        except Exception:
            return 0.0

coinbase_service = CoinbaseLedgerService()
