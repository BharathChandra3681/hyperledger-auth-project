'use strict';

/**
 * Authenticate User Script
 * 
 * Tests authentication by connecting to the Fabric network
 * using credentials from the wallet.
 * 
 * Usage: node src/authenticate.js <username>
 * Example: node src/authenticate.js user1
 */

const config = require('./config');
const walletManager = require('./utils/wallet');
const gatewayManager = require('./utils/gateway');
const logger = require('./utils/logger');

async function main() {
    const args = process.argv.slice(2);
    
    if (args.length === 0) {
        console.log('\nUsage: node src/authenticate.js <username>');
        console.log('Example: node src/authenticate.js user1\n');
        process.exit(1);
    }

    const userId = args[0];

    console.log('\n========================================');
    console.log('  Hyperledger Fabric - Authentication   ');
    console.log('========================================\n');
    console.log(`  User ID: ${userId}`);
    console.log(`  Channel: ${config.network.channelName}\n`);

    try {
        // Step 1: Check wallet
        logger.info('Step 1: Checking user identity in wallet...');
        
        const userExists = await walletManager.identityExists(userId);
        
        if (!userExists) {
            throw new Error(`User '${userId}' not found. Register first.`);
        }

        logger.info(`User '${userId}' found in wallet`);

        // Step 2: Load credentials
        logger.info('Step 2: Loading user credentials...');
        
        const identity = await walletManager.getIdentity(userId);
        
        console.log('  ✓ Certificate loaded');
        console.log('  ✓ Private key loaded');
        console.log(`  ✓ MSP ID: ${identity.mspId}`);

        // Step 3: Authenticate
        logger.info('Step 3: Connecting to Fabric network...');
        
        const authResult = await gatewayManager.authenticate(userId);

        if (authResult.success) {
            console.log('\n========================================');
            console.log('  ✓ Authentication Successful!          ');
            console.log('========================================');
            console.log(`\n  User: ${authResult.userId}`);
            console.log(`  Channel: ${authResult.channelInfo.channel}`);
            console.log(`  Connected: ${authResult.channelInfo.connected}`);

            // Step 4: Query ledger
            logger.info('Step 4: Querying ledger to verify access...');
            
            const queryResult = await gatewayManager.queryLedger(
                userId,
                'GetAllAssets',
                []
            );

            if (queryResult.success) {
                console.log('\n  ✓ Ledger query successful');
                if (Array.isArray(queryResult.data)) {
                    console.log(`  ✓ Found ${queryResult.data.length} assets`);
                }
            } else {
                console.log('\n  ⚠ Ledger query returned error');
                console.log('    (Chaincode may not be deployed)');
            }

            console.log('\n========================================');
            console.log('  Authentication Test Complete          ');
            console.log('========================================\n');

        } else {
            throw new Error(authResult.message);
        }

    } catch (error) {
        console.error('\n========================================');
        console.error('  ✗ Authentication Failed!              ');
        console.error('========================================');
        logger.error(`Error: ${error.message}`);
        
        if (error.message.includes('not found')) {
            console.error(`\n  Register the user first:`);
            console.error(`  $ node src/registerUser.js ${userId}\n`);
        }
        
        process.exit(1);
    }
}

main();
