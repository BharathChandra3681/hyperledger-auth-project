'use strict';

const { Wallets } = require('fabric-network');
const fs = require('fs');
const path = require('path');
const config = require('../config');
const logger = require('./logger');

/**
 * Wallet Utility Module
 * Manages the file system wallet for storing user identities
 */
class WalletManager {
    constructor() {
        this.walletPath = config.wallet.path;
        this.wallet = null;
    }

    /**
     * Initialize and get the wallet instance
     */
    async getWallet() {
        if (this.wallet) {
            return this.wallet;
        }

        // Ensure wallet directory exists
        if (!fs.existsSync(this.walletPath)) {
            fs.mkdirSync(this.walletPath, { recursive: true });
            logger.info(`Created wallet directory at: ${this.walletPath}`);
        }

        // Create file system wallet
        this.wallet = await Wallets.newFileSystemWallet(this.walletPath);
        logger.debug(`Wallet initialized at: ${this.walletPath}`);
        
        return this.wallet;
    }

    /**
     * Check if an identity exists in the wallet
     */
    async identityExists(identityLabel) {
        const wallet = await this.getWallet();
        const identity = await wallet.get(identityLabel);
        return identity !== undefined;
    }

    /**
     * Get an identity from the wallet
     */
    async getIdentity(identityLabel) {
        const wallet = await this.getWallet();
        const identity = await wallet.get(identityLabel);
        
        if (!identity) {
            logger.warn(`Identity not found in wallet: ${identityLabel}`);
            return null;
        }

        logger.debug(`Retrieved identity from wallet: ${identityLabel}`);
        return identity;
    }

    /**
     * Store an identity in the wallet
     */
    async putIdentity(identityLabel, x509Identity) {
        const wallet = await this.getWallet();
        await wallet.put(identityLabel, x509Identity);
        logger.info(`Identity stored in wallet: ${identityLabel}`);
    }

    /**
     * Create an X.509 identity object
     */
    createX509Identity(certificate, privateKey, mspId = config.org.mspId) {
        return {
            credentials: {
                certificate: certificate,
                privateKey: privateKey
            },
            mspId: mspId,
            type: 'X.509'
        };
    }

    /**
     * List all identities in the wallet
     */
    async listIdentities() {
        const wallet = await this.getWallet();
        const identities = await wallet.list();
        logger.debug(`Found ${identities.length} identities in wallet`);
        return identities;
    }

    /**
     * Remove an identity from the wallet
     */
    async removeIdentity(identityLabel) {
        const wallet = await this.getWallet();
        await wallet.remove(identityLabel);
        logger.info(`Identity removed from wallet: ${identityLabel}`);
    }

    /**
     * Export identity details (without private key for security)
     */
    async exportIdentityInfo(identityLabel) {
        const identity = await this.getIdentity(identityLabel);
        
        if (!identity) {
            return null;
        }

        return {
            label: identityLabel,
            mspId: identity.mspId,
            type: identity.type,
            status: 'Certificate loaded successfully'
        };
    }
}

// Export singleton instance
module.exports = new WalletManager();
