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
    it("should accept valid proofOfAudit, bind auditor, and insert leaf into Merkle tree", async function () {
      const attType = ethers.keccak256(ethers.toUtf8Bytes("ACCREDITED_INVESTOR"));
      const validUntil = Math.floor(Date.now() / 1000) + 86400 * 365;

      // Construct proofOfAudit payload bound to auditor.address and sampleOwnerPubkey
      const proofPayload = ethers.AbiCoder.defaultAbiCoder().encode(
        ["address", "uint256"],
        [auditor.address, sampleOwnerPubkey]
      );

      const initialLeaves = await merkleTree.totalLeaves();

      const tx = await attestationRegistry
        .connect(auditor)
        .submitShieldedAttestation(sampleOwnerPubkey, attType, validUntil, proofPayload);
      await tx.wait();

      expect(await merkleTree.totalLeaves()).to.equal(initialLeaves + 1n);

      // Verify that the key is tagged
      const subjectId = ethers.toBeHex(sampleOwnerPubkey, 32);
      const taggedLeaf = await attestationRegistry.getTaggedAttestationId(subjectId, attType, auditor.address);
      expect(taggedLeaf).to.not.equal(ethers.ZeroHash);
    });

    it("should revert if an unauthorized front-runner attempts to use the auditor's proof", async function () {
      const attType = ethers.keccak256(ethers.toUtf8Bytes("ACCREDITED_INVESTOR"));
      const validUntil = Math.floor(Date.now() / 1000) + 86400;

      // Proof generated for auditor.address
      const proofPayload = ethers.AbiCoder.defaultAbiCoder().encode(
        ["address", "uint256"],
        [auditor.address, sampleOwnerPubkey]
      );

      // Frontrunner copies proof payload and tries to submit from their account
      await expect(
        attestationRegistry
          .connect(frontRunner)
          .submitShieldedAttestation(sampleOwnerPubkey, attType, validUntil, proofPayload)
      ).to.be.revertedWithCustomError(attestationRegistry, "UnauthorizedAuditor");
    });

    it("should revert if the proof does not match the target owner_pubkey", async function () {
      const attType = ethers.keccak256(ethers.toUtf8Bytes("ACCREDITED_INVESTOR"));
      const validUntil = Math.floor(Date.now() / 1000) + 86400;

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
          .submitShieldedAttestation(sampleOwnerPubkey, attType, validUntil, proofPayload)
      ).to.be.revertedWithCustomError(attestationRegistry, "UnauthorizedAuditor");
    });
  });
});
