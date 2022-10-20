// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
import { ContractReceipt, ContractTransaction } from "ethers";
import { ethers } from "hardhat";
import { generateMerkleTree } from "../test/shared/generateMerkleTree";
import { VRFCoordinatorV2Mock } from "../typechain";

async function main() {
  // Hardhat always runs the compile task when running scripts with its command
  // line interface.
  //
  // If this script is run directly using `node` you may want to call compile
  // manually to make sure everything is compiled
  // await hre.run('compile');
  const [deployer] = await ethers.getSigners(); // mock wallets

  const BASE_FEE = "1000000000000000000"; // 1 LINK
  const GAS_PRICE_LINK = "1000000000"; // 0.0000000001 LINK per gas

  const vrfCoordinatorFactory = await ethers.getContractFactory(
    "VRFCoordinatorV2Mock"
  );

  const mockVrfCoordinator: VRFCoordinatorV2Mock =
    await vrfCoordinatorFactory.deploy(BASE_FEE, GAS_PRICE_LINK);

  const tx: ContractTransaction = await mockVrfCoordinator.createSubscription();
  const txReceipt: ContractReceipt = await tx.wait();
  if (!txReceipt.events) return;
  const subsriptionId = ethers.BigNumber.from(txReceipt.events[0].topics[1]);

  const tickets = [`01`, `02`, `03`, `04`, `05`, `06`, `07`, `08`, `09`, `10`];

  const genMk = await generateMerkleTree(tickets);

  const keyHash = `0x79d3d8832d904592c0bf9818b621522c988bb8b0c05cdc3b15aea1b6e8db0c15`;
  const automationRegistery = `0x02777053d6764996e594c3E88AF1D58D5363a2e6`;
  const callbackGasLimit = 2500000;
  const reqConfirmation = 5;
  const numWords = 7;

  // We get the contract to deploy
  const DynamicRaffleFactory = await ethers.getContractFactory("DynamicRaffle");
  const dynamicRaffle = await DynamicRaffleFactory.deploy(
    subsriptionId,
    mockVrfCoordinator.address,
    keyHash,
    callbackGasLimit,
    reqConfirmation,
    numWords,
    automationRegistery,
    genMk.merkleRoot
  );

  await dynamicRaffle.deployed();

  console.log("Greeter deployed to:", dynamicRaffle.address);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
