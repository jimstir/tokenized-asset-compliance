# Specifications & RFCs

This directory contains the formal technical specifications for the Tokenization Assurance Framework (TAF).

All specifications in this repository adhere to the **COSS/1 (Consensus-Oriented Specification System)** standard, a lightweight framework designed to draft, track, and maintain open digital protocols with transparent versioning and rough consensus.

---

## Specification Lifecycle

Each specification document tracks its lifecycle state via its metadata header:

| Status | Definition |
| :--- | :--- |
| **`raw`** | Early experimental idea or initial proposal under preliminary review. |
| **`draft`** | Actively developed and refined specification undergoing community and review feedback. |
| **`stable`** | Ratified, reference-complete standard intended for production and interoperability. |
| **`legacy` / `retired`** | Deprecated or superseded by a newer specification. |

---

## Document Format

Every specification must begin with the standard COSS/1 YAML frontmatter:

```yaml
---
title: SPEC-IDENTIFIER
name: Full Descriptive Specification Title
status: draft # raw | draft | stable | retired
category: Best Current Practice # Standards Track | Best Current Practice | Informational
contributors: Name <@handle>
---
```

Followed by the standardized COSS sections:
1. **Abstract**: Brief summary of the standard's scope and purpose.
2. **Motivation**: Problem statement, current industry limitations, and consumer protection rationale.
3. **Specification**: Normative definitions, data schemas, smart contract interfaces, and cryptographic flows.
4. **Security & Privacy Considerations**: Threat models, verification integrity, and privacy implications.
5. **References**: Applicable regulatory RFCs, external standards, and citations.

---

## Active Specifications

| Specification | Status | Category | Description |
| :--- | :--- | :--- | :--- |
| **[`TOKENIZATION-ASSURANCE`](tokenization-assurance.md)** | `draft` | Best Current Practice | Framework for independent attestations, dynamic verification, and consumer-first trust for tokenized assets. |
