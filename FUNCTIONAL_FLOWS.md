# Functional Flows

## 1. Network Setup Flow
```
┌─────────────────────────────────────────────────────────────────┐
│                    ./network.sh up -ca                          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ Starts Docker Containers:                                       │
│   • ca_org1 (Certificate Authority for Org1)                    │
│   • ca_org2 (Certificate Authority for Org2)                    │
│   • peer0.org1.example.com                                      │
│   • peer0.org2.example.com                                      │
│   • orderer.example.com                                         │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ CA Bootstraps with:                                             │
│   • Admin credentials (admin/adminpw)                           │
│   • TLS certificates                                            │
│   • Root CA certificate                                         │
└─────────────────────────────────────────────────────────────────┘
```

## 2. Admin Enrollment Flow
```
┌─────────────────────────────────────────────────────────────────┐
│                    node src/enrollAdmin.js                      │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ Step 1: Check wallet                                            │
│         wallet.js → identityExists('admin')                     │
│         If exists → Skip enrollment                             │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ Step 2: Connect to CA                                           │
│         caClient.js → getCAClient()                             │
│           └→ Read TLS certificate                               │
│           └→ Create FabricCAServices client                     │
│           └→ Connect to https://localhost:7054                  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ Step 3: Enroll with CA                                          │
│         caClient.js → enroll('admin', 'adminpw')                │
│           └→ Send enrollment request to CA                      │
│           └→ CA verifies credentials                            │
│           └→ CA generates & signs X.509 certificate             │
│           └→ Returns: { certificate, privateKey }               │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ Step 4: Store in Wallet                                         │
│         wallet.js → putIdentity('admin', x509Identity)          │
│         Saves to: wallet/admin.id                               │
│         Contains: { certificate, privateKey, mspId }            │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ Result: Admin identity ready                                    │
│         Can now register new users                              │
└─────────────────────────────────────────────────────────────────┘
```

## 3. User Registration Flow
```
┌─────────────────────────────────────────────────────────────────┐
│                node src/registerUser.js user1                   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ Step 1: Check if user exists in wallet                          │
│         wallet.js → identityExists('user1')                     │
│         If exists → Skip registration                           │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ Step 2: Load admin identity                                     │
│         wallet.js → getIdentity('admin')                        │
│         Returns admin's { certificate, privateKey, mspId }      │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ Step 3: Build admin User object                                 │
│         caClient.js → buildUserFromIdentity(adminIdentity)      │
│           └→ Import privateKey into cryptoSuite                 │
│           └→ Create User object with signing capability         │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ Step 4: Register user with CA                                   │
│         caClient.js → registerUser('user1', adminUser)          │
│           └→ Admin signs registration request                   │
│           └→ CA verifies admin's authority                      │
│           └→ CA creates user entry                              │
│           └→ Returns: enrollmentSecret (one-time password)      │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ Step 5: Enroll user                                             │
│         caClient.js → enroll('user1', secret)                   │
│           └→ User authenticates with secret                     │
│           └→ CA generates X.509 certificate for user            │
│           └→ Returns: { certificate, privateKey }               │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ Step 6: Store in Wallet                                         │
│         wallet.js → putIdentity('user1', x509Identity)          │
│         Saves to: wallet/user1.id                               │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ Result: User registered & enrolled                              │
│         Can now authenticate to network                         │
└─────────────────────────────────────────────────────────────────┘
```

## 4. Complete System Flow (Big Picture)
```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  Fabric CA      │     │    Wallet       │     │  Fabric Peer    │
│  (ca_org1)      │     │  (File System)  │     │  (peer0.org1)   │
└────────┬────────┘     └────────┬────────┘     └────────┬────────┘
         │                       │                       │
         │   1. Enroll Admin     │                       │
         │◄──────────────────────│                       │
         │   Return: cert + key  │                       │
         │──────────────────────►│                       │
         │                       │  Store admin.id       │
         │                       │──────────┐            │
         │                       │◄─────────┘            │
         │                       │                       │
         │   2. Register User    │                       │
         │◄──────────────────────│                       │
         │   (signed by admin)   │                       │
         │   Return: secret      │                       │
         │──────────────────────►│                       │
         │                       │                       │
         │   3. Enroll User      │                       │
         │◄──────────────────────│                       │
         │   Return: cert + key  │                       │
         │──────────────────────►│                       │
         │                       │  Store user1.id       │
         │                       │──────────┐            │
         │                       │◄─────────┘            │
         │                       │                       │
         │                       │   4. Authenticate     │
         │                       │──────────────────────►│
         │                       │   (user's cert)       │
         │                       │                       │
         │                       │   Verify & Connect    │
         │                       │◄──────────────────────│
         │                       │                       │
```

## 5. Visual Authentication Flow
```
┌─────────────────────────────────────────────────────────────────┐
│                    node src/authenticate.js user7               │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ Step 1: Check if user exists in wallet                          │
│         wallet.js → identityExists('user7')                     │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ Step 2: Load credentials from wallet                            │
│         wallet.js → getIdentity('user7')                        │
│         Returns: { certificate, privateKey, mspId }             │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ Step 3: Connect to Fabric Network                               │
│         gateway.js → authenticate('user7')                      │
│           └→ Build connection profile (TLS certs)               │
│           └→ Create Gateway                                     │
│           └→ Connect using user's certificate                   │
│           └→ Access channel 'mychannel'                         │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ Result: Connection successful = User Authenticated              │
│         (Peer validated the certificate)                        │
└─────────────────────────────────────────────────────────────────┘
```
