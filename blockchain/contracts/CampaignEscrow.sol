// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

// OpenZeppelin imports for security and token support
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title CampaignEscrow
 * @dev Manages brand-creator campaigns with milestone-based, stablecoin-pegged payments.
 * 
 * HOW IT WORKS:
 * 1. Admin/Deployer specifies the supported ERC-20 token (e.g., USDT/USDC).
 * 2. Brand creates a campaign showing values in USD equivalents (front-end maps to INR).
 * 3. Brand approves and deposits the full budget via `depositFunds`.
 * 4. Milestones confirmed release ERC-20 tokens safely to the creator automatically.
 */
contract CampaignEscrow is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // ─────────────────────────────────────────────
    //  DATA STRUCTURES
    // ─────────────────────────────────────────────

    struct Milestone {
        string description;      
        string requiredAction;   
        uint128 targetValue;     
        uint128 paymentAmount;   // in token units
        uint128 currentProgress; 
        uint64 deadline;         
        bool isCompleted;        
        bool isPaid;             
    }

    struct Campaign {
        address brand;           
        address creator;         
        uint256 budget;          // total token amount locked
        uint256 depositedAmount; 
        bool isDisputed;         
        bool isResolved;         
        bool isPaused;           
        bool exists;             
    }

    // ─────────────────────────────────────────────
    //  STATE VARIABLES
    // ─────────────────────────────────────────────

    // The ERC-20 token used for payments (e.g., USDT address)
    IERC20 public immutable paymentToken;

    mapping(uint256 => Campaign) public campaigns;
    mapping(uint256 => Milestone[]) public milestones;
    uint256 private _campaignCounter;

    // ─────────────────────────────────────────────
    //  EVENTS
    // ─────────────────────────────────────────────

    event CampaignCreated(uint256 indexed campaignId, address indexed brand, address indexed creator, uint256 budget);
    event FundsDeposited(uint256 indexed campaignId, address indexed brand, uint256 amount);
    event MilestoneConfirmed(uint256 indexed campaignId, uint256 milestoneIndex);
    event PaymentReleased(uint256 indexed campaignId, uint256 milestoneIndex, uint256 amount, address recipient);
    event DisputeRaised(uint256 indexed campaignId);
    event DisputeResolved(uint256 indexed campaignId, bool paidCreator);
    event MilestoneProgressUpdated(uint256 indexed campaignId, uint256 milestoneIndex, uint256 newProgress);
    event MilestoneExpiredCancelled(uint256 indexed campaignId, uint256 milestoneIndex, uint256 refundAmount);
    event UncompletedMilestonesRefunded(uint256 indexed campaignId, uint256 totalRefunded);

    // ─────────────────────────────────────────────
    //  CONSTRUCTOR
    // ─────────────────────────────────────────────

    /**
     * @dev Initialize with a specific stablecoin token address
     */
    constructor(address _paymentToken) Ownable(msg.sender) {
        require(_paymentToken != address(0), "Invalid token address");
        paymentToken = IERC20(_paymentToken);
    }

    // ─────────────────────────────────────────────
    //  CORE FUNCTIONS
    // ─────────────────────────────────────────────

    function createCampaign(
        address creator,
        uint256 budget,
        Milestone[] calldata _milestones
    ) external returns (uint256 campaignId) {
        require(creator != address(0), "Invalid creator address");
        require(creator != msg.sender, "Brand and creator cannot be the same");
        require(budget > 0, "Budget must be greater than 0");
        require(_milestones.length > 0, "Must have at least one milestone");

        uint256 totalMilestonePayments = 0;
        uint256 len = _milestones.length;
        for (uint256 i = 0; i < len;) {
            require(_milestones[i].paymentAmount > 0, "Each milestone must have a payment");
            require(_milestones[i].deadline > block.timestamp, "Deadline must be in the future");
            totalMilestonePayments += _milestones[i].paymentAmount;
            unchecked { ++i; }
        }
        require(totalMilestonePayments == budget, "Milestone payments must equal total budget");

        _campaignCounter++;
        campaignId = _campaignCounter;

        campaigns[campaignId] = Campaign({
            brand: msg.sender,
            creator: creator,
            budget: budget,
            depositedAmount: 0,
            isDisputed: false,
            isResolved: false,
            isPaused: false,
            exists: true
        });

        for (uint256 i = 0; i < len;) {
            milestones[campaignId].push(Milestone({
                description: _milestones[i].description,
                requiredAction: _milestones[i].requiredAction,
                targetValue: _milestones[i].targetValue,
                paymentAmount: _milestones[i].paymentAmount,
                currentProgress: 0,
                deadline: _milestones[i].deadline,
                isCompleted: false,
                isPaid: false
            }));
            unchecked { ++i; }
        }

        emit CampaignCreated(campaignId, msg.sender, creator, budget);
        return campaignId;
    }

    /**
     * @dev Brand deposits ERC-20 tokens into the campaign
     * Must have called `paymentToken.approve(escrowAddress, budget)` prior to this.
     */
    function depositFunds(uint256 campaignId) external nonReentrant {
        Campaign storage campaign = campaigns[campaignId];

        require(campaign.exists, "Campaign does not exist");
        require(msg.sender == campaign.brand, "Only the brand can deposit funds");
        require(campaign.depositedAmount == 0, "Funds already deposited");
        require(!campaign.isDisputed, "Campaign is under dispute");

        uint256 depositAmount = campaign.budget;
        campaign.depositedAmount = depositAmount;

        // Pull tokens from the brand into this contract securely
        paymentToken.safeTransferFrom(msg.sender, address(this), depositAmount);

        emit FundsDeposited(campaignId, msg.sender, depositAmount);
    }

    function confirmMilestone(uint256 campaignId, uint256 milestoneIndex) external nonReentrant {
        Campaign storage campaign = campaigns[campaignId];

        require(campaign.exists, "Campaign does not exist");
        require(msg.sender == campaign.brand || msg.sender == owner(), "Only brand or admin can confirm milestones");
        require(!campaign.isDisputed, "Campaign is under dispute");
        require(!campaign.isPaused, "Campaign is currently paused");
        require(!campaign.isResolved, "Campaign already resolved"); // Fixed loophole: prevent payout post-resolution
        require(campaign.depositedAmount == campaign.budget, "Funds not yet deposited");
        require(milestoneIndex < milestones[campaignId].length, "Invalid milestone index");

        Milestone storage milestone = milestones[campaignId][milestoneIndex];
        require(!milestone.isCompleted, "Milestone already confirmed");
        require(!milestone.isPaid, "Milestone already paid"); // Fixed loophole: double payout prevention
        require(block.timestamp <= milestone.deadline, "Milestone deadline passed");

        milestone.isCompleted = true;
        milestone.isPaid = true;

        uint256 amount = milestone.paymentAmount;
        
        // Push-over-pull modified for ERC20. Since stablecoin transfers are standard, this is safe from standard ETH-receive reentrancy/blocks.
        paymentToken.safeTransfer(campaign.creator, amount);

        emit MilestoneConfirmed(campaignId, milestoneIndex);
        emit PaymentReleased(campaignId, milestoneIndex, amount, campaign.creator);
    }

    function disputeCampaign(uint256 campaignId) external {
        Campaign storage campaign = campaigns[campaignId];

        require(campaign.exists, "Campaign does not exist");
        require(campaign.depositedAmount == campaign.budget, "Cannot dispute unfunded campaign"); // Fixed loophole: zero-cost dispute lock
        require(msg.sender == campaign.brand || msg.sender == campaign.creator, "Only brand or creator can raise a dispute");
        require(!campaign.isDisputed, "Campaign already disputed");
        require(!campaign.isResolved, "Campaign already resolved");

        campaign.isDisputed = true;
        emit DisputeRaised(campaignId);
    }

    function togglePauseCampaign(uint256 campaignId) external {
        Campaign storage campaign = campaigns[campaignId];

        require(campaign.exists, "Campaign does not exist");
        require(msg.sender == campaign.brand || msg.sender == owner(), "Only brand or admin can toggle pause");
        require(!campaign.isDisputed, "Cannot pause a disputed campaign");
        require(!campaign.isResolved, "Cannot pause a resolved campaign");

        campaign.isPaused = !campaign.isPaused;
    }

    function resolveDispute(uint256 campaignId, bool payCreator) external onlyOwner nonReentrant {
        Campaign storage campaign = campaigns[campaignId];

        require(campaign.exists, "Campaign does not exist");
        require(campaign.isDisputed, "Campaign is not disputed");
        require(!campaign.isResolved, "Dispute already resolved");
        require(campaign.depositedAmount == campaign.budget, "Campaign not funded"); // Fixed loophole: empty vault drain

        uint256 remainingFunds = 0;
        Milestone[] storage cms = milestones[campaignId];
        uint256 len = cms.length;
        
        for (uint256 i = 0; i < len;) {
            if (!cms[i].isPaid) {
                remainingFunds += cms[i].paymentAmount;
                cms[i].isPaid = true; 
            }
            unchecked { ++i; }
        }

        campaign.isResolved = true;
        campaign.isDisputed = false;

        if (remainingFunds > 0) {
            address recipient = payCreator ? campaign.creator : campaign.brand;
            paymentToken.safeTransfer(recipient, remainingFunds);
        }

        emit DisputeResolved(campaignId, payCreator);
    }

    function cancelExpiredMilestone(uint256 campaignId, uint256 milestoneIndex) external nonReentrant {
        Campaign storage campaign = campaigns[campaignId];

        require(campaign.exists, "Campaign does not exist");
        require(msg.sender == campaign.brand, "Only brand can cancel expired milestone");
        require(campaign.depositedAmount == campaign.budget, "Funds never deposited"); // Fixed loophole: phantom refund drain
        require(!campaign.isDisputed, "Campaign is under dispute");
        require(!campaign.isResolved, "Campaign already resolved");
        require(milestoneIndex < milestones[campaignId].length, "Invalid milestone index");

        Milestone storage m = milestones[campaignId][milestoneIndex];
        require(!m.isCompleted, "Milestone is already completed");
        require(!m.isPaid, "Milestone already paid");
        require(block.timestamp > m.deadline, "Deadline has not passed yet");

        uint256 amountToRefund = m.paymentAmount;
        m.isPaid = true;

        paymentToken.safeTransfer(campaign.brand, amountToRefund);

        emit MilestoneExpiredCancelled(campaignId, milestoneIndex, amountToRefund);
    }

    function updateProgress(uint256 campaignId, uint256 milestoneIndex, uint128 progress) external {
        Campaign storage campaign = campaigns[campaignId];

        require(campaign.exists, "Campaign does not exist");
        require(msg.sender == campaign.brand || msg.sender == owner(), "Only brand or admin can update progress");
        require(!campaign.isDisputed, "Campaign is under dispute");
        require(milestoneIndex < milestones[campaignId].length, "Invalid milestone index");

        Milestone storage m = milestones[campaignId][milestoneIndex];
        require(!m.isCompleted, "Milestone already completed");
        require(block.timestamp <= m.deadline, "Milestone deadline passed");
        require(progress <= m.targetValue, "Progress exceeds target");

        m.currentProgress = progress;

        emit MilestoneProgressUpdated(campaignId, milestoneIndex, progress);
    }

    function getMilestoneProgressPercentage(uint256 campaignId, uint256 milestoneIndex) external view returns (uint256) {
        require(campaigns[campaignId].exists, "Campaign does not exist");
        require(milestoneIndex < milestones[campaignId].length, "Invalid milestone index");

        Milestone storage m = milestones[campaignId][milestoneIndex];
        if (m.targetValue == 0) return 0; 
        unchecked { return (uint256(m.currentProgress) * 100) / m.targetValue; }
    }

    function refundUncompletedMilestones(uint256 campaignId) external nonReentrant {
        Campaign storage campaign = campaigns[campaignId];
        
        require(campaign.exists, "Campaign does not exist");
        require(msg.sender == owner() || msg.sender == campaign.brand, "Only admin or brand");
        require(campaign.depositedAmount == campaign.budget, "Funds never deposited"); // Fixed loophole: phantom bulk refund drain
        require(!campaign.isDisputed, "Campaign is under dispute");
        require(!campaign.isResolved, "Campaign already resolved");

        uint256 remainingFunds = 0;
        Milestone[] storage cms = milestones[campaignId];
        uint256 len = cms.length;

        for (uint256 i = 0; i < len;) {
            if (!cms[i].isCompleted && !cms[i].isPaid) {
                // Fixed Loophole: DOS for bulk refund. Do not revert if unexpired, simply skip unless it's owner.
                if (msg.sender != owner() && block.timestamp <= cms[i].deadline) {
                    unchecked { ++i; }
                    continue;
                }

                remainingFunds += cms[i].paymentAmount;
                cms[i].isPaid = true; 
            }
            unchecked { ++i; }
        }

        require(remainingFunds > 0, "No funds to refund");

        paymentToken.safeTransfer(campaign.brand, remainingFunds);

        emit UncompletedMilestonesRefunded(campaignId, remainingFunds);
    }

    function getContractBalance() external view returns (uint256) {
        return paymentToken.balanceOf(address(this));
    }

    function getMilestones(uint256 campaignId) external view returns (Milestone[] memory) {
        require(campaigns[campaignId].exists, "Campaign does not exist");
        return milestones[campaignId];
    }

    function getMilestoneStatus(uint256 campaignId, uint256 milestoneIndex) external view returns (bool isCompleted, bool isPaid, uint256 paymentAmount) {
        require(campaigns[campaignId].exists, "Campaign does not exist");
        require(milestoneIndex < milestones[campaignId].length, "Invalid milestone index");
        Milestone storage m = milestones[campaignId][milestoneIndex];
        return (m.isCompleted, m.isPaid, m.paymentAmount);
    }

    function getTotalCampaigns() external view returns (uint256) {
        return _campaignCounter;
    }
}
