# Tokenization Assurance Framework (TAF) Reference Implementation Guide

Welcome to the reference implementation of the **Tokenization Assurance Framework (TAF)**. This guide provides comprehensive, step-by-step instructions on compiling, deploying, and executing the smart contract suite and interactive CLI across all protocol actors.

---

## Table of Contents
1. [Architecture & Components](#architecture--components)
2. [Environment Setup & Testing](#environment-setup--testing)
3. [Actor-Specific Operational Guides](#actor-specific-operational-guides)
   - [Actor 1: The Entity / Attestor (Custodian, Auditor, KYC Provider)](#actor-1-the-entity--attestor)
   - [Actor 2: The Asset Issuer (Tokenized Product Entity)](#actor-2-the-asset-issuer)
   - [Actor 3: The Participant (Investor / Tokenholder)](#actor-3-the-participant)
   - [Actor 4: The Verifier / Public / DeFi Integrator](#actor-4-the-verifier--public--defi-integrator)
4. [End-to-End Operational Lifecycle Scenarios](#end-to-end-operational-lifecycle-scenarios)
   - [Scenario A: Asset Tokenization & Full Verification](#scenario-a-asset-tokenization--full-verification)
   - [Scenario B: Participant Onboarding & Asset Approval](#scenario-b-participant-onboarding--asset-approval)
   - [Scenario C: Shielded Compliance & Auditor Authorization](#scenario-c-shielded-compliance--auditor-authorization)
   - [Scenario D: Time Expiration & Dynamic Gasless STALE State](#scenario-d-time-expiration--dynamic-gasless-stale-state)
   - [Scenario E: Attestation Revocation, Policy Enforcement & Reinstatement](#scenario-e-attestation-revocation-policy-enforcement--reinstatement)

---

## Architecture & Components

The reference implementation is composed of five core smart contracts:

1. **`ProfileRegistry.sol`**: Manages on-chain identities for `ENTITY` (issuers, auditors), `ASSET` (tokenized products), and `PARTICIPANT` (investors) profiles, supporting both transparent and shielded visibility flags.
2. **`AttestationRegistry.sol`**: Stores compliance claims, computes deterministic attestation identifiers, generates relational tagging maps (`subjectIdentifier` $\rightarrow$ `attestationType` $\rightarrow$ `attestor`), and handles access-controlled revocations.
3. **`AttestationMerkleTree.sol`**: Implements an incremental Merkle tree based on EthSystems Spec 3 with `Poseidon4` leaf hashing (`owner_pubkey`, `attester`, `issued_at`, `expires_at`) and a 50-root ring buffer to eliminate concurrency front-running reverts.
4. **`ZKVerifier.sol`**: Verifies `proofOfAudit` calldata bindings (ensuring callers match authorized auditors and participants) and Zero-Knowledge membership proofs.
5. **`VerificationEngine.sol`**: Evaluates verification policies, checks mandatory rights and custody reserves against representation ratios, dynamically derives `STALE` states when timestamps lapse (with zero transaction overhead), and computes the active `VerificationState`.
6. **`TokenizedAsset.sol`**: A reference tokenized asset contract with attestation-linked `mint`/`burn` operations and discoverable governance properties.

---

## Environment Setup & Testing

### 1. Installation & Compilation
From the `reference/` directory, install dependencies and compile the contracts:

```bash
# Install dependencies
npm install

# Compile contracts and generate TypeScript typings
npm run compile
```

### 2. Running Automated Tests
Run the comprehensive test suite covering all profiles, Merkle tree insertions, proof of audit verifications, representation ratio checks, and state transitions:

```bash
npm test
```

Expected output:
```text
  AttestationMerkleTree
    ✔ should compute Poseidon4 leaf and update root upon insertion
    ✔ should enforce ring buffer history across 5 insertions
    ✔ should revert if non-registry address attempts to insert leaf

  AttestationRegistry
    ✔ should allow registered entity to submit an attestation and index it in the tagging map
    ✔ should reject attestation submission from an unregistered address
    ✔ should allow the issuing attestor to revoke an attestation
    ✔ should allow an authorized delegate to revoke an attestation
    ✔ should revert if an unauthorized party tries to revoke an attestation

  ProfileRegistry
    ✔ should allow an entity to register with DID and legal document hash
    ✔ should prevent double registration of the same entity
    ✔ should allow an asset to be registered by a verified issuer entity
    ✔ should reject asset registration if the issuer is not a registered entity
    ✔ should register a participant with transparent visibility
    ✔ should register a shielded participant with Baby Jubjub key hash

  Proof of Audit & Shielded Attestations
    ✔ should accept valid proofOfAudit, bind auditor, and insert leaf into Merkle tree
    ✔ should revert if an unauthorized front-runner attempts to use the auditor's proof
    ✔ should revert if the proof does not match the target owner_pubkey

  VerificationEngine (State Machine & Policy Evaluation)
    ✔ should evaluate state as UNVERIFIED upon initial asset registration without attestations
    ✔ should transition to VERIFIED when valid custody and legal rights attestations are attached
    ✔ should transition to UNVERIFIED if token supply exceeds verified custody reserves (underbacked)
    ✔ should dynamically resolve to STALE when timestamp expires without requiring a transaction
    ✔ should transition to REVOKED when an authorized entity revokes a mandatory attestation

  22 passing
```

---

## Actor-Specific Operational Guides

To run interactive CLI commands, open two terminal windows:

### Terminal 1: Start Local EVM Node
```bash
npm run node
```

### Terminal 2: Execute Actor Actions
You can seed the preconfigured NVIDIA Corporation tokenized asset demo at any time:
```bash
npm run seed:nvda
```

---

### Actor 1: The Entity / Attestor

Entities represent institutions such as **Auditors**, **Custodians**, **Transfer Agents**, and **KYC Providers**.

#### 1. Register an Entity Profile
An entity registers their controlling wallet, off-chain W3C DID, visibility preference, and legal document hash:
```bash
npm run taf -- entity:register --did "did:web:deloitte.com"
```
*Options:*
* `--did <string>`: W3C Decentralized Identifier or domain reference.
* `--shielded`: (Optional) Flags the entity profile for shielded privacy.

#### 2. Submit a Transparent Attestation
An authorized entity submits a signed compliance claim (e.g., verified custody reserves or legal rights):
```bash
npm run taf -- attest:transparent \
  --subject "NVDA-TOKEN" \
  --type "CUSTODY_RESERVES" \
  --amount 1000000 \
  --validity 2592000
```
*Parameters:*
* `--subject`: Identifier of the target asset or entity.
* `--type`: Cryptographic claim type (e.g., `CUSTODY_RESERVES`, `REDEMPTION_RIGHT`, `KYC_APPROVED`).
* `--amount`: (Optional) Numerical quantity encoded in `resultData` (e.g., verified share reserves).
* `--validity`: Validity window in seconds from current timestamp (e.g., `2592000` = 30 days).

#### 3. Audit a Shielded Participant
When auditing a shielded participant, the entity receives the participant's **Viewing Key** off-chain, constructs a `proofOfAudit` bound to their caller address and the participant's `owner_pubkey`, and submits the transaction:
```bash
npm run taf -- attest:shielded \
  --pubkey 98765432109876543210 \
  --type "ACCREDITED_INVESTOR" \
  --validity 31536000
```
*Effect:* The contract validates the proof in calldata, computes `Poseidon4(owner_pubkey, msg.sender, issuedAt, expiresAt)`, inserts the leaf into `AttestationMerkleTree`, and advances the root without exposing the participant's private identity.

#### 4. Revoke an Attestation
If an audit fails, custody collateral drops, or a license is cancelled, the issuing attestor revokes the attestation:
```bash
npm run taf -- attest:revoke --id <ATTESTATION_ID>
```
*Security:* Only the issuing `attestor` (or their explicitly approved delegate) has the authority to revoke this record.

---

### Actor 2: The Asset Issuer

The Issuer is the corporate entity responsible for deploying the tokenized product and registering its real-world legal connection.

#### 1. Register as an Issuer Entity
```bash
npm run taf -- entity:register --did "did:web:superstate.co"
```

#### 2. Register an `ASSET` Profile
The issuer registers the asset profile in `ProfileRegistry`, linking:
* `AssetId`: `assetId`, `chainId`, `issuer` address, and `tokenContract` address.
* `AssetMetadata`: `representationRatio` (e.g. 1:1, 1:10), linked custody attestation IDs, and core legal rights IDs (`redemptionRightAttestationId`, `insolvencyProtection`, `nativeOwnership`).

#### 3. Execute Minting / Burning with Attestation References
When minting new tokens upon receipt of investor collateral:
```typescript
// TokenizedAsset.sol
token.mint(recipientAddress, 1000000, custodyAttestationId);
```
*Policy Check:* The contract queries `VerificationEngine.evaluateVerificationState(assetId)`. If the asset is currently in a `REVOKED` state, the mint transaction automatically reverts!

---

### Actor 3: The Participant

Participants represent investors, fund managers, and retail tokenholders.

#### 1. Register as a Transparent Participant
For standard public wallet users:
```bash
npm run taf -- participant:register --jurisdiction "US"
```

#### 2. Register as a Shielded Participant
For privacy-preserving users utilizing the dual-key architecture:
* **Shielded Spending Key (`owner_pubkey`):** Derived over the Baby Jubjub curve; held private in the user's wallet.
* **Viewing Key:** Shared with authorized auditors.
```bash
npm run taf -- participant:register --shielded 98765432109876543210 --jurisdiction "CH"
```

#### 3. Get Approved by an Entity for an Asset
1. The participant submits identity documents off-chain to an authorized KYC Entity.
2. The entity verifies credentials and submits an attestation referencing the participant's address (transparent) or `owner_pubkey` (shielded).
3. The participant is now cleared to receive and hold tokenized shares.

---

### Actor 4: The Verifier / Public / DeFi Integrator

Any third party, investor, decentralized exchange, or smart contract can independently audit compliance in real time.

#### 1. Generate Complete Tokenization Assurance Report
Query the `VerificationEngine` for any registered asset:
```bash
npm run taf -- verify --asset 0x4e5644412d53544f434b2d323032360000000000000000000000000000000000
```
*(If `--asset` is omitted, the CLI automatically loads the seeded demo asset).*

Output:
```text
===================================================
          TOKENIZATION ASSURANCE REPORT            
===================================================
Asset ID:           0x4e5644412d53544f434b2d323032360000000000000000000000000000000000
Token Contract:     0x71C95911E9a5D330f4D621842EC243EE1343292e
Chain ID:           31337 (Local Hardhat)

Issuer Entity:      0x70997970C51812dc3A010C7d01b50e0d17dc79C8 (did:web:nvda-issuer.com)
Representation:     1:1
Token Supply:       1,000,000
Verified Custody:   1,000,000 Units

--- Core Tokenholder Rights ---
Redemption Rights:       YES
Insolvency Protection:   YES
Native Legal Ownership:  YES

===================================================
VERIFICATION STATE:  VERIFIED
===================================================
```

#### 2. Discover Smart Contract Properties
Inspect proxy architecture, implementation logic addresses, upgrade admins, timelocks, and pause statuses:
```bash
npm run taf -- inspect
```

Output:
```text
===================================================
        SMART CONTRACT PROPERTY DISCOVERY          
===================================================
Token Address:           0x71C95911E9a5D330f4D621842EC243EE1343292e
Implementation Address:  0x71C95911E9a5D330f4D621842EC243EE1343292e
Upgrade Admin:           0x70997970C51812dc3A010C7d01b50e0d17dc79C8
Mint Authority:          0x70997970C51812dc3A010C7d01b50e0d17dc79C8
Burn Authority:          0x70997970C51812dc3A010C7d01b50e0d17dc79C8
Is Paused:               NO
Total Supply:            1,000,000
===================================================
```

---

## End-to-End Operational Lifecycle Scenarios

### Scenario A: Asset Tokenization & Full Verification
1. **Issuer Onboarding:** Issuer registers entity profile with corporate DID.
2. **Asset Profile Creation:** Issuer registers `ASSET` record linking token contract. Initial state is **`UNVERIFIED`** (no attestations attached).
3. **Auditor & Custodian Verification:**
   - Qualified Custodian deposits underlying securities in vault and submits `CUSTODY_RESERVES` attestation for 1,000,000 units.
   - Independent Legal Counsel reviews offering prospectus and submits `REDEMPTION_RIGHT` attestation.
4. **State Transition:** The `VerificationEngine` evaluates policy conditions: reserves equal supply and legal rights are active. State deterministically transitions to **`VERIFIED`**.

### Scenario B: Participant Onboarding & Asset Approval
1. **Investor Registration:** Participant registers a profile specifying jurisdiction `US`.
2. **KYC Submission:** Participant passes identity verification with an authorized KYC Entity off-chain.
3. **On-Chain Clearance:** The KYC entity issues an attestation with `attestationType = KYC_APPROVED`.
4. **Asset Interaction:** When the investor purchases tokenized shares, the issuer contract checks the tagging map:
   ```solidity
   bytes32 attId = attestationRegistry.getTaggedAttestationId(investorAddress, KYC_APPROVED, kycEntityAddress);
   require(attestationRegistry.isAttestationValid(attId), "KYC not verified");
   ```

### Scenario C: Shielded Compliance & Auditor Authorization
1. **Key Generation:** Participant generates an off-chain Baby Jubjub keypair (`owner_pubkey` and private spending key).
2. **Viewing Key Sharing:** Participant discloses their read-only Viewing Key to an authorized auditor.
3. **Proof of Audit:** The auditor generates a Zero-Knowledge proof confirming possession of the Viewing Key.
4. **Shielded Submission:** The auditor calls `submitShieldedAttestation` in calldata. The contract binds `msg.sender` and `owner_pubkey` as public inputs, verifies the proof, and inserts the leaf into `AttestationMerkleTree`.
5. **Private Settlement:** The participant transacts privately using ZK membership proofs verified by `ZKVerifier.sol`.

### Scenario D: Time Expiration & Dynamic Gasless STALE State
1. **Active State:** Asset holds a stored state of `VERIFIED` with a 30-day validity window.
2. **Timestamp Elapses:** 31 days pass without a renewed audit.
3. **Zero-Gas Transition:** When any user queries `getVerificationReport()`, the engine detects `block.timestamp > validUntil` and **dynamically returns `STALE` without requiring anyone to spend gas on a transaction**.
4. **Renewal:** Custodian audits the vault and issues a fresh attestation with an updated timestamp. The asset immediately resolves back to **`VERIFIED`**.

### Scenario E: Attestation Revocation, Policy Enforcement & Reinstatement
1. **Deficit Detected:** A custodian discovers an off-chain reserve deficit or discrepancy.
2. **Revocation Flag:** The custodian calls `revokeAttestation(custodyAttestationId)`.
3. **Policy Degradation:** Because custody reserves are a mandatory attribute, the asset drops out of `VERIFIED` to **`UNVERIFIED`** (or **`REVOKED`** if profile-level notice is served).
4. **Enforcement:** Integrating smart contracts calling `evaluateVerificationState()` automatically block new token mints.
5. **Cure & Reinstatement:** The issuer cures the deficit with new deposits. The custodian issues a new, valid attestation. The asset returns to **`VERIFIED`** status.
