import { expect } from "chai";
import { ethers } from "hardhat";
import { Contract } from 'ethers';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';

describe("WeightedLottery", () => {
  let WeightedLottery;
  let weightedLottery: Contract;
  let owner: SignerWithAddress;
  let addr1: SignerWithAddress;
  let addr2: SignerWithAddress;
  let addr3: SignerWithAddress;
  let addrs: SignerWithAddress[];

  beforeEach(async () => {
    WeightedLottery = await ethers.getContractFactory("WeightedLottery");
    [owner, addr1, addr2, addr3, ...addrs] = await ethers.getSigners();
    weightedLottery = await WeightedLottery.deploy();
    await weightedLottery.deployed();
  });

  const do3Entries = async () => {
    if (!weightedLottery || !addr1 || !addr2 || !addr3) {
      throw new Error('Contract and Addresses not initialized!!!');
    }
    const entry1 = await weightedLottery.connect(addr1).enterLottery({ value: ethers.utils.parseEther('1.0') });
    await entry1.wait();
    const entry2 = await weightedLottery.connect(addr2).enterLottery({ value: ethers.utils.parseEther('3.0') });
    await entry2.wait();
    const entry3 = await weightedLottery.connect(addr3).enterLottery({ value: ethers.utils.parseEther('2.0') });
    await entry3.wait();
  }

  const mine20Blocks = async () => {
    for (let i = 0; i < 20; i++) {
      await ethers.provider.send('evm_mine', []);
    }
  }

  describe("constructor", () => {
    it('Sets the right owner', async () => {
      expect(await weightedLottery.owner()).to.equal(owner.address);
    });

    it('Initializes enteredAmountCdf correctly', async () => {
      expect(await weightedLottery.enteredAmountCdf(0)).to.equal(0);
    });
  });

  it("3 entries changes state correctly", async () => {
    await do3Entries();

    // Tests enteredAddresses
    expect(await weightedLottery.enteredAddresses(0)).to.equal(addr1.address);
    expect(await weightedLottery.enteredAddresses(1)).to.equal(addr2.address);
    expect(await weightedLottery.enteredAddresses(2)).to.equal(addr3.address);

    // Tests enteredAmounts
    expect(await weightedLottery.enteredAmounts(addr1.address)).to.equal(ethers.utils.parseEther('1.0'));
    expect(await weightedLottery.enteredAmounts(addr2.address)).to.equal(ethers.utils.parseEther('3.0'));
    expect(await weightedLottery.enteredAmounts(addr3.address)).to.equal(ethers.utils.parseEther('2.0'));

    // Tests enteredAmountCdf
    expect(await weightedLottery.enteredAmountCdf(0)).to.equal(0);
    expect(await weightedLottery.enteredAmountCdf(1)).to.equal(ethers.utils.parseEther('1.0'));
    expect(await weightedLottery.enteredAmountCdf(2)).to.equal(ethers.utils.parseEther('4.0'));
    expect(await weightedLottery.enteredAmountCdf(3)).to.equal(ethers.utils.parseEther('6.0'));

    // Tests totalPot
    expect(await weightedLottery.totalPot()).to.equal(ethers.utils.parseEther('6.0'));

    // Tests totalEntries
    expect(await weightedLottery.totalEntries()).to.equal(3);
  });

  describe('revealWinner', () => {
    it('picks a winner', async () => {
      await do3Entries();

      await weightedLottery.startPickingWinner();
      await mine20Blocks();
      const winner = await weightedLottery.revealWinner();
      expect([addr1.address, addr2.address, addr3.address]).to.include(winner);
    });

    it('returns the winner if already revealed', async () => {
      await do3Entries();

      await weightedLottery.startPickingWinner();
      await mine20Blocks();
      const winner = await weightedLottery.revealWinner();
      const sameWinner = await weightedLottery.revealWinner();
      expect(winner).to.equal(sameWinner);
    });

    it('reverts if lottery not started', async () => {
      expect(await weightedLottery.revealWinner()).to.throw(/LotteryNotStarted/);
    });

    it('reverts if lottery not ready', async () => {
      await weightedLottery.startPickingWinner();
      expect(await weightedLottery.revealWinner()).to.throw(/LotteryNotReady/);
    });
  });
});
