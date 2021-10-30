const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Brainiac contract", function () {
  let Brainiac, brainiac, owner, addr1, addr2;
  const buyLimit = 100;
  const feeRewardPct = 750;
  let feeRewardAddress;
  const router = "0x10ed43c718714eb63d5aa57b78b54704e256024e";

  beforeEach(async () => {
    [owner, addr1, addr2] = await hre.ethers.getSigners();

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

    const owner_balance = await brainiac.balanceOf(owner.address);
    expect(totalSupply).to.equal(owner_balance);
  });

  it("should have a buy limit", async function () {
    const limit = await brainiac.limit();

    expect(limit).to.equal(buyLimit);
  });

  it("should be able to transfer from an account to account without fees", async function () {
    const transferAmount = 50;
    await brainiac.transfer(addr1.address, transferAmount);

    const owner_balance = await brainiac.balanceOf(owner.address);
    const addr1_balance = await brainiac.balanceOf(addr1.address);
    
    expect(addr1_balance.toString()).to.equal(transferAmount.toString());
  });
});
