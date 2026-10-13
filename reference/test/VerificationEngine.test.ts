import { expect } from "chai";
import { ethers } from "hardhat";
import { time } from "@nomicfoundation/hardhat-network-helpers";
import {
  ProfileRegistry,
  AttestationRegistry,
  AttestationMerkleTree,
  ZKVerifier,
  VerificationEngine,
  TokenizedAsset,
} from "../typechain-types";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";

describe("VerificationEngine (State Machine & Policy Evaluation)", function () {
  let profileRegistry: ProfileRegistry;
  let merkleTree: AttestationMerkleTree;
  let zkVerifier: ZKVerifier;
  let attestationRegistry: AttestationRegistry;
  let verificationEngine: VerificationEngine;
  let token: TokenizedAsset;

  let owner: HardhatEthersSigner;
  let issuer: HardhatEthersSigner;
  let custodian: HardhatEthersSigner;
  let legalCounsel: HardhatEthersSigner;

  const assetIdBytes = ethers.encodeBytes32String("NVDA-TOKEN");

  beforeEach(async function () {
    [owner, issuer, custodian, legalCounsel] = await ethers.getSigners();

    const ProfileRegistryFactory = await ethers.getContractFactory("ProfileRegistry");
    profileRegistry = await ProfileRegistryFactory.deploy();

    const MerkleTreeFactory = await ethers.getContractFactory("AttestationMerkleTree");
    merkleTree = await MerkleTreeFactory.deploy();

    const ZKVerifierFactory = await ethers.getContractFactory("ZKVerifier");
    zkVerifier = await ZKVerifierFactory.deploy();

    const AttestationRegistryFactory = await ethers.getContractFactory("AttestationRegistry");
    attestationRegistry = await AttestationRegistryFactory.deploy(
      await profileRegistry.getAddress(),
      await merkleTree.getAddress(),
      await zkVerifier.getAddress()
    );
    await merkleTree.setAttestationRegistry(await attestationRegistry.getAddress());

    const EngineFactory = await ethers.getContractFactory("VerificationEngine");
    verificationEngine = await EngineFactory.deploy(
      await profileRegistry.getAddress(),
      await attestationRegistry.getAddress()
    );

    // Register Entities
    await profileRegistry.connect(issuer).registerEntity(ethers.encodeBytes32String("did:web:issuer.com"), 0, ethers.ZeroHash);
    await profileRegistry.connect(custodian).registerEntity(ethers.encodeBytes32String("did:web:custodian.com"), 0, ethers.ZeroHash);
    await profileRegistry.connect(legalCounsel).registerEntity(ethers.encodeBytes32String("did:web:legal.com"), 0, ethers.ZeroHash);

    // Deploy TokenizedAsset mock
    const TokenFactory = await ethers.getContractFactory("TokenizedAsset");
    token = await TokenFactory.deploy(
      "NVIDIA Tokenized Stock",
      "NVDA",
      assetIdBytes,
      await verificationEngine.getAddress()
    );
  });

  it("should evaluate state as UNVERIFIED upon initial asset registration without attestations", async function () {
    const assetId = {
      assetId: assetIdBytes,
      chainId: 31337,
      issuer: issuer.address,
      tokenContract: await token.getAddress(),
    };

    const assetMetadata = {
      assetId: assetIdBytes,
      timestamp: Math.floor(Date.now() / 1000),
      representationRatio: 1, // 1:1
      attestationIds: [],
      redemptionRightAttestationId: ethers.ZeroHash,
      insolvencyProtection: ethers.ZeroHash,
      nativeOwnership: ethers.ZeroHash,
      extensionMetadata: [],
    };

    await profileRegistry.connect(issuer).registerAsset(assetId, assetMetadata);

    const state = await verificationEngine.evaluateVerificationState(assetIdBytes);
    expect(state).to.equal(0); // 0 = UNVERIFIED

    const report = await verificationEngine.getVerificationReport(assetIdBytes);
    expect(report.state).to.equal(0);
    expect(report.hasRedemptionRight).to.be.false;
  });

  it("should transition to VERIFIED when valid custody and legal rights attestations are attached", async function () {
    const validUntil = (await time.latest()) + 86400 * 30; // 30 days

    // 1. Submit Redemption Right Attestation
    const redemptionAttInput = {
      id: ethers.ZeroHash,
      attestor: legalCounsel.address,
      attestedAt: await time.latest(),
      validUntil: validUntil,
      subjectIdentifier: assetIdBytes,
      attestationType: ethers.keccak256(ethers.toUtf8Bytes("REDEMPTION_RIGHT")),
      visibility: 0,
      revoked: false,
      evidenceHash: ethers.keccak256(ethers.toUtf8Bytes("Prospectus-Legal")),
      evidenceURI: "ipfs://bafy-legal",
      signature: "0x",
      resultData: "0x",
    };
    await attestationRegistry.connect(legalCounsel).submitAttestation(redemptionAttInput);
    const redemptionId = await attestationRegistry.getTaggedAttestationId(
      assetIdBytes,
      redemptionAttInput.attestationType,
      legalCounsel.address
    );

    // 2. Submit Custody Backing Attestation for 1,000,000 shares
    const custodyAttInput = {
      id: ethers.ZeroHash,
      attestor: custodian.address,
      attestedAt: await time.latest(),
      validUntil: validUntil,
      subjectIdentifier: assetIdBytes,
      attestationType: ethers.keccak256(ethers.toUtf8Bytes("CUSTODY_RESERVES")),
      visibility: 0,
      revoked: false,
      evidenceHash: ethers.keccak256(ethers.toUtf8Bytes("Vault-Receipt")),
      evidenceURI: "ipfs://bafy-vault",
      signature: "0x",
      resultData: ethers.AbiCoder.defaultAbiCoder().encode(["uint256"], [1000000]),
    };
    await attestationRegistry.connect(custodian).submitAttestation(custodyAttInput);
    const custodyId = await attestationRegistry.getTaggedAttestationId(
      assetIdBytes,
      custodyAttInput.attestationType,
      custodian.address
    );

    // 3. Register Asset with linked attestations
    const assetId = {
      assetId: assetIdBytes,
      chainId: 31337,
      issuer: issuer.address,
      tokenContract: await token.getAddress(),
    };

    const assetMetadata = {
      assetId: assetIdBytes,
      timestamp: await time.latest(),
      representationRatio: 1, // 1:1
      attestationIds: [custodyId],
      redemptionRightAttestationId: redemptionId,
      insolvencyProtection: ethers.ZeroHash,
      nativeOwnership: ethers.ZeroHash,
      extensionMetadata: [],
    };
    await profileRegistry.connect(issuer).registerAsset(assetId, assetMetadata);

    // Mint 1,000,000 tokens
    await token.mint(issuer.address, 1000000, custodyId);

    // Evaluate
    const report = await verificationEngine.getVerificationReport(assetIdBytes);
    expect(report.state).to.equal(1); // 1 = VERIFIED
    expect(report.tokenSupply).to.equal(1000000n);
    expect(report.verifiedBacking).to.equal(1000000n);
    expect(report.hasRedemptionRight).to.be.true;
  });

  it("should transition to UNVERIFIED if token supply exceeds verified custody reserves (underbacked)", async function () {
    const validUntil = (await time.latest()) + 86400 * 30;

    // Submit redemption
    const redemptionInput = {
      id: ethers.ZeroHash,
      attestor: legalCounsel.address,
      attestedAt: await time.latest(),
      validUntil: validUntil,
      subjectIdentifier: assetIdBytes,
      attestationType: ethers.keccak256(ethers.toUtf8Bytes("REDEMPTION_RIGHT")),
      visibility: 0,
      revoked: false,
      evidenceHash: ethers.ZeroHash,
      evidenceURI: "",
      signature: "0x",
      resultData: "0x",
    };
    await attestationRegistry.connect(legalCounsel).submitAttestation(redemptionInput);
    const redemptionId = await attestationRegistry.getTaggedAttestationId(
      assetIdBytes,
      redemptionInput.attestationType,
      legalCounsel.address
    );

    // Custody attestation only backs 500,000 shares
    const custodyInput = {
      id: ethers.ZeroHash,
      attestor: custodian.address,
      attestedAt: await time.latest(),
      validUntil: validUntil,
      subjectIdentifier: assetIdBytes,
      attestationType: ethers.keccak256(ethers.toUtf8Bytes("CUSTODY_RESERVES")),
      visibility: 0,
      revoked: false,
      evidenceHash: ethers.ZeroHash,
      evidenceURI: "",
      signature: "0x",
      resultData: ethers.AbiCoder.defaultAbiCoder().encode(["uint256"], [500000]),
    };
    await attestationRegistry.connect(custodian).submitAttestation(custodyInput);
    const custodyId = await attestationRegistry.getTaggedAttestationId(
      assetIdBytes,
      custodyInput.attestationType,
      custodian.address
    );

    await profileRegistry.connect(issuer).registerAsset(
      {
        assetId: assetIdBytes,
        chainId: 31337,
        issuer: issuer.address,
        tokenContract: await token.getAddress(),
      },
      {
        assetId: assetIdBytes,
        timestamp: await time.latest(),
        representationRatio: 1,
        attestationIds: [custodyId],
        redemptionRightAttestationId: redemptionId,
        insolvencyProtection: ethers.ZeroHash,
        nativeOwnership: ethers.ZeroHash,
        extensionMetadata: [],
      }
    );

    // Mint 1,000,000 tokens (supply = 1,000,000 > backing = 500,000)
    await token.mint(issuer.address, 1000000, custodyId);

    const report = await verificationEngine.getVerificationReport(assetIdBytes);
    expect(report.state).to.equal(0); // UNVERIFIED due to insufficient reserves!
    expect(report.verifiedBacking).to.be.lessThan(report.tokenSupply);
  });

  it("should dynamically resolve to STALE when timestamp expires without requiring a transaction", async function () {
    const validUntil = (await time.latest()) + 3600; // 1 hour validity

    const redemptionInput = {
      id: ethers.ZeroHash,
      attestor: legalCounsel.address,
      attestedAt: await time.latest(),
      validUntil: validUntil,
      subjectIdentifier: assetIdBytes,
      attestationType: ethers.keccak256(ethers.toUtf8Bytes("REDEMPTION_RIGHT")),
      visibility: 0,
      revoked: false,
      evidenceHash: ethers.ZeroHash,
      evidenceURI: "",
      signature: "0x",
      resultData: "0x",
    };
    await attestationRegistry.connect(legalCounsel).submitAttestation(redemptionInput);
    const redemptionId = await attestationRegistry.getTaggedAttestationId(assetIdBytes, redemptionInput.attestationType, legalCounsel.address);

    const custodyInput = {
      id: ethers.ZeroHash,
      attestor: custodian.address,
      attestedAt: await time.latest(),
      validUntil: validUntil,
      subjectIdentifier: assetIdBytes,
      attestationType: ethers.keccak256(ethers.toUtf8Bytes("CUSTODY_RESERVES")),
      visibility: 0,
      revoked: false,
      evidenceHash: ethers.ZeroHash,
      evidenceURI: "",
      signature: "0x",
      resultData: ethers.AbiCoder.defaultAbiCoder().encode(["uint256"], [100000]),
    };
    await attestationRegistry.connect(custodian).submitAttestation(custodyInput);
    const custodyId = await attestationRegistry.getTaggedAttestationId(assetIdBytes, custodyInput.attestationType, custodian.address);

    await profileRegistry.connect(issuer).registerAsset(
      {
        assetId: assetIdBytes,
        chainId: 31337,
        issuer: issuer.address,
        tokenContract: await token.getAddress(),
      },
      {
        assetId: assetIdBytes,
        timestamp: await time.latest(),
        representationRatio: 1,
        attestationIds: [custodyId],
        redemptionRightAttestationId: redemptionId,
        insolvencyProtection: ethers.ZeroHash,
        nativeOwnership: ethers.ZeroHash,
        extensionMetadata: [],
      }
    );

    await token.mint(issuer.address, 100000, custodyId);

    // Initial check: VERIFIED
    expect(await verificationEngine.evaluateVerificationState(assetIdBytes)).to.equal(1);

    // Fast-forward time past expiration (+3601 seconds)
    await time.increase(3601);

    // Zero-transaction dynamic evaluation to STALE!
    expect(await verificationEngine.evaluateVerificationState(assetIdBytes)).to.equal(2); // 2 = STALE
  });

  it("should transition to REVOKED when an authorized entity revokes a mandatory attestation", async function () {
    const validUntil = (await time.latest()) + 86400 * 30;

    const redemptionInput = {
      id: ethers.ZeroHash,
      attestor: legalCounsel.address,
      attestedAt: await time.latest(),
      validUntil: validUntil,
      subjectIdentifier: assetIdBytes,
      attestationType: ethers.keccak256(ethers.toUtf8Bytes("REDEMPTION_RIGHT")),
      visibility: 0,
      revoked: false,
      evidenceHash: ethers.ZeroHash,
      evidenceURI: "",
      signature: "0x",
      resultData: "0x",
    };
    await attestationRegistry.connect(legalCounsel).submitAttestation(redemptionInput);
    const redemptionId = await attestationRegistry.getTaggedAttestationId(assetIdBytes, redemptionInput.attestationType, legalCounsel.address);

    const custodyInput = {
      id: ethers.ZeroHash,
      attestor: custodian.address,
      attestedAt: await time.latest(),
      validUntil: validUntil,
      subjectIdentifier: assetIdBytes,
      attestationType: ethers.keccak256(ethers.toUtf8Bytes("CUSTODY_RESERVES")),
      visibility: 0,
      revoked: false,
      evidenceHash: ethers.ZeroHash,
      evidenceURI: "",
      signature: "0x",
      resultData: ethers.AbiCoder.defaultAbiCoder().encode(["uint256"], [100000]),
    };
    await attestationRegistry.connect(custodian).submitAttestation(custodyInput);
    const custodyId = await attestationRegistry.getTaggedAttestationId(assetIdBytes, custodyInput.attestationType, custodian.address);

    await profileRegistry.connect(issuer).registerAsset(
      {
        assetId: assetIdBytes,
        chainId: 31337,
        issuer: issuer.address,
        tokenContract: await token.getAddress(),
      },
      {
        assetId: assetIdBytes,
        timestamp: await time.latest(),
        representationRatio: 1,
        attestationIds: [custodyId],
        redemptionRightAttestationId: redemptionId,
        insolvencyProtection: ethers.ZeroHash,
        nativeOwnership: ethers.ZeroHash,
        extensionMetadata: [],
      }
    );

    // Revoke custody attestation by custodian
    await attestationRegistry.connect(custodian).revokeAttestation(custodyId);

    // Verification state is now REVOKED
    expect(await verificationEngine.evaluateVerificationState(assetIdBytes)).to.equal(3); // 3 = REVOKED
  });
});
