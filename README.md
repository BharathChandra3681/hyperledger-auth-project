# Hyperledger Fabric Authentication Project - Complete Guide

This project implements a complete **user registration and authentication system** for Hyperledger Fabric blockchain networks. It provides both CLI scripts and a REST API to manage user identities, authenticate users, and interact with the blockchain ledger.

### Key Features

- **User Registration**: Create new blockchain identities with X.509 certificates
- **Authentication**: Verify users can access the blockchain network
- **Ledger Operations**: Query and invoke chaincode functions
- **REST API**: HTTP endpoints for easy integration
- **Secure Storage**: File-system wallet for cryptographic credentials

---

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Client Application                       │
│            (Web App, Mobile App, CLI, etc.)                  │
└──────────────────────┬──────────────────────────────────────┘
                       │ HTTP REST API
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                   Express API Server                         │
│                    (Port 3000)                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  User Mgmt   │  │ Auth Service │  │Ledger Service│      │
│  │  Endpoints   │  │  Endpoints   │  │  Endpoints   │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└──────────────────────┬──────────────────────────────────────┘
                       │
        ┌──────────────┼──────────────┐
        │              │              │
        ▼              ▼              ▼
┌─────────────┐ ┌──────────────┐ ┌─────────────┐
│  CA Client  │ │Wallet Manager│ │   Gateway   │
│   Utility   │ │   Utility    │ │   Manager   │
└──────┬──────┘ └──────┬───────┘ └──────┬──────┘
       │               │                │
       ▼               ▼                ▼
┌─────────────────────────────────────────────┐
│         Hyperledger Fabric Network          │
│  ┌──────────┐  ┌─────────┐  ┌───────────┐  │
│  │Certificate│  │  Peer   │  │ Chaincode │  │
│  │ Authority │  │  Node   │  │ (Smart    │  │
│  │   (CA)    │  │         │  │ Contract) │  │
│  └──────────┘  └─────────┘  └───────────┘  │
└─────────────────────────────────────────────┘
       │               │
       ▼               ▼
┌──────────────┐ ┌──────────────┐
│File System   │ │  Blockchain  │
│Wallet        │ │    Ledger    │
│(Identities)  │ │   (State)    │
└──────────────┘ └──────────────┘
```

### Functional Flows

See [FUNCTIONAL_FLOWS.md](FUNCTIONAL_FLOWS.md) for detailed flow diagrams including:
- Network Setup Flow
- Admin Enrollment Flow
- User Registration Flow
- Complete System Flow
- Visual Authentication Flow

### Component Interaction Flow

1. **Registration Flow**:
   - Client sends registration request to API
   - API uses CA Client to register user with Certificate Authority
   - CA issues X.509 certificate and private key
   - Wallet Manager stores credentials in file system

2. **Authentication Flow**:
   - Client sends login request to API
   - Wallet Manager retrieves user credentials
   - Gateway Manager establishes mTLS connection to Fabric peer
   - Successful connection = User authenticated

3. **Ledger Query Flow**:
   - Client sends query with user ID header
   - Gateway connects using user's credentials
   - Contract evaluates transaction (read-only)
   - Results returned to client

---

**Storage Format**:
Each identity is stored as a JSON file in the `wallet/` directory:


### 3. Gateway Manager (`src/utils/gateway.js`)

**Purpose**: Manages connections to the Hyperledger Fabric network

**Key Responsibilities**:
- Build dynamic connection profiles
- Establish gateway connections using user credentials
- Authenticate users by verifying network access
- Execute ledger queries and transactions

**Main Methods**:
```javascript
// Build connection profile
const connectionProfile = await gatewayManager.buildConnectionProfile()

// Connect to network
const { gateway, network } = await gatewayManager.connect('user1')

// Authenticate user
const result = await gatewayManager.authenticate('user1')

// Query ledger (read-only)
const data = await gatewayManager.queryLedger('user1', 'GetAllAssets', [])

// Submit transaction (state-changing)
const result = await gatewayManager.submitTransaction('user1', 'CreateAsset', ['id', 'data'])
```

### 4. Logger (`src/utils/logger.js`)

**Purpose**: Centralized logging using Winston

**Features**:
- Timestamp formatting (YYYY-MM-DD HH:mm:ss)
- Log levels: debug, info, warn, error
- Colored console output
- Error stack traces

### 5. Configuration (`src/config.js`)

**Purpose**: Centralized configuration management

**Configuration Sections**:
- Network settings (channel, chaincode)
- Organization details (MSP ID, org name)
- CA settings (host, port, admin credentials)
- Application settings (port, environment, logging)

---

## How Authentication Works

### Understanding X.509 Certificates

In Hyperledger Fabric, authentication is based on **X.509 digital certificates** rather than usernames and passwords. Here's how it works:

1. **Certificate Authority (CA)**: Acts like a trusted passport office
2. **Certificate**: Like a digital passport that proves your identity
3. **Private Key**: Secret key that only you have (proves the certificate belongs to you)
4. **Public Key**: Included in certificate (others use it to verify your signatures)

### Authentication Process Step-by-Step

#### Step 1: Admin Enrollment

Before any users can register, an admin must enroll:

```bash
node src/enrollAdmin.js
```

**What happens**:
1. Script connects to CA at `localhost:7054`
2. Enrolls using hardcoded credentials (`admin:adminpw`)
3. CA issues X.509 certificate and private key for admin
4. Credentials stored in `wallet/admin.id`

**Result**: Admin can now register users

#### Step 2: User Registration

Register a new user:

```bash
node src/registerUser.js user1
```

**What happens**:
1. Script loads admin identity from wallet
2. Admin authenticates with CA
3. Admin registers new user `user1` with CA
4. CA returns enrollment secret (one-time password)
5. Script enrolls `user1` using the secret
6. CA issues X.509 certificate and private key for `user1`
7. Credentials stored in `wallet/user1.id`

**Result**: User1 can now authenticate and access the network

#### Step 3: Authentication

Verify user can access the network:

```bash
node src/authenticate.js user1
```

**What happens**:
1. Script loads `user1` identity from wallet
2. Creates connection profile with network details
3. Initiates gateway connection to Fabric peer
4. **mTLS Handshake**:
   - Peer requests client certificate
   - User presents X.509 certificate
   - User proves ownership by signing with private key
   - Peer validates certificate against CA
   - Peer checks MSP ID (Org1MSP)
5. If valid, connection established
6. Script queries ledger with `GetAllAssets`
7. Successful query = Full authentication verified

**Result**: User1 is authenticated and authorized

### Visual Authentication Flow

See [FUNCTIONAL_FLOWS.md](FUNCTIONAL_FLOWS.md) for the complete authentication flow diagram.

---

## Project Structure

```
hyperledger-auth-project/
│
├── src/                           # Source code
│   ├── app.js                    # Express REST API server (main entry)
│   ├── config.js                 # Configuration management
│   ├── enrollAdmin.js            # CLI: Enroll CA admin
│   ├── registerUser.js           # CLI: Register new user
│   ├── authenticate.js           # CLI: Test authentication
│   │
│   └── utils/                    # Utility modules
│       ├── caClient.js           # Certificate Authority operations
│       ├── wallet.js             # Identity storage management
│       ├── gateway.js            # Network gateway management
│       └── logger.js             # Winston logging utility
│
├── wallet/                        # File system wallet (gitignored)
│   ├── admin.id                  # Admin identity
│   ├── user5.id                  # User identities
│   ├── user7.id
│   └── ...
│
├── scripts/
│   └── test-api.sh               # API testing script
│
├── .env                          # Environment configuration
├── package.json                  # Dependencies
├── README.md                     # Original documentation
└── AUTHENTICATION_IMPLEMENTATION_REPORT.md  # Implementation report
```

---

## Setup Instructions

### Prerequisites

1. **Docker & Docker Compose** - For Hyperledger Fabric network
2. **Node.js 18+** - JavaScript runtime
3. **Hyperledger Fabric 2.5+** - Blockchain framework
4. **fabric-samples** - Example networks and chaincode

### Step 1: Install Hyperledger Fabric

```bash
# Create directory
mkdir -p ~/hyperledger
cd ~/hyperledger

# Download fabric-samples
curl -sSL https://bit.ly/2ysbOFE | bash -s

# This installs:
# - fabric-samples/ directory
# - Hyperledger Fabric binaries
# - Docker images
```

### Step 2: Start Fabric Test Network

```bash
cd ~/hyperledger/fabric-samples/test-network

# Start network with Certificate Authority
./network.sh up -ca

# Create channel
./network.sh createChannel -c mychannel

# Deploy basic chaincode
./network.sh deployCC -ccn basic -ccp ../asset-transfer-basic/chaincode-javascript -ccl javascript
```

**Verify network is running**:
```bash
docker ps
# Should see containers: peer0.org1, orderer, ca_org1, etc.
```

### Step 3: Clone and Setup This Project

```bash
# Clone or navigate to project
cd ~/hyperledger-auth-project

# Install dependencies
npm install
```

### Step 4: Configure Environment

Edit `.env` file with your paths:

```bash
# Fabric network path (update this to your actual path)
FABRIC_NETWORK_PATH=/Users/youruser/hyperledger/fabric-samples/test-network

# Network configuration
CHANNEL_NAME=mychannel
CHAINCODE_NAME=basic

# Organization
MSP_ID=Org1MSP
ORG_NAME=org1.example.com

# Certificate Authority
CA_NAME=ca-org1
CA_HOST=localhost
CA_PORT=7054
CA_ADMIN_ID=admin
CA_ADMIN_SECRET=adminpw

# Application
WALLET_PATH=./wallet
PORT=3000
NODE_ENV=development
LOG_LEVEL=debug
```

### Step 5: Enroll Admin

```bash
npm run enroll-admin
# or
node src/enrollAdmin.js
```

**Expected output**:
```
Successfully enrolled admin user and imported it into the wallet
Admin Identity Details:
- MSP ID: Org1MSP
- Identity Type: X.509
- Wallet Path: ./wallet

Next step: Register a user using 'node src/registerUser.js <username>'
```

### Step 6: Register Test User

```bash
npm run register-user user1
# or
node src/registerUser.js user1
```

**Expected output**:
```
Successfully registered and enrolled user 'user1'
User Identity Details:
- User ID: user1
- MSP ID: Org1MSP
- Identity Type: X.509
- Wallet Path: ./wallet

Next step: Authenticate using 'node src/authenticate.js user1'
```

### Step 7: Test Authentication

```bash
npm run authenticate user1
# or
node src/authenticate.js user1
```

**Expected output**:
```
User 'user1' authenticated successfully!
Authentication Details:
- User ID: user1
- MSP ID: Org1MSP
- Channel: mychannel
- Assets on Ledger: [...]
```

### Step 8: Start API Server

```bash
npm run dev
# or
npm start  # for production
```

**Server should start**:
```
Server is running on port 3000
Environment: development
```

---

## Usage Guide

### CLI Scripts

#### 1. Enroll Admin

```bash
node src/enrollAdmin.js
```

Enrolls the Certificate Authority administrator. **Required before registering users.**

#### 2. Register User

```bash
node src/registerUser.js <username>

# Examples:
node src/registerUser.js alice
node src/registerUser.js bob
node src/registerUser.js user123
```

Registers a new user and enrolls them with the CA.

#### 3. Authenticate User

```bash
node src/authenticate.js <username>

# Examples:
node src/authenticate.js alice
node src/authenticate.js bob
```

Tests if user can authenticate to the network and query the ledger.

### API Usage

Start the server first:
```bash
npm run dev
```

#### Health Check

```bash
curl http://localhost:3000/api/health
```

**Response**:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "ca": {
    "name": "ca-org1",
    "url": "https://localhost:7054"
  },
  "network": {
    "channel": "mychannel",
    "mspId": "Org1MSP"
  }
}
```

#### Enroll Admin

```bash
curl -X POST http://localhost:3000/api/admin/enroll \
  -H "Content-Type: application/json"
```

**Response**:
```json
{
  "success": true,
  "message": "Admin enrolled successfully",
  "mspId": "Org1MSP"
}
```

#### Register User

```bash
curl -X POST http://localhost:3000/api/users/register \
  -H "Content-Type: application/json" \
  -d '{"userId": "alice"}'
```

**Response**:
```json
{
  "success": true,
  "message": "User registered and enrolled successfully",
  "userId": "alice",
  "mspId": "Org1MSP"
}
```

#### Login (Authenticate)

```bash
curl -X POST http://localhost:3000/api/users/login \
  -H "Content-Type: application/json" \
  -d '{"userId": "alice"}'
```

**Response**:
```json
{
  "success": true,
  "message": "Authentication successful",
  "userId": "alice",
  "mspId": "Org1MSP",
  "channel": "mychannel",
  "timestamp": "2024-01-15T10:35:00.000Z"
}
```

#### List All Users

```bash
curl http://localhost:3000/api/users
```

**Response**:
```json
{
  "success": true,
  "users": ["admin", "alice", "bob", "user5"],
  "count": 4
}
```

#### Get User Details

```bash
curl http://localhost:3000/api/users/alice
```

**Response**:
```json
{
  "success": true,
  "user": {
    "label": "alice",
    "mspId": "Org1MSP",
    "type": "X.509",
    "exists": true
  }
}
```

#### Query Ledger

```bash
curl http://localhost:3000/api/ledger/query?function=GetAllAssets \
  -H "x-user-id: alice"
```

**Response**:
```json
{
  "success": true,
  "function": "GetAllAssets",
  "data": [
    {
      "ID": "asset1",
      "Color": "blue",
      "Size": 5,
      "Owner": "Tomoko",
      "AppraisedValue": 300
    }
  ]
}
```

#### Invoke Transaction

```bash
curl -X POST http://localhost:3000/api/ledger/invoke \
  -H "Content-Type: application/json" \
  -H "x-user-id: alice" \
  -d '{
    "function": "CreateAsset",
    "args": ["asset7", "green", "10", "Alice", "500"]
  }'
```

**Response**:
```json
{
  "success": true,
  "message": "Transaction submitted successfully",
  "function": "CreateAsset",
  "result": "asset7 created"
}
```

---

## API Reference

### Base URL
```
http://localhost:3000/api
```

### Authentication
Most endpoints require a user ID:
- **Header**: `x-user-id: <username>`

### Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/health` | Health check | No |
| POST | `/admin/enroll` | Enroll CA admin | No |
| POST | `/users/register` | Register new user | No (requires admin enrolled) |
| POST | `/users/login` | Authenticate user | No |
| GET | `/users` | List all users | No |
| GET | `/users/:userId` | Get user details | No |
| GET | `/ledger/query` | Query chaincode | Yes (x-user-id) |
| POST | `/ledger/invoke` | Invoke transaction | Yes (x-user-id) |

### Error Responses

All errors follow this format:

```json
{
  "success": false,
  "error": "Error message describing what went wrong"
}
```

### Transaction Flow

**Query (Read-Only)**:
```
User → Gateway → Peer → Chaincode → World State → Return Results
```
- No endorsement required
- No ledger update
- Fast and efficient

**Invoke (State-Changing)**:
```
User → Gateway → Peer(s) → Chaincode → Endorsement
  → Orderer → Consensus → Commit to Ledger → Notify User
```
- Requires endorsement
- Updates world state
- Creates new block
- Slower but secure

---

## Security


### Future Security Enhancements

1. **Hardware Security Module (HSM)**: Store private keys in hardware
2. **Encrypted Wallet**: Encrypt wallet files at rest
3. **JWT Tokens**: Session management for API
4. **Rate Limiting**: Prevent abuse of API endpoints
5. **Role-Based Access Control (RBAC)**: Fine-grained permissions
6. **Audit Logging**: Immutable audit trail on blockchain

---
### Network Reset

If things are broken, reset everything:

```bash
# 1. Stop and clean Fabric network
cd ~/hyperledger/fabric-samples/test-network
./network.sh down
docker system prune -f

# 2. Remove wallet
cd ~/hyperledger-auth-project
rm -rf wallet/

# 3. Restart network
cd ~/hyperledger/fabric-samples/test-network
./network.sh up -ca
./network.sh createChannel -c mychannel
./network.sh deployCC -ccn basic -ccp ../asset-transfer-basic/chaincode-javascript -ccl javascript

# 4. Re-enroll admin
cd ~/hyperledger-auth-project
node src/enrollAdmin.js
```

---
### Test Script

Run the automated API test suite:

```bash
bash scripts/test-api.sh
```

**Sample Test Results:**

```
==========================================
  API Test Suite                         
==========================================

Test 1: Health Check
Request: GET /api/health
Response:
{
  "status": "healthy",
  "timestamp": "2025-11-29T07:57:52.086Z",
  "fabric": {
    "ca": "ca-org1",
    "channel": "mychannel",
    "mspId": "Org1MSP"
  }
}

Test 2: Enroll Admin
Request: POST /api/admin/enroll
Response:
{
  "success": true,
  "message": "Admin already enrolled"
}

Test 3: Register User (testuser_1764403071)
Request: POST /api/users/register
Payload: {"userId": "testuser_1764403071"}
Response:
{
  "success": true,
  "message": "User registered successfully",
  "userId": "testuser_1764403071",
  "mspId": "Org1MSP"
}

Test 4: Login
Request: POST /api/users/login
Payload: {"userId": "testuser_1764403071"}
Response:
{
  "success": true,
  "message": "Authentication successful",
  "userId": "testuser_1764403071",
  "mspId": "Org1MSP",
  "channel": "mychannel",
  "timestamp": "2025-11-29T07:57:52.689Z"
}

Test 5: List All Users
Request: GET /api/users
Response:
{
  "success": true,
  "count": 7,
  "users": [
    "admin",
    "testuser_1764361952",
    "testuser_1764364692",
    "testuser_1764403071",
    "user5",
    "user7",
    "user9"
  ]
}

Tests Complete!
```

---

## Summary

This project provides a **production-ready authentication system** for Hyperledger Fabric that:

1. Uses **X.509 certificates** for cryptographic identity
2. Integrates with **Fabric CA** for user management
3. Provides **CLI scripts** for easy testing
4. Offers a **REST API** for application integration
5. Implements **security best practices**
6. Includes **comprehensive logging** and error handling

