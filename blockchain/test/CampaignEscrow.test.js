const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("CampaignEscrow", function () {
  let escrow;
  let mockToken;
  let owner;
  let brand;
  let creator;
  let other;

  const getMilestones = async () => {
    const latestTime = await time.latest();
    return [
      {
        description: "Reach 10,000 views",
        requiredAction: "Post Instagram Reel",
        targetValue: 10000,
        paymentAmount: ethers.parseEther("0.3"),
        currentProgress: 0,
        deadline: latestTime + 86400 * 7,
        isCompleted: false,
        isPaid: false,
      },
      {
        description: "Reach 50,000 views",
        requiredAction: "Post YouTube Short",
        targetValue: 50000,
        paymentAmount: ethers.parseEther("0.3"),
        currentProgress: 0,
        deadline: latestTime + 86400 * 14,
        isCompleted: false,
        isPaid: false,
      },
      {
        description: "Reach 100,000 views",
        requiredAction: "Post TikTok Video",
        targetValue: 100000,
        paymentAmount: ethers.parseEther("0.4"),
        currentProgress: 0,
        deadline: latestTime + 86400 * 21,
        isCompleted: false,
        isPaid: false,
      },
    ];
  };

  const BUDGET = ethers.parseEther("1.0");

  beforeEach(async function () {
    [owner, brand, creator, other] = await ethers.getSigners();

    const MockERC20 = await ethers.getContractFactory("MockERC20");
    mockToken = await MockERC20.deploy();
    await mockToken.waitForDeployment();

    const tokenAddress = await mockToken.getAddress();

    const EscrowFactory = await ethers.getContractFactory("CampaignEscrow");
    escrow = await EscrowFactory.deploy(tokenAddress);
    await escrow.waitForDeployment();

    // Give brand some tokens to test
    await mockToken.transfer(brand.address, ethers.parseEther("100"));
  });

  describe("createCampaign()", function () {
    it("should accept packed milestones with deadlines and progress", async function () {
      const milestones = await getMilestones();
      await escrow.connect(brand).createCampaign(creator.address, BUDGET, milestones);
      
      const stored = await escrow.getMilestones(1);
      expect(stored.length).to.equal(3);
      expect(stored[0].currentProgress).to.equal(0);
      expect(stored[0].deadline).to.equal(milestones[0].deadline);
      expect(stored[0].targetValue).to.equal(10000); 
    });

    it("should revert if any deadline is in the past", async function () {
      const milestones = await getMilestones();
      milestones[1].deadline = (await time.latest()) - 100;
      await expect(
        escrow.connect(brand).createCampaign(creator.address, BUDGET, milestones)
      ).to.be.revertedWith("Deadline must be in the future");
    });
  });

  describe("depositFunds()", function () {
    beforeEach(async function () {
      const milestones = await getMilestones();
      await escrow.connect(brand).createCampaign(creator.address, BUDGET, milestones);
    });

    it("should deposit successfully after approval", async function () {
      await mockToken.connect(brand).approve(await escrow.getAddress(), BUDGET);
      await expect(escrow.connect(brand).depositFunds(1))
        .to.emit(escrow, "FundsDeposited")
        .withArgs(1, brand.address, BUDGET);

      expect(await escrow.getContractBalance()).to.equal(BUDGET);
    });
  });

  describe("confirmMilestone() -> Auto Payment", function () {
    beforeEach(async function () {
      const milestones = await getMilestones();
      await escrow.connect(brand).createCampaign(creator.address, BUDGET, milestones);
      
      await mockToken.connect(brand).approve(await escrow.getAddress(), BUDGET);
      await escrow.connect(brand).depositFunds(1);
    });

    it("should automatically transfer ERC20 token when milestone confirmed", async function () {
      const creatorStart = await mockToken.balanceOf(creator.address);

      const tx = await escrow.connect(brand).confirmMilestone(1, 0);
      
      await expect(tx).to.emit(escrow, "MilestoneConfirmed").withArgs(1, 0);
      await expect(tx).to.emit(escrow, "PaymentReleased").withArgs(1, 0, ethers.parseEther("0.3"), creator.address);

      const creatorEnd = await mockToken.balanceOf(creator.address);
      expect(creatorEnd - creatorStart).to.equal(ethers.parseEther("0.3"));
    });

    it("should revert on double call (prevents double payment loophole)", async function () {
      await escrow.connect(brand).confirmMilestone(1, 0);
      await expect(
        escrow.connect(brand).confirmMilestone(1, 0)
      ).to.be.revertedWith("Milestone already confirmed");
    });
  });

  describe("cancelExpiredMilestone()", function () {
    beforeEach(async function () {
      const milestones = await getMilestones();
      await escrow.connect(brand).createCampaign(creator.address, BUDGET, milestones);
      await mockToken.connect(brand).approve(await escrow.getAddress(), BUDGET);
      await escrow.connect(brand).depositFunds(1);
    });

    it("should let brand cancel & refund a strictly expired milestone securely via tokens", async function () {
      await time.increase(86400 * 8); // Pass 7-day mark

      const brandStart = await mockToken.balanceOf(brand.address);
      const tx = await escrow.connect(brand).cancelExpiredMilestone(1, 0);
      
      await expect(tx).to.emit(escrow, "MilestoneExpiredCancelled")
                      .withArgs(1, 0, ethers.parseEther("0.3"));

      const [isCom, isPaid] = await escrow.getMilestoneStatus(1, 0);
      expect(isPaid).to.equal(true); 

      const brandEnd = await mockToken.balanceOf(brand.address);
      expect(brandEnd - brandStart).to.equal(ethers.parseEther("0.3"));
      expect(await escrow.getContractBalance()).to.equal(ethers.parseEther("0.7"));
    });
  });

  describe("refundUncompletedMilestones() (Fixed DOS Loophole)", function () {
    beforeEach(async function () {
      const milestones = await getMilestones();
      await escrow.connect(brand).createCampaign(creator.address, BUDGET, milestones);
      await mockToken.connect(brand).approve(await escrow.getAddress(), BUDGET);
      await escrow.connect(brand).depositFunds(1);
    });

    it("should securely bulk refund remaining uncompleted tokens when ALL expire", async function () {
      await escrow.connect(brand).confirmMilestone(1, 0); 
      await time.increase(86400 * 30);
      
      const brandStart = await mockToken.balanceOf(brand.address);
      const tx = await escrow.connect(brand).refundUncompletedMilestones(1);
      
      await expect(tx).to.emit(escrow, "UncompletedMilestonesRefunded")
                      .withArgs(1, ethers.parseEther("0.7"));

      const brandEnd = await mockToken.balanceOf(brand.address);
      expect(brandEnd - brandStart).to.equal(ethers.parseEther("0.7"));
    });
  });
});
