---
title: TOKENIZATION-ASSURANCE
name: Tokenization Assurance Framework
status: raw
category: Best Current Practice
contributors: Jimmy Debe <@jimstir>

---

## Abstract

This document defines a framework for representing, verifying,
and enforcing claims associated with tokenized products.

The Tokenization Assurance Framework (TAF)
establishes a consumer-first trust layer across the tokenization lifecycle.
While issuers frequently publish off-chain legal disclosures,
the tokenization remains fragmented across different operational models, custodians,
broker-dealers, and the underlying legal structures.
This framework aims to bridge the divide between smart contracts and
the off-chain reality of tokenized offerings by establishing a universal on-chain assurance architecture.

## Motivation

Tokenization represents a rapidly expanding space,
with evolving regulatory guidelines being introduced across different jurisdictions worldwide.
For example, a recent
[SEC Request for Comment](https://www.sec.gov/newsroom/press-releases/2026-90-sec-issues-innovation-exemption-facilitate-trading-tokenized-nms-stock-request-comment)
announced exemptive relief considerations for trading Tokenized NMS Stocks,
highlighting the exact type of regulatory gap this standard was created to bridge
The architectural flexibility of tokenization empowers issuers to design varied product models.
While this flexibility delivers the benefits of blockchain technology to a broader audience,
it also introduces structural uncertainties, operational risks,
and investor protection gaps that current protocols leave unaddressed.

A smart contract can prove how many tokens exist, ensure self custody, and manage access.
It can not prove the real-world state of the physical asset backing it.
Currently, token issuers attempt approach this by implementing off-chain legal strucutres 
and attestations linked to a on-chain token.
While this demonstrates a desire for transparency, the reality is often opaque.
Most consumers do not understand dense legal documents,
nor do they know how to verify relevant information.

Instead, users are forced to trust the issuer's product press release about what is being offered.
Instead, market participants are often forced to trust marketing claims and product summaries.
This creates an environment where negligent or
bad-faith actors can obscure broad liability disclaimers within dense legal agreements.
Mask critical discrepancies between on-chain token supply and
actual off-chain custodial reserves.
Unforeseen hidden counterparty risks simply because
market participants have no accessible way to confirm what their token represents.


### The Need for Independent Verification

The tokenization ecosystem currently suffers from a reliance on self-certification and
fragmented architectures.
Multiple issuers might tokenize the exact same underlying asset (e.g., Apple common stock)
using different legal structures, custodians, and oracle systems.
In many cases,
these assets are tokenized by unaffiliated third parties without the underlying issuer's involvement.
The consumer of these products are still vunderable in the current tokenization envirnoment.
As regulators start to require secondary markets and
Tokenized Securities Venues to verify that a tokenized asset provides the same rights as traditional venues.
Manual verification becomes difficult to commidate across the industry.
If an exchange or even
DeFi protocols need to list these assets, a standardized,
machine-readable way for independent auditors to attest to off-chain facts about the product is required.
The future of capital markets is on-chain, establishing standardized,
machine-readable compliance infrastructure must be prioritized over static digital-based disclosures.
Attesting PDF-based disclosures can be on-chain in a structured format can make retrieving and
evaluating these documents a programmatically indexable process.
This document establishes the following core objectives:

- Asset Identification: Standardizing how the underlying real-world asset is identified on-chain.
- Rights Representation: Providing a machine-readable format to define the legal rights and privileges associated with the tokenized offering.
- Entity Accountability: Cryptographically defining which specific attestors are recognized for particular claims, and securely anchoring their on-chain attestations to their verifiable real-world resources. This includes establishing a verifiable cryptographic link between an entity's on-chain signatures and their real-world legal documents.
- Time-Bounded Attestations: Requiring cryptographic, time-limited attestations for off-chain claims to prevent reliance on expired data.
- Supply Backing: Comparing the on-chain token supply against authorized custody attestations to ensure the asset is not under-collateralized.
- Standardized Evidence Interface: Exposing all verification evidence and attestation metadata through a unified, public smart contract interface.
- Explicit Failure States: Representing verification failures (e.g., data conflicts, under-collateralization) as explicit, machine-readable on-chain states.
- Automated Enforcement: Applying predefined on-chain consequences (such as halting transfers or freezing minting) when required guarantees become stale, revoked, or unavailable.

### Architectural Goals

By separating concerns into distinct, interconnected profile records 
(Asset, Entity, Participant, and Attestation).
This framework accommodates various tokenization structures through a standardized verification interface and data schema,
enabling secondary trading venues to evaluate asset classes using a uniform programmatic standard.
This approach aims to expose that economic exposure is clearly separated from actual legal ownership and specific rights.
This framework aims to eliminate ambiguity by making a token immediately verifiable,
clearly separating true beneficial ownership from mere synthetic economic exposure.

Rather than relying on blind trust,
the standard mandates a system of cryptographic evidence.
Legal documents related to custody operations or
the underlying entity are not stored as raw text on-chain.
Instead, they are hashed, signed,
and published as time-bounded attestations by the expected authorized party.
This creates a independently verifiable historical record of all compliance claims and
explicitly captures any verification failures as immediate on-chain state changes.

Finally, the standard encourages participant privacy.
While verification for assets and entities should be publicly auditable,
participant identity information must remain private.
By utilizing zero-knowledge proofs,
the standard allows authorized parties to audit the compliance of the tokenized product,
without leaking financial data to the public ledger.

The goal is not to establish absolute truth about an off-chain asset.
Instead, the standard establishes a clearly defined,
auditable on-chain interface that places the relationship between the consumer and
the owner of a tokenized product at center stage.
By forcing the product's claims into full public view,
it strips away opaque legal shields and
demands true cryptographic accountability.

## Specification

The key words "MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT", "SHOULD", "SHOULD NOT",
"RECOMMENDED",  "MAY", and "OPTIONAL" in this document are to be interpreted as described in
[RFC 2119](http://tools.ietf.org/html/rfc2119).

The standard consist of a core attestation registry that handles registrations,
exposes a verification interface, verification state status and attestation submissions.
The registry is a smart contract that MAY be deployed by any party.
The owner of the contract MAY be a party not assoicated with tokenized offerings.,
Contract owners SHOULD NOT have the authority to update the state of the registry record.

### Attestation Registry

Each actor in this envirnoment MUST be classified by a registry profile record.
The verification interface will expose these profiles to complete verification tasks.
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

Viewing Key: A companion cryptographic key that grants read-only decryption authority. Attestation records reference off-chain evidence artifacts (e.g., via `evidenceURI` or IPFS CIDs) that are not publicly open. A participant selectively shares their Viewing Key with authorized parties off-chain to decrypt and inspect these underlying compliance records and audit details, without granting any ability to transfer assets or sign on-chain transactions.

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
These values are hashed together with a ZK hash function, like Poseidon5.
This creates an `AttestationLeaf` that MUST be inserted into the registry's attestation Merkle tree and
updates the public Merkle Root

Below is the `AttestationLeaf` binds the following parameters:

```
AttestationLeaf {
    owner_pubkey: Field    // spending public key of attested party
    attestationType: Field
    attester:       address  // compliance authority
    issued_at:      u64
    expires_at:     u64      // 0 = no expiry
}

attestation_leaf = Poseidon5(owner_pubkey, attestationType, attester, issued_at, expires_at)
```

Consistent with [EthSystem's Attested Shielded Pool](https://github.com/ethsystems/specs/blob/main/specs/3/README.md), the registry MUST NOT emit plaintext identifiers or
claim types in a shielded attestation event.
The event does emit owner_pubkey and attester.
What remains private is strictly the off-chain evidence.
Only an actor possessing the corresponding Viewing Key can decrypt the off-chain evidence referenced by the attestation.

(REMOVED, Comment, do not implement
the registry MUST emit an event carrying the newly computed leaf,
the `owner_pubkey`, the `ENTITY` wallet address,
and the `issued_At`, `expires_at` timestamps and
the `attestationType`.
)

#### Shielded Attestation Revocation

The Attestation Merkle Tree is append-only. Once an `AttestationLeaf` is inserted, it cannot be modified or deleted without recomputing the entire tree. Furthermore, because the verifier accepts historical roots to prevent concurrency front-running (see [Merkle Root Concurrency]()), historical roots will continue to contain the leaf even after it is superseded.

To enforce revocation without compromising privacy, a registry supporting SHIELDED attestations MUST maintain a secondary **Revocation Tree**, and transaction-time Zero-Knowledge eligibility proofs MUST demonstrate both:
1. **Membership** in the Attestation Merkle Tree.
2. **Non-membership** in the Revocation Tree.

The Revocation Tree SHOULD be structured for efficient ZK non-membership proofs (such as an indexed or sparse Merkle tree) utilizing the same ZK-friendly hash function (`Poseidon`) as the Attestation Merkle Tree.

##### Attestation Registration & Revocation Interface

Upon insertion of a shielded `AttestationLeaf`, the registry MUST record the issuing `ENTITY` address against the leaf value to enforce access control:

```solidity
mapping(bytes32 => address) public shieldedAttesters;
```

To revoke an attestation, the issuing `ENTITY` (or its approved delegate) submits the target leaf:

```solidity
function revokeShieldedAttestation(bytes32 leaf) external returns (bytes32 newRevocationRoot);
```

The registry MUST:
1. Revert if `msg.sender` is not the recorded attester for `leaf` or an authorized delegate.
2. Revert if `leaf` is already present in the Revocation Tree.
3. Insert `leaf` into the Revocation Tree and advance the Revocation Root.
4. Emit an event carrying the revoked `leaf`, the `attester`, and the updated `newRevocationRoot`.

##### State Impact & Reinstatement

- **Policy Degradation (`UNVERIFIED`)**: Revoking an individual shielded leaf invalidates that specific claim. If that claim was mandatory under the offering entity's `attestationReq`, the profile dynamically resolves to `UNVERIFIED`. It does not trigger `REVOKED` unless an explicit profile-level ban is enforced.
- **Permanent Invalidation & Reinstatement**: Once inserted into the Revocation Tree, a revoked leaf CANNOT be removed or reinstated. To restore compliance, the `ENTITY` MUST issue a **new** `AttestationLeaf` (with updated timestamps). Because the new leaf has a distinct hash, it is not present in the Revocation Tree and passes verification immediately.

##### Transaction-Time Eligibility Proof Requirements

When a participant executes an on-chain transaction from an arbitrary wallet, they submit a Zero-Knowledge Proof verifying that they are authorized by an active, unrevoked attestation.

To preserve **wallet-to-profile unlinkability**, the proof MUST separate public verifier inputs from private circuit witnesses:

1. **Public Inputs (Known to the Smart Contract Verifier)**:
   - `attestationRoot`: An authorized historical root from the Attestation Merkle Tree.
   - `revocationRoot`: The latest (fresh) root of the Revocation Tree.
   - `attestationType`: The claim type required by the token offering.
   - `timestamp`: Current block timestamp (or bounded epoch).

2. **Private Witnesses (Known Strictly to the Participant's Wallet)**:
   - `owner_pubkey` and the corresponding private spending key (proving control of the profile).
   - `leaf`: The preimage attributes `(owner_pubkey, attestationType, attester, issued_at, expires_at)`.
   - Merkle membership path proving the leaf exists in the Attestation Tree under `attestationRoot`.
   - Non-membership Merkle path proving the leaf does NOT exist in the Revocation Tree under `revocationRoot`.

Because `owner_pubkey` and the `leaf` remain private inside the ZK circuit during trade execution, the transacting on-chain wallet address (`msg.sender`) is never linked to the participant's profile.

##### Revocation Root Freshness

While the verifier accepts a historical ring buffer of Attestation Roots to mitigate transaction race conditions, it MUST NOT accept stale Revocation Roots. 

Accepting an expired Revocation Root would allow a revoked participant to prove eligibility against a historical snapshot taken before their revocation. Smart contracts evaluating shielded proofs SHOULD verify against the latest Revocation Root (or enforce a strictly bounded window of no more than $T$ seconds) and document this latency parameter.

- **Pseudonymous Public Visibility**: Calling `revokeShieldedAttestation` reveals that an attestation issued by that `ENTITY` was revoked. If an observer correlates the revoked leaf with the original insertion transaction, they can observe which `owner_pubkey` was revoked.
- **Evidence Protection**: Revocation does not expose the underlying off-chain evidence or human identity. The evidence hosted at `evidenceURI` remains encrypted off-chain under the participant's Viewing Key.
- **Wallet Separation**: Because transaction execution conceals both `owner_pubkey` and `leaf` inside the Zero-Knowledge circuit, an observer inspecting a revoked leaf on-chain cannot identify which past or future blockchain wallet transactions belonged to that participant.


### Attestation Framework

While the engine integrates privacy-preserving components adapted from
[EthSystem's Attested Shielded Pool](https://github.com/ethsystems/specs/blob/main/specs/3/README.md#51-data-structures),
this framework extends the `AttestationLeaf` data structure to support both transparent and
shielded configurations for the `Attestation` schema.
All the parameters from the EthSystems `AttestationLeaf` data structure SHOULD be
used to generate a unique deterministic `id` for every attestation.

For example, the keccak256 algorithm to bind these parameters together:

> keccak256(abi.encode(subjectIdentifier, attestor, attestedAt, attestationType, validUntil)).

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

The evidenceHash is a cryptographic hash of the off-chain evidence artifact.

The `evidenceHash` is a cryptographic hash of the original off-chain evidence artifact,
, while the `evidenceURI` is the link to locate it
This proves to the public exactly which source material the attester is refer to.

It is RECOMMENDED to use [Content Identifiers, CID](),
for the `evidenceURI` value to ensure decentralized evidence retrieval. 
However, standard HTTP/HTTPS string URLs MAY be used,
as many traditional enities currently rely on centralized domain resources.
For SHIELDED attestations, the underlying evidence artifact hosted at evidenceURI MUST be encrypted off-chain using the participant's Viewing Key. To prevent dictionary and rainbow table attacks on predictable status text (e.g., 'KYC: PASS'), the on-chain evidenceHash MUST be computed over the encrypted ciphertext, rather than the raw plaintext.

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
the validity of each profile is dictated by the tokenized offering utilizing it.
A profile's `Attestation` has no authority on its own.
Its validity is recognized only in the context of a defined offering by an `ENTITY`.

### Entity Profile

A `ENTITY` profile represents the operational operator of the tokenized offering.
The registry MUST expose an interface to query whether an `ENTITY`
address corresponds to a registered profile.
During registration, it is RECOMMENDED that an `ENTITY` define an `operator` as true to indicate that this profile operates a tokenized offering.
The tokenized offering SHOULD NOT define the name of the product or
any detailed off-chain information.
Instead, it is RECOMMENDED that this `ENTITY` define the product using the `attestationReq` attribute.
This will hold a list of the REQUIRED `attestationType` for each profile says the `ENTITY`.
Now the verfication infterface will be able to know how to resolve a `VerificationState` for profiles participanting in that offering.
This apporach is RECOMMENDED, as products can implement for their use case, like when mulitple profile combine to share which `attestationType` count instead of one entity and so on.

```solidity

    struct ENTITY {
        address owner;
        bool operator; 
        bytes32 did; // Optional Decentralized Identifier
        VisibilityPreference visibility;
        bytes32 legalDocumentHash; // refernece to off-chain operational documents 
        bytes32[] attestationIds;
        bool status;
    }
    
    // Optional based on operator status
    // operatorAddress => targetProfileType => required attestationType hashes
    mapping(address => mapping(bytes32 => bytes32[])) public attestationReq;
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

When an authorized `ENTITY` needs to issue an attestation regarding a SHIELDED `PARTICIPANT`,
the smart contract MUST cryptographically verify that the `ENTITY` was authorized by the `PARTICIPANT` to inspect their private records.
This prevents unauthorized third parties from attaching unapproved claims to a participant's spending key without their consent.

To issue an `Attestation` for a shielded `PARTICIPANT`,
an `ENTITY` MUST submit the cryptographic authorization proof alongside the standard attestation parameters in transaction calldata.
The registry acts as the entry gatekeeper,
evaluating the proof against a ZK verifier before updating state.

The `PARTICIPANT` securely shares their viewing key (or a cryptographically signed consent payload) with the authorized `ENTITY` off-chain.
Then the `ENTITY` generates the proof of audit off-chain and
executes the `submitShieldedAttestation` with the following attributes:

``` solidity

function submitShieldedAttestation(
    uint256 ownerPubkey,
    bytes32 attestationType,
    uint64 issued_at,
    uint64 expires_at:,
    bytes calldata proofOfAudit
) external returns (bytes32 leaf);

```
Upon invocation, the contract MUST execute the following sequence:

1. The contract MUST bind the `ENTITY` address and
the target `ownerPubkey` as public inputs to the submitted `proofOfAudit` payload.
This binds the proof directly to the calling `ENTITY`,
preventing proof front-running or transaction replaying by unauthorized actors.
2. The contract evaluates the proof against the bound parameters. The check evaluates to false and the transaction MUST revert if:

- The cryptographic proof is mathematically invalid or corrupted.
- The proof does not match the target `owner_pubkey`.
- This `ENTITY` does not match the attestor address authorized in the proof.

If the proof evaluates to true, the contract computes the attestation leaf and inserts it into the registry's Attestation Merkle Tree following the exact procedure established in the [Attestation Merkle Tree]() section.

The `proofOfAudit` parameter MUST NOT be persisted to contract storage (sstore). 
The proof is consumed strictly from transaction calldata during execution to prevent state bloat.

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
    bool status;
}

```

The `chainId` is MAY NOT be defined in cases where justified.
The `assetId` value SHOULD be generated at the time of asset registration.
In some cases there can be more than one issuing party responisble for an asset tokenization.
The `issuer` value SHOULD be the main identifying party that has real world resources publicly sharing the address ownerships and activiy.
In other words, this address does not need to be the owner of the token contract,
only a publicly idenitifing party.

The core three rights defined in the metadata SHOULD be the value of `attestationId`.
This is RECOMMENDED to discourage an `ENTITY` from declaring false rights claims about an `ASSET`,
while the off-chain legal structure is different.
More information about attestation values are described in the [Attestation Framework]().

The `ENTITY` is RECOMMENDED to define an `underlyingAssetIdentifier` for the underlying asset.
This identifier SHOULD NOT rely exclusively on token symbol, token name,
blockchain address, or issuer selected ticker.
For example, two unrelated tokens SHOULD NOT be considered equivalent since both use the symbol `NVDA`.

#### Extension Metadata Modules

Different tokenized products have specialized operational requirements that cannot be captured in a static baseline schema.
To maintain extensibility, the `extensionMetadata` array stores the contract addresses of modular extension adapters.
Each address in `extensionMetadata` SHOULD point to an external contract or
extensions implementing interfaces for specialized tokenized products.

#### Minting and Burning

TThe addresses authorized to execute mint (create) or
burn (destroy) operations on the token contract MUST be publicly defined in the `ASSET` profile.
A mint operation SHOULD NOT increase the total token supply beyond the verified quantity permitted by active `Attestation`.
Each mint operation SHOULD reference the specific `Attestation`,
confirming the corresponding deposit and custody of the underlying collateral.

A token burn operation decreases the on-chain token supply (typically upon asset redemption).
The responsible `ENTITY` SHOULD publish an `Attestation` linking the on-chain token burn to the corresponding settlement,
withdrawal, or reduction in the underlying supply.

### Participant Profile 

A `PARTICIPANT` profiles represents the actor planning to on hold the corresoponding `ASSET`.
A `PARTICIPANT` SHOULD register to the registry with the following attributes:

```solidity
struct PARTICIPANT {
    address user;
    uint256 participantType;
    bytes32 shieldedKeyHash; // Optional, for shielded profiles
    VisibilityPreference visibility;
    bytes32 jurisdiction;
    // Attestations already made in the registry by other profiles about this profile
    bytes32[] attestationIds;
}
```

An implementation MAY represent eligibility through an on-chain attestation or zero-knowledge proof.
A `PARTICIPANT` eligibility status SHOULD NOT expose identity information.
A `PARTICIPANT` MAY choose their `VisibilityPreference` 
(transparent or shielded) depending on their prefered privacy requirements.

For shielded participants the `user` MAY be set to address(0).
The profile is indexed by the `shieldedKeyHash`, 
which SHOULD be the `owner_pubKey`.

This ensures no on-chain wallet is ever linked to the profile during registration.
If Alice uses her personal, funded Ethereum wallet (0xAlice) to broadcast the registerParticipant transaction, the blockchain ledger permanently records that 0xAlice paid the gas to register owner_pubkey.

When Alice later interacts with an asset or token contract, she can use any wallet (even a completely new, empty address).
The transacting wallet does not reveal owner_pubkey. Instead, it provides a Zero-Knowledge Proof

#### Restrictions

When a `PARTICIPANT` compliance status changes,
the issuing `ENTITY` MUST update the registry by revoking the `PARTICIPANT`'s eligibility thorugh an `Attestation`. For a shielded `PARTICIPANT`,
revoking the attestation leaf ensures subsequent zero-knowledge eligibility proofs evaluate to false.

### Verification State & Discovery

The verification interface allows verifiers to query all active `Attestation`s linked to a profile.
A profile's current status is represented by its `VerificationState`.
Based on the targeted profile,
supplementary evidence or
renewed `Attestation` records MAY be required to satisfy the verification policy and
achieve a `VERIFIED` state.
Each tokenized offering MUST define all the `attestationType` required to be attached to a profile to achieve `VERIFIED` at time of `VerificationState`.

The verification interface SHOULD evaluate a profile strictly against the requirements defined by an `ENTITY` for a specific tokenized offering.
The `VerificationState` is context-dependent,
so a profile is only considered `VERIFIED` in the context of that specific registered ENTITY's offering. A profile that resolves to `VERIFIED` for an tokenized offering MAY resolve to UNVERIFIED for a different offering.

All states `VERIFIED`, `UNVERIFIED`, and
`REVOKED` SHOULD be dynamically resolved based on the active on-chain state and attestations associated with the profile.
The `STALE` state is dynamically derived at query time and
MAY NOT require an on-chain state change.

The following are the RECOMMENDED states:

```solidity
enum VerificationState {
    UNVERIFIED,
    VERIFIED,
    STALE,
    REVOKED,
}
```

- `VERIFIED`: All required profile attributes are established, supporting `Attestation` remain valid, and the profile satisfies the requirements of the verification policy.
Enforcement: Normal protocol operations MAY continue.

- `UNVERIFIED`: The profile is registered, but fails verification policy requirements. This state resolves when the profile lacks one or more mandatory attestationType hashes defined in the operator entity's attestationReq, or when quantitative reserve balances fall below the required backing ratio.
Enforcement: The asset MUST be flagged as UNVERIFIED.
Enforcement: The asset MUST be  flagged as `UNVERIFIED`.

- `STALE` : A `VERIFIED` asset profile no longer meets the validity period.
Enforcement: New minting SHOULD be disabled, unless separate defined policy explicitly permits otherwise. This restriction SHOULD be reflected via an on-chain flag. The `STALE` state SHOULD be evaluated dynamically at query time rather than a required on-chain state change. If a profile holds a stored state of `VERIFIED`, but the underlying `Attestation` validity window has lapsed, the verification interface SHOULD return `STALE`.

- `REVOKED`: An authorized profile sets the `revoked` state to true. Once set to true, the state SHOULD NOT be modified.
To overturn the state, a new `Attestation` with the same `attestationType` in a false state MAY be queryed to reveal the new status.
Enforcement: New issuance SHOULD be disabled. Token transfers SHOULD be halted. Only an authorized attestor who issued the `Attestation` MUST possess the permission to flag the profile's `VerificationState` to `REVOKED`.

#### State Transitions

 Below plots the deterministic transitions between verification states.

Example:

```text
                    valid attestation
           ┌──────────────────────────────────────────────┐
           │                                              ▼
      UNVERIFIED ◄──────────────────────────────────── VERIFIED ◄───────┐
           │          policy fails                        │   ▲         │
           │                                      expires │   │ renewed │
           │                                              ▼   │         │
           │                                            STALE ┘         │
           │                                              │             │
           │              revoke attestation              │             │
           └──────────────────────┬───────────────────────┘             │
                                  ▼                                     │
                               REVOKED ─────────────────────────────────┘
                                        reinstated

```

#### Attestation Discovery

`Attestation` tagging is necessary to provide predictable query endpoints for external smart contracts.
An `Attestation` SHOULD NOT be stored solely by its primary `attestationId`.
Querying parties may not know the exact identifier in advance,
the registry MUST generate relational tagging maps upon submission.
It is RECOMMENDED that the tagging record consist of three attributes from the `Attestation`;
`subjectIdentifier`, `attestor` and `attestationType`

```solidity

// Tagging Map layout: subjectIdentifier -> ENTITY address -> attestationType = attestationId
mapping(bytes32 => mapping(address => mapping(bytes32 => bytes32))) internal _taggedAttestations;

```

During verification,
the registry retrieves the full `Attestation` record using the discovered `attestationId`.
The `VerificationState` of a profile is directly driven by its active,
tagged `Attestation` records.
The registry exposes these states transparently.
Token issuers and external protocols MAY integrate with this interface to support pausing mint, burn, or transfers when an `ASSET` verification state is updated.
The verification framework itself remains strictly an authoritative source of truth.

Shielded attestations MUST BE EXEMPT from on-chain relational Tagging Maps. A shielded attestation MUST NEVER be stored or indexed by `owner_pubkey` or `attestationType` in contract storage.
Instead, verification of shielded claims is conducted entirely off-chain via Zero-Knowledge Merkle membership proofs: the participant proves possession of a valid, unexpired leaf inside the Attestation Merkle Tree without revealing the leaf, the attestation type, or their public key to the verifier contract.

#### Smart Contract Discovery

During the verification discovery process,
a verifier evaluates the profile to ensure compliance.
Every registered `ASSET` profile binds an `assetId` to an underlying token smart contract. 
The discovery interface SHOULD expose the operational, technical,
and administrative properties of that specific token contract.

This enables all parties to programmatically evaluate tokenized product's architecture.
When discovering an `ASSET` profile,
the interface SHOULD provide mechanisms to inspect:

- Contract Architecture: The `tokenContract` address referenced in the `ASSET` profile, and if that contract is upgradeable (e.g., via a proxy pattern), the underlying smart contract address for where the active execution code currently lives.
- Administrative Controls: The addressses allowed to upgrade the `tokenContract`, including any timelock mechanisms that delay code changes.
- Operational Flags: Real-time state flags indicating whether the `tokenContract` is paused, permissioned, or enforces custom transfer restrictions.
- Supply Authorities: The designated addresses authorized to execute mint and burn operations.

## Security Considerations

The verification engine acts as an cryptographic recordkeeper but
cannot verify off-chain conditions.
Consequently, the security of the framework depends entirely on the integrity of the participating actors,
their updated attestation,
and the execution of state changes.

Implementation must consider the inherent boundary between off-chain events and on-chain state:

There is an unavoidable delay between an off-chain occurrence and the submission of a corresponding revocation or
update transaction on-chain.
Authorized attestors may maliciously or negligently omit negative information while selectively publishing favorable attestations.

#### Attestor Compromise

A compromised or malicious attestor private key allows unauthorized actors to publish fraudulent attestations,
forge compliance claims, or
maliciously revoke profiles.
Off-chain key. safty, best practices and
key comprise mitigation is beyond the scope of this document.

#### Cryptographic Agility and ECDSA Deprecation

While the framework supports standard ECDSA signatures, 
via [EIP-712](https://eips.ethereum.org/EIPS/eip-712)
for immediate compatibility with existing Externally Owned Accounts (EOAs).
The underlying mathematics of elliptic curves remain vulnerable to future quantum computing advances.
To ensure long-term survivability,
the framework should rely on [EIP-1271](https://eips.ethereum.org/EIPS/eip-1271)
(`isValidSignature`) to support upgradeable smart contract wallets.
In alignment with phased migration principles established by the 
[NIST Post-Quantum Cryptography Standards](https://csrc.nist.gov/projects/post-quantum-cryptography).Implementations should support a phased Cryptographic Deprecation Phase:

- Grandfathered Signatures: All attestations recorded prior to an agreed protocol deprecation timestamp remain fully valid for their remaining validity window.
- Deprecation of Native ECDSA: New attestations submitted using legacy elliptic curve signatures after the deprecation milestone should be rejected or flagged as non-compliant, requiring entities to utilize quantum-resistant smart contract wallets (e.g., via [ERC-4337](https://eips.ethereum.org/EIPS/eip-4337) or [EIP-7702](https://eips.ethereum.org/EIPS/eip-7702))

#### Merkle Root Concurrency

In the shielded mode,
participants generate Zero-Knowledge proofs off-chain against a specific on-chain Attestation Merkle Root.
In high-throughput registries,
rapid issuance of new attestations will advance the Merkle root frequently.
If the verifier only validates against the single latest Merkle root,
transactions generated off-chain may frequently revert due to on-chain state race conditions (root front-running).

To mitigate this denial-of-service condition:

The on-chain verifier should maintain a historical ring buffer of recent valid Merkle roots,
consistent with the root-history pattern established in
[EthSystems Shielded Pool Specification](https://github.com/ethsystems/specs/blob/main/specs/2/README.md) and
[Semaphore Protocol Architecture](https://docs.semaphore.pse.dev/).

The verifier must accept proofs generated against any root within this authorized historical window, (e.g., the last 50 to 100 valid roots).

Privacy Scope: owner_pubkey provides pseudonymity, not unlinkability. Observers can observe which entities have issued attestations to an owner_pubkey. Full privacy applies to the real-world identity (which is never stored on-chain) and the transacting wallet address (which transacts using Zero-Knowledge proofs without revealing owner_pubkey).

## Copyright

Copyright and related rights waived via [CC0](https://creativecommons.org/publicdomain/zero/1.0/).

## References

