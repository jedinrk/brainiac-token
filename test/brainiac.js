const chai = require("chai");
const chaiAlmost = require("chai-almost");

chai.use(chaiAlmost(0.1));
const { ethers } = require("hardhat");
let expect = chai.expect;
const big = ethers.BigNumber;

const WBNB = "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c";

describe("Brainiac contract", function () {
  let Brainiac, brainiac, owner, user0, user1, user2;
  const buyLimit = 100; //1%
  const buyFeePercent = 500; //5%
  const sellFeePercent = 1000; //10%
  let marketingAddress;
  let feeReward;
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

    marketingAddress = user2.address;
  });

  it("Should have deployed Brainiac", async function () {
    Brainiac = await ethers.getContractFactory("Brainiac");
    brainiac = await Brainiac.deploy(
      buyLimit,
      buyFeePercent,
      sellFeePercent,
      marketingAddress,
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
    const limit = await brainiac.buyLimit();

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
    expect(pairAddress).to.not.equal(0x00);
  });

  it("Should ensure the fees collected after adding liquidity by owner is zero", async () => {
    expect(await brainiac.balanceOf(marketingAddress)).to.equal(0);
  });

  it("Should be able to buy Brainiac token for an amount of BNB", async () => {
    const bnbAmountIn = ethers.utils.parseUnits("0.01", "ether");

    const buyFeePct = await brainiac.buyFeePct();
    const amounts = await routerInstance.getAmountsOut(bnbAmountIn, [
      WBNB,
      brainiac.address,
    ]);

    const amountOut = amounts[1];
    feeReward = Math.floor((amountOut * buyFeePct) / 10000);
    const expectedBrainToken = Math.floor((amountOut - feeReward) / 1e11);

    await routerInstance
      .connect(user1)
      .swapETHForExactTokens(
        amountOut,
        [WBNB, brainiac.address],
        user1.address,
        new Date(new Date().getTime() + 10 * 60000).getTime(),
        { value: bnbAmountIn }
      );

    let brainToken = await brainiac.connect(user1).balanceOf(user1.address);
    const actualBrainToken = Math.floor(brainToken / 1e11);

    expect(expectedBrainToken).to.equal(actualBrainToken);
  });

  it("Should ensure the fee has been collected after the swap", async () => {
    let brainiacFeeBalance = await brainiac
      .connect(user2)
      .balanceOf(marketingAddress);

    const expectedBrainFeeBal = Math.floor(brainiacFeeBalance / 1e11);
    const feeCollected = Math.floor(feeReward / 1e11);
    expect(expectedBrainFeeBal).to.almost.equal(feeCollected);
  });

  it.skip("Should be able to sell Brainiac token for BNB", async () => {
    const tokenAmountIn = ethers.utils.parseUnits("10", "ether");

    const sellFeePct = await brainiac.sellFeePct();
    feeReward = Math.floor((tokenAmountIn * sellFeePct) / 10000);
    console.log("feeReward: ", feeReward);

    const tokenAmtIntoLp = tokenAmountIn - feeReward;
    console.log("tokenAmtIntoLp: ", tokenAmtIntoLp);
    const amounts = await routerInstance.getAmountsOut(tokenAmtIntoLp, [
      brainiac.address,
      WBNB,
    ]);
    const amountOut = amounts[1];

    console.log("swapExactTokensForETH ", amountOut);
    await routerInstance
      .connect(user1)
      .swapExactTokensForETH(
        tokenAmountIn,
        amountOut,
        [brainiac.address, WBNB],
        user1.address,
        new Date(new Date().getTime() + 10 * 60000).getTime()
      );

    let bnbBalance = await wbnbInstance.balanceOf(user1.address);
    console.log("bnbBalance :", bnbBalance);
    const flooredBalance = Math.floor(bnbBalance / 1e11);
    console.log("flooredBalance :", flooredBalance);

    const expectedamountOut = Math.floor(amountOut / 1e11);
    console.log("expectedamountOut :", expectedamountOut);

    expect(expectedamountOut).to.equal();
  });
});

async function seedToken(tokenInstance, account) {
  await tokenInstance.connect(account);
  await tokenInstance.deposit({ value: ethers.utils.parseEther("500") });

  const symbol = await tokenInstance.symbol();
  const tokenBalance = await tokenInstance.balanceOf(account.address);
  console.log(symbol + " Token balance of owner: ", tokenBalance.toString());
}
