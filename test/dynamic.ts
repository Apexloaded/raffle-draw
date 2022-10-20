import { assert, expect } from "chai";
import { loadFixture } from "ethereum-waffle";
import { ContractReceipt, ContractTransaction } from "ethers";
import { BytesLike, parseEther, keccak256, toUtf8Bytes } from "ethers/lib/utils";
import { MerkleTree } from "merkletreejs";
import { ethers } from "hardhat";
import {
  DynamicRaffle,
  VRFCoordinatorV2Mock,
} from "../typechain";
import { generateMerkleTree } from "./shared/generateMerkleTree";

describe("Static raffle test scenario with seven winner", async function () {
  async function deployStaticRaffleFixture() {
    const [deployer] = await ethers.getSigners(); // mock wallets

    const BASE_FEE = "1000000000000000000"; // 1 LINK
    const GAS_PRICE_LINK = "1000000000"; // 0.0000000001 LINK per gas

    const vrfCoordinatorFactory = await ethers.getContractFactory(
      "VRFCoordinatorV2Mock"
    );
    const mockVrfCoordinator: VRFCoordinatorV2Mock =
      await vrfCoordinatorFactory.deploy(BASE_FEE, GAS_PRICE_LINK);

    const tx: ContractTransaction =
      await mockVrfCoordinator.createSubscription();
    const txReceipt: ContractReceipt = await tx.wait();
    if (!txReceipt.events) return;
    const subsriptionId = ethers.BigNumber.from(txReceipt.events[0].topics[1]);

    const keyHash = `0x79d3d8832d904592c0bf9818b621522c988bb8b0c05cdc3b15aea1b6e8db0c15`;
    const automationRegistery = `0x02777053d6764996e594c3E88AF1D58D5363a2e6`;
    const callbackGasLimit = 2500000;
    const reqConfirmation = 5;
    const numWords = 7;

    const tickets = [
      `01`,
      `02`,
      `03`,
      `04`,
      `05`,
      `06`,
      `07`,
      `08`,
      `09`,
      `10`,
    ];

    const mk = await generateMerkleTree(tickets);

    const dynamicRaffleFactory = await ethers.getContractFactory(
      "DynamicRaffle"
    );
    const dynamicRaffle: DynamicRaffle = await dynamicRaffleFactory.deploy(
      subsriptionId,
      mockVrfCoordinator.address,
      keyHash,
      callbackGasLimit,
      reqConfirmation,
      numWords,
      automationRegistery,
      mk.merkleRoot
    );

    mockVrfCoordinator.fundSubscription(subsriptionId, parseEther("5"));
    mockVrfCoordinator.addConsumer(subsriptionId, dynamicRaffle.address);

    return { dynamicRaffle, deployer, mockVrfCoordinator, numWords, mk };
  }

  describe("Running raffle scenaro", async function () {
    it("Shold run raffle and determine seven winners only", async function () {
      const fixture = await loadFixture(deployStaticRaffleFixture);
      if (!fixture) return;

      const ticketConfirmationNumber = "010";
      const hashedTicketConfirmationNumber = keccak256(toUtf8Bytes(ticketConfirmationNumber));
      const proof = fixture.mk.merkleTree.getHexProof(hashedTicketConfirmationNumber);

      expect(fixture.dynamicRaffle.enterRaffle(hashedTicketConfirmationNumber, proof)).to.be.reverted;
    });
  });
});
