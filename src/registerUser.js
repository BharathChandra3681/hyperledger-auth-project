'use strict';

/**
 * Register User Script
 * 
 * Registers a new user with the Fabric CA and enrolls them.
 * 
 * Usage: node src/registerUser.js <username>
 * Example: node src/registerUser.js user1
 */

const config = require('./config');
const caClient = require('./utils/caClient');
const walletManager = require('./utils/wallet');
const logger = require('./utils/logger');

async function main() {
    const args = process.argv.slice(2);
    
    if (args.length === 0) {
        console.log('\nUsage: node src/registerUser.js <username>');
        console.log('Example: node src/registerUser.js user1\n');
        process.exit(1);
    }

    const userId = args[0];

    console.log('\n========================================');
    console.log('  Hyperledger Fabric - Register User    ');
    console.log('========================================\n');
    console.log(`  User ID: ${userId}`);
    console.log(`  Organization: ${config.org.mspId}\n`);

    try {
        // Step 1: Check if user exists
        logger.info('Step 1: Checking if user already exists...');
        
        const userExists = await walletManager.identityExists(userId);
        
        if (userExists) {
            logger.warn(`User '${userId}' already exists in wallet`);
            console.log(`\n✓ User '${userId}' is already registered.\n`);
            return;
        }

        // Step 2: Verify admin exists
        logger.info('Step 2: Verifying admin identity...');
        
        const adminIdentity = await walletManager.getIdentity('admin');
        
        if (!adminIdentity) {
            throw new Error('Admin identity not found. Run enrollAdmin.js first.');
        }

        logger.info('Admin identity verified');

        // Step 3: Register with CA
        logger.info(`Step 3: Registering user '${userId}' with CA...`);
        
        const secret = await caClient.registerUser(userId, adminIdentity, {
            affiliation: config.org.department,
            role: 'client'
        });

        // Step 4: Enroll user
        logger.info('Step 4: Enrolling user to generate certificates...');
        
        const enrollment = await caClient.enroll(userId, secret);

        // Step 5: Create identity
        logger.info('Step 5: Creating X.509 identity...');
        
        const x509Identity = walletManager.createX509Identity(
            enrollment.certificate,
            enrollment.privateKey,
            config.org.mspId
        );

        // Step 6: Store in wallet
        logger.info('Step 6: Storing user identity in wallet...');
        
        await walletManager.putIdentity(userId, x509Identity);

        // Step 7: Verify
        logger.info('Step 7: Verifying registration...');
        
        const storedIdentity = await walletManager.getIdentity(userId);
        
        if (storedIdentity) {
            console.log('\n========================================');
            console.log('  ✓ User Registration Successful!       ');
            console.log('========================================');
            console.log(`\n  User ID: ${userId}`);
            console.log(`  MSP ID: ${storedIdentity.mspId}`);
            console.log(`  Type: ${storedIdentity.type}`);
            console.log('\n  Next step - Authenticate:');
            console.log(`  $ node src/authenticate.js ${userId}\n`);
        }

    } catch (error) {
        console.error('\n========================================');
        console.error('  ✗ User Registration Failed!           ');
        console.error('========================================');
        logger.error(`Error: ${error.message}`);
        
        if (error.message.includes('already registered')) {
            console.error(`\n  User '${userId}' exists in CA but not in wallet.`);
            console.error('  Try a different username.\n');
        }
        
        process.exit(1);
    }
}

main();
