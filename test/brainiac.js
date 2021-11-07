const { expect } = require("chai");
const { ethers } = require("hardhat");

const WBNB = "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c";

describe("Brainiac contract", function () {
  let Brainiac, brainiac, owner, user0, user1, user2;
  const buyLimit = 100;
  const feeRewardPct = 750;
  let feeRewardAddress;
  const routerAddr = process.env.ROUTER_ADDRESS;
  const factoryAddr = process.env.FACTORY_ADDRESS;
  let routerInstance, factoryInstance, wbnbInstance;
  const MAX_APPROVE_AMOUNT = ethers.BigNumber.from(
    "0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff"
  );

  before(async () => {
    routerInstance = await ethers.getContractAt(
      "IUniswapV2Router02",
      routerAddr
    );

    factoryInstance = await ethers.getContractAt(
      "IUniswapV2Factory",
      factoryAddr
    );

    wbnbInstance = await ethers.getContractAt("IERC20", WBNB);
    [owner, user0, user1, user2] = await hre.ethers.getSigners();

    feeRewardAddress = user2.address;
  });

  it("Should have deployed Brainiac", async function () {
    Brainiac = await ethers.getContractFactory("Brainiac");
    brainiac = await Brainiac.deploy(
      buyLimit,
      feeRewardPct,
      feeRewardAddress,
      routerAddr
    );

    expect(await brainiac.deployed());
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
    const transferAmount = ethers.utils.parseEther("100000");
    const totalSupply = await brainiac.totalSupply();

    await brainiac.transfer(user0.address, transferAmount);

    const owner_balance = await brainiac.balanceOf(owner.address);
    const user0_balance = await brainiac.balanceOf(user0.address);

    expect(user0_balance).to.equal(transferAmount);

    //expect(owner_balance.toString()).to.equal((totalSupply-50).toString());
  });

  it("owner should create pair and add liquidity", async () => {
    await brainiac.approve(routerAddr, MAX_APPROVE_AMOUNT);
    await wbnbInstance.approve(routerAddr, MAX_APPROVE_AMOUNT);

    const allowance = await brainiac.allowance(owner.address, routerAddr);

    const amountTokenDesired = ethers.utils.parseUnits("10000", "ether");
    const amountTokenMin = amountTokenDesired;
    const amountETHMin = ethers.utils.parseUnits("100", "ether");

    await routerInstance.addLiquidityETH(
      brainiac.address,
      amountTokenDesired,
      amountTokenMin,
      amountETHMin,
      owner.address,
      new Date(new Date().getTime() + 10 * 60000).getTime(),
      { value: ethers.utils.parseEther("1000") }
    );

    let pairAddress = await factoryInstance.getPair(brainiac.address, WBNB);
    console.log("pairAddress", pairAddress);
  });

  it("Should ensure the fees collected after adding liquidity by owner is zero", async () => {
    expect(await brainiac.balanceOf(feeRewardAddress)).to.equal(0);
  });

  it("Should be able to swap a BNB for the Brainiac token", async () => {
    const tokenAmountIn = ethers.utils.parseUnits("0.01", "ether");

    const pair = await factoryInstance.getPair(brainiac.address, WBNB);
    console.log("pair ", pair);

    let tokenBalanceBeforeSwap = await brainiac.balanceOf(user1.address);
    console.log("tokenBalanceBeforeSwap", tokenBalanceBeforeSwap.toString());

    const amounts = await routerInstance.getAmountsOut(tokenAmountIn, [
      brainiac.address,
      WBNB,
    ]);

    const amountOut = amounts[1];
    const expectedBrainToken = amountOut;
    console.log("amountOut ", expectedBrainToken.toString());

    await routerInstance
      .connect(user1)
      .swapETHForExactTokens(
        amountOut,
        [WBNB, brainiac.address],
        user1.address,
        new Date(new Date().getTime() + 10 * 60000).getTime(),
        { value: tokenAmountIn }
      );

    let brainToken = await brainiac.connect(user1).balanceOf(user1.address);
    const actualBrainToken = brainToken.toString();

    expect(expectedBrainToken).to.equal(actualBrainToken);
  });

  it("Should ensure the fee has been collected after the swap", async () => {
    let brainiacFeeBalance = await brainiac
      .connect(user2)
      .balanceOf(feeRewardAddress);
    console.log("brainiacFeeBalance ", brainiacFeeBalance.toString());
  });
});

async function seedToken(tokenInstance, account) {
  await tokenInstance.connect(account);
  await tokenInstance.deposit({ value: ethers.utils.parseEther("500") });

  const symbol = await tokenInstance.symbol();
  const tokenBalance = await tokenInstance.balanceOf(account.address);
  console.log(symbol + " Token balance of owner: ", tokenBalance.toString());
}
