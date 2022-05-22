import { ethers } from "hardhat";

async function main() {

  // We get the contract to deploy
  const WeightedRaffle = await ethers.getContractFactory("WeightedRaffle");
  const weightedRaffle = await WeightedRaffle.deploy();

  console.log("WeightedRaffle deployed to:", weightedRaffle.address);
}


main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
