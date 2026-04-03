# CampaignEscrow Smart Contract

<div align="center">
  <img src="https://via.placeholder.com/150" alt="CampaignEscrow Logo" width="150" height="150">
  <br />
  <p>A secure, stablecoin-based (USDT/USDC) escrow smart contract for brand-creator campaigns with localized INR UI bridging.</p>
</div>

---

## 📖 Overview

The **CampaignEscrow Smart Contract** (V2) is designed to streamline trust between brands and content creators. It acts as an unbiased on-chain escrow that securely locks brand funds and autonomously distributes payouts based on strict, predefined milestones. 

**Currency Modernization (INR/USD):** Following industry standards set by top Indian crypto platforms (like CoinDCX), this contract is built to operate strictly on USD-pegged stablecoins (like USDT or USDC). This protects creators and brands from volatile ETH fluctuations. In the frontend, real-time ExchangeRate-APIs actively convert the USD logic into straightforward ₹ (INR) equivalents for localized Indian users.

---

## ✨ Key Features

- **Stablecoin Architecture:** Operates firmly on ERC-20 tokens (USDT/USDC). Eliminates cryptocurrency volatility risks.
- **Automated Milestone Payments:** Instantly routes stablecoins to creators upon task confirmation.
- **Deadline Enforcement:** Fails safely if `block.timestamp` exceeds a milestone's strict deadline.
- **Real-Time Progress Tracking:** On-chain reporting of fulfillment percentage for tasks.
- **Granular Cancellations & Refunds:** Allows individual cancellation of expired tasks and batch refunds for uncompleted milestones without affecting previous settlements.
- **Arbitration & Dispute Handling:** Robust dispute mechanisms that freeze campaigns completely until an administrator resolves the conflict.
- **Double-Payout & Drain Protection:** Built to safely handle logic bugs across refund distributions ensuring the platform vault remains sealed.

---

## 🎥 Demo / Preview

*(Include a placeholder or link to a deployed dApp interface, demo video, or Etherscan contract link here)*

- **Etherscan Sepolia Contract:** `[Insert Contract Address]`
- **Live dApp Frontend:** `[Insert URL]`

---

## 🛠 Tech Stack

**Smart Contract Development:**
- **Solidity:** Core programming language
- **OpenZeppelin Contracts:** Standardized `IERC20` and `SafeERC20` implementations 

**Testing & Infrastructure:**
- **Chai & Ethers.js:** Comprehensive unit testing
- **Hardhat:** Ethereum-based testing and deployment execution

---

## 🚀 Installation & Setup

Follow these steps to deploy and test the contract locally.

### Prerequisite
Ensure you have [Node.js](https://nodejs.org/) installed on your machine.

### 1. Clone & Install
```bash
git clone https://github.com/yourusername/campaign-escrow.git
cd campaign-escrow
npm install
```

### 2. Configure Environment
Copy the example environment file and insert your keys. Note that you need a valid ERC-20 stablecoin address for testnets.
```bash
cp .env.example .env
# Open .env and insert STABLECOIN_ADDRESS=0xYourUSDTAddress
```

### 3. Compile the Contract
```bash
npm run compile
```

### 4. Run Test Suite
```bash
npm test
```

### 5. Local Deployment (Auto-Deploys MockERC20)
Start a local Hardhat node in a separate terminal:
```bash
npm run node
```
Deploy the contract to your local network (automatically deploys a Mock Stablecoin and hooks it to the Escrow):
```bash
npm run deploy:local
```

---

## 💡 Usage

The escrow lifecycle involves three primary roles: **Brand**, **Creator**, and **Admin**.

1. **Creating the Campaign:** The Brand calls `createCampaign(creatorAddress, budget, milestones)` indicating the total amount in USDT (18/6 decimals).
2. **Locking Funds:** 
   - *Frontend:* Brand approves tokens via `usdt.approve(escrowAddress, budget)`.
   - *Contract:* The Brand calls `depositFunds(campaignId)` locking the stablecoins. The front-end displays this action in INR (₹).
3. **Tracking Progress:** As the Creator works, progress can be updated via `updateProgress()`.
4. **Completion:** Upon successful delivery, the Brand or Admin calls `confirmMilestone()`, auto-releasing the stablecoin to the Creator.
5. **Handling Failures:** If a Creator goes dark, a Brand safely retrieves funds via `cancelExpiredMilestone()` or bulk refunds via `refundUncompletedMilestones()`.
6. **Resolving Disputes:** Either party can call `disputeCampaign()` to freeze everything. An Admin determines the outcome via `resolveDispute()`.

*(For the Frontend/Backend Team: Contract ABI is located in `artifacts/contracts/CampaignEscrow.sol/CampaignEscrow.json` and the deployed address is housed in `deployments.json`.)*

---

## 🧠 Core Concepts & Learnings

Building this escrow contract involved several deep dives into Ethereum development:
- **`SafeERC20` Standard:** Learned to switch out native ETH integrations for `.safeTransfer()` and `.safeTransferFrom()` using OpenZeppelin, drastically reducing re-entrancy risks via "Pull-Over-Push" mechanisms.
- **Frontend USD/INR Mapping:** Understood that smart contracts shouldn't handle fiat natively. Sticking to USD stablecoins and delegating UI-level API conversions to the Javascript layer is much cleaner and gas-efficient.

---

## 🚧 Challenges & Solutions

| Challenge | Solution |
|-----------|----------|
| **Vulnerable ETH Drain Exploits** | Strict `require(depositedAmount == budget)` checks were integrated into bulk refunds, disputes, and manual cancellations to fix a massive logic loophole that allowed hackers to refund un-funded campaigns using other users' locked tokens. |
| **Market Volatility for Creators** | Switched from `msg.value` (ETH) to an ERC-20 architecture (USDT). The local platform interface uses Live API pricing to let Brands view things in ₹ (INR), but all underlying settlement rests in stable fiat-pegged pairs avoiding crashes. |
| **DoS in Loop Logic** | Rewrote bulk refund loops. Previous logic reverted entirely if a *single* task hadn't expired. Now, the loop successfully `continues` dynamically via boundary checks, scaling efficiently. |

---

## 🎯 Future Improvements / Roadmap

- [ ] **Decentralized Oracles:** Implement Chainlink integrations to auto-verify certain milestone fulfillments off-chain without Admin interaction.
- [ ] **Factory Contract:** Build a `CampaignEscrowFactory` to spawn individual proxy contracts for heavily scaled usage.
- [ ] **Multi-sig Admin For Disputes:** Enforce a multi-signature requirement for dispute resolutions to increase trust and decentralization. 

---

## 🤝 Contributing

Contributions, issues, and feature requests are welcome! 

1. Fork the project.
2. Create your feature branch (`git checkout -b feature/AmazingFeature`).
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`).
4. Push to the branch (`git push origin feature/AmazingFeature`).
5. Open a Pull Request.

---

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
