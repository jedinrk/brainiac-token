const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Brainiac contract", function () {
  let Brainiac, brainiac, owner;
  const buyLimit = 100;
  const feeRewardPct = 750;
  let feeRewardAddress;
  const router = "0x10ed43c718714eb63d5aa57b78b54704e256024e";

  beforeEach(async () => {
    [owner] = await hre.ethers.getSigners();

    feeRewardAddress = owner.address;

    Brainiac = await ethers.getContractFactory("Brainiac");
    brainiac = await Brainiac.deploy();
    await brainiac.deployed();

    const initializer = await brainiac.initialize(
      buyLimit,
      feeRewardPct,
      feeRewardAddress,
      router
    );
  });

  it("should assign the total supply of tokens to the owner", async function () {
    const totalSupply = await brainiac.totalSupply();
    //expect(totalSupply).to.equal(300000000 * 10 ** 18);

    const owner_balance = await brainiac.balanceOf(owner.address);
    expect(totalSupply).to.equal(owner_balance);
  });
});
