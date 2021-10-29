// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
const hre = require("hardhat");

async function main() {
  // Hardhat always runs the compile task when running scripts with its command
  // line interface.
  //
  // If this script is run directly using `node` you may want to call compile
  // manually to make sure everything is compiled
  // await hre.run('compile');

  const accounts = await hre.ethers.getSigners();

  const tokenCap = 300000000;
  const buyLimit = 100;
  const feeBurnPct = 0;
  const feeRewardPct = 750;
  const feeRewardAddress = accounts[0].address;
  const router = "0x10ed43c718714eb63d5aa57b78b54704e256024e";
  // We get the contract to deploy
  const Brainiac = await hre.ethers.getContractFactory("Brainiac");
  const brainiac = await Brainiac.deploy();

  await brainiac.deployed();
  console.log("Brainiac deployed to:", brainiac.address);

  const initializer = await brainiac.initialize(
    tokenCap,
    buyLimit,
    feeBurnPct,
    feeRewardPct,
    feeRewardAddress,
    router
  );


}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
