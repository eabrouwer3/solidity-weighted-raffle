import { ethers } from "hardhat";

async function main() {

  // We get the contract to deploy
  const WeightedLottery = await ethers.getContractFactory("WeightedLottery");
  const weightedLottery = await WeightedLottery.deploy();

  console.log("WeightedLottery deployed to:", weightedLottery.address);
}


main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
