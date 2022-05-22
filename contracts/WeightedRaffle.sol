//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "hardhat/console.sol";

import '@openzeppelin/contracts/access/Ownable.sol';
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

error RaffleInProgress();
error RaffleNotStarted();
error RaffleNotReady();
error WinnerNotPicked();

contract WeightedRaffle is Ownable, ReentrancyGuard {
    uint public totalEntries;
    address[] public enteredAddresses;
    mapping(address => uint) public enteredAmounts;
    uint[] public enteredAmountCdf;
    uint public totalPot;
    bool public raffleInProgress;
    uint public raffleStartedBlock;
    address public currentWinner;

    event WinnerPicked(address winner, uint entries, uint winnings);

    constructor() Ownable() {
        enteredAmountCdf.push(0);
    }

    function resetRaffle() public {
        if (currentWinner == address(0)) {
            revert WinnerNotPicked();
        }
        if (!raffleInProgress) {
            revert RaffleNotStarted();
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
        raffleInProgress = false;
        delete currentWinner;
    }

    function enterRaffle() external payable {
        if (raffleInProgress) {
            revert RaffleInProgress();
        }

        enteredAddresses.push(msg.sender);
        enteredAmounts[msg.sender] = enteredAmounts[msg.sender] + msg.value;
        enteredAmountCdf.push(enteredAmountCdf[totalEntries] + msg.value);
        totalPot = totalPot + msg.value;
        totalEntries = totalEntries + 1;
    }

    function startPickingWinner() external onlyOwner {
        if (raffleInProgress) {
            revert RaffleInProgress();
        }
        raffleInProgress = true;
        raffleStartedBlock = block.number;
    }

    function revealWinner() external onlyOwner returns (address) {
        if (currentWinner != address(0)) {
            return currentWinner;
        }
        if (!raffleInProgress) {
            revert RaffleNotStarted();
        }
        if (block.number <= raffleStartedBlock + 20) {
            revert RaffleNotReady();
        }

        uint winningAmount = uint(blockhash(raffleStartedBlock + 20)) % totalPot;

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
