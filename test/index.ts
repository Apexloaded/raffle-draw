import { assert } from "chai";
import { loadFixture } from "ethereum-waffle";
import { ContractReceipt, ContractTransaction } from "ethers";
import { BytesLike, parseEther } from "ethers/lib/utils";
import { ethers } from "hardhat"
import { StaticRaffle, VRFCoordinatorV2Mock } from "../typechain";

describe("Static raffle test scenario with seven winner", async function() {
  async function deployStaticRaffleFixture() {
    const [deployer] = await ethers.getSigners(); // mock wallets

    const BASE_FEE = "1000000000000000000"; // 1 LINK
    const GAS_PRICE_LINK = "1000000000"; // 0.0000000001 LINK per gas

    const vrfCoordinatorFactory = await ethers.getContractFactory("VRFCoordinatorV2Mock");
    const mockVrfCoordinator: VRFCoordinatorV2Mock = await vrfCoordinatorFactory.deploy(BASE_FEE, GAS_PRICE_LINK);

    const tx: ContractTransaction = await mockVrfCoordinator.createSubscription();
    const txReceipt: ContractReceipt = await tx.wait();
    if(!txReceipt.events) return;
    const subsriptionId = ethers.BigNumber.from(txReceipt.events[0].topics[1]);

    const keyHash = `0x79d3d8832d904592c0bf9818b621522c988bb8b0c05cdc3b15aea1b6e8db0c15`;
    const callbackGasLimit = 2500000;
    const reqConfirmation = 5;
    const numWords = 7;

    const participants: BytesLike[] = [
      `0xc89efdaa54c0f20c7adf612882df0950f5a951637e0307cdcb4c672f298b8bc6`,
      `0xad7c5bef027816a800da1736444fb58a807ef4c9603b7848673f7e3a68eb14a5`,
      `0x2a80e1ef1d7842f27f2e6be0972bb708b9a135c38860dbe73c27c3486c34f4de`,
      `0x13600b294191fc92924bb3ce4b969c1e7e2bab8f4c93c3fc6d0a51733df3c060`,
      `0xceebf77a833b30520287ddd9478ff51abbdffa30aa90a8d655dba0e8a79ce0c1`,
      `0xe455bf8ea6e7463a1046a0b52804526e119b4bf5136279614e0b1e8e296a4e2d`,
      `0x52f1a9b320cab38e5da8a8f97989383aab0a49165fc91c737310e4f7e9821021`,
      `0xe4b1702d9298fee62dfeccc57d322a463ad55ca201256d01f62b45b2e1c21c10`,
      `0xd2f8f61201b2b11a78d6e866abc9c3db2ae8631fa656bfe5cb53668255367afb`,
      `0x1a192fabce13988b84994d4296e6cdc418d55e2f1d7f942188d4040b94fc57ac`,
    ]

    const staticRaffleFactory = await ethers.getContractFactory("StaticRaffle");
    const staticRaffle: StaticRaffle = await staticRaffleFactory.deploy(
      participants,
      subsriptionId,
      mockVrfCoordinator.address,
      keyHash,
      callbackGasLimit,
      reqConfirmation,
      numWords
    )

    mockVrfCoordinator.fundSubscription(subsriptionId, parseEther("5"));
    mockVrfCoordinator.addConsumer(subsriptionId, staticRaffle.address);

    return {staticRaffle, deployer, mockVrfCoordinator, numWords};
  }

  describe("Running raffle scenaro", async function() {
    it("Shold run raffle and determine seven winners only once", async function() {
      const fixture = await loadFixture(deployStaticRaffleFixture);
      if(!fixture) return;

      const tx: ContractTransaction = await fixture.staticRaffle.connect(fixture.deployer).runRaffle();
      const txReceipt: ContractReceipt = await tx.wait(1);
      if(!txReceipt.events) return;
      if(!txReceipt.events[1].args) return;
      const requestId = txReceipt.events[1].args[0];

      await fixture.mockVrfCoordinator.fulfillRandomWords(requestId, fixture.staticRaffle.address);
      const winners = await fixture.staticRaffle.getWinners();

      assert(winners.length === fixture.numWords, "Invalid winners number!")
    })
  })
})
