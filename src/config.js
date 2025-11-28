'use strict';

const path = require('path');
require('dotenv').config();

/**
 * Application Configuration
 * Centralizes all configuration values
 */
const config = {
    // Network paths
    network: {
        testNetworkPath: process.env.FABRIC_NETWORK_PATH || 
            path.join(process.env.HOME, 'hyperledger', 'fabric-samples', 'test-network'),
        channelName: process.env.CHANNEL_NAME || 'mychannel',
        chaincodeName: process.env.CHAINCODE_NAME || 'basic'
    },

    // Organization configuration
    org: {
        mspId: process.env.MSP_ID || 'Org1MSP',
        name: process.env.ORG_NAME || 'org1.example.com',
        department: 'org1.department1'
    },

    // Certificate Authority configuration
    ca: {
        name: process.env.CA_NAME || 'ca-org1',
        host: process.env.CA_HOST || 'localhost',
        port: parseInt(process.env.CA_PORT) || 7054,
        adminId: process.env.CA_ADMIN_ID || 'admin',
        adminSecret: process.env.CA_ADMIN_SECRET || 'adminpw',
        get url() {
            return `https://${this.host}:${this.port}`;
        }
    },

    // Wallet configuration
    wallet: {
        path: process.env.WALLET_PATH || path.join(__dirname, '..', 'wallet')
    },

    // Connection profile
    connectionProfile: {
        path: process.env.CONNECTION_PROFILE_PATH || 
            path.join(__dirname, '..', 'connection-profiles', 'connection-org1.json')
    },

    // Server configuration
    server: {
        port: parseInt(process.env.PORT) || 3000,
        env: process.env.NODE_ENV || 'development'
    },

    // Logging
    logging: {
        level: process.env.LOG_LEVEL || 'debug'
    },

    // Helper function to get crypto paths
    getCryptoPaths() {
        const testNetworkPath = this.network.testNetworkPath;
        const orgName = this.org.name;
        
        return {
            caTlsCert: path.join(
                testNetworkPath,
                'organizations',
                'fabric-ca',
                'org1',
                'ca-cert.pem'
            ),
            peerTlsCert: path.join(
                testNetworkPath,
                'organizations',
                'peerOrganizations',
                orgName,
                'peers',
                `peer0.${orgName}`,
                'tls',
                'ca.crt'
            ),
            orgMspPath: path.join(
                testNetworkPath,
                'organizations',
                'peerOrganizations',
                orgName,
                'msp'
            )
        };
    }
};

module.exports = config;
