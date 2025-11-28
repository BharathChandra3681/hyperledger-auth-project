# Hyperledger Fabric User Registration & Authentication

## Overview

This project implements user registration and authentication using Hyperledger Fabric Certificate Authority (CA).

## Features

- CA Admin enrollment
- User registration via CA
- User enrollment (certificate generation)
- File system wallet for credential storage
- Network authentication verification
- REST API for all operations (Bonus)

## Prerequisites

- Docker & Docker Compose
- Node.js 18+
- Hyperledger Fabric 2.5+

## Quick Start

### 1. Start Fabric Network
```bash
cd ~/hyperledger/fabric-samples/test-network
./network.sh up -ca
./network.sh createChannel -c mychannel
./network.sh deployCC -ccn basic -ccp ../asset-transfer-basic/chaincode-javascript -ccl javascript
```

### 2. Setup Project
```bash
cd ~/hyperledger-auth-project
npm install
# Update .env with your FABRIC_NETWORK_PATH
```

### 3. Core Operations
```bash
# Enroll admin
node src/enrollAdmin.js

# Register user
node src/registerUser.js user1

# Authenticate
node src/authenticate.js user1
```

### 4. API Server (Bonus)
```bash
npm run dev
```

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| /api/health | GET | Health check |
| /api/admin/enroll | POST | Enroll CA admin |
| /api/users/register | POST | Register user |
| /api/users | GET | List users |
| /api/users/:id | GET | Get user info |
| /api/users/login | POST | Authenticate |
| /api/ledger/query | GET | Query ledger |

## Project Structure
```
├── src/
│   ├── config.js          # Configuration
│   ├── enrollAdmin.js     # Admin enrollment
│   ├── registerUser.js    # User registration
│   ├── authenticate.js    # Authentication test
│   ├── app.js             # REST API
│   └── utils/
│       ├── logger.js      # Logging
│       ├── wallet.js      # Wallet management
│       ├── caClient.js    # CA operations
│       └── gateway.js     # Network gateway
├── wallet/                # Credentials storage
├── scripts/               # Shell scripts
└── screenshots/           # Evidence
```

## Screenshots

1. Network containers running
2. Admin enrollment success
3. User registration success
4. Authentication success
5. API responses

## Author

Your Name

## License

MIT
```

Save and exit.

---

# ✅ Final Checklist

## Files Created:
```
hyperledger-auth-project/
├── package.json              ✓
├── .env                      ✓
├── .gitignore                ✓
├── README.md                 ✓
├── src/
│   ├── config.js             ✓
│   ├── enrollAdmin.js        ✓
│   ├── registerUser.js       ✓
│   ├── authenticate.js       ✓
│   ├── app.js                ✓
│   └── utils/
│       ├── logger.js         ✓
│       ├── wallet.js         ✓
│       ├── caClient.js       ✓
│       └── gateway.js        ✓
├── scripts/
│   └── test-api.sh           ✓
├── wallet/                   (created at runtime)
