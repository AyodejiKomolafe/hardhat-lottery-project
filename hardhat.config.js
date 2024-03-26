require("@nomicfoundation/hardhat-toolbox");
// require("@nomiclabs/hardhat-waffle");
// require("@nomiclabs/hardhat-etherscan");
// require("@nomicfoundation/hardhat-ethers");
require("hardhat-deploy");
require("solidity-coverage");
require("hardhat-gas-reporter");
// require("hardhat-contract-sizer");
require("dotenv").config();

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
    solidity: {
        compilers: [{ version: "0.8.24" }, { version: "0.6.6" }],
    },
    defaultNetwork: "hardhat",
    networks: {
        sepolia: {
            url: process.env.ALCHEMY_SEPOLIA_RPC_URL,
            accounts: [process.env.PRIVATE_KEY],
            chainId: 11155111,
            blockConfirmations: 6,
        },
        Goerli: {
            url: process.env.ALCHEMY_GOERLI_RPC_URL,
            accounts: [process.env.PRIVATE_KEY],
            chainId: 5,
            blockConfirmations: 6,
        },
        hardhat: {
            chainId: 31337,
        },
    },
    namedAccounts: {
        deployer: {
            default: 0,
        },
        player: {
            default: 1,
        },
    },
    mocha: {
      timeout: 200000,
    },
    gasReporter: {
        enabled: false,
        outputFile: "gas-report.txt",
        noColors: true,
        currency: "USD",
        coinmarketcap: process.env.COINMARKETCAP_API_KEY,
    },
    etherscan: {
        apiKey: process.env.ETHERSCAN_API_KEY,
    },
};

