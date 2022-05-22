//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "hardhat/console.sol";

import '@openzeppelin/contracts/access/Ownable.sol';
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

error LotteryInProgress();
error LotteryNotStarted();
error LotteryNotReady();
error WinnerNotPicked();

contract WeightedLottery is Ownable, ReentrancyGuard {
    uint public totalEntries;
    address[] public enteredAddresses;
    mapping(address => uint) public enteredAmounts;
    uint[] public enteredAmountCdf;
    uint public totalPot;
    bool public lotteryInProgress;
    uint public lotteryStartedBlock;
    address public currentWinner;

    event WinnerPicked(address winner, uint entries, uint winnings);

    constructor() Ownable() {
        enteredAmountCdf.push(0);
    }

    function resetLottery() public {
        if (currentWinner == address(0)) {
            revert WinnerNotPicked();
        }
        if (!lotteryInProgress) {
            revert LotteryNotStarted();
        }
        // Loop through enteredAddresses and clear enteredAmounts
        for (uint i = 0; i < enteredAddresses.length; i++) {
            delete enteredAmounts[enteredAddresses[i]];
        }

        delete totalEntries;
        delete enteredAddresses;
        delete enteredAmountCdf;
        enteredAmountCdf.push(0);
        delete totalPot;
        lotteryInProgress = false;
        delete currentWinner;
    }

    function enterLottery() external payable {
        if (lotteryInProgress) {
            revert LotteryInProgress();
        }

        enteredAddresses.push(msg.sender);
        enteredAmounts[msg.sender] = enteredAmounts[msg.sender] + msg.value;
        enteredAmountCdf.push(enteredAmountCdf[totalEntries] + msg.value);
        totalPot = totalPot + msg.value;
        totalEntries = totalEntries + 1;
    }

    function startPickingWinner() external onlyOwner {
        if (lotteryInProgress) {
            revert LotteryInProgress();
        }
        lotteryInProgress = true;
        lotteryStartedBlock = block.number;
    }

    function revealWinner() external onlyOwner returns (address) {
        if (currentWinner != address(0)) {
            return currentWinner;
        }
        if (!lotteryInProgress) {
            revert LotteryNotStarted();
        }
        if (block.number <= lotteryStartedBlock + 20) {
            revert LotteryNotReady();
        }

        uint winningAmount = uint(blockhash(lotteryStartedBlock + 20)) % totalPot;

        // Binary Search
        uint lower = uint(0);
        uint upper = totalEntries;
        while (currentWinner == address(0)) {
            uint curIndex = lower + ((upper - lower) / uint(2));
            uint amountAtIndex = enteredAmountCdf[curIndex];
            if (winningAmount < amountAtIndex) {
                if (winningAmount >= enteredAmountCdf[curIndex - 1]) {
                    currentWinner = enteredAddresses[curIndex - 1];
                } else {
                    upper = curIndex - 1;
                }
            } else {
                if (winningAmount < enteredAmountCdf[curIndex + 1]) {
                    currentWinner = enteredAddresses[curIndex];
                } else {
                    lower = curIndex;
                }
            }
        }
        emit WinnerPicked(currentWinner, totalEntries, totalPot);
        return currentWinner;
    }
}
