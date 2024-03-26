const { network, ethers } = require("hardhat");
const {
  developmentChains,
  networkConfig,
} = require("../helper-hardhat-config.js");
const { verify } = require("../utils/verify");
require("dotenv").config();

const VRF_SUB_FUND_AMOUNT = ethers.parseEther("2");

module.exports = async ({ getNamedAccounts, deployments }) => {
  const { deploy, log } = deployments;
  const { deployer } = await getNamedAccounts();
  const chainId = network.config.chainId;
  let vrfCoordinatorV2Address;
  let subscriptionId;

  if (developmentChains.includes(network.name)) {
    const contractAddress = (await deployments.get("VRFCoordinatorV2Mock"))
      .address;
    const vrfCoordinatorV2Mock = await ethers.getContractAt(
      "VRFCoordinatorV2Mock",
      contractAddress
    );
    vrfCoordinatorV2Address = vrfCoordinatorV2Mock.target;

    const transactionResponse = await vrfCoordinatorV2Mock.createSubscription();
    const transactionReceipt = await transactionResponse.wait(1);
    subscriptionId = transactionReceipt.logs[0].args.subId;
    // subscriptionId = transactionReceipt.events[0].args.subId
    await vrfCoordinatorV2Mock.fundSubscription(
      subscriptionId,
      VRF_SUB_FUND_AMOUNT
    );
  } else {
    vrfCoordinatorV2Address = networkConfig[chainId]["vrfCoordinatorV2"];
    subscriptionId = networkConfig[chainId]["subscriptionId"];
  }
  const entranceFee = networkConfig[chainId]["entranceFee"];
  const gasLane = networkConfig[chainId]["gasLane"];
  const callbackGasLimit = networkConfig[chainId]["callbackGasLimit"];
  const keepersUpdateInterval = networkConfig[chainId]["keepersUpdateInterval"];

  const args = [
    vrfCoordinatorV2Address,
    entranceFee,
    gasLane,
    subscriptionId,
    callbackGasLimit,
    keepersUpdateInterval,
  ];

  const raffle = await deploy("Raffle", {
    from: deployer,
    args: [
      vrfCoordinatorV2Address,
      entranceFee,
      gasLane,
      subscriptionId,
      callbackGasLimit,
      keepersUpdateInterval,
    ],
    log: true,
    waitConfirmations: network.config.blockConfirmations || 1,
  });

    log("Raffle deployed")

    if(developmentChains.includes(network.name)){
      const contractAddress = (await deployments.get("VRFCoordinatorV2Mock"))
      .address;
    const vrfCoordinatorV2Mock = await ethers.getContractAt(
      "VRFCoordinatorV2Mock",
      contractAddress
    );
  
    await vrfCoordinatorV2Mock.addConsumer(subscriptionId, raffle.address);
    log("consumer is added");
  }

  if (
    !developmentChains.includes(network.name) &&
    process.env.ETHERSCAN_API_KEY
  ) {
    log("Verifying contract...");
    await verify(raffle.address, args);
  }

  log("----------------------------------------------------");
};

module.exports.tags = ["all", "raffle"];
