---
title: TOKENIZATION-VERIFICATION
name: Tokenization Verification Standard
status: draft
category: Best Current Practice
contributors: Jimmy Debe <@jimstir>

---

## Abstract

This document defines a standardized framework for representing, verifying, and enforcing claims associated with tokenized securities and other tokenized real-world assets on-chain.

The standard focuses more on the consumers of tokenized products. There is a need to have a universal standard for verifying the information accoicated with the different parts of these products. Issuers may be providing publicly available information but each product has different processes, custodians, brokers, transfer agents, tokenization formats with off-chain claims, or other trusted entities. These should to be identified and veified on-chain for independent auditing.

## Motivation

The Tokenized Asset Verification Standard (TAVS) is a tool aimed at protecting the consumer.
Tokenization is a growing space,
with regulation frameworks still being introduced in different juridictions worldwide.
For example, the SEC recently announced a [Request for Comment]() regarding exemptive relief for trading Tokenized NMS Stocks,
which is the type of regulatory gap this standard was created to bridge.
The flexibility of tokenization allows issuers to create different models for their products.
While this flexibility brings the benefits of blockchain to a wider audience,
it also introduces critical vulnerabilities that may be overlooked.

A smart contract can prove how many tokens exist, ensure self custody, and manage access,
but it can not prove the real world state of the physical asset backing it.
Currently token issuers attempt to solve this problem using off-chain legal strucutres 
and attestations linked to the token.
While this demonstrates a desire for transparency, the reality is often opaque.
Most consumers do not understand dense legal documents, nor do they know how to verify relevant information.

Instead, users are forced to trust the issuer's product landing page.
This leaves room for malicious or negligent issuers to bury clever liability waivers in legal documents or
take advantage of the time lag between blockchain execution and real-world settlement.
Furthermore, traditional compliance models force retail users to expose their private financial data on public ledgers just to meet KYC/AML requirements.

### The Need for Independent Verification

The tokenization ecosystem currently suffers from a reliance on self-certification and
fragmented architectures.
Multiple issuers might tokenize the exact same underlying asset (e.g., Apple common stock)
using different legal structures, custodians, and oracle systems.
In many cases, these assets are tokenized by unaffiliated third parties without the underlying issuer's involvement.
An tokenization envirnoment keeps the consumer vunderable.
As regulators start to require secondary markets and
Tokenized Securities Venues to verify that a tokenized asset provides the same rights as traditional venues.
Manual verification becomes difficult to commidate across the industry.
If an exchange or
DeFi protocol wants to list these assets, they need a standardized,
machine-readable way for independent auditors to attest to off-chain facts without relying on the token issuer's marketing materials.
Since the future is on-chain, building the machine-readable infrustruce is important.
To solve these issues, this standard establishes the following core objectives:

- Asset Identification: Standardizing how the underlying real-world asset is identified on-chain.
- Rights Representation: Providing a machine-readable format to define the legal rights and privileges associated with the tokenized asset.
- Entity Accountability: Cryptographically defining which specific attestors are recognized for particular claims, and securely anchoring their on-chain attestations to their verifiable real-world resources. This includes establishing a verifiable cryptographic link between an entity's on-chain signatures and their real-world legal documents.
- Time-Bounded Attestations: Requiring cryptographic, time-limited attestations for off-chain claims to prevent reliance on expired data.
- Supply Backing: Comparing the on-chain token supply against authorized custody attestations to mathematically ensure the asset is not under-collateralized.
- Standardized Evidence Interface: Exposing all verification evidence and attestation metadata through a unified, public smart contract interface.
- Explicit Failure States: Representing verification failures (e.g., data conflicts, under-collateralization) as explicit, machine-readable on-chain states.
- Automated Enforcement: Applying predefined on-chain consequences (such as halting transfers or freezing minting) when required guarantees become stale, revoked, inconsistent, or unavailable.

### Architectural Goals

To achieve the core objectives this standard utilizes a modular architecture.
By separating concerns into distinct, interconnected profile records 
(Asset, Entity, Participant, and Attestation),
the standard can support highly varied models through a single unified interface.
For example, custodian-backed assets, multi-attestor verifications, or
issuer sponsored securities.
This approach ensures that economic exposure is clearly separated from actual legal ownership and specific rights.

Rather than relying on blind trust,
the standard mandates a system of cryptographic evidence.
Legal documents related to custody operations or
the underlying entity are not stored as raw text on-chain.
Instead, they are hashed, signed, and published as time-bounded attestations by the responsible party.
This creates a independently verifiable historical record of all compliance claims and
explicitly captures any verification failures as immediate on-chain state changes.

Finally, the standard encourages participant privacy.
While verification for assets and entities should be publicly auditable,
participant identity information must remain private.
By utilizing zero-knowledge proofs and selective disclosure (such as authorized viewing keys),
the standard allows approved parties to audit the compliance of the tokenized product without exposing retail financial data to the public ledger.

The goal is not to establish absolute truth about an off-chain asset.
Instead, the standard establishes a clearly defined,
auditable on-chain interface that places the relationship between the consumer and
the issuer at center stage.
By forcing the issuer's claims into full public view,
it strips away opaque legal shields and
demands true cryptographic accountability.

Rather than relying on abstract legal concepts,
the standard translates off-chain guarantees into machine-readable format for every tokenized asset.
By mathematically locking these guarantees on-chain, the system explicitly defines:

- What is being claimed;
- Who is legally responsible for the claim;
- When the claim was verified;
- How long the verification remains valid; and
- What happens on-chain when that guarantee is no longer valid.

## Specification

The key words "MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT", "SHOULD", "SHOULD NOT", "RECOMMENDED",  "MAY", and "OPTIONAL" in this document are to be interpreted as described in
[RFC 2119](http://tools.ietf.org/html/rfc2119).

The standard consist of a core attestation registry to will handle the registration of all parties,
expose a verification interface, verification state status and attestation submissions.
The registry is a smart contract that MAY be deployed by any party.
The owner of the contract does not need to be asset issuers,
nor does the contract owner have any authority to update the state of an registered profile record.

### Attestation Registry

There are a few registry profile records that the verification interface will access to complete verification tasks.
The RECOMMENDED profiles defined in a registry is the `ENTITY` profile, `PARTICIPANT` profile, and `ASSET` profile.
An `ATTESTATION` profile record is submitted by either an entity or
participant profile about a specific asset profile.
Each profile MUST have an on chain identity.
This identity will be used for all attestations and verification processes.

#### Visibility Preference

To support both public auditability and zero-knowledge privacy,
the standard SHOULD support two types of visibility preferences.
The `VisibilityPreference` flag attached to an `PARTICIPANT` or
`ENTITY` indicates the interface preference.
It is RECOMMENDED that ENTITY profiles remain public for transparency.
However, an `ENTITY` MAY utilize shielded profiles for specific use cases requiring confidentiality."
Below is the `VisibilityPreference` flag mode:

```solidity
enum VisibilityPreference { TRANSPARENT, SHIELDED }
```

- **TRANSPARENT:** The registry MUST store the profile record, attestations,
and other results in public smart contract storage.
This mode is RECOMMENDED for `ENTITY` and `ASSET` profiles.
- **SHIELDED:** Attestations related to profiles  SHOULD NOT be accesible to the public.
Instead, the registry SHOULD hash the raw inputs into a leaf and
insert it into the public Merkle Tree(For more information see the next section).
This mode is RECOMMENDED for `PARTICIPANT` profiles opting for privacy.

#### Attestation Merkle Tree

To support privacy-preserving verification for `PARTICIPANT` or `ENTITY` profiles,
the attestation registry MAY support an attestation merkle tree.
The merkle tree of attestations presented in this standard is adopted from [EthSystem's Attested Shielded Pool](https://github.com/ethsystems/specs/blob/main/specs/3/README.md).
Although their implementation primarily targets private on-chain payments,
the underlying zero-knowledge mechanics provide a good foundation for the privacy requirements of this standard.

Dual-Key Architecture (Spending vs. Viewing Keys):

In the  SHIELDED participants utilize a dual-key cryptographic pair:

Shielded Spending Key (owner_pubkey): A cryptographic keypair (derived over the Baby Jubjub curve) that grants write and execution authority. The private key is held strictly by the participant and is used to generate Zero-Knowledge Proofs for on-chain transactions. It MUST NEVER be shared with third parties.

Viewing Key: A companion cryptographic key that grants read-only decryption authority. Possessing the Viewing Key allows an external party to inspect the participant's encrypted compliance notes, transaction history, and attestation claims without granting any ability to transfer assets or sign transactions.

A participant MAY selectively disclose their Viewing Key to authorized ENTITY profiles to satisfy legal disclosure requirements while preserving on-chain public privacy.

In the registry,
a `PARTICIPANT` does not register using a blockchain wallet address.
Instead, they generate a separate spending public key, `owner_pubkey`, off-chain.
The spending public key is derived from a newly generated zero-knowledge keypair, 
which utilizes the Baby Jubjub elliptic curve.
This is a twisted Edwards elliptic curve designed specifically for ZK-SNARK circuits and
cryptographic operations, such as EdDSA signatures.

The `PARTICIPANT` MUST provide this `owner_pubkey` to an authorized `ENTITY` off-chain.
An authorized `ENTITY` is defined as a profile with certain flag privileges.
More details on this in the `ENTITY` profile section.
When an authorized entity submits a new attestation to the registry,
the transaction MUST contain the `owner_pubkey` along with the attestation attributes.
The smart contract takes the submitted `owner_pubkey`, the `ENTITY`'s address,
the issued timestamp and the expires timestamp.
These values are hashed together with a ZK hash function, like Poseidon4.
This creates an `AttestationLeaf` that is inserted into the registry's attestation Merkle tree.

The `PARTICIPANT` blockchain wallet is not tied to the `owner_pubkey` on-chain.
So the `PARTICIPANT` MUST create a proof using the private key corresponding to their `owner_pubkey` for each transaction.
This will prove the submitted attestation is authorized for the wallet in use.
The smart contract takes the submitted `owner_pubkey`, the `ENTITY`'s address,
the issued timestamp and the expires timestamp.
These values are hashed together with a ZK hash function, like Poseidon4.
This creates an `AttestationLeaf` that MUST be inserted into the registry's attestation Merkle tree and
updates the public Merkle Root

Below is the `AttestationLeaf` binds the following parameters:

```
AttestationLeaf {
    owner_pubkey: Field    // spending public key of attested party
    attester:       address  // compliance authority
    issued_at:      u64
    expires_at:     u64      // 0 = no expiry
}

attestation_leaf = Poseidon4(subject_pubkey, attester, issued_at, expires_at)
```

Consistent with [EthSystem's Attested Shielded Pool](https://github.com/ethsystems/specs/blob/main/specs/3/README.md),
the registry MUST emit an event carrying the newly computed leaf,
the `owner_pubkey`, the `ENTITY` wallet address,
and the `issued_At` and `expires_at` timestamps.

### Attestation Framework

While the engine integrates privacy-preserving components adapted from
[EthSystem's Attested Shielded Pool](https://github.com/ethsystems/specs/blob/main/specs/3/README.md#51-data-structures),
this framework extends the `AttestationLeaf` data structure to support both transparent and
shielded configurations for the `Attestation` schema.
All the parameters from the EthSystems `AttestationLeaf` data structure SHOULD be
used to generate a unique deterministic `id` for every attestation.
All parameters from the `AttestationLeaf` data structure SHOULD be used to generate a unique,
deterministic `id` for every attestation.

For example, the keccak256 algorithm to bind these parameters together:

> keccak256(abi.encode(subjectIdentifier, attestor, attestedAt, validUntil)).

For detailed information on how this deterministic ID is utilized for on-chain lookups, see the [Query & Lookup Interface]() section.


Each profile SHOULD structure the attestation format with the following attributes:

```solidity
struct Attestation {
    bytes32 id;
    address attestor;
    uint256 attestedAt;
    uint256 validUntil;
    
    bytes32 subjectIdentifier;
    bytes32 attestationType;
    VisibilityPreference visibility;
    bool revoked;

    bytes32 evidenceHash;
    string evidenceURI;
    bytes signature;

    bytes resultData; // Optional Flexible ABI-encoded result (e.g., limits, states)
    
}

```
An `Attestation` MUST include the `VisibilityPreference` flag.
and have a validity period, `validUntil`.

The `attestationType` is a standardized cryptographic hash representing the specific claim or
rule being verified, e.g., keccak256("KYC").
To ensure interoperability, the exact string value 
and their legal meanings SHOULD be published off-chain by the `attestor`.
Enities may require excessively long or complex identifier names for `attestationType` .
So this value SHOULD be hashed,
rather than stored as a raw string,
to prevent on-chain state bloat and reduce gas costs.
This public documentation allows all parties to calculate the correct hash and
query the attestation registry for the specific attestation they require.

The `subjectIdentifier` value SHOULD be the cryptographic identity of the actor or
asset the attestation applies to.
The format of `subjectIdentifier` depends on the targeted profile and/or the visibility flag:

- For `ENTITY`: A Decentralized Identifier (DID),  public on-chain address and/or shielded spending public key (`owner_pubkey`).
- For `ASSET`: A unique `assetId` derived from the smart contract and underlying asset.
- For `PARTICIPANT`: The shielded spending public key (`owner_pubkey`) or
the public wallet address for transparent users.

The `evidenceHash` is a cryptographic hash of the original off-chain evidence artifact.
This proves to the public exactly which source material the attester is refer to.
While the `evidenceURI` is the reference link to find this artifact.
It is RECOMMENDED to use [Content Identifiers, CID](),
for the `evidenceURI` value to ensure decentralized evidence retrieval. 
However, standard HTTP/HTTPS string URLs MAY be used,
as many traditional enities currently rely on centralized domain resources.

To accommodate additional programmable data,
an attestation MAY include the `resultData` field.
While the current `Attestation` attributes represent simple boolean states,
there will be a need to support specific numerical values or complex data structures.
When utilized, the `resultData` field SHOULD contain arbitrary ABI-encoded data.
This allows a unified `Attestation` to flexibly support custom application logic.

The `signature` is a field contains the cryptographic  generated by the `attestor`.
An implemented framework SHOULD utilize a standardized typed data formatting protocol 
(e.g., [EIP-712 Typed Data Signatures]() for EVM-compatible networks)
to ensure the data is readable by user wallets.
To ensure cryptographic agility across different blockchain networks,
implemented attestation frameworks SHOULD use universal signature verification logic.
This logic MUST support both native cryptographic keypairs (e.g., standard [ECDSA]()) and
smart contract wallet standards (e.g., [EIP-1271]()).
Supporting smart contract wallets ensures that entities can seamlessly upgrade to post-quantum signature schemes in the future.

For information regarding the eventual system-wide deprecation of native elliptic curve cryptography 
and the transition to quantum-safe environments, see the [Security Considerations]() section.

The `revoke` field indicates the active status of the attestation.
Upon an `Attestation` submission,
this value MUST be set to false.
The state of the `revoke` field MUST be modified only by the `attestor` or
by a delegate address authorized by the `attestor`.

### Profile Registration 

Before an actor can submit an `Attestation`,
they MUST be a registered a profile within the registry.
This registration establishes the on-chain identity,
defines their visibility preferences and the specific profile type of the actor.

While the registry MAY allow permissionless registration, 
where any address can create a profile,
the validity of each profile is dictated by the tokenized product utilizing it.

### Entity Profile

A `ENTITY` profile represents the operational operators of the tokenized product.
The registry MUST expose an interface to query whether an `ENTITY`
address corresponds to a registered profile.

```solidity

struct ENTITY {
    address owner;
    bytes32 did; // Optional Decentralized Identifier
    VisibilityPreference visibility;
    bytes32 legalDocumentHash; // refernece to operational documents about the entity
    bool isActive;
}
```
In a smart contract, an `ENTITY` can issue `ASSET` profiles with `Attestation` records without restrictions,
as the real-world identity of an `ENTITY` is unknown at the contract level.
To anchor an `ENTITY` profile to a real-world identity,
an entity publishes verification records directly on publicly accessible resources.
To establish public trust and independent auditability,
an `ENTITY` profile MAY include a [W3C-compliant Decentralized Identifier](), `did`.
Utilizing a `did`,
allows third parties to independently verify the real-world identity
by accessing the real-world resource associated with it.
This attribute is optional and
MAY be replace with other values that the `ENTITY` supports
(e.g., web endpoints).

The `did` creation is separated into three processes off-chain DID document creation,
on-chain publishing, then document resolution and verification.

Off-chain the `ENTITY` generates a W3C DID (e.g., `did:web:example-auditor.com`),
then contructs a DID document which is a JSON file which is hosted publicly at a IPFS CID 
(e.g.,`ipfs://bafybeicg2ush5nhu7nacvn4cdjh22pdauuzy4v7vhox4v3w2376fbq5vy4`.)
For centralized domain approaches,
typically hosted publicly on website at `https://example-auditor.com/.well-known/did.json`.
This acts as a digital identity card containing the company's cryptographic public keys and
declaring which blockchain wallet addresses they own.

The `ENTITY` submits a profile registration,
along with their `did` CID hash.
The verifier resolves the `did` off-chain by fetching the DID Document directly.
Then the verifier can confirm that the `owner` address is assoicated.

####  Rights Profile interface

It is RECOMMENDED to expose the real-world rights associated with an `ASSET` profile or
an `ENTITY` tokenized product.
The follwoing are examples of potential attributes and
what they MAY clarify:

```solidity

struct TokenHolderRights {
    bool votingRights;          // Token holder has shareholder voting rights.
    bool dividendRights;        // Token holder is entitled to dividend distributions.
    bool redemptionRights;      // The token is reedemable for the underlying physical asset or other.
    bool corporateActionRights; // Token holder participates in corporate actions (e.g., stock splits, buybacks).
    bool ownershipRights;       // Token holder possesses direct legal title to the underlying asset.
    bool economicExposure;      // Token provides financial price exposure without legal ownership title.
}
```

Changes to token-holder rights MUST be recorded.
The verification interface MUST expose the current rights values and
MAY expose historical rights values.
To prevent `ENTITY`s from making false legal claims on-chain,
all declared rights SHOULD be associated with an `Attestation`.

#### Entity Legal Footprint

All relevant parties assoicated with an `ENTITY` profile SHOULD be represented through `Attestation`s 
and legal structure through , 
so that users can understand the legal structure and where claims reside.

A tokenized asset is rarely supported by a single `ENTITY`.
Its operational architecture relies on a network of specialized third parties
(e.g., Custodians, Transfer Agents, Legal Counsel).
Therefore, implementations SHOULD NOT rely on tokenized product
where the issued `ASSET` records contain a single `ENTITY` profile.
Instead, it SHOULD combine multiple `Attestation`s to reconstruct the off-chain operational
and legal structure on-chain.
By mapping specific schema claims (such as backing reserves, voting rights, etc)
directly to the independent parties (`ENTITY` profiles) responsible for them,
the verification framework enables users to deterministically trace the origin,
authority, and provenance of every claim.

#### Proof of Audit

While a `PARTICIPANT` spending key can safely sit in public storage as the `subjectIdentifier` without revealing their identity,
the compliance data remain strictly private.

When an authorized `ENTITY` needs to issue an attestation regarding a SHIELDED participant,
the smart contract MUST cryptographically verify that the `ENTITY` was authorized by the `PARTICIPANT` to inspect their private records.
This prevents unauthorized third parties from attaching unapproved claims to a participant's spending key without their consent.

To satisfy this requirement:

1. Off-Chain Authorization: The `PARTICIPANT` securely shares their viewing key (or a cryptographically signed consent payload) with the authorized `ENTITY` off-chain.
2. Proof Generation: The `ENTITY` generates a Proof of Audit. This cryptographic proof mathematically proves that the entity possesses the valid Viewing Key corresponding to the target owner_pubkey.
3. On-Chain Submission: The registry MUST expose an interface for the ENTITY to submit the new attestation alongside this proof:

```solidity
function submitProofofAudit(
    bytes32 subjectIdentifier, // The participant's owner_pubkey
    bytes32 newAttestationType,
    bytes memory newResultData,
    bytes calldata zkProofOfAudit
) external;
```
The smart contract MUST verify the `zkProofOfAudit` against the `owner_pubkey` before recording the attestation,
guaranteeing that the entity had authority to audit the `PARTICIPANT` without exposing the viewing key on-chain.

### Asset Profile

An `ASSET` profile links to authorized `ENTITY` profiles through its registered `issuer` address and
the specific `Attestation` records associated with its metadata.
When an `ASSET` is registered,
the registry MUST verify that the `issuer` address corresponds to an active,
registered `ENTITY` profile before accepting the registration.
Arbitrary tokens can be deployed without any real-world attachments known on-chain.
Registering an `ASSET` profile is REQUIRED to distinguish generic on-chain tokens from legitimate tokenized assets that have real-world attachments.

```solidity

struct AssetId {
    bytes32 assetId;
    uint256 chainId;
    address issuer;
    address tokenContract;
}

struct AssetMetadata{
    bytes32 assetId;
    uint256 timestamp; 
    uint256 representationRatio;                
    bytes32[] attestationId;         
    // The three core rights, represented by their attestationID
    bytes32 redemptionRightAttestationId;
    bytes32 insolvencyProtection;
    bytes32 nativeOwnership;
    
    address[] extensionMetadata; // Optional
}

struct ASSET {
    AssetId id;
    AssetMetadata metadata;
    bool isActive;
}

```

The `chainId` is MAY NOT be defined in cases where justified.
The `assetId` value SHOULD be generated at the time of asset registration.
In some cases there can be more than one issuing party responisble for an asset tokenization.
The `issuer` value SHOULD be the main identifying party that has real world resources publicly sharing the address ownerships and activiy.
In other words, this address does not need to be the owner of the token contract,
only a publicly idenitifing party.

The core three rights defined in the metadata SHOULD be the value of `attestationId`.
This is RECOMMENDED to discourage an issuer/owner from declaring flase rights claims about the asset on-chain,
while the off-chain legal structure is the opposite.
More information about attestation values are described in the [Attestation Framework]().

- If the company that created the token goes out of business, your underlying asset is safe in a separate vault and belongs to you, not their creditors.
- Whoever holds the token in their crypto wallet is the legal owner of the asset. The blockchain is the final source of truth, rather than a traditional transfer agent's private database.

The issuer SHOULD define an `underlyingAssetIdentifier` for the underlying asset.
The identifier SHOULD NOT rely exclusively on token symbol, token name,
blockchain address, or issuer-selected ticker.
For example, two unrelated tokens MUST NOT be considered equivalent merely because both use the symbol `NVDA`.

extensionMetadata: votingRights, dividendRights
ISSUER_NOTICE_PROVIDED : an auditor must submit an attestation proving that the written notice was sent to the underlying stock issuer(if the issuer is registered in the registry, than they can be the auditor).

#### Representation Ratio

The implementation SHOULD specify the relationship between token units and underlying units.
Example:

```text
1 token = 1 underlying share
```
#### Minting and Burning

The address able to  create tokens, mint, or 
destory tokens, burning, MUST be publicly defined.
Minting SHOULD NOT increase token supply beyond the quantity permitted by the attestation supporting the corresponding increase in backing.
profile that is assigned to minting and burn tasks.
A mint operation SHOULD reference the Attestation supporting the corresponding increase in backing.

Burning SHOULD NOT decrease token supply.
Entity attestation are responsible for  SHOULD record the relationship between the token burn and the corresponding change in the underlying custody position where that information is available.

### Participant Profile 

A `PARTICIPANT` profiles represents the actor thatplans on holding the tokenized token.
To provide a standardized, privacy-preserving method for on-chain identity verification,
a `PARTICIPANT` SHOULD be registered in the registry.

#### Eligibility & Classification

An implementation MAY represent eligibility through an on-chain attestation or zero-knowledge proof.
A participant's eligibility status MUST NOT expose unnecessary underlying identity information.
Participants MAY choose their `VisibilityPreference` (Transparent or Shielded) depending on their operational privacy requirements.


```solidity
struct PARTICIPANT {
    address wallet;
    uint256 participantType;
    bytes32 shieldedKeyHash; // For SHIELDED profiles, this is the commitment
    VisibilityPreference visibility;
    bytes32 jurisdiction;
    // Attestations alreay made in the registry by other profiles
    bytes32[] identityAttestationIds;
}
```

#### Asset Restrictions

For `PARTICIPANT` that have been rewarded retrictions about a specific `ASSET` or
the use a specific `ENTITY` registered offerings,
the registry SHOULD be updated.

If the participant opts for a SHIELDED visibility preference, the transfer restriction check MUST be validated via a Zero-Knowledge Proof (ZKP) confirming eligibility without exposing the underlying jurisdiction or identity.

### Verification State & Discovery

The verification interface allows the verifier to collect all relevant information can calculate a the current state of a tokenized asset.
The following are the RECOMMENDED states based on public values defined in 
Every registered Tokenized Asset MUST have a current Verification State.
The base states are:

```solidity
enum VerificationState {
    UNVERIFIED,
    VERIFIED,
    STALE,
    UNDERBACKED,
    REVOKED,
}
```

- `VERIFIED`: All REQUIRED defined attributes for the RECOMMENDED profiles are defined. evidence is valid.
The asset satisfies the all defined attributes of the verification policy.
Enforcement: Normal protocol operations MAY continue.

- `UNVERIFIED`: The REQUIRED defined attributes for the RECOMMENDED profiles are not all defined.
For example, no attestations, unregistered attestor, and so on.
Enforcement: The asset MUST be  flagged as `UNVERIFIED`.

- `STALE` : A `VERIFIED` asset profile no longer meets the validity period.
Enforcement: New minting SHOULD be disabled, unless separate defined policy explicitly permits otherwise. This disabled SHOULD be an on-chain flag. The STALE state SHOULD be evaluated dynamically at query time rather than requiring an explicit on-chain state transition transaction. If an asset holds a stored state of VERIFIED, but the underlying attestation's validity window has lapsed (block.timestamp > validUntil), the verification interface MUST dynamically evaluate and return STALE.

- `UNDERBACKED`: The verified quantity of underlying assets is less than the required token supply.
This flag MUST be attached with an attestation profile.
Enforcement: New issuance SHOULD be disabled.

- `REVOKED`: An authorized entity profile submits an revocation attestation.
SHOULD be a valid revoke and not a reserved/overturn revoke.
Enforcement: New issuance SHOULD be disabled. Token transfers SHOULD be halted.

#### State Transitions

The implementation MUST define deterministic transitions between verification states.

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
   │ backing < supply attestation
   ▼
UNDERBACKED

VERIFIED
   │
   │ revoke attestation
   ▼
REVOKED

```

#### Attestation Discovery

Attestion tagging
An `Attestation` SHOULD NOT exist in isolation in a profile by its `attestationId`.
Different partie may not know the unique `attestationId` for each profile in advance,
the registry MUST generate tagging maps at time of submission.
The tagging record MAY consist of three attributes from the `Attestation`;
`subjectIdentifier`, `attestor` and `attestationType`

```solidity

// Tagging Map layout: subjectIdentifier -> ENTITY address -> attestationType = attestationId
mapping(bytes32 => mapping(address => mapping(bytes32 => bytes32))) internal _taggedAttestations;

```
During verification, The registry retrieves the full Attestation record by the discovered attestationId.

The verification state of an `ASSET` or `ENTITY` profile is directly driven by its active tagged attestations.
When legal licenses, corporate registrations, or parent entity authorizations are tagged or revoked for an `ENTITY`, the entity's active verification standing SHOULD be updated accordingly.
The registry exposes these states transparently. Token issuers and external protocols MAY integrate with this interface to automatically pause minting, burning, or trading when an asset's verification state degrades, but the verification framework itself remains strictly an authoritative source of truth.

#### Smart Contract Discovery

During the verification discovery process, a verifier evaluates the Asset Profile to ensure compliance. Because every registered Asset Profile explicitly binds an assetId to an underlying tokenContract, the discovery interface SHOULD expose the operational, technical, and administrative properties of that specific token contract.

This enables integrating protocols, auditors, and investors to programmatically evaluate smart contract architecture and centralization risks directly alongside the asset's compliance attestations.

When discovering an Asset Profile, the interface SHOULD provide mechanisms to inspect:

Contract Architecture: The tokenContract address referenced in the Asset Profile, and, if upgradeable (e.g., via a proxy pattern), the current implementation logic address.
Administrative Controls: The controlling upgrade administrator, multi-sig address, or timelock contract governing the Asset Profile's token.
Operational Flags: Real-time state flags indicating whether the token contract is paused, permissioned, or enforces custom transfer restrictions.
Supply Authorities: The designated addresses authorized to execute mint and burn operations on the asset token.
An implementation SHOULD allow verifiers to deterministically evaluate whether the contract linked to the Asset Profile is immutable, upgradeable, paused, or subject to external administrator intervention.

### Security Considerations

The Verification Engine acts as an on-chain state machine and cryptographic notarization layer; it does not independently verify physical or off-chain reality. Consequently, the security of the framework depends entirely on the integrity of the participating actors, the freshness of their attestations, and the timely execution of state changes.

Integrators and auditors MUST consider the inherent boundary between off-chain events and on-chain state:

Submission Timing Latency: There is an unavoidable delay between an off-chain occurrence (e.g., a corporate insolvency, sanctions designation, or bank account seizure) and the submission of a corresponding revocation or update transaction on-chain. Malicious or compromised actors MAY exploit this latency window to trade or settle assets before the registry transitions to REVOKED or UNDERBACKED.
Selective Omission: Authorized attestors MAY maliciously or negligently omit negative information while selectively publishing favorable attestations.
Decoupled Custody: On-chain ownership records do not physically lock off-chain bank accounts or vault collateral; an attestation represents a point-in-time claim rather than a perpetual guarantee of collateral safety.

#### Attestor Compromise

A compromised or malicious Attestor private key allows unauthorized actors to publish fraudulent attestations, forge compliance claims, or maliciously revoke legitimate participant profiles. This standard cannot cryptographically prevent off-chain key compromise, regulatory coercion, or bribery.

To mitigate this risk, implementations:

SHOULD support multi-attestor threshold quorums (e.g., requiring 
M
M-of-
N
N independent attestors to sign off on high-value asset reserves).
MUST implement rapid revocation mechanisms for compromised Attestor profiles in the central registry.
SHOULD enforce short, policy-defined validity windows for volatile claims to limit the damage window of a compromised key.

#### Cryptographic Agility and ECDSA Deprecation

While the framework supports standard ECDSA signatures, 
via [EIP-712](https://eips.ethereum.org/EIPS/eip-712) for immediate compatibility with existing Externally Owned Accounts (EOAs), the underlying mathematics of elliptic curves remain vulnerable to future quantum computing advances. To ensure long-term survivability, the framework SHOULD rely on [EIP-1271](https://eips.ethereum.org/EIPS/eip-1271) (`isValidSignature`) to support upgradeable smart contract wallets. Following guidelines outlined by [NIST Post-Quantum Cryptography Standards](https://csrc.nist.gov/projects/post-quantum-cryptography).implementations **SHOULD** support a phased **Cryptographic Deprecation Phase**:

* **Grandfathered Signatures:** All attestations recorded prior to an agreed protocol deprecation timestamp remain fully valid for their remaining validity window.
* **Deprecation of Native ECDSA:** New attestations submitted using legacy elliptic curve signatures after the deprecation milestone **SHOULD** be rejected or flagged as non-compliant, requiring entities to utilize quantum-resistant smart contract wallets (e.g., via [ERC-4337](https://eips.ethereum.org/EIPS/eip-4337) or [EIP-7702](https://eips.ethereum.org/EIPS/eip-7702))

#### Merkle Root Concurrency

In the shielded mode, participants generate Zero-Knowledge proofs off-chain against a specific on-chain Attestation Merkle Root. In high-throughput registries, rapid issuance of new attestations will advance the Merkle root frequently.

If the smart contract verifier only validates against the single latest Merkle root, transactions generated off-chain may frequently revert due to on-chain state race conditions (root front-running).

To mitigate this denial-of-service condition:

The on-chain verifier SHOULD maintain a historical ring buffer of recent valid Merkle roots,
consistent with the root-history pattern established in [EthSystems Shielded Pool Specification](https://github.com/ethsystems/specs/blob/main/specs/2/README.md) and [Semaphore Protocol Architecture](https://docs.semaphore.pse.dev/).

The verifier MUST accept proofs generated against any root within this authorized historical window, (e.g., the last 50 to 100 valid roots).

### Reference Implementation

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

#### ZK Proofs Roots

"The current Attestation Merkle Root MUST be passed as a public input to the Zero-Knowledge circuit to ensure the smart contract verifies the proof against the correct on-chain state."

SDK must support:

Event Indexing and State Management: The SDK MUST be capable of parsing the registry's emitted events, reconstructing the Attestation Merkle Tree locally, and maintaining the current Merkle Root.
ZK Proof Generation: The SDK MUST implement the required cryptographic circuit to generate the Zero-Knowledge Membership Proof off-chain, using the local tree state and the participant's shielded key.
Key Management (Dual-Key Support): The SDK MUST securely manage the participant's dual-key setup. It must allow the user to sign proofs using their Shielded Spending Key while providing a mechanism to securely export or share the Viewing Key with authorized third parties.
Verification Querying: The SDK MUST provide a standardized interface to query the Verification Engine and return a machine-readable compliance status (which you actually already have an example of in the "Verification Interface" section!).

The implementation MUST pass the raw owner_pubkey directly into the leaf hash function without applying any preliminary hash layers. 
For detailed cryptographic rationale regarding circuit provability and
proper leaf construction, refer to the EthSystems spec/3

## Copyright

## References

