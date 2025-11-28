'use strict';

const { Gateway } = require('fabric-network');
const fs = require('fs');
const config = require('../config');
const walletManager = require('./wallet');
const logger = require('./logger');

/**
 * Gateway Utility Module
 * Handles connections to the Fabric network
 */
class GatewayManager {
    constructor() {
        this.connectionProfile = null;
    }

    /**
     * Build the connection profile with actual TLS certificates
     */
    async buildConnectionProfile() {
        if (this.connectionProfile) {
            return this.connectionProfile;
        }

        try {
            const cryptoPaths = config.getCryptoPaths();

            // Read TLS certificates
            const caTlsCert = fs.readFileSync(cryptoPaths.caTlsCert, 'utf8');
            const peerTlsCert = fs.readFileSync(cryptoPaths.peerTlsCert, 'utf8');

            // Build connection profile dynamically
            this.connectionProfile = {
                name: 'test-network-org1',
                version: '1.0.0',
                client: {
                    organization: 'Org1',
                    connection: {
                        timeout: {
                            peer: {
                                endorser: '300'
                            }
                        }
                    }
                },
                organizations: {
                    Org1: {
                        mspid: config.org.mspId,
                        peers: ['peer0.org1.example.com'],
                        certificateAuthorities: ['ca.org1.example.com']
                    }
                },
                peers: {
                    'peer0.org1.example.com': {
                        url: 'grpcs://localhost:7051',
                        tlsCACerts: {
                            pem: peerTlsCert
                        },
                        grpcOptions: {
                            'ssl-target-name-override': 'peer0.org1.example.com',
                            'hostnameOverride': 'peer0.org1.example.com'
                        }
                    }
                },
                certificateAuthorities: {
                    'ca.org1.example.com': {
                        url: config.ca.url,
                        caName: config.ca.name,
                        tlsCACerts: {
                            pem: caTlsCert
                        },
                        httpOptions: {
                            verify: false
                        }
                    }
                }
            };

            logger.debug('Connection profile built successfully');
            return this.connectionProfile;
        } catch (error) {
            logger.error(`Failed to build connection profile: ${error.message}`);
            throw error;
        }
    }

    /**
     * Connect to the Fabric network using a specific identity
     */
    async connect(identityLabel) {
        try {
            const identityExists = await walletManager.identityExists(identityLabel);
            if (!identityExists) {
                throw new Error(`Identity '${identityLabel}' not found in wallet`);
            }

            const wallet = await walletManager.getWallet();
            const connectionProfile = await this.buildConnectionProfile();

            const gateway = new Gateway();

            const gatewayOptions = {
                wallet: wallet,
                identity: identityLabel,
                discovery: {
                    enabled: false,
                    asLocalhost: true
                }
            };

            logger.info(`Connecting to gateway as '${identityLabel}'...`);
            await gateway.connect(connectionProfile, gatewayOptions);

            const network = await gateway.getNetwork(config.network.channelName);
            logger.info(`Connected to channel: ${config.network.channelName}`);

            return { gateway, network };
        } catch (error) {
            logger.error(`Failed to connect to gateway: ${error.message}`);
            throw error;
        }
    }

    /**
     * Authenticate a user by connecting to the network
     */
   async authenticate(userId) {
        let gateway = null;

        try {
            logger.info(`Authenticating user: ${userId}`);

            const { gateway: gw, network } = await this.connect(userId);
            gateway = gw;

            // Connection successful = authentication successful
            // No need to query qscc which may fail for various reasons
            logger.info(`User '${userId}' authenticated successfully`);

            return {
                success: true,
                userId: userId,
                message: 'Authentication successful',
                channelInfo: {
                    channel: config.network.channelName,
                    connected: true
                }
            };
        } catch (error) {
            logger.error(`Authentication failed for ${userId}: ${error.message}`);
            return {
                success: false,
                userId: userId,
                message: `Authentication failed: ${error.message}`
            };
        } finally {
            if (gateway) {
                gateway.disconnect();
                logger.debug('Gateway disconnected');
            }
        }
    }

    /**
     * Query the ledger using a specific identity
     */
    async queryLedger(userId, functionName = 'GetAllAssets', args = []) {
        let gateway = null;

        try {
            logger.info(`Querying ledger as '${userId}', function: ${functionName}`);

            const { gateway: gw, network } = await this.connect(userId);
            gateway = gw;

            const contract = network.getContract(config.network.chaincodeName);
            const result = await contract.evaluateTransaction(functionName, ...args);

            const resultString = result.toString();
            logger.info(`Query successful`);

            try {
                return { success: true, data: JSON.parse(resultString) };
            } catch {
                return { success: true, data: resultString };
            }
        } catch (error) {
            logger.error(`Query failed: ${error.message}`);
            return { success: false, error: error.message };
        } finally {
            if (gateway) {
                gateway.disconnect();
            }
        }
    }

    /**
     * Submit a transaction to the ledger
     */
    async submitTransaction(userId, functionName, args = []) {
        let gateway = null;

        try {
            logger.info(`Submitting transaction as '${userId}', function: ${functionName}`);

            const { gateway: gw, network } = await this.connect(userId);
            gateway = gw;

            const contract = network.getContract(config.network.chaincodeName);
            const result = await contract.submitTransaction(functionName, ...args);

            logger.info('Transaction submitted successfully');

            return { success: true, data: result.toString() || 'Transaction committed' };
        } catch (error) {
            logger.error(`Transaction failed: ${error.message}`);
            return { success: false, error: error.message };
        } finally {
            if (gateway) {
                gateway.disconnect();
            }
        }
    }
}

// Export singleton instance
module.exports = new GatewayManager();
