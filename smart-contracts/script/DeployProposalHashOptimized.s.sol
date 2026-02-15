// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Script.sol";
import "../src/ProposalHashOptimized.sol";

/**
 * @title DeployProposalHashOptimized
 * @notice Deployment script for ProposalHashOptimized contract
 * @dev Run with: forge script script/DeployProposalHashOptimized.s.sol:DeployProposalHashOptimized --rpc-url $BASE_SEPOLIA_RPC_URL --broadcast --verify
 */
contract DeployProposalHashOptimized is Script {
    function run() external {
        // Start broadcasting transactions
        vm.startBroadcast();
        
        // Deploy ProposalHashOptimized
        ProposalHashOptimized proposal = new ProposalHashOptimized();
        
        console.log("========================================");
        console.log("ProposalHashOptimized deployed to:", address(proposal));
        console.log("Deployer:", msg.sender);
        console.log("Chain ID:", block.chainid);
        console.log("========================================");
        
        // Stop broadcasting
        vm.stopBroadcast();
        
        // Log deployment info
        console.log("\nDeployment Summary:");
        console.log("- Contract: ProposalHashOptimized");
        console.log("- Address:", address(proposal));
        console.log("- Owner:", proposal.owner());
        console.log("- Proposal Count:", proposal.proposalCount());
        console.log("\nNext Steps:");
        console.log("1. Update frontend/.env.local with contract address");
        console.log("2. Verify contract on BaseScan (if not auto-verified)");
        console.log("3. Test proposal creation and voting");
    }
}
