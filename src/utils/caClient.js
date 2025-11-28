'use strict';

const FabricCAServices = require('fabric-ca-client');
const { User } = require('fabric-common');
const fs = require('fs');
const config = require('../config');
const logger = require('./logger');

/**
 * Certificate Authority Client Utility
 * Handles all interactions with the Fabric CA
 */
class CAClient {
    constructor() {
        this.caClient = null;
        this.caInfo = null;
    }

    /**
     * Build and return the CA client instance
     */
    async getCAClient() {
        if (this.caClient) {
            return this.caClient;
        }

        try {
            const cryptoPaths = config.getCryptoPaths();
            const caTlsCertPath = cryptoPaths.caTlsCert;

            if (!fs.existsSync(caTlsCertPath)) {
                throw new Error(`CA TLS certificate not found at: ${caTlsCertPath}`);
            }

            const caTlsCert = fs.readFileSync(caTlsCertPath, 'utf8');

            this.caClient = new FabricCAServices(
                config.ca.url,
                {
                    trustedRoots: [caTlsCert],
                    verify: false
                },
                config.ca.name
            );

            logger.info(`CA client created for: ${config.ca.name}`);

            return this.caClient;
        } catch (error) {
            logger.error(`Failed to create CA client: ${error.message}`);
            throw error;
        }
    }

    /**
     * Enroll an identity with the CA
     */
    async enroll(enrollmentId, enrollmentSecret) {
        try {
            const caClient = await this.getCAClient();

            logger.info(`Enrolling identity: ${enrollmentId}`);

            const enrollment = await caClient.enroll({
                enrollmentID: enrollmentId,
                enrollmentSecret: enrollmentSecret
            });

            logger.info(`Successfully enrolled identity: ${enrollmentId}`);

            return {
                certificate: enrollment.certificate,
                privateKey: enrollment.key.toBytes()
            };
        } catch (error) {
            logger.error(`Failed to enroll ${enrollmentId}: ${error.message}`);
            throw error;
        }
    }

    /**
     * Build a proper User object from wallet identity
     */
    async buildUserFromIdentity(adminIdentity) {
        try {
            // Get the CA client to access its crypto suite
            const caClient = await this.getCAClient();
            
            // Get the crypto suite from CA client
            const cryptoSuite = caClient.getCryptoSuite();
            
            // Import the private key into the crypto suite
            const privateKeyPEM = adminIdentity.credentials.privateKey;
            const privateKey = await cryptoSuite.importKey(privateKeyPEM, {
                ephemeral: true
            });

            logger.debug('Admin private key imported successfully');

            // Create the user object
            const user = new User('admin');
            
            // Set the crypto suite on the user
            user.setCryptoSuite(cryptoSuite);
            
            // Set the enrollment with private key, certificate, and MSP ID
            await user.setEnrollment(
                privateKey,
                adminIdentity.credentials.certificate,
                adminIdentity.mspId
            );

            logger.debug('Admin user object built successfully');

            return user;
        } catch (error) {
            logger.error(`Failed to build user from identity: ${error.message}`);
            throw error;
        }
    }

    /**
     * Register a new user with the CA
     */
    async registerUser(userId, adminIdentity, options = {}) {
        try {
            const caClient = await this.getCAClient();

            logger.info(`Registering new user: ${userId}`);

            // Build proper admin user object
            const adminUser = await this.buildUserFromIdentity(adminIdentity);

            // Register the user
            const secret = await caClient.register(
                {
                    affiliation: options.affiliation || config.org.department,
                    enrollmentID: userId,
                    role: options.role || 'client',
                    attrs: options.attrs || []
                },
                adminUser
            );

            logger.info(`Successfully registered user: ${userId}`);

            return secret;
        } catch (error) {
            logger.error(`Failed to register user ${userId}: ${error.message}`);
            throw error;
        }
    }

    /**
     * Register and enroll a new user in one step
     */
    async registerAndEnroll(userId, adminIdentity, options = {}) {
        const secret = await this.registerUser(userId, adminIdentity, options);
        const enrollment = await this.enroll(userId, secret);
        return enrollment;
    }

    /**
     * Get CA information
     */
    async getCAInfo() {
        await this.getCAClient();
        // Return basic info without calling getCaInfo() which requires auth
        return {
            caName: config.ca.name,
            caUrl: config.ca.url
        };
    }
}

// Export singleton instance
module.exports = new CAClient();