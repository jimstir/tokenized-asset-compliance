import { expect } from "chai";
import { ethers } from "hardhat";
import { ProfileRegistry, AttestationRegistry, AttestationMerkleTree, ZKVerifier } from "../typechain-types";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";

describe("Proof of Audit & Shielded Attestations", function () {
  let profileRegistry: ProfileRegistry;
  let merkleTree: AttestationMerkleTree;
  let zkVerifier: ZKVerifier;
  let attestationRegistry: AttestationRegistry;

  let owner: HardhatEthersSigner;
  let auditor: HardhatEthersSigner;
  let frontRunner: HardhatEthersSigner;

  const sampleOwnerPubkey = 987654321098765432109876543210n;

  beforeEach(async function () {
    [owner, auditor, frontRunner] = await ethers.getSigners();

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

    // Register auditor as ENTITY
    const did = ethers.encodeBytes32String("did:web:kpmg.com");
    await profileRegistry.connect(auditor).registerEntity(did, 0, ethers.ZeroHash);
    await profileRegistry.connect(frontRunner).registerEntity(ethers.encodeBytes32String("did:web:evil.com"), 0, ethers.ZeroHash);
  });

  describe("Shielded Submission Workflow", function () {
    it("should accept valid proofOfAudit, bind auditor, insert leaf into Merkle tree, and exempt from tagging maps", async function () {
      const attType = ethers.keccak256(ethers.toUtf8Bytes("ACCREDITED_INVESTOR"));
      const issuedAt = Math.floor(Date.now() / 1000);
      const expiresAt = issuedAt + 86400 * 365;

      // Construct proofOfAudit payload bound to auditor.address and sampleOwnerPubkey
      const proofPayload = ethers.AbiCoder.defaultAbiCoder().encode(
        ["address", "uint256"],
        [auditor.address, sampleOwnerPubkey]
      );

      const initialLeaves = await merkleTree.totalLeaves();

      const tx = await attestationRegistry
        .connect(auditor)
        .submitShieldedAttestation(sampleOwnerPubkey, attType, issuedAt, expiresAt, proofPayload);
      const receipt = await tx.wait();

      expect(await merkleTree.totalLeaves()).to.equal(initialLeaves + 1n);

      // Verify that shielded attestation is recorded in shieldedAttesters
      // Extract leaf from AttestationSubmitted event
      const event = receipt?.logs
        .map((log) => {
          try {
            return attestationRegistry.interface.parseLog(log);
          } catch {
            return null;
          }
        })
        .find((parsed) => parsed?.name === "AttestationSubmitted");

      const leaf = event?.args[0];
      expect(leaf).to.not.equal(ethers.ZeroHash);
      expect(await attestationRegistry.getShieldedAttester(leaf)).to.equal(auditor.address);
      expect(await attestationRegistry.isShieldedAttestationRevoked(leaf)).to.be.false;

      // Verify that shielded claims MUST BE EXEMPT from relational tagging maps!
      const subjectId = ethers.toBeHex(sampleOwnerPubkey, 32);
      const taggedLeaf = await attestationRegistry.getTaggedAttestationId(subjectId, attType, auditor.address);
      expect(taggedLeaf).to.equal(ethers.ZeroHash);
    });

    it("should allow issuing entity to revoke shielded attestation and advance revocation root", async function () {
      const attType = ethers.keccak256(ethers.toUtf8Bytes("ACCREDITED_INVESTOR"));
      const issuedAt = Math.floor(Date.now() / 1000);
      const expiresAt = issuedAt + 86400 * 365;

      const proofPayload = ethers.AbiCoder.defaultAbiCoder().encode(
        ["address", "uint256"],
        [auditor.address, sampleOwnerPubkey]
      );

      const tx = await attestationRegistry
        .connect(auditor)
        .submitShieldedAttestation(sampleOwnerPubkey, attType, issuedAt, expiresAt, proofPayload);
      const receipt = await tx.wait();

      const event = receipt?.logs
        .map((log) => {
          try {
            return attestationRegistry.interface.parseLog(log);
          } catch {
            return null;
          }
        })
        .find((parsed) => parsed?.name === "AttestationSubmitted");
      const leaf = event?.args[0];

      // Revoke the shielded attestation
      await expect(attestationRegistry.connect(auditor).revokeShieldedAttestation(leaf))
        .to.emit(attestationRegistry, "ShieldedAttestationRevoked");

      expect(await attestationRegistry.isShieldedAttestationRevoked(leaf)).to.be.true;

      // Cannot revoke twice
      await expect(
        attestationRegistry.connect(auditor).revokeShieldedAttestation(leaf)
      ).to.be.revertedWithCustomError(attestationRegistry, "ShieldedLeafAlreadyRevoked");
    });

    it("should revert if an unauthorized front-runner attempts to use the auditor's proof", async function () {
      const attType = ethers.keccak256(ethers.toUtf8Bytes("ACCREDITED_INVESTOR"));
      const issuedAt = Math.floor(Date.now() / 1000);
      const expiresAt = issuedAt + 86400;

      // Proof generated for auditor.address
      const proofPayload = ethers.AbiCoder.defaultAbiCoder().encode(
        ["address", "uint256"],
        [auditor.address, sampleOwnerPubkey]
      );

      // Frontrunner copies proof payload and tries to submit from their account
      await expect(
        attestationRegistry
          .connect(frontRunner)
          .submitShieldedAttestation(sampleOwnerPubkey, attType, issuedAt, expiresAt, proofPayload)
      ).to.be.revertedWithCustomError(attestationRegistry, "UnauthorizedAuditor");
    });

    it("should revert if the proof does not match the target owner_pubkey", async function () {
      const attType = ethers.keccak256(ethers.toUtf8Bytes("ACCREDITED_INVESTOR"));
      const issuedAt = Math.floor(Date.now() / 1000);
      const expiresAt = issuedAt + 86400;

      const wrongPubkey = 111111111111111111111111111111n;

      // Proof bound to wrongPubkey
      const proofPayload = ethers.AbiCoder.defaultAbiCoder().encode(
        ["address", "uint256"],
        [auditor.address, wrongPubkey]
      );

      // Submitting against sampleOwnerPubkey
      await expect(
        attestationRegistry
          .connect(auditor)
          .submitShieldedAttestation(sampleOwnerPubkey, attType, issuedAt, expiresAt, proofPayload)
      ).to.be.revertedWithCustomError(attestationRegistry, "UnauthorizedAuditor");
    });
  });

  describe("ZK Dual-Tree Eligibility & Non-Membership Verification", function () {
    const attType = ethers.keccak256(ethers.toUtf8Bytes("ACCREDITED_INVESTOR"));
    let attestationRoot: string;
    let revocationRoot: string;
    let expiresAt: number;
    let leaf: string;

    beforeEach(async function () {
      const issuedAt = Math.floor(Date.now() / 1000);
      expiresAt = issuedAt + 86400 * 365;

      const proofPayload = ethers.AbiCoder.defaultAbiCoder().encode(
        ["address", "uint256"],
        [auditor.address, sampleOwnerPubkey]
      );

      const tx = await attestationRegistry
        .connect(auditor)
        .submitShieldedAttestation(sampleOwnerPubkey, attType, issuedAt, expiresAt, proofPayload);
      const receipt = await tx.wait();

      const event = receipt?.logs
        .map((log) => {
          try {
            return attestationRegistry.interface.parseLog(log);
          } catch {
            return null;
          }
        })
        .find((parsed) => parsed?.name === "AttestationSubmitted");
      leaf = event?.args[0];

      attestationRoot = await merkleTree.currentRoot();
      revocationRoot = await attestationRegistry.currentRevocationRoot();
    });

    it("should successfully verify valid eligibility proof against active attestation and revocation roots", async function () {
      const minValidTimestamp = Math.floor(Date.now() / 1000);

      // Encode ZK proof: (boundAttestationRoot, boundRevocationRoot, boundAttestationType, boundExpiry)
      const zkProof = ethers.AbiCoder.defaultAbiCoder().encode(
        ["bytes32", "bytes32", "bytes32", "uint256"],
        [attestationRoot, revocationRoot, attType, expiresAt]
      );

      const isValid = await zkVerifier.verifyEligibilityProof(
        attestationRoot,
        revocationRoot,
        attType,
        minValidTimestamp,
        zkProof
      );
      expect(isValid).to.be.true;
    });

    it("should reject eligibility proof when attestation is revoked and revocation root advances", async function () {
      const minValidTimestamp = Math.floor(Date.now() / 1000);

      // Old proof was generated with pre-revocation root
      const staleZkProof = ethers.AbiCoder.defaultAbiCoder().encode(
        ["bytes32", "bytes32", "bytes32", "uint256"],
        [attestationRoot, revocationRoot, attType, expiresAt]
      );

      // Attestation is revoked by auditor
      await attestationRegistry.connect(auditor).revokeShieldedAttestation(leaf);
      const updatedRevocationRoot = await attestationRegistry.currentRevocationRoot();
      expect(updatedRevocationRoot).to.not.equal(revocationRoot);

      // Verification fails with updated on-chain revocation root
      const isValid = await zkVerifier.verifyEligibilityProof(
        attestationRoot,
        updatedRevocationRoot,
        attType,
        minValidTimestamp,
        staleZkProof
      );
      expect(isValid).to.be.false;
    });

    it("should reject eligibility proof if attestationType does not match requirement", async function () {
      const minValidTimestamp = Math.floor(Date.now() / 1000);
      const otherType = ethers.keccak256(ethers.toUtf8Bytes("QUALIFIED_PURCHASER"));

      const zkProof = ethers.AbiCoder.defaultAbiCoder().encode(
        ["bytes32", "bytes32", "bytes32", "uint256"],
        [attestationRoot, revocationRoot, attType, expiresAt]
      );

      const isValid = await zkVerifier.verifyEligibilityProof(
        attestationRoot,
        revocationRoot,
        otherType, // Mismatched type
        minValidTimestamp,
        zkProof
      );
      expect(isValid).to.be.false;
    });

    it("should reject eligibility proof if proof timestamp has expired", async function () {
      const pastExpiry = Math.floor(Date.now() / 1000) - 100;
      const currentTimestamp = Math.floor(Date.now() / 1000);

      const expiredProof = ethers.AbiCoder.defaultAbiCoder().encode(
        ["bytes32", "bytes32", "bytes32", "uint256"],
        [attestationRoot, revocationRoot, attType, pastExpiry]
      );

      const isValid = await zkVerifier.verifyEligibilityProof(
        attestationRoot,
        revocationRoot,
        attType,
        currentTimestamp,
        expiredProof
      );
      expect(isValid).to.be.false;
    });

    it("should reject eligibility proof if attestationRoot is mismatched", async function () {
      const minValidTimestamp = Math.floor(Date.now() / 1000);
      const forgedAttestationRoot = ethers.keccak256(ethers.toUtf8Bytes("FORGED_ROOT"));

      const zkProof = ethers.AbiCoder.defaultAbiCoder().encode(
        ["bytes32", "bytes32", "bytes32", "uint256"],
        [forgedAttestationRoot, revocationRoot, attType, expiresAt]
      );

      const isValid = await zkVerifier.verifyEligibilityProof(
        attestationRoot, // Real root
        revocationRoot,
        attType,
        minValidTimestamp,
        zkProof // Forged proof
      );
      expect(isValid).to.be.false;
    });
  });
});
