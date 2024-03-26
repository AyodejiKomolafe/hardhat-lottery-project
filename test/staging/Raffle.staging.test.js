const { network, getNamedAccounts, deployments, ethers } = require("hardhat");
const {
  developmentChains,
  networkConfig,
} = require("../../helper-hardhat-config.js");
const { assert, expect } = require("chai");

developmentChains.includes(network.name)
  ? describe.skip
  : describe("Raffle Unit Tests", function () {
      let raffle, raffleEntranceFee, deployer;

      beforeEach(async function () {
        deployer = (await getNamedAccounts()).deployer;
        accounts = await ethers.getSigners();
        deployer = accounts[0];
        player = accounts[1];
        raffle = await ethers.getContractAt(
          "Raffle",
          (
            await deployments.get("Raffle")
          ).address,
          deployer
        );
        raffleEntranceFee = await raffle.getEntranceFee();
      });

      describe("fulfillRandomWords", function () {
        it("works with live chainlink Keepers and Chainlink VRF, we get a random winner", async () => {
          console.log("setting up test...");
          const startingTimeStamp = raffle.getLatestTimeStamp();
          console.log("setting uo listener..");
          await new Promise(async (resolve, reject) => {
            setTimeout(resolve, 5000);
            raffle.on("WinnerPicked", async () => {
              console.log("WinnerPicked event fired!");
              try {
                const recentWinner = await raffle.getRecentWinner();
                const raffleState = await raffle.getRaffleState();
                const provider = ethers.getDefaultProvider();
                const winnerEndingBalance = await provider.getBalance(
                  accounts[0].address
                );
                const endingTimeStamp = await raffle.getLatestTimeStamp();

                await expect(raffle.getPlayer(0)).to.be.reverted;
                assert.equal(recentWinner.toString(), accounts[0].address);
                assert.equal(raffleState, 0);
                assert.equal(
                  Number(winnerEndingBalance),
                  Number(winnerStartingBalance) +
                    ethers.formatEther(raffleEntranceFee)
                );
                assert(endingTimeStamp > startingTimeStamp);
                resolve();
              } catch (error) {
                console.log(error);
                reject(error);
              }
            });
            console.log("entering rafle");
            await raffle.enterRaffle({ value: raffleEntranceFee });
            const provider = ethers.getDefaultProvider();
            console.log("okay, time to wait...");
            const winnerStartingBalance = await provider.getBalance(
              accounts[0].address
            );
          });
        });
      });
    });
