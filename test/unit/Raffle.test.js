const { network, getNamedAccounts, deployments, ethers } = require("hardhat");
const {
  developmentChains,
  networkConfig,
} = require("../../helper-hardhat-config.js");
const { assert, expect } = require("chai");

!developmentChains.includes(network.name)
  ? describe.skip
  : describe("Raffle Unit Tests", function () {
      let raffle,
        vrfCoordinatorV2Mock,
        raffleEntranceFee,
        deployer,
        keepersUpdateInterval;
      const chainId = network.config.chainId;

      beforeEach(async function () {
        accounts = await ethers.getSigners();
        deployer = accounts[0];
        player = accounts[1];
        await deployments.fixture("all");
        raffle = await ethers.getContractAt(
          "Raffle",
          (
            await deployments.get("Raffle")
          ).address,
          deployer
        );

        vrfCoordinatorV2Mock = await ethers.getContractAt(
          "VRFCoordinatorV2Mock",
          (
            await deployments.get("VRFCoordinatorV2Mock")
          ).address,
          deployer
        );
        raffleEntranceFee = await raffle.getEntranceFee();
        keepersUpdateInterval = await raffle.getInterval();
      });

      describe("constructor", function () {
        it("initializes the raffle correctly", async () => {
          //ideally we make our tests to have just one assert per "it"
          const raffleState = (await raffle.getRaffleState()).toString();
          const interval = (await raffle.getInterval()).toString();
          assert.equal(raffleState, "0");
          assert.equal(
            interval.toString(),
            networkConfig[chainId]["keepersUpdateInterval"]
          );
        });
      });

      describe("Number of player", function () {
        it("initializes the raffle contract with zero players", async () => {
          const numberOfPlayers = (
            await raffle.getNumberOfPlayers()
          ).toString();
          assert.equal(numberOfPlayers, "0");
        });
      });

      describe("Number of words", function () {
        it("initializes the raffle contract with NUM_WORD of 1", async () => {
          const numWords = (await raffle.getNumWords()).toString();
          assert.equal(numWords, "1");
        });
      });

      describe("enterRaffle", function () {
        it("reverts when you dont pay enough ether", async () => {
          await expect(raffle.enterRaffle()).to.be.revertedWithCustomError(
            raffle,
            "Raffle__NotEnoughEthEntered"
          );
        });
        it("records playes when they enter the raffle", async () => {
          await raffle.enterRaffle({ value: raffleEntranceFee });
          const playerFromContract = await raffle.getPlayer(0);
          assert.equal(playerFromContract, deployer.address);
        });

        it("emits event on enter raffle ", async () => {
          await expect(
            raffle.enterRaffle({ value: raffleEntranceFee })
          ).to.emit(raffle, "RaffleEntered");
        });

        it("doesnt allow entrance when raffle is calculating or closes", async () => {
          await raffle.enterRaffle({ value: raffleEntranceFee });
          await network.provider.send("evm_increaseTime", [
            Number(keepersUpdateInterval) + 1,
          ]);
          await network.provider.send("evm_mine", []);
          await raffle.performUpkeep("0x");
          await expect(
            raffle.enterRaffle({ value: raffleEntranceFee })
          ).to.be.revertedWithCustomError(raffle, "Raffle__NotOpen");
        });
      });

      describe("checkUpkeep", function () {
        it("returns false if people havent sent any Eth", async () => {
          await network.provider.send("evm_increaseTime", [
            Number(keepersUpdateInterval) + 1,
          ]);
          await network.provider.send("evm_mine", []);
          const { upkeepNeeded } = await raffle.checkUpkeep.staticCall("0x");
          assert(!upkeepNeeded);
        });
        it("returns false if raffle is not open", async () => {
          await raffle.enterRaffle({ value: raffleEntranceFee });
          await network.provider.send("evm_increaseTime", [
            Number(keepersUpdateInterval) + 1,
          ]);
          await network.provider.send("evm_mine", []);
          await raffle.performUpkeep("0x");
          const raffleState = await raffle.getRaffleState();
          const { upkeepNeeded } = await raffle.checkUpkeep.staticCall("0x");
          assert.equal(raffleState.toString(), 1);
          assert.equal(upkeepNeeded, false);
        });
        it("returns false if enough time hasn't passed", async () => {
          await raffle.enterRaffle({ value: raffleEntranceFee });
          await network.provider.send("evm_increaseTime", [
            Number(keepersUpdateInterval) - 2,
          ]);
          await network.provider.send("evm_mine", []);
          const { upkeepNeeded } = await raffle.checkUpkeep.staticCall("0x");
          assert(!upkeepNeeded);
        });
        it("returns true if enough time has passed, has players, eth and is open", async () => {
          await raffle.enterRaffle({ value: raffleEntranceFee });
          await network.provider.send("evm_increaseTime", [
            Number(keepersUpdateInterval) + 1,
          ]);
          await network.provider.send("evm_mine", []);
          const { upkeepNeeded } = await raffle.checkUpkeep.staticCall("0x");
          assert(upkeepNeeded);
        });
      });

      describe("performUpkeep", function () {
        it("can only run if checkUpkeep is true", async () => {
          await raffle.enterRaffle({ value: raffleEntranceFee });
          await network.provider.send("evm_increaseTime", [
            Number(keepersUpdateInterval) + 1,
          ]);
          await network.provider.send("evm_mine", []);
          const tx = await raffle.performUpkeep("0x");
          assert(tx);
        });
        it("reverts when checkUpkeep is false", async () => {
          await expect(
            raffle.performUpkeep("0x")
          ).to.be.revertedWithCustomError(raffle, "Raffle__UpkeepNotNeeded");
        });
        it("updates the raffle state, emits an event and calls the vrf coordinator", async () => {
          await raffle.enterRaffle({ value: raffleEntranceFee });
          await network.provider.send("evm_increaseTime", [
            Number(keepersUpdateInterval) + 1,
          ]);
          await network.provider.send("evm_mine", []);
          const txResponse = await raffle.performUpkeep("0x");
          const txReceipt = await txResponse.wait(1);
          const requestId = txReceipt.logs[1].args.requestId;
          const raffleState = await raffle.getRaffleState();
          assert(Number(requestId) > 0);
          assert(Number(raffleState) == 1);
        });
      });

      describe("fulfillRandomWords", function () {
        beforeEach(async () => {
          await raffle.enterRaffle({ value: raffleEntranceFee });
          await network.provider.send("evm_increaseTime", [
            Number(keepersUpdateInterval) + 1,
          ]);
          await network.provider.send("evm_mine", []);
        });
        it("can only be called after performUpkeep", async () => {
          await expect(
            vrfCoordinatorV2Mock.fulfillRandomWords(0, raffle.target)
          ).to.be.revertedWith("nonexistent request");
          await expect(
            vrfCoordinatorV2Mock.fulfillRandomWords(1, raffle.target)
          ).to.be.revertedWith("nonexistent request");
        });
        it("picks a winner, resets the lottery,  and sends money to the winner", async () => {
          const additionalEntrants = 3;
          const startingAccountIndex = 2;
          for (
            let i = startingAccountIndex;
            i < startingAccountIndex + additionalEntrants;
            i++
          ) {
            const accountConnectedToRaffle = raffle.connect(accounts[i]);
            await accountConnectedToRaffle.enterRaffle({
              value: raffleEntranceFee,
            });
          }
          const startingTimeStamp = await raffle.getLatestTimeStamp();

          await new Promise(async (resolve, reject) => {
            setTimeout(resolve, 5000);
            raffle.on("WinnerPicked", async () => {
              console.log("Found the event!");
              try {
                const recentWinner = await raffle.getRecentWinner();
                console.log(recentWinner);
                console.log(accounts[2].address);
                console.log(accounts[0].address);
                console.log(accounts[1].address);
                console.log(accounts[3].address);
                const raffleState = await raffle.getRaffleState();
                const endingTimeStamp = await raffle.getLatestTimeStamp();
                const numPlayers = await raffle.getNumberOfPlayers();
                const provider = ethers.getDefaultProvider();
                const winnerEndingBalance = await provider.getBalance(
                  accounts[2].address
                );
                assert.equal(Number(raffleState) == 0);
                assert.equal(Number(numPlayers) == 0);
                assert(endingTimeStamp > startingTimeStamp);
                assert.equal(
                  Number(winnerEndingBalance),
                  Number(winnderStartingBalance) +
                    (Number(raffleEntranceFee) * additionalEntrants +
                      Number(raffleEntranceFee))
                );
                resolve();
              } catch (error) {
                reject(error);
              }
            });

            const tx = await raffle.performUpkeep("0x");
            const txReciept = await tx.wait(1);
            const provider = ethers.getDefaultProvider();
            const winnderStartingBalance = await provider.getBalance(
              accounts[2].address
            );
            console.log(Number(winnderStartingBalance));
            await vrfCoordinatorV2Mock.fulfillRandomWords(
              txReciept.logs[1].args.requestId,
              raffle.target
            );
          });
        });
      });
    });
