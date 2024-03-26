const { network, ethers } = require("hardhat");
const { developmentChains } = require("../helper-hardhat-config.js");

const BASE_FEE = "250000000000000000"; //0.25 is the premium, it costs 0.25 LINK.
const GAS_PRICE_LINK = 1e9;

module.exports = async function ({ getNamedAccounts, deployments }) {
  const { deploy, log } = deployments;
  const { deployer } = await getNamedAccounts();
  const chainId = network.config.chainId;
  // if (developmentChains.includes(network.name)) {}
  if (chainId == 31337) {
    log("local network detected! Deploying mocks.");
    await deploy("VRFCoordinatorV2Mock", {
      from: deployer,
      log: true,
      args: [BASE_FEE, GAS_PRICE_LINK],
    });
  }
  log("Mocks deployed!");
  log("-------------------------------------------------------");
};

module.exports.tags = ["all", "mocks"];
