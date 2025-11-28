'use strict';

/**
 * Hyperledger Fabric Authentication API Server
 * 
 * REST API for user registration and authentication
 * 
 * Usage: npm start or npm run dev
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { v4: uuidv4 } = require('uuid');

const config = require('./config');
const caClient = require('./utils/caClient');
const walletManager = require('./utils/wallet');
const gatewayManager = require('./utils/gateway');
const logger = require('./utils/logger');

// Initialize Express
const app = express();

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Request logging
app.use((req, res, next) => {
    const requestId = uuidv4().substring(0, 8);
    req.requestId = requestId;
    logger.info(`[${requestId}] ${req.method} ${req.path}`);
    next();
});

// ==========================================
// HEALTH CHECK
// ==========================================

app.get('/api/health', async (req, res) => {
    try {
        const caInfo = await caClient.getCAInfo();
        
        res.json({
            status: 'healthy',
            timestamp: new Date().toISOString(),
            fabric: {
                ca: caInfo.caName,
                channel: config.network.channelName,
                mspId: config.org.mspId
            }
        });
    } catch (error) {
        res.status(503).json({
            status: 'unhealthy',
            error: error.message
        });
    }
});

// ==========================================
// ADMIN ENDPOINTS
// ==========================================

app.post('/api/admin/enroll', async (req, res) => {
    const { requestId } = req;

    try {
        logger.info(`[${requestId}] Enrolling CA admin...`);

        const adminExists = await walletManager.identityExists('admin');
        
        if (adminExists) {
            return res.json({
                success: true,
                message: 'Admin already enrolled'
            });
        }

        const enrollment = await caClient.enroll(
            config.ca.adminId,
            config.ca.adminSecret
        );

        const x509Identity = walletManager.createX509Identity(
            enrollment.certificate,
            enrollment.privateKey,
            config.org.mspId
        );

        await walletManager.putIdentity('admin', x509Identity);

        res.status(201).json({
            success: true,
            message: 'Admin enrolled successfully'
        });

    } catch (error) {
        logger.error(`[${requestId}] Admin enrollment failed: ${error.message}`);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ==========================================
// USER ENDPOINTS
// ==========================================

// Register new user
app.post('/api/users/register', async (req, res) => {
    const { requestId } = req;
    const { userId } = req.body;

    if (!userId) {
        return res.status(400).json({
            success: false,
            error: 'userId is required'
        });
    }

    if (!/^[a-zA-Z0-9_-]+$/.test(userId)) {
        return res.status(400).json({
            success: false,
            error: 'Invalid userId format'
        });
    }

    try {
        logger.info(`[${requestId}] Registering user: ${userId}`);

        const userExists = await walletManager.identityExists(userId);
        
        if (userExists) {
            return res.status(409).json({
                success: false,
                error: `User '${userId}' already registered`
            });
        }

        const adminIdentity = await walletManager.getIdentity('admin');
        
        if (!adminIdentity) {
            return res.status(400).json({
                success: false,
                error: 'Admin not enrolled. POST /api/admin/enroll first'
            });
        }

        const enrollment = await caClient.registerAndEnroll(
            userId,
            adminIdentity,
            { affiliation: config.org.department, role: 'client' }
        );

        const x509Identity = walletManager.createX509Identity(
            enrollment.certificate,
            enrollment.privateKey,
            config.org.mspId
        );

        await walletManager.putIdentity(userId, x509Identity);

        res.status(201).json({
            success: true,
            message: 'User registered successfully',
            userId: userId,
            mspId: config.org.mspId
        });

    } catch (error) {
        logger.error(`[${requestId}] Registration failed: ${error.message}`);
        
        if (error.message.includes('already registered')) {
            return res.status(409).json({
                success: false,
                error: `User '${userId}' already registered with CA`
            });
        }

        res.status(500).json({ success: false, error: error.message });
    }
});

// List all users
app.get('/api/users', async (req, res) => {
    try {
        const identities = await walletManager.listIdentities();
        res.json({ success: true, count: identities.length, users: identities });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get user info
app.get('/api/users/:userId', async (req, res) => {
    const { userId } = req.params;

    try {
        const userInfo = await walletManager.exportIdentityInfo(userId);

        if (!userInfo) {
            return res.status(404).json({
                success: false,
                error: `User '${userId}' not found`
            });
        }

        res.json({ success: true, user: userInfo });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Login user
app.post('/api/users/login', async (req, res) => {
    const { requestId } = req;
    const { userId } = req.body;

    if (!userId) {
        return res.status(400).json({
            success: false,
            error: 'userId is required'
        });
    }

    try {
        logger.info(`[${requestId}] Login attempt: ${userId}`);

        const userExists = await walletManager.identityExists(userId);
        
        if (!userExists) {
            return res.status(401).json({
                success: false,
                error: 'Invalid credentials'
            });
        }

        const authResult = await gatewayManager.authenticate(userId);

        if (authResult.success) {
            res.json({
                success: true,
                message: 'Authentication successful',
                userId: userId,
                mspId: config.org.mspId,
                channel: config.network.channelName,
                timestamp: new Date().toISOString()
            });
        } else {
            res.status(401).json({
                success: false,
                error: 'Authentication failed'
            });
        }

    } catch (error) {
        logger.error(`[${requestId}] Login error: ${error.message}`);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ==========================================
// LEDGER ENDPOINTS
// ==========================================

// Query ledger
app.get('/api/ledger/query', async (req, res) => {
    const userId = req.headers['x-user-id'];
    const functionName = req.query.function || 'GetAllAssets';

    if (!userId) {
        return res.status(401).json({
            success: false,
            error: 'x-user-id header required'
        });
    }

    try {
        const userExists = await walletManager.identityExists(userId);
        
        if (!userExists) {
            return res.status(401).json({ success: false, error: 'Invalid user' });
        }

        const result = await gatewayManager.queryLedger(userId, functionName, []);

        if (result.success) {
            res.json({ success: true, function: functionName, data: result.data });
        } else {
            res.status(400).json({ success: false, error: result.error });
        }

    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Submit transaction
app.post('/api/ledger/invoke', async (req, res) => {
    const userId = req.headers['x-user-id'];
    const { function: functionName, args = [] } = req.body;

    if (!userId) {
        return res.status(401).json({
            success: false,
            error: 'x-user-id header required'
        });
    }

    if (!functionName) {
        return res.status(400).json({
            success: false,
            error: 'function is required'
        });
    }

    try {
        const userExists = await walletManager.identityExists(userId);
        
        if (!userExists) {
            return res.status(401).json({ success: false, error: 'Invalid user' });
        }

        const result = await gatewayManager.submitTransaction(userId, functionName, args);

        if (result.success) {
            res.json({ success: true, function: functionName, result: result.data });
        } else {
            res.status(400).json({ success: false, error: result.error });
        }

    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ==========================================
// ERROR HANDLING
// ==========================================

app.use((req, res) => {
    res.status(404).json({ success: false, error: 'Endpoint not found' });
});

app.use((err, req, res, next) => {
    logger.error(`Unhandled error: ${err.message}`);
    res.status(500).json({ success: false, error: 'Internal server error' });
});

// ==========================================
// START SERVER
// ==========================================

const PORT = config.server.port;

app.listen(PORT, () => {
    console.log('\n========================================');
    console.log('  Hyperledger Fabric Auth API Server    ');
    console.log('========================================');
    console.log(`\n  Server: http://localhost:${PORT}`);
    console.log(`  Environment: ${config.server.env}`);
    console.log('\n  Endpoints:');
    console.log('  GET  /api/health');
    console.log('  POST /api/admin/enroll');
    console.log('  POST /api/users/register');
    console.log('  GET  /api/users');
    console.log('  GET  /api/users/:id');
    console.log('  POST /api/users/login');
    console.log('  GET  /api/ledger/query');
    console.log('  POST /api/ledger/invoke');
    console.log('\n========================================\n');
});

module.exports = app;
