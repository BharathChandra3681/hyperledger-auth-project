Intern Assignment: Hyperledger Fabric – User Registration & Authentication
Objective
Implement a simple registration and authentication flow for users in a Hyperledger Fabric network using the Fabric CA (Certificate Authority). The goal is to understand how identities are issued and how authentication works in Hyperledger.

Tasks
Set up the Environment
Install Hyperledger Fabric binaries and Docker images.
Start a basic test network using fabric-samples/test-network.
Work with Fabric CA
Start the Fabric CA server.
Use the Fabric CA client (fabric-ca-client) to: 
Enroll the CA admin.
Register a new user (e.g., user1).
Enroll the new user to generate certificates and keys.
Store User Credentials
Save the generated certificates and keys for the registered user in a wallet (file system or database).
Implement Authentication
Write a simple Node.js/Go/Java/Python app that: 
Loads user credentials from the wallet.
Connects to the Fabric gateway using the identity.
Verifies successful authentication by querying the ledger (can just call mychannel → qscc or chaincode).
Deliverables
A step-by-step guide (README.md) of the setup and registration/authentication process.
Source code of the small app (for authentication test).
Screenshots/logs of successful: 
User registration
User enrollment
Authentication (ledger query)
Bonus (Optional)
Implement a simple login API (Node.js/Express or Flask) where: 
New users can be registered (via CA).
Existing users can log in by using their certificate.

