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

To achieve this privacy,
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
(e.g., [EIP-712 Typed Data Signatures]() for EVM-compatible networks) to ensure the data is readable by user wallets.
To ensure cryptographic agility across different blockchain networks,
implemented attestation frameworks SHOULD use universal signature verification logic.
This logic MUST support both native cryptographic keypairs (e.g., standard [ECDSA]()) and
smart contract wallet standards (e.g., [EIP-1271]()).
Supporting smart contract wallets ensures that entities can seamlessly upgrade to post-quantum signature schemes in the future.

For information regarding the eventual system-wide deprecation of native elliptic curve cryptography and the transition to quantum-safe environments, see the [Security Considerations]() section.

The `revoke` field indicates the active status of the attestation.
Upon an `Attestation` submission,
this value MUST be set to false.
The state of the `revoke` field MUST be modified only by the `attestor` or
by a delegate address authorized by the `attestor`.

### Profile Registration 

Before an actor can submit attestations,
they MUST be a registered a profile within the registry.
A registration establishes the on-chain identity,
defines their visibility preferences and the profile type of the actor.

While the registry MAY allow permissionless registration, 
where anyone address can create a profile,
the profile is dictated by the Asset integrators.
An `AssetProfile` SHOULD  whitelist which registered Entity Profiles it trusts to act as its authorized Attestors.

#### Attestation Links to Profiles

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

The implementation SHOULD allow a verifier to determine:

### Entity Profile

```solidity

struct EntityProfile {
    address entity;
    bytes32 did; // Optional Decentralized Identifier
    VisibilityPreference visibility;
    address authorizedKey;
    bytes32 legalDocumentHash;
    bool isActive;
}
```

####  Rights Profile interface

The implementation SHOULD expose the real world rights associated with the Tokenized Asset ownership. Examples of potential rights attributes MAY clarify:

```solidity

bool votingRights; // The token holder has voting rights.
bool dividendRights; // The token may/may not entitled to dividends.
bool redemptionRights; //
bool corporateActionRights; //
bool ownershipRights; //
bool economicExposure; //
```

Changes to token-holder rights MUST be recorded.
The verification interface MUST expose the current rights and SHOULD expose historical rights.
All right SHOULD be accompanied by attestations.

#### Entity Legal Actions

The implementation SHOULD expose the relevant parties and
legal structure through attestations, 
so that users can understand where claims ultimately reside.

A tokenized asset is rarely supported by a single entity.
Its operational architecture relies on a network of specialized third parties (e.g., Custodians, Transfer Agents, Legal Counsel).
Therefore, implementations of the verification framework SHOULD NOT rely on a single `Entity` profile submiting the `Attestation`s for an `Asset` profile.
Instead, SHOULD utilize a mosaic of distinct `Attestation`s to reconstruct the off-chain operational
and legal structure on-chain.
By mapping specific schema claims (such as backing reserves or voting rights)
directly to the independent parties (`Entity` profiles) responsible for them,
the verification framework ensures that users can accurately trace the origin of every claim and
isolate specific counterparty risks.

#### Cryptographic Proof of Audit (Auditor Authorization)

When an authorized Auditor (acting under an `ENTITY` profile) needs to issue a secondary attestation regarding a `SHIELDED` participant, the smart contract MUST cryptographically verify that the Auditor was explicitly granted access to the private data. The smart contract CANNOT rely on off-chain trust assumptions.

To satisfy this requirement:
1. The participant MUST securely share their **Viewing Key** with the Auditor off-chain.
2. The Auditor MUST generate a **ZK Proof of Audit**. This cryptographic proof asserts: *"I possess the valid Viewing Key for a specific anonymous leaf in the Merkle Tree, and I am signing this new on-chain transaction based on its contents."*
3. The registry MUST expose an interface for the Auditor to submit this proof alongside their new attestation.

```solidity
function submitAuditorAttestation(
    bytes32 newAttestationType,
    bytes memory newResultData,
    bytes calldata zkProofOfAudit
) external;
```
The smart contract MUST verify the `zkProofOfAudit` against the public Merkle Root before accepting the Auditor's submission, guaranteeing on-chain that the `ENTITY` was authorized without exposing the Viewing Key.

### Asset Profile

A token represented in the verification engine is considered a tokenized asset if an asset profile is declared.
This is REQUIRED to differeniate on-chain tokens from tokens that have real world attachments or
claims to them.
Before an Asset is considered compliant, the implementation SHOULD register at minimum the following information:

```solidity
struct AssetId{
  bytes32 assetId;
  uint256 chainId;
  address issuer;
  address tokenContract;
  
}
```

The `chainId` is MAY NOT be defined in cases where justified.
The `assetId` value SHOULD be generated at the time of asset registration.
In some cases there can be more than one issuing party responisble for an asset tokenization.
The `issuer` value SHOULD be the main identifying party that has real world resources publicly sharing the address ownerships and activiy.
In other words, this address does not need to be the owner of the token contract,
only a publicly idenitifing party.

#### Asset Metadata

The tokenization landscape is a fast pace ever changing envirnoment.


```solidity
struct AssetMetadata{
    bytes32 assetId;
    uint256 timestamp; 
    uint256 representationRatio;                
    Attest[] attestations;         
    // The three core rights, represented by their attestationID
    bytes32 redemptionRightAttestationId;
    bytes32 insolvencyProtection;
    bytes32 nativeOwnership;
    
    address[] extensionMetadata; // Optional
}
```

The core three rights defined in the metadata SHOULD be the value of `attestationID`.
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

#### Eligibility & Classification

An implementation MAY represent eligibility through an on-chain attestation or zero-knowledge proof.
A participant's eligibility status MUST NOT expose unnecessary underlying identity information.
Participants MAY choose their `VisibilityPreference` (Transparent or Shielded) depending on their operational privacy requirements.


```solidity
struct ParticipantProfile {
    address wallet;
    uint256 participantType;
    bytes32 shieldedKeyHash; // For SHIELDED profiles, this is the commitment
    VisibilityPreference visibility;
    bytes32 jurisdiction;
}
```
#### KYC

#### Transfer Restriction


### Verification Interface

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
Enforcement: New minting SHOULD be disabled, unless separate defined policy explicitly permits otherwise. This disabled SHOULD be an on-chain flag.

- `UNDERBACKED`: The verified quantity of underlying assets is less than the required token supply.
This flag MUST be attached with an attestation profile.
Enforcement: New issuance SHOULD be disabled.

- `REVOKED`: An authorized entity profile submits an revocation attestation.
SHOULD be a valid revoke and not a reserved/overturn revoke.
Enforcement: New issuance SHOULD be disabled. Token transfers SHOULD be halted.

#### State Transitions

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
   │ backing < supply attestation
   ▼
UNDERBACKED

VERIFIED
   │
   │ revoke attestation
   ▼
REVOKED

```


#### Query Interface

A compliant implementation MUST expose a machine-readable verification interface for each profile.
The interface MUST allow any party to verify the following:

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


#### Contract Integrity

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

### Security Considerations

#### Attestor Compromise

A compromised Attestor may issue false or incorrect Attestations.
This standard does not cryptographically eliminate this risk.
The protocol MUST therefore define:

* recognized Attestors;
* Attestation validity periods;
* revocation;
* emergency states;
* optional multi-attestor requirements.

#### Stale Evidence

Long-lived attestations create the risk that a previously correct statement is treated as current.
Implementations SHOULD use short, policy-defined validity periods for high-risk claims.

An Attestation does not guarantee future custody.
The protocol MUST treat backing as a time-dependent property.

#### Cryptographic Agility and ECDSA Deprecation
While the standard currently supports standard ECDSA signatures (via EIP-712) for immediate compatibility with existing Externally Owned Accounts (EOAs), the underlying mathematics of ECDSA are vulnerable to future quantum computing threats. To ensure long-term security, the standard relies on EIP-1271 (isValidSignature) to allow entities to utilize upgradeable Smart Contract Wallets.

However, relying entirely on individual entities to proactively rotate their keys is inefficient. The standard acknowledges that the broader Ethereum network will eventually transition to post-quantum cryptography (e.g., via Account Abstraction and EIP-7702). When this industry-wide transition occurs, implementations of the Verification Engine SHOULD support a Cryptographic Deprecation Phase.

During this phase:

Grandfathered Signatures: All attestations signed and recorded prior to the deprecation timestamp remain fully valid.
Deprecation of ECDSA: Any new attestations submitted using native ECDSA signatures after the deprecation timestamp SHOULD be flagged as "low credibility" or outright rejected by the engine, forcing entities to utilize EIP-1271 quantum-safe smart wallets for all future claims.

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

#### Cryptographic Agility and ECDSA Deprecation
While the standard currently supports standard ECDSA signatures (via EIP-712) for immediate compatibility with existing Externally Owned Accounts (EOAs), the underlying mathematics of ECDSA are vulnerable to future quantum computing threats. To ensure long-term security, the standard relies on EIP-1271 (`isValidSignature`) to allow entities to utilize upgradeable Smart Contract Wallets.

However, relying entirely on individual entities to proactively rotate their keys is inefficient. The standard acknowledges that the broader Ethereum network will eventually transition to post-quantum cryptography (e.g., via Account Abstraction and EIP-7702). When this industry-wide transition occurs, implementations of the Verification Engine SHOULD support a **Cryptographic Deprecation Phase**. 

During this phase:
*   **Grandfathered Signatures:** All attestations signed and recorded prior to the deprecation timestamp remain fully valid.
*   **Deprecation of ECDSA:** Any *new* attestations submitted using native ECDSA signatures after the deprecation timestamp SHOULD be flagged as "low credibility" or outright rejected by the engine, forcing entities to utilize EIP-1271 quantum-safe smart wallets for all future claims.
