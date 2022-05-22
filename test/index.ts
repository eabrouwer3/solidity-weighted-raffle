import { expect } from "chai";
import { ethers } from "hardhat";
import { Contract } from 'ethers';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';

describe("WeightedRaffle", () => {
  let WeightedRaffle;
  let weightedRaffle: Contract;
  let owner: SignerWithAddress;
  let addr1: SignerWithAddress;
  let addr2: SignerWithAddress;
  let addr3: SignerWithAddress;
  let addrs: SignerWithAddress[];

  beforeEach(async () => {
    WeightedRaffle = await ethers.getContractFactory("WeightedRaffle");
    [owner, addr1, addr2, addr3, ...addrs] = await ethers.getSigners();
    weightedRaffle = await WeightedRaffle.deploy();
    await weightedRaffle.deployed();
  });

  const do3Entries = async () => {
    if (!weightedRaffle || !addr1 || !addr2 || !addr3) {
      throw new Error('Contract and Addresses not initialized!!!');
    }
    const entry1 = await weightedRaffle.connect(addr1).enterRaffle({ value: ethers.utils.parseEther('1.0') });
    await entry1.wait();
    const entry2 = await weightedRaffle.connect(addr2).enterRaffle({ value: ethers.utils.parseEther('3.0') });
    await entry2.wait();
    const entry3 = await weightedRaffle.connect(addr3).enterRaffle({ value: ethers.utils.parseEther('2.0') });
    await entry3.wait();
  }

  const mine20Blocks = async () => {
    for (let i = 0; i < 20; i++) {
      await ethers.provider.send('evm_mine', []);
    }
  }

  describe("constructor", () => {
    it('Sets the right owner', async () => {
      expect(await weightedRaffle.owner()).to.equal(owner.address);
    });

    it('Initializes enteredAmountCdf correctly', async () => {
      expect(await weightedRaffle.enteredAmountCdf(0)).to.equal(0);
    });
  });

  it("3 entries changes state correctly", async () => {
    await do3Entries();

    // Tests enteredAddresses
    expect(await weightedRaffle.enteredAddresses(0)).to.equal(addr1.address);
    expect(await weightedRaffle.enteredAddresses(1)).to.equal(addr2.address);
    expect(await weightedRaffle.enteredAddresses(2)).to.equal(addr3.address);

    // Tests enteredAmounts
    expect(await weightedRaffle.enteredAmounts(addr1.address)).to.equal(ethers.utils.parseEther('1.0'));
    expect(await weightedRaffle.enteredAmounts(addr2.address)).to.equal(ethers.utils.parseEther('3.0'));
    expect(await weightedRaffle.enteredAmounts(addr3.address)).to.equal(ethers.utils.parseEther('2.0'));

    // Tests enteredAmountCdf
    expect(await weightedRaffle.enteredAmountCdf(0)).to.equal(0);
    expect(await weightedRaffle.enteredAmountCdf(1)).to.equal(ethers.utils.parseEther('1.0'));
    expect(await weightedRaffle.enteredAmountCdf(2)).to.equal(ethers.utils.parseEther('4.0'));
    expect(await weightedRaffle.enteredAmountCdf(3)).to.equal(ethers.utils.parseEther('6.0'));

    // Tests totalPot
    expect(await weightedRaffle.totalPot()).to.equal(ethers.utils.parseEther('6.0'));

    // Tests totalEntries
    expect(await weightedRaffle.totalEntries()).to.equal(3);
  });

  describe('revealWinner', () => {
    it('picks a winner', async () => {
      await do3Entries();

      await weightedRaffle.startPickingWinner();
      await mine20Blocks();
      await weightedRaffle.revealWinner();
      const winner = await weightedRaffle.currentWinner();
      expect([addr1.address, addr2.address, addr3.address]).to.include(winner);
    });

    // it('returns the winner if already revealed', async () => {
    //   await do3Entries();
    //
    //   await weightedRaffle.startPickingWinner();
    //   await mine20Blocks();
    //   const winner = await weightedRaffle.revealWinner();
    //   const sameWinner = await weightedRaffle.revealWinner();
    //   expect(winner).to.equal(sameWinner);
    // });

    it('reverts if raffle not started', async () => {
      expect(await weightedRaffle.revealWinner()).to.throw(/RaffleNotStarted/);
    });

    it('reverts if raffle not ready', async () => {
      await weightedRaffle.startPickingWinner();
      expect(await weightedRaffle.revealWinner()).to.throw(/RaffleNotReady/);
    });
  });
});
