---
title: TOKEN-VERIFICATION
name: Tokenization Verification Engine Standard
status: draft
category: Best Current Practice
contributors: Jimmy Debe <@jimstir>

---

## Abstract

This document defines a standardized framework for representing, verifying, and enforcing claims associated with tokenized securities and other tokenized real-world assets on-chain.

The standard focuses more on the consumer interacting with asset on-chain. There need to be a universal standard for verifying information about the tokenized asset. Issuers may be providing publicly available information but each entity has their own process and tokenization format with off-chain claims, time-limited attestations, custodians, brokers, transfer agents, or other trusted entities. These should to be identified and veified on-chain for independent auditing.

## Motivation

TAVS defines a common model for:

1. identifying the underlying asset;
2. representing the rights associated with the token;
3. identifying the parties responsible for relevant claims;
4. producing time-bounded attestations for off-chain facts;
5. reconciling verified underlying assets against token supply;
6. exposing verification evidence through a standardized interface;
7. representing verification failures as explicit on-chain states; and
8. applying predefined on-chain consequences when required guarantees become stale, revoked, inconsistent, or unavailable.

The goal is not to establish absolute truth about an off-chain asset. Instead, the specification establishes an on-chain defined and auditable structure interface that will improve the trust associated with tokenized assets. 

This is achieved through a public interface and attestation registry all on-chain. The interface will define values for participants eligibility, participants classifications(e.g. allowed amounts, jurdisdiction rules),

**guarantee boundary**: what is being claimed, who is responsible for the claim, when the claim was verified, how long the verification remains valid, and what happens when the guarantee is no longer valid.

Tokenized securities may represent the same underlying security while using substantially different architectures. For example, two different platform can present offer the same NVIDIA Corporation common stock but use different blockchains, custodians, smart contracts designs, attesstation providers, oracle systems, and legal structures.

Consequently, the existence of an on-chain token and the publication of supporting information do not by themselves establish that the token currently has the characteristics a user expects.

A token contract can prove on-chain that a token exists on-chain, a particular amount is outstanding, a particular attestation was signed, a particular contract is currently configured in a certain way and particular events occurred on-chain. It cannot directly prove an off-chain fact such as the current amount of common stock is in the tokenized securites entity holds. That is why all tokenized product require off-chain evidence to remain valid.

TAVS therefore separates **on-chain verification** from **off-chain attestation** and defines how the two interact.


The goals of this specification are to:

1. Provide a standardized representation of tokenized-asset claims.
2. Create verification profiles and attestation profiles: tokenized-security verification, Custodian-backed verification, Multi-attestor verification, Issuer-sponsored security verification, etc
3. Identify the party responsible for establishing each off-chain claim.
4. Asstesttion are public auditable, or auditable by approve persons.
5. Legal documents related to the tokenization custody operations and/or the custody entity should be attessted by the enitty, hashed and signed. hash should be presented on chain.
5. Time based attestations, validity periods, etc
5. Allow users to independently inspect the evidence supporting an asset.
6. Participant identity information should be private with approve audit keys(EthSystems)
8. Represent verification failures through explicit on-chain states.
10. Preserve historical verification and attestation information.
11. Distinguish economic exposure from actual ownership and other legal rights.


Instead, the specification defines which attestors are recognized for particular claims and what guarantees their attestations provide.

## Specification

The standard consist of a core registry for active requirements, participant eligibility and classification. Issuer and custody attestations. 

### Attestation Registry

The attestation has a few registry Profiles, that the verification interface can access if they were registered in the registry.
The recommended defined role profiles to support tokenized assets verification discussed in this document will be entity profile, participant profile, and asset profile.
Each profile needs an on chain identity that identifies its profile.

The attestation registry MUST define profiles for each role in the system.
Every profile acting within the ecosystem MUST have an on-chain identity.
This identity will be used for all attestations and verification processes.
The RECOMMENDED defined profiles are `ENTITY`, `PARTICIPANT`,
and `ASSET`.

#### Attestation Merkle Tree

To support privacy-preserving verification for `PARTICIPANT` profiles, the attestation registry SHOULD support an Attestation Tree, which is a merkle tree of attestations which is adopted from [EthSystem's Attested Shielded Pool](https://github.com/ethsystems/specs/blob/main/specs/3/README.md).

When an attestation is issued by a profile,
the registry MUST compute the attestation leaf on-chain rather than accepting a precomputed leaf.
By enforcing on-chain computation, the registry mathematically guarantees that the underlying data strictly adheres to verification engine defined rules.
The attestation leaf SHOULD bind the following parameters:

- The participant's shielded spending key (`owner_pubkey`).
- The attester address.
- The validity window (issued_at and expires_at).
- The specific profile attributes (e.g., eligibility, classification, jurisdiction limits) required by the Verification Engine.

Upon leaf computation, the registry inserts the leaf into the Merkle tree and
updates the public Merkle Root.
Consistent with [EthSystem's Attested Shielded Pool](https://github.com/ethsystems/specs/blob/main/specs/3/README.md),
the registry MUST emit an event carrying the leaf,
the subject key hash, the attester, and the validity window.
This allows participants to index the tree off-chain and
compute the exact Merkle inclusion paths necessary for generating valid Zero-Knowledge (ZK) proofs.


### Asset Registration

Before an Asset is considered compliant with TAVS, the implementation MUST register the following information:

```text
assetId
underlyingAssetIdentifier
assetName
issuer
tokenContract
representationRatio
rightsProfile
attestorRegistry
verificationPolicy
```

#### Underlying Asset identifier

The implementation MUST create an on-chain identifier for the underlying asset that correndsponds to off-chain researces/ information held by the issuer/custodian.

The identifier SHOULD NOT rely exclusively on token symbol, token name, blockchain address,or issuer-selected ticker. For example, two unrelated tokens MUST NOT be considered equivalent merely because both use the symbol `NVDA`.

#### Representation Ratio

The implementation SHOULD specify the relationship between token units and underlying units.
Example:

```text
1 token = 1 underlying share
```

####  Rights Profile interface

The implementation SHOULD expose the real world rights associated with the Tokenized Asset ownership. At minimum, the rights profile SHOULD identify:

```text
votingRights
dividendRights
redemptionRights
corporateActionRights
ownershipRights
economicExposure
```

A right that does not exist MUST NOT be represented as available.

Changes to token-holder rights MUST be recorded.
An implementation MUST NOT silently change:
without creating an auditable state transition.
The verification interface MUST expose the current rights and SHOULD expose historical rights.

#### Entity Legal Actions

The implementation SHOULD expose the relevant parties and
legal structure through attestations, 
so that users can understand where claims ultimately reside.

#### Entity Profile Decentralized Identity

To verify the association, the entity profile should create a public signing key. This can be done by using a DID, decentralized identifiers,and verification process.
Dencentralized identity is a ties an entity to a real world resource. This is neccassary to allow the verifier to know that the entity is established in the real world. 
Decentralized Identity registration flow in the attestation registry.
1. Entity creates DID
2. DID Document contains
   - DID
   - verification method
   - public key
   - domain service
3. Entity publishes DID binding on its authoritative domain 
4. Entity registers DID/domain reference on-chain
5. Entity signs attestations with the DID verification key
6. Verifier receives attestation

### Participant Eligibility

An implementation MAY represent eligibility through an on-chain attestation or zero-knowledge proof.
A participant's eligibility status MUST NOT expose unnecessary underlying identity information.

### Attestation Framework

The verification engine adopts the proposed attestation schema established by [EthSystem's Attested Shielded Pool](https://github.com/ethsystems/specs/blob/main/specs/3/README.md). 
Regardless of the profile type (Entity, Participant, or Asset) or
the privacy mode being used,
every attestation MUST implement the following attributes:

1. Subject Identifier: The cryptographic identity of the actor or asset the attestation applies to.
The format of this identifier depends on the profile:
- For Entities: A Decentralized Identifier (DID) and/or public on-chain address.
- For Assets: A unique `assetId` derived from the smart contract and underlying asset.
- For Participants (Shielded): A cryptographic hash of their Shielded Spending Key (e.g., `owner_pubkey`).
2. Attester: The on-chain address of the authorized compliance provider, auditor,
or issuer who verified the off-chain facts and
cryptographically signed the attestation.
3. Validity Window: The strictly defined timeframe (issued_at and expires_at) during which the attestation is considered legally or procedurally valid.
4. Attestation Type: A standardized identifier (e.g., PARTICIPANT_ELIGIBLE, CUSTODY_VERIFIED) defining exactly what claim or rule the attestation is verifying.
5. Evidence Commitment: A cryptographic hash (evidenceHash) of the underlying off-chain documentation (such as a KYC report or legal contract). This ensures the underlying evidence can be audited off-chain without exposing private data on the public ledger.
6. Revocation Status: A standardized status indicating if the attestation is active, expired, or explicitly revoked by the Attester (e.g., due to a sanctions match or expired legal agreement).

The Verification Engine extends this structure to support the complex requirements of tokenized real-world assets.

A claim concerning an off-chain fact MUST identify the entity responsible for establishing that fact.

The issuer SHOULD NOT be treated as the sole source of evidence for claims where the verification policy requires an independent Attestor.

#### Profile Definitions

The Verification Engine relies on the interplay of these profiles to map critical relationships (e.g., binding an Asset Profile to an Entity Profile to establish the authorized issuer)

Participant Profile:
The participant uses a Shielded Spending Key to generate ZK proofs.
The participant also has a Viewing Key.
If an auditor or regulator needs to see the private participant's identity or transaction history, the participant selectively shares the Viewing Key with them. The auditor can now decrypt and verify the data, but because they don't have the Spending Key, they cannot steal funds or act on the participant's behalf.



#### Attestor Registry

The implementation MUST maintain a registry containing recognized Attestors.

Each Attestor record SHOULD include:

```text
attestor
attestationTypes
authorizationStatus
validFrom
validUntil
revoked
```

The specific mechanism by which an entity becomes an authorized Attestor is outside the scope of the base technical specification.

## 11.3 Attestation Structure

An Attestation SHOULD contain at least:

```solidity
struct Attestation {
    bytes32 assetId;
    address attestor;

    uint256 quantity;
    uint256 attestedAt;
    uint256 validUntil;

    bytes32 evidenceHash;

    bytes32 subjectIdentifier;

    bool revoked;

    bytes signature;
}
```

The final implementation MAY use a different encoding provided that equivalent information is available.

# 12. Time-Bounded Verification

An Attestation MUST have a validity period.
An implementation MUST NOT treat an expired Attestation as current evidence.
At minimum:

```text
attestedAt < validUntil
```

MUST hold for a valid Attestation.

After:

```text
block.timestamp > validUntil
```

the Attestation MUST be considered stale unless replaced or renewed according to the verification policy.
This requirement exists because an Attestation represents a statement about an external state at a particular point in time, not an indefinite guarantee.

#### Attestation History

A compliant implementation SHOULD preserve historical verification information.

The history SHOULD include:

* previous Attestations;
* Attestation revocations;
* backing quantities;
* token supply;
* verification-state changes;
* issuer changes;
* custodian changes;
* rights changes;
* contract upgrades;
* pauses;
* corporate actions.

Historical records SHOULD be append-only. 
This allows a verifier to reconstruct the verification state of an Asset at a previous point in time.

An issuer can use the entity profile.
This SHOULD identify the entity responsible for issuing or sponsoring the Tokenized Asset.
This should be represented by an address that is also confirm on a public domain owned/affiliate of issuing/custodain entity. 
Where the underlying issuer's authorization is required, the implementation MUST provide a mechanism to record:
Mechanism for unauthorized tokenization include tokens minted with out the proper attestation commited on-chain.

# 13. Revocation

Attestors MUST have a mechanism to revoke an Attestation where the asserted fact is no longer valid or the Attestor determines that the Attestation should no longer be relied upon.
A revoked Attestation MUST NOT satisfy a verification requirement.
This is done by an entity profile attestation.
Revocation SHOULD record:

```text
attestationId
revokedAt
revocationReason
revokedBy
```

The revocation reason MAY be privacy-preserving or represented by a standardized reason code.

## Minting and Burning

### Minting

Minting MUST NOT increase token supply beyond the quantity permitted by the entity profile that is assigned to minting and burn tasks.
A mint operation SHOULD reference the Attestation supporting the corresponding increase in backing.

###  Burning

Burning MUST decrease token supply.
Implementations SHOULD record the relationship between the token burn and the corresponding change in the underlying custody position where that information is available.

#### Attestation Profiles Linking

Every externally sourced verification claim by an attestation profile SHOULD contain a reference to its supporting evidence.
This MAY be:

* a document hash;
* a URI;
* an API response hash;
* an on-chain record;
* a signed data object;
* another content-addressed reference.
The implementation SHOULD allow a verifier to determine:

## Verification Structure

Every registered Tokenized Asset MUST have a current Verification State.

The base states are:

```solidity
enum VerificationState {
    UNVERIFIED,
    VERIFIED,
    STALE,
    UNDERBACKED,
    REVOKED,
    RECONCILIATION_FAILURE
}
```

### UNVERIFIED

The required evidence does not currently establish the Asset's required claims.

Examples:

* no Attestation;
* unauthorized Attestor;
* missing required evidence.

### VERIFIED

All required evidence is valid and current.

The Asset satisfies its declared verification policy.

### STALE

Required evidence existed but is no longer within its permitted validity period.

### UNDERBACKED

The verified quantity of underlying assets is less than the required token supply.

### REVOKED

A required Attestation has been explicitly revoked.

### RECONCILIATION_FAILURE

Required data sources disagree or
the implementation cannot establish the required relationship between the underlying Asset 
and token supply.

# 18. State Transitions

The implementation MUST define deterministic transitions between Verification States.

Example:

```text
                    valid attestation
               ┌──────────────────────┐
               │                      ▼
        UNVERIFIED ─────────────── VERIFIED
             ▲                         │
             │                         │ expires
             │                         ▼
             │                       STALE
             │                         │
             │                         │ renewed
             └─────────────────────────┘

VERIFIED
   │
   │ backing < supply
   ▼
UNDERBACKED

VERIFIED
   │
   │ attestation revoked
   ▼
REVOKED

VERIFIED
   │
   │ conflicting evidence
   ▼
RECONCILIATION_FAILURE
```

The implementation MAY define additional states, but MUST preserve the semantics of the required base states.

# 19. Enforcement

Verification states MUST have defined protocol consequences.
At minimum:

### VERIFIED

Normal protocol operations MAY continue.

### STALE

New issuance SHOULD be disabled unless the implementation's policy explicitly permits otherwise. This disabled SHOULD be an on-chain flag.

### UNDERBACKED

New issuance SHOULD be disabled. 
The implementation SHOULD apply additional restrictions to prevent an increase in the unsupported token position.

### REVOKED

New issuance MUST be disabled.

### UNVERIFIED

The Asset or the entity MUST NOT be represented as verified by a compliant verification profile.

### RECONCILIATION_FAILURE

New issuance MUST be disabled.
The exact treatment of secondary transfers MAY depend on the legal and regulatory structure of the Asset.

It is not REQUIRED that all transfers are revert for every failure state.


## Verification Interface

A compliant implementation MUST expose a machine-readable verification interface.
The interface MUST allow a user or external verifier to determine:

```text
asset identity
token contract
issuer
underlying asset
representation ratio
token supply
verified backing
attestor
attestation timestamp
attestation expiration
attestation status
rights profile
current verification state
verification failure reason
```

An example response:

```json
{
  "asset": {
    "id": "NVDA",
    "identifier": "UNDERLYING-ASSET-ID"
  },
  "token": {
    "contract": "0x...",
    "supply": "1000000"
  },
  "representation": {
    "ratio": "1:1",
    "type": "underlying-security"
  },
  "backing": {
    "verifiedQuantity": "1000000",
    "attestor": "0x...",
    "attestedAt": 1790179200,
    "validUntil": 1790265600,
    "status": "VALID"
  },
  "rights": {
    "voting": true,
    "dividends": true,
    "redemption": true
  },
  "verification": {
    "state": "VERIFIED"
  }
}
```

The interface MUST NOT represent an Asset as fully verified merely because the issuer has published an unsupported assertion.

# 25. Contract Integrity

The verification interface SHOULD expose security-relevant properties of the Tokenized Asset contract.

At minimum:

```text
contract address
implementation address, if upgradeable
upgrade administrator
pause mechanism
mint authority
burn authority
transfer restrictions
```

An implementation SHOULD indicate whether a contract is immutable; upgradeable; paused ;permissioned; ubject to an external administrator.

# 27. Security Considerations

## 27.1 Attestor Compromise

A compromised Attestor may issue false or incorrect Attestations.
This standard does not cryptographically eliminate this risk.
The protocol MUST therefore define:

* recognized Attestors;
* Attestation validity periods;
* revocation;
* emergency states;
* optional multi-attestor requirements.

## 27.2 Stale Evidence

Long-lived Attestations create the risk that a previously correct statement is treated as current.
Implementations SHOULD use short, policy-defined validity periods for high-risk claims.

An Attestation does not guarantee future custody.
The protocol MUST treat backing as a time-dependent property.

## Reference Implementation Requirements

The reference implementation SHOULD contain:

```text
contracts/
    AssetRegistry.sol
    AttestorRegistry.sol
    AttestationRegistry.sol
    VerificationEngine.sol
    TokenizedAsset.sol
    ComplianceStateMachine.sol

test/
    attestation/
    backing/
    reconciliation/
    expiration/
    revocation/
    corporate-actions/
    adversarial/

sdk/
    verifier/

examples/
    nvda/
```

The reference implementation SHOULD provide a command or API that allows a user to obtain a complete verification result for an Asset.

Example:

```text
$ npm run verify -- NVDA
```

Expected output:

```text
TOKENIZED ASSET VERIFICATION

Asset: NVIDIA Corporation
Identifier: XXXXX

Token: 0x123...

Representation: 1:1
Token Supply: 1,000,000

Verified Backing: 1,000,000
Attestor: Authorized Custodian X

Attested: 2026-09-23
Valid Until: 2026-09-24

Voting Rights: YES
Dividend Rights: YES
Redemption: YES

Verification State: VERIFIED
```

## Open Questions

### 32.4 Failure consequences

Which failures should:

* disable minting;
* halt transfers;
* halt trading;
* trigger redemption;
* trigger an emergency procedure?

### 32.8 Recovery

What process returns an Asset from:

```text
STALE
```

or:

```text
UNDERBACKED
```

to:

```text
VERIFIED
```

### Reference Implementation

SDK must support:

Event Indexing and State Management: The SDK MUST be capable of parsing the registry's emitted events, reconstructing the Attestation Merkle Tree locally, and maintaining the current Merkle Root.
ZK Proof Generation: The SDK MUST implement the required cryptographic circuit to generate the Zero-Knowledge Membership Proof off-chain, using the local tree state and the participant's shielded key.
Key Management (Dual-Key Support): The SDK MUST securely manage the participant's dual-key setup. It must allow the user to sign proofs using their Shielded Spending Key while providing a mechanism to securely export or share the Viewing Key with authorized third parties.
Verification Querying: The SDK MUST provide a standardized interface to query the Verification Engine and return a machine-readable compliance status (which you actually already have an example of in the "Verification Interface" section!).

## Copyright

## References
