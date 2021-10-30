const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Brainiac contract", function () {
  it("should assign the total supply of tokens to the owner", async function () {

    const [deployer] = await hre.ethers.getSigners();

    const buyLimit = 100;
    const feeRewardPct = 750;
    const feeRewardAddress = deployer.address;
    const router = "0x10ed43c718714eb63d5aa57b78b54704e256024e";

    const Brainiac = await ethers.getContractFactory("Brainiac");
    const brainiac = await Brainiac.deploy();
    await brainiac.deployed();

    const initializer = await brainiac.initialize(
      buyLimit,
      feeRewardPct,
      feeRewardAddress,
      router
    );
    
    const totalSupply = await brainiac.totalSupply();
    const owner_balance = await brainiac.balanceOf(deployer.address);

    expect(totalSupply).to.equal(owner_balance);

    expect(await brainiac.balanceOf(deployer)).to.equal(300000000 * 10 ** 18);
  });
});
