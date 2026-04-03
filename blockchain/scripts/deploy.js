const hre = require("hardhat");

async function main() {
  console.log("Deploying Escrow contracts...");

  let tokenAddress = process.env.STABLECOIN_ADDRESS;

  // On local networks or if no address provided for testnets, deploy a Mock Stablecoin automatically
  if (hre.network.name === "hardhat" || hre.network.name === "localhost" || !tokenAddress) {
    console.log(`Network: ${hre.network.name}. Deploying fresh MockERC20...`);
    const MockERC20 = await hre.ethers.getContractFactory("MockERC20");
    const mockToken = await MockERC20.deploy();
    await mockToken.waitForDeployment();
    tokenAddress = await mockToken.getAddress();
    console.log("MockERC20 deployed to:", tokenAddress);
  }

  const CampaignEscrow = await hre.ethers.getContractFactory("CampaignEscrow");
  // Pass the token address to the constructor
  const escrow = await CampaignEscrow.deploy(tokenAddress);
  await escrow.waitForDeployment();

  const address = await escrow.getAddress();
  console.log("CampaignEscrow deployed to:", address);

  const fs = require("fs");
  const path = require("path");
  const deploymentsPath = path.join(__dirname, "..", "deployments.json");
  
  const deploymentData = {
    network: hre.network.name,
    address: address,
    tokenAddress: tokenAddress,
    deployedAt: new Date().toISOString()
  };

  fs.writeFileSync(deploymentsPath, JSON.stringify(deploymentData, null, 2));
  console.log("Deployment info saved to deployments.json");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
