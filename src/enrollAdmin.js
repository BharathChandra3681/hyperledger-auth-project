'use strict';

/**
 * Enroll Admin Script
 * 
 * Enrolls the CA administrator and stores the identity in the wallet.
 * The admin identity is required to register new users.
 * 
 * Usage: node src/enrollAdmin.js
 */

const config = require('./config');
const caClient = require('./utils/caClient');
const walletManager = require('./utils/wallet');
const logger = require('./utils/logger');

async function main() {
    console.log('\n========================================');
    console.log('  Hyperledger Fabric - Enroll CA Admin  ');
    console.log('========================================\n');

    try {
        // Step 1: Check if admin already exists
        logger.info('Step 1: Checking if admin identity already exists...');
        
        const adminExists = await walletManager.identityExists('admin');
        
        if (adminExists) {
            logger.warn('Admin identity already exists in wallet');
            console.log('\n✓ Admin already enrolled.');
            console.log('  To re-enroll, delete wallet/admin.id first.\n');
            return;
        }

        // Step 2: Enroll admin with CA
        logger.info('Step 2: Connecting to CA and enrolling admin...');
        logger.info(`CA URL: ${config.ca.url}`);
        logger.info(`CA Name: ${config.ca.name}`);

        const enrollment = await caClient.enroll(
            config.ca.adminId,
            config.ca.adminSecret
        );

        // Step 3: Create X.509 identity
        logger.info('Step 3: Creating X.509 identity...');
        
        const x509Identity = walletManager.createX509Identity(
            enrollment.certificate,
            enrollment.privateKey,
            config.org.mspId
        );

        // Step 4: Store in wallet
        logger.info('Step 4: Storing admin identity in wallet...');
        
        await walletManager.putIdentity('admin', x509Identity);

        // Step 5: Verify
        logger.info('Step 5: Verifying enrollment...');
        
        const storedIdentity = await walletManager.getIdentity('admin');
        
        if (storedIdentity) {
            console.log('\n========================================');
            console.log('  ✓ Admin Enrollment Successful!        ');
            console.log('========================================');
            console.log(`\n  MSP ID: ${storedIdentity.mspId}`);
            console.log(`  Type: ${storedIdentity.type}`);
            console.log(`  Wallet Path: ${config.wallet.path}`);
            console.log('\n  Next step - Register a user:');
            console.log('  $ node src/registerUser.js user1\n');
        }

    } catch (error) {
        console.error('\n========================================');
        console.error('  ✗ Admin Enrollment Failed!            ');
        console.error('========================================');
        logger.error(`Error: ${error.message}`);
        
        if (error.message.includes('ECONNREFUSED')) {
            console.error('\n  The Fabric network is not running.');
            console.error('  Start it with:');
            console.error('  $ cd ~/hyperledger/fabric-samples/test-network');
            console.error('  $ ./network.sh up -ca\n');
        }
        
        process.exit(1);
    }
}

main();
