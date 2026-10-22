# Tokenization Assurance Framework (TAF)

An open, verifiable trust and assurance standard bridging the divide between smart contracts and off-chain physical reality for tokenized real-world assets (RWAs).

---

## Overview & Mission

While a blockchain's consensus mechanism provides absolute cryptographic certainty over native on-chain assets, the ledger cannot independently observe the physical world. A network of validator nodes can mathematically verify a token’s supply and state transitions, but it cannot inspect a bank account, count bullion in a vault, or verify a corporate transfer-agent register.

This raises the fundamental challenge of tokenization. If a blockchain cannot directly inspect physical reality, how close can a real-world asset get to the consensus-backed trust of native on-chain assets?

The Tokenization Assurance Framework (TAF) bridges this gap by translating off-chain custody, legal title, and independent audits into deterministic on-chain state machines.

Today, token issuers attempt to bridge this divide using static off-chain PDFs, marketing websites, and fragmented legal disclaimers. This leaves retail consumers exposed to:

* **Self-Certification Vulnerabilities:** Issuers acting as the sole source of truth regarding their own collateral.
* **Opaque Legal Rights:** Disparate, hidden fine print regarding redemption rights, insolvency protection, beneficial ownership and other deceptive corporate practices.
* **Settlement Latency:** Exploitation of the time lag between on-chain trading and traditional off-chain settlement.

The Tokenization Assurance Framework (TAF) establishes an open, consumer-first assurance layer across the tokenization lifecycle. Instead of forcing investors to blindly trust third-party issuers and centralized intermediaries, TAF translates off-chain legal agreements, qualified custody balances, and institutional audits into a standardized on-chain state machine—empowering any tokenholder or smart contract to independently verify the true backing, legal rights, and solvency of an asset in real time."

---

## Core Methodology

TAF is built upon four fundamental architectural principles:

### 1. Separation of Duties
No tokenized asset should rely on a single entity to certify its validity. Real-world compliance relies on an ecosystem of specialized counterparties. TAF standardizes independent attestation records from distinct actors:
* **Qualified Custodians** attest to verified underlying reserve balances.
* **Independent Legal Counsel** attests to enforceable tokenholder rights (redemption, bankruptcy remoteness, and direct legal title).
* **Compliance Authorities** attest to participant eligibility and accreditation.

By mapping claims directly to the responsible `ENTITY` profiles, verifiers can deterministically trace the origin, authority, and provenance of every claim.

### 2. Dual-Mode Attestations (Transparent & Shielded)
Compliance cannot come at the expense of consumer privacy:
* **Transparent Mode:** For public institutions, issuers, and audited assets. Claims are recorded on-chain, hashed, and indexed via Attestation Tagging Maps for query discovery (`subject` $\rightarrow$ `claimType` $\rightarrow$ `attestor`).
* **Shielded Mode:** For privacy-preserving participants and confidential entities. Adapts the **Dual-Key Architecture** from [EthSystems]():
  * *Shielded Spending Key:* The profile owner holds a private spending key to generate Zero-Knowledge execution proofs, deriving their public identifier (`owner_pubkey = Poseidon(spending_key)`) without revealing their on-chain wallet address.
  * *Viewing Key:* A companion cryptographic key selectively shared off-chain with authorized auditors to decrypt underlying compliance documents.
  * *Proof of Audit & Revocation:* Authorized entities submit attestations into a Merkle Tree. Participants prove compliance in zero knowledge without doxxing their identity or past activity.

### 3. Dynamic State Evaluation & Gasless Assurance

Real-world backing and legal standing are time-dependent conditions, not static guarantees:
* **Time Bound Attestations:** When an attestation's validity window elapses, the `VerificationEngine` derives the `STALE` state dynamically at query time.
* **Quantitative & Legal Backing Verification:** Programmatically compares custodian-reported reserves against circulating token supply (supporting 1:1, multi-asset, or fractional backing ratios), while simultaneously inspecting mandatory legal covenants: enforceable redemption rights, bankruptcy remoteness, and direct beneficial ownership.
* **Deterministic 4-State Lifecycle:** Explicitly resolves an asset's real-time compliance into four transparent states: `VERIFIED`, `UNVERIFIED`, `STALE`, or `REVOKED`. This in an effort to prevent undercollateralized or disputed assets from silently propagating bad debt through the tokenized product lifecycle without the consumer's knowledge.

### 4. Separation of Powers

TAF functions strictly as an authoritative verification engine and independent source of truth, not a centralized execution censor:
* **No Arbitrary Admin Freezes:** TAF contracts do not hold admin backdoors to unilaterally seize funds or freeze token balances. 
* **Composable Policy Enforcement:** Downstream applications—including ERC-20 token contracts, DeFi lending pools, and cross-chain bridges can query TAF's standardized interface to trigger their own automated risk policies.
* **Separation of Measurement from Execution:** By decoupling the evaluation of real-world claims from token transfer mechanics, TAF maintains credible neutrality while providing an open, machine-readable standard for consumer protection.

---

## Repository Structure

* **[`docs/specs/`](docs/specs/)**: Formal RFC specification documents adhering to the [COSS/1 standard](docs/specs/README.md), defining data structures, identity flows, and verification policies.
* **[`reference/`](reference/)**: The reference implementation, containing:
  * Modular Solidity smart contracts (`ProfileRegistry`, `AttestationRegistry`, `AttestationMerkleTree`, `ZKVerifier`, `VerificationEngine`, and `TokenizedAsset`).
  * Automated Hardhat test suite covering 100% of state transitions and cryptographic flows.
  * Actor-specific CLI tooling (`npx taf verify`, `npx taf inspect`, etc.).
  * **[`reference/INSTRUCTIONS.md`](reference/INSTRUCTIONS.md)**: Operational guides for Issuers, Custodians, Auditors, and Participants.

---

## License

Copyright and related rights waived via [CC0 1.0 Universal](LICENSE).
