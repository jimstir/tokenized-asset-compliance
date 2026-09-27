
## Abstract
The document discusses a proposed standard for on chain tokenized assets verification. This proposal suggests the use of an universal open on-chain verification mechanism that allows independent auditing of tokenized assets.

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


TAVS does **not** attempt to prove the truth of every external fact recursively.

In particular, TAVS does not attempt to answer, "Who audits the attestor?"

Instead, the specification defines which attestors are recognized for particular claims and what guarantees their attestations provide.


## Proposed Standard / Design

The proposed standard introduces a few components that promote independent auditing. The blockchain that stores the smart contracts will store the history of verification so an individual can check the history of verification as well.
There is an attestation verification profile. The attestation profile will support the addition of different profile roles. The recommended defined role profiles to support tokenized assets verification discussed in this document will be entity profile, participant profile, and asset profile. 
Each type of verification has a profile which is considered its identifier in the verification protocol. Each profile must enter an on-chain registry. 
The registry defines a few attributes that are immutable. 
### Attestation Registry
The attestation registry is on-chain registration that each profile registers. The specific profiles that must create attestation will make attestation in this registry. 
The chain does not understand specific attestation, but each profile does have queryable information.
The registry create attestation types to match
The registry can create new entity and participant profiles. The attestation profile should remain unchanged to conform to the standard. When a new profile is added than the 
### Registry Profiles
Each profile needs an on chain identity that identifies its profile.
#### Legal Document Attestations
An important aspect of tokenized assets is attaching real world legal structure to the product. Legal document attestations are an attribute of an entity profile. These legal are different between products, they may be upgraded at any time, and are solely approved by an entity. The participant of the product  formally does not have input in the construction of these legal documents, just agree to them before using the product. The verification system needs to tie the history of these documents to the entity, either the custodian, the issuer, or any other relevant entity tied to the tokenized asset real world operations.
The verification system does not need to verify the take of legal document or its validity. The main requirement is that the association and the article documents are record on chain. The documents will be off-chain assets so the entity will provide the resources for other parties to retrieve these documents.
To verify the association, the entity profile should create a public signing key. This can be done by using a DID, decentralized identifiers,and verification process.
The implementation can define how relevant corporate actions affect the Tokenized Asset.
Examples include:
* stock splits;
* reverse splits;
* dividends;
* mergers;
* acquisitions;
* spin-offs;
* ticker changes;
* security identifier changes.
Corporate actions MUST NOT silently change the representation relationship.
For example, if the underlying security undergoes a split, the implementation MUST update the representation and backing model according to the defined corporate-action policy.
The change MUST be discoverable through the verification interface.

#### Entity Profile Decentralized Identity

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

- Resolve DID
        - obtain public key/wallet address
 - Resolve official domain
        - verify DID binding
- Read on-chain reference
  - verify expected DID/domain
        - Verify attestation signature
       ACCEPT

Example DID json schema:

{
  "@context": [
    "https://www.w3.org/ns/did/v1"
  ],
  "id": "did:example:acme123",
  "verificationMethod": [
    {
      "id": "did:example:acme123#key-1",
      "type": "JsonWebKey2020",
      "controller": "did:example:acme123",
      "publicKeyJwk": {
        "kty": "OKP",
        "crv": "Ed25519",
        "x": "<PUBLIC_KEY>"
      }
    }
  ],
  "authentication": [
    "did:example:acme123#key-1"
  ],
  "assertionMethod": [
    "did:example:acme123#key-1"
  ],
  "service": [
    {
      "id": "did:example:acme123#domain",
      "type": "LinkedDomains",
      "serviceEndpoint": "https://acme.example"
    }
  ]
}
On the Entity Domain should host could hold:
{
  "did": "did:example:acme123",
  "verificationMethod": "did:example:acme123#key-1",
  "domain": "acme.example",
  "proof": {
    "type": "Ed25519Signature",
    "created": "2026-09-25T00:00:00Z",
    "proofPurpose": "domainBinding",
    "signature": "<SIGNATURE>"
  }
}

#### Participant Verification Profile Requirements

### Participant Eligibility
Where participant eligibility is required, a compliant implementation MUST provide a mechanism for determining whether a wallet or participant is permitted to interact with the Tokenized Asset.
The eligibility system MAY use:
* KYC;
* KYB;
* sanctions screening;
* jurisdictional restrictions;
* regulatory classifications;
* accredited/institutional status;
* other applicable eligibility criteria.
Eligibility information SHOULD NOT be exposed publicly where disclosure is not required.
An implementation MAY represent eligibility through an on-chain attestation or zero-knowledge proof.

####  Verification interface
 The verification process has two components, the user verification and verifications failures. User verification includes each profile and establishes that an attestation is recorded and its attributes. Certain attributes like if an attestation has failed or approved.
expose a default interface, allow it to be modular



#### Time bound Attestations
Verification engine uses ‘issued_at’ and ‘ends_at’ to see if contract states valid or expired or revoked, etc.
#### Expose Mint/Burn
Verification exposes who can mint, rules to burn and mint, etc
#### Verification Failures
The standard should define what each failure state causes the protocol to do.

STALE
→ new minting disabled

UNDERBACKED
→ minting disabled
→ appropriate trading restrictions

REVOKED
→ asset enters emergency state

UNVERIFIED
→ asset cannot be treated as verified

RECONCILIATION_FAILURE
→ predefined emergency controls





———————————
Example:
function hasAttestation(
    bytes32 participant,
    AttestationType attestationType
) external view returns (bool);

