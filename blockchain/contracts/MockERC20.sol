// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MockERC20 is ERC20 {
    constructor() ERC20("Mock Stablecoin", "USD") {
        // Mint 1 million tokens to the deployer
        _mint(msg.sender, 1000000 * 10**decimals());
    }

    // Allow anyone to mint tokens for testing purposes
    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}
