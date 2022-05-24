// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import "forge-std/console.sol";

import "forge-std/Test.sol";
import "../src/WeightedRaffle.sol";

contract WeightedRaffleTest is Test {
    WeightedRaffle weightedRaffle;

    function setUp() public {
        weightedRaffle = new WeightedRaffle();
    }

    function do3Entries() private {
        vm.deal(address(0), 10 ether);
        vm.deal(address(1), 10 ether);
        vm.deal(address(2), 10 ether);

        vm.prank(address(0));
        weightedRaffle.enterRaffle{value:1 ether}();
        vm.prank(address(1));
        weightedRaffle.enterRaffle{value:3 ether}();
        vm.prank(address(2));
        weightedRaffle.enterRaffle{value:2 ether}();
    }

    function test3EntriesSetCorrectState() public {
        do3Entries();

        assertEq(weightedRaffle.enteredAddresses(0), address(0));
        assertEq(weightedRaffle.enteredAddresses(1), address(1));
        assertEq(weightedRaffle.enteredAddresses(2), address(2));

        assertEq(weightedRaffle.enteredAmounts(address(0)), 1 ether);
        assertEq(weightedRaffle.enteredAmounts(address(1)), 3 ether);
        assertEq(weightedRaffle.enteredAmounts(address(2)), 2 ether);

        assertEq(weightedRaffle.enteredAmountCdf(0), 0 ether);
        assertEq(weightedRaffle.enteredAmountCdf(1), 1 ether);
        assertEq(weightedRaffle.enteredAmountCdf(2), 4 ether);
        assertEq(weightedRaffle.enteredAmountCdf(3), 6 ether);

        assertEq(weightedRaffle.totalPot(), 6 ether);

        assertEq(weightedRaffle.totalEntries(), 3);
    }
}
