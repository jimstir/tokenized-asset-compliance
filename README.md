# Tokenization Assurance Framework (TAF)

An open, verifiable trust and assurance standard bridging the divide between smart contracts and off-chain physical reality for tokenized real-world assets (RWAs).

---

## Overview & Mission

While blockchain networks provide immutable ledgers for token supply and execution, **a smart contract cannot independently observe or verify physical reality**. A token contract knows how many units exist, but it cannot inspect a bank account, count bullion in a vault, verify transfer-agent records, or detect corporate insolvency.

Today, token issuers attempt to bridge this divide using static off-chain PDFs, marketing websites, and fragmented legal disclaimers. This leaves retail consumers and DeFi protocols exposed to:
* **Self-Certification Vulnerabilities:** Issuers acting as the sole source of truth regarding their own collateral.
* **Opaque Legal Rights:** Disparate, hidden fine print regarding redemption rights, insolvency protection, and beneficial ownership.
* **Settlement Latency:** Exploitation of the time lag between on-chain trading and traditional off-chain settlement.

The **Tokenization Assurance Framework (TAF)** establishes a consumer-first assurance layer across the tokenization lifecycle. It translates off-chain legal agreements, qualified custody balances, and institutional audits into a standardized, deterministic on-chain state machine.

---

## Core Methodology

TAF is built upon four fundamental architectural principles:

### 1. Separation of Duties (The Mosaic Model)
No tokenized asset should rely on a single entity to certify its validity. Real-world compliance relies on an ecosystem of specialized counterparties. TAF standardizes independent attestation records from distinct actors:
* **Qualified Custodians** attest to verified underlying reserve balances.
* **Independent Legal Counsel** attests to enforceable tokenholder rights (redemption, bankruptcy remoteness, and direct legal title).
* **Compliance Authorities** attest to participant eligibility and accreditation.

By mapping claims directly to the responsible `ENTITY` profiles, verifiers can deterministically trace the origin, authority, and provenance of every claim.

### 2. Dual-Mode Attestations (Transparent & Shielded)
Compliance cannot come at the expense of consumer privacy:
* **Transparent Mode:** For public institutions, issuers, and audited assets. Claims are recorded on-chain, hashed with deterministic collision-resistant IDs, and indexed via **Attestation Tagging Maps** for $O(1)$ query discovery (`subject` $\rightarrow$ `claimType` $\rightarrow$ `attestor`).
* **Shielded Mode:** For privacy-preserving participants. Utilizes a **Dual-Key Architecture** over the Baby Jubjub curve:
  * *Shielded Spending Key (`owner_pubkey`):* Held strictly private in the user's wallet for generating Zero-Knowledge execution proofs.
  * *Viewing Key:* Selectively shared with authorized auditors off-chain.
  * *Proof of Audit:* Auditors submit transactions with ZK proofs verifying that the participant authorized the audit, inserting an un-doxxed leaf into an incremental `Poseidon4` Merkle Tree.

### 3. Dynamic State Evaluation & Gasless Expiration
Real-world backing is a time-dependent condition, not a permanent invariant:
* **Dynamic `STALE` Derivation:** When an attestation's validity window elapses (`block.timestamp > validUntil`), the verification engine derives the `STALE` state on-the-fly at query time. This eliminates the need for expensive, 24/7 automated keeper bot transactions.
* **Quantitative Ratio Enforcement:** Supports arbitrary backing ratios (`representationRatio`, such as 1:1, 1:10, or fractional shares), programmatically flagging underbacked assets as `UNVERIFIED`.
* **The 4-State Lifecycle:** Deterministically transitions between `UNVERIFIED`, `VERIFIED`, `STALE`, and `REVOKED`.

### 4. Separation of Powers
TAF functions strictly as an **authoritative verification engine and source of truth**. It does not arbitrarily force token transfers to freeze. Instead, external protocols, automated compliance bridges, and token contracts query TAF's standardized interface to trigger their own governance actions (such as halting mints or pausing secondary trading when verification degrades).

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
