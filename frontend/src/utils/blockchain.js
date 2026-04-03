import { ethers } from "ethers";
import { CoinbaseWalletSDK } from "@coinbase/wallet-sdk";
import CampaignEscrowABI from "./CampaignEscrow.json";
import MockERC20ABI from "./MockERC20.json";

// These addresses are updated from the latest Hardhat local deployment
// Configuration using environment variables with local fallbacks
const ESCROW_ADDRESS = import.meta.env.VITE_ESCROW_ADDRESS || "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512";
const TOKEN_ADDRESS = import.meta.env.VITE_TOKEN_ADDRESS || "0x5FbDB2315678afecb367f032d93F642f64180aa3";
const TARGET_CHAIN_ID_HEX = import.meta.env.VITE_CHAIN_ID_HEX || "0x7A69"; // Default: 31337 (Local)
const TARGET_CHAIN_NAME = import.meta.env.VITE_CHAIN_NAME || "Hardhat Local";
const TARGET_RPC_URL = import.meta.env.VITE_RPC_URL || "http://127.0.0.1:8545";

export async function connectWallet() {
  try {
    let baseProvider;

    // 1. Check if the Coinbase Wallet Extension is already injected in the browser
    if (window.coinbaseWalletExtension) {
      baseProvider = window.coinbaseWalletExtension;
      console.log("Using injected Coinbase Wallet Extension");
    } else if (window.ethereum?.isCoinbaseWallet) {
      baseProvider = window.ethereum;
      console.log("Using window.ethereum (Coinbase Wallet selected)");
    } else {
      // 2. Fallback to SDK (shows QR code for mobile or encourages extension install)
      console.log("No injected Coinbase found, initializing SDK...");
      const coinbaseWallet = new CoinbaseWalletSDK({
        appName: "MIH Escrow Platform",
        appLogoUrl: "https://cryptologos.cc/logos/usd-coin-usdc-logo.png",
        darkMode: true
      });
      baseProvider = coinbaseWallet.makeWeb3Provider(
        TARGET_RPC_URL,
        parseInt(TARGET_CHAIN_ID_HEX, 16)
      );
    }

    const provider = new ethers.BrowserProvider(baseProvider);
    
    // --- AUTOMATED NETWORK SWITCHING ---
    const targetChainId = TARGET_CHAIN_ID_HEX;
    try {
      await baseProvider.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: targetChainId }],
      });
    } catch (switchError) {
      // This error code (4902) indicates that the chain has not been added to the wallet.
      if (switchError.code === 4902) {
        try {
          await baseProvider.request({
            method: "wallet_addEthereumChain",
            params: [
              {
                chainId: targetChainId,
                chainName: TARGET_CHAIN_NAME,
                rpcUrls: [TARGET_RPC_URL],
                nativeCurrency: { name: "POL", symbol: "POL", decimals: 18 },
              },
            ],
          });
        } catch (addError) {
          console.error("Failed to add network:", addError);
        }
      }
    }
    // -----------------------------------

    // Request accounts — this is what triggers the "Pop Up" in the extension
    const accounts = await provider.send("eth_requestAccounts", []);
    
    if (!accounts || accounts.length === 0) {
      throw new Error("No accounts retrieved from Coinbase Wallet.");
    }

    return { provider, signer: await provider.getSigner(), account: accounts[0] };
  } catch (err) {
    console.error("Coinbase connection error:", err);
    // Be more specific if possible
    if (err.message.includes("User rejected")) {
      throw new Error("Connection rejected. Please approve the request in your Coinbase Wallet.");
    }
    throw new Error("Failed to connect to Coinbase Wallet. Please ensure the extension is active and unlocked.");
  }
}

export async function getEscrowContract(signerOrProvider) {
  return new ethers.Contract(ESCROW_ADDRESS, CampaignEscrowABI, signerOrProvider);
}

export async function getTokenContract(signerOrProvider) {
  return new ethers.Contract(TOKEN_ADDRESS, MockERC20ABI, signerOrProvider);
}

/**
 * Ensures the user has enough test tokens and approves the escrow contract.
 */
async function prepareTokenForEscrow(signer, amountInWei) {
  const token = await getTokenContract(signer);
  const address = await signer.getAddress();
  
  const balance = await token.balanceOf(address);
  if (balance < amountInWei) {
    console.log("Low balance, minting test tokens...");
    const mintTx = await token.mint(address, amountInWei);
    await mintTx.wait();
  }

  const allowance = await token.allowance(address, ESCROW_ADDRESS);
  if (allowance < amountInWei) {
    console.log("Approving escrow contract to spend tokens...");
    const approveTx = await token.approve(ESCROW_ADDRESS, amountInWei);
    await approveTx.wait();
  }
}

export async function createCampaignOnChain(creatorAddress, totalBudget, milestones) {
  const { signer } = await connectWallet();
  const contract = await getEscrowContract(signer);

  const budgetInWei = ethers.parseUnits(totalBudget.toString(), 18);

  const formattedMilestones = milestones.map(m => ({
    description: m.description,
    requiredAction: m.requiredAction || "Analysis required",
    targetValue: m.targetValue || 0,
    paymentAmount: ethers.parseUnits(m.paymentAmount.toString(), 18),
    currentProgress: 0,
    deadline: Math.floor((new Date(m.deadline).getTime() || (Date.now() + 86400000 * 30)) / 1000),
    isCompleted: false,
    isPaid: false
  }));

  const tx = await contract.createCampaign(creatorAddress, budgetInWei, formattedMilestones);
  const receipt = await tx.wait();

  const event = receipt.logs.find(log => {
      try {
          const parsed = contract.interface.parseLog(log);
          return parsed.name === "CampaignCreated";
      } catch (e) { return false; }
  });

  const onChainId = event ? contract.interface.parseLog(event).args.campaignId.toString() : null;
  
  return { txHash: receipt.hash, onChainId };
}


export async function depositFundsOnChain(onChainId, amount) {
  const { signer } = await connectWallet();
  const escrow = await getEscrowContract(signer);

  const amountInWei = ethers.parseUnits(amount.toString(), 18);
  
  // Handle ERC20 Approval first
  await prepareTokenForEscrow(signer, amountInWei);

  const tx = await escrow.depositFunds(onChainId);
  const receipt = await tx.wait();

  return receipt.hash;
}

export async function disputeCampaignOnChain(onChainId) {
  const { signer } = await connectWallet();
  const escrow = await getEscrowContract(signer);
  const tx = await escrow.disputeCampaign(onChainId);
  await tx.wait();
  return tx.hash;
}

export async function togglePauseCampaignOnChain(onChainId) {
  const { signer } = await connectWallet();
  const escrow = await getEscrowContract(signer);
  const tx = await escrow.togglePauseCampaign(onChainId);
  await tx.wait();
  return tx.hash;
}

export async function resolveDisputeOnChain(onChainId, payCreator) {
  const { signer } = await connectWallet();
  const escrow = await getEscrowContract(signer);
  const tx = await escrow.resolveDispute(onChainId, payCreator);
  await tx.wait();
  return tx.hash;
}

export async function confirmMilestoneOnChain(onChainId, milestoneIndex) {
  const { signer } = await connectWallet();
  const escrow = await getEscrowContract(signer);
  const tx = await escrow.confirmMilestone(onChainId, milestoneIndex);
  await tx.wait();
  return tx.hash;
}

export async function checkIsOwner() {
  try {
    const { address, signer } = await connectWallet();
    const escrow = await getEscrowContract(signer);
    const owner = await escrow.owner();
    return owner.toLowerCase() === address.toLowerCase();
  } catch (err) {
    return false;
  }
}

