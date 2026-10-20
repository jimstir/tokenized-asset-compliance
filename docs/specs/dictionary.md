# Standard Attestation Type Dictionary

This document specifies the canonical dictionary of standardized `attestationType` identifiers used across the Tokenization Assurance Framework (TAF).

## Overview

In smart contract storage and Zero-Knowledge circuit leaves, an `attestationType` is stored as a fixed 32-byte cryptographic hash (`bytes32`) rather than a variable-length string:

$$\text{attestationType} = \text{keccak256}(\text{ASCII\_STRING\_IDENTIFIER})$$

Storing fixed hashes eliminates on-chain storage bloat and guarantees $O(1)$ gas costs for lookups and comparisons. Off-chain applications, indexers, frontends, and auditors use this dictionary to translate between the on-chain `bytes32` values and human-readable compliance claims.

---

## 1. Custody & Reserve Verification

Attestations certifying that real-world assets backing the token are held in custody, verified, and audited.

| String Identifier | `bytes32` Keccak-256 Hash | Legal & Operational Meaning |
| :--- | :--- | :--- |
| `CUSTODY_RESERVES` | `0x2cf528cc44abd39ca4f7029ba88d5c967f0f897a0bbff1b962513bf185c779e1` | Verified quantitative balance of reserve collateral held by a qualified custodian. |
| `CUSTODY_VERIFIED` | `0x3ce7414d3576a2599edb4fd4a72f1316f9cb64f570820f08b3dec2cb64844e09` | Qualitative confirmation that an active custody agreement is in effect with an authorized custodian. |
| `PROOF_OF_RESERVES` | `0xecd64b50e718480c1054f7e59dca65e2cc70333c541dd7ad6d14ca013c931364` | Third-party cryptographic or accounting attestation proving collateral matches token supply. |
| `SEGREGATED_ACCOUNT` | `0x0b193c7124077eedb32afd6134dc3feb997ec040645ff7bd368d9ceadafe48c1` | Collateral is maintained in an omnibus or segregated FBO (For Benefit Of) client account. |

---

## 2. Legal Structure & Tokenholder Rights

Attestations defining the legal enforceability of token ownership and collateral claims under applicable commercial law.

| String Identifier | `bytes32` Keccak-256 Hash | Legal & Operational Meaning |
| :--- | :--- | :--- |
| `REDEMPTION_RIGHT` | `0x32f5c4801e783d1ddf59d35ae5138d08c4d392f22efa14b0ee44f487f91a45b3` | Tokenholder possesses an enforceable bilateral legal right to redeem tokens for physical/fiat assets. |
| `INSOLVENCY_PROTECTION` | `0xe7faee435f84d481328b67c658f2554cdcb36729df283e6900d4234c59c939f4` | Underlying reserves are held in a bankruptcy-remote structure shielded from issuer insolvency. |
| `NATIVE_OWNERSHIP` | `0x807da3ef51cc58aff3bb9f32d8b41460f681ad0542883c0b223d87527781f395` | Token represents direct legal title to the property (unencumbered beneficial ownership). |
| `BANKRUPTCY_REMOTE` | `0x3104ba631e378033ba2e837486f1fe5921c60fd6f8eb8991690eb7573b50a8a0` | The legal entity holding the assets is structured as an SPV isolated from credit risk. |
| `BENEFICIAL_OWNERSHIP` | `0x084540f4d2f25ff5f42baa4ef9e30d475ac64dccdd71af60a76437d3ea7b8e3f` | Token confers equity or debt beneficial interests rather than naked debt claims. |
| `SYNTHETIC_EXPOSURE` | `0xb27e6de77479a465c5d3163dc1427f0d0d8e31e23fb30b2893be39467c271d05` | Explicit declaration that the token tracks price/index performance without ownership title. |

---

## 3. Audit, Assurance & Regulatory Filings

Attestations referencing legal opinions, independent accounting certifications, and regulatory registrations.

| String Identifier | `bytes32` Keccak-256 Hash | Legal & Operational Meaning |
| :--- | :--- | :--- |
| `INDEPENDENT_AUDIT` | `0x3308c78a22a2ecbd932bd1b9eebe1065af1b0d308f4436e9202abee0e25697a8` | Independent CPA or accounting audit report covering the tokenized asset structure. |
| `FINANCIAL_AUDIT` | `0x266b44f7410b927160639b592c04adc2e3b4d20b460fe7bb9e8855cd39f8ff08` | GAAP/IFRS audited balance sheet and reserve statement. |
| `LEGAL_OPINION` | `0xd5e05842baaf012467838205d0bd800733a10c86c17bb910e77e53067caa74f5` | Formal legal opinion letter analyzing securities status, UCC Article 8/9 perfection, or tax classification. |
| `REGULATORY_FILING` | `0x9b090b670e153329a799a1b6eef1b2aaa4686151d75ffca510b1436743c2d363` | Public disclosure filed with the SEC, CFTC, or foreign regulatory authority (e.g., Form D, Form 1-A). |

---

## 4. Participant & Investor Due Diligence

Attestations certifying investor eligibility, AML/KYC status, and compliance exemptions.

| String Identifier | `bytes32` Keccak-256 Hash | Legal & Operational Meaning |
| :--- | :--- | :--- |
| `KYC_PASSED` | `0x8198966b374d1cbb64517af77c9cfe1776304682a02cfc0e8c918a5a94969ef8` | Natural person identity verified per BSA / FinCEN AML guidelines. |
| `KYB_PASSED` | `0xe25400b24795efe74ad5e09ad7415ef8d8c53420202d6cab4e1c98615cf4095e` | Corporate entity identity and ultimate beneficial ownership (UBO) verified. |
| `ACCREDITED_INVESTOR` | `0xc6490bca666653d9c895eb35db9ee67a1b062680313a2a94196d3251d008a11b` | Accredited investor verification under SEC Rule 501 of Regulation D. |
| `QUALIFIED_PURCHASER` | `0xf488e0fa3a4c996d5ba832732198a1a0990f196e900e673305a923f66838a389` | Qualified Purchaser certification under Section 2(a)(51) of the Investment Company Act. |
| `QUALIFIED_INSTITUTIONAL_BUYER` | `0xab21d317d9fd026e6a325ce9fc08496eebe9e7255daaadba0a1abd7648e48da2` | Qualified Institutional Buyer (QIB) status under SEC Rule 144A. |
| `SANCTIONS_SCREENING_CLEARED` | `0x099efe963e69db123e9846575d4b2a7e9fe2ee1f5b8d031ee203a97dd6ce0306` | Participant cleared against OFAC, EU, UN, and international sanctions lists. |
| `TAX_RESIDENCY_VERIFIED` | `0xc6ba6647b1a7f931fdf018405e10c44995f6094a6814a3eb1aeaca376bcbf6c5` | Tax jurisdiction certified via W-9, W-8BEN, or CRS documentation. |

---

## 5. Traditional Market Linkages

Attestations connecting the on-chain asset to traditional capital market infrastructure.

| String Identifier | `bytes32` Keccak-256 Hash | Legal & Operational Meaning |
| :--- | :--- | :--- |
| `TRANSFER_AGENT_REGISTERED` | `0x7791289542f93ed310b5d44f046f7e169cf4d0e3fce2e8525e142e9737798617` | Official records maintained by an SEC-registered transfer agent. |
| `UCC_FILING_PERFECTED` | `0x2f35e25ab5ffc75c1bd2bf6a385428ea5b4e14deee63ab9ea7ed942c6efd6889` | Security interest perfected under UCC Article 8 or 9 in relevant state jurisdiction. |
| `ISIN_MAPPED` | `0x817896a0b6424d7b940d6705c59d1722d8fc85422c0e35099470ce77296252d8` | Token corresponds to an active International Securities Identification Number (ISIN). |
| `CUSIP_MAPPED` | `0x38fbabbc27dd634d554b5f72280a63fa0468c4a39e7f196580a493e6e3d76630` | Token corresponds to an active Committee on Uniform Securities Identification Procedures (CUSIP) number. |

---

## 6. Custom Attestation Types & Publishing Schema

When an `ENTITY` introduces a new or bespoke attestation requirement not listed in the core dictionary, the entity MUST publish a machine-readable JSON schema defining the mapping between the `bytes32` hash and its human-readable meaning.

### Recommended JSON Dictionary Schema

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "TAF Custom Attestation Dictionary",
  "entity": "did:web:issuer.example.com",
  "types": {
    "0x2cf528cc44abd39ca4f7029ba88d5c967f0f897a0bbff1b962513bf185c779e1": {
      "identifier": "CUSTODY_RESERVES",
      "category": "CUSTODY",
      "description": "Audited proof of reserve balance for US Treasury Bills held at Bank NY Mellon.",
      "legalStandard": "SEC Rule 206(4)-2 Custody Rule"
    }
  }
}
```

The URI or IPFS CID pointing to this schema SHOULD be linked within the `ENTITY` profile's `legalDocumentHash` or published at their standardized DID well-known endpoint (e.g., `https://issuer.example.com/.well-known/taf-dictionary.json`).
