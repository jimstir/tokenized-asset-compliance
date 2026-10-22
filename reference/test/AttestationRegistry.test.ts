import { expect } from "chai";
import { ethers } from "hardhat";
import { ProfileRegistry, AttestationRegistry, AttestationMerkleTree, ZKVerifier } from "../typechain-types";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";

describe("AttestationRegistry", function () {
  let profileRegistry: ProfileRegistry;
  let merkleTree: AttestationMerkleTree;
  let zkVerifier: ZKVerifier;
  let attestationRegistry: AttestationRegistry;

  let owner: HardhatEthersSigner;
  let attestor: HardhatEthersSigner;
  let user: HardhatEthersSigner;
  let delegate: HardhatEthersSigner;

  beforeEach(async function () {
    [owner, attestor, user, delegate] = await ethers.getSigners();

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

    // Register attestor as valid ENTITY
    const did = ethers.encodeBytes32String("did:web:auditor.com");
    await profileRegistry.connect(attestor).registerEntity(did, 0, ethers.ZeroHash);
  });

  describe("Transparent Attestation Submission & Tagging", function () {
    const getEIP712Signature = async (signer: any, attestation: any) => {
      const domain = {
        name: "Tokenization Assurance Framework",
        version: "1",
        chainId: (await ethers.provider.getNetwork()).chainId,
        verifyingContract: await attestationRegistry.getAddress(),
      };

      const types = {
        Attestation: [
          { name: "subjectIdentifier", type: "bytes32" },
          { name: "attestationType", type: "bytes32" },
          { name: "attestedAt", type: "uint256" },
          { name: "validUntil", type: "uint256" },
          { name: "evidenceHash", type: "bytes32" },
          { name: "evidenceURI", type: "string" },
          { name: "resultData", type: "bytes" },
        ],
      };

      const value = {
        subjectIdentifier: attestation.subjectIdentifier,
        attestationType: attestation.attestationType,
        attestedAt: attestation.attestedAt,
        validUntil: attestation.validUntil,
        evidenceHash: attestation.evidenceHash,
        evidenceURI: attestation.evidenceURI,
        resultData: attestation.resultData,
      };

      return await signer.signTypedData(domain, types, value);
    };

    it("should allow registered entity to submit an attestation directly without signature", async function () {
      const subjectId = ethers.encodeBytes32String("NVDA-ASSET");
      const attType = ethers.keccak256(ethers.toUtf8Bytes("CUSTODY_VERIFIED"));
      const validUntil = Math.floor(Date.now() / 1000) + 86400; // 1 day validity
      const evidenceHash = ethers.keccak256(ethers.toUtf8Bytes("Vault-Receipt-PDF"));

      const attestationInput = {
        id: ethers.ZeroHash,
        attestor: attestor.address,
        attestedAt: Math.floor(Date.now() / 1000),
        validUntil: validUntil,
        subjectIdentifier: subjectId,
        attestationType: attType,
        visibility: 0, // TRANSPARENT
        revoked: false,
        evidenceHash: evidenceHash,
        evidenceURI: "ipfs://bafybeicg2ush5nhu7nacvn4cdjh22pdauuzy4v7vhox4v3w2376fbq5vy4",
        signature: "0x",
        resultData: ethers.AbiCoder.defaultAbiCoder().encode(["uint256"], [1000000]),
      };

      const tx = await attestationRegistry.connect(attestor).submitAttestation(attestationInput);
      await tx.wait();

      const discoveredId = await attestationRegistry.getTaggedAttestationId(subjectId, attType, attestor.address);
      expect(discoveredId).to.not.equal(ethers.ZeroHash);

      const savedAtt = await attestationRegistry.getAttestation(discoveredId);
      expect(savedAtt.attestor).to.equal(attestor.address);
      expect(savedAtt.subjectIdentifier).to.equal(subjectId);
      expect(savedAtt.validUntil).to.equal(validUntil);
      expect(savedAtt.revoked).to.be.false;
      expect(await attestationRegistry.isAttestationValid(discoveredId)).to.be.true;
    });

    it("should allow submission with valid EIP-712 ECDSA signature", async function () {
      const subjectId = ethers.encodeBytes32String("NVDA-ASSET-SIGNED");
      const attType = ethers.keccak256(ethers.toUtf8Bytes("LEGAL_RIGHTS_VERIFIED"));
      const validUntil = Math.floor(Date.now() / 1000) + 86400;
      const evidenceHash = ethers.keccak256(ethers.toUtf8Bytes("Legal-Opinion-Doc"));
      const attestedAt = Math.floor(Date.now() / 1000);

      const attestationInput = {
        id: ethers.ZeroHash,
        attestor: attestor.address,
        attestedAt: attestedAt,
        validUntil: validUntil,
        subjectIdentifier: subjectId,
        attestationType: attType,
        visibility: 0,
        revoked: false,
        evidenceHash: evidenceHash,
        evidenceURI: "ipfs://bafybeicg2ush5nhu7nacvn4cdjh22pdauuzy4v7vhox4v3w2376fbq5vy4",
        signature: "0x",
        resultData: ethers.toUtf8Bytes("US-DELAWARE-GOVERNING-LAW"),
      };

      const sig = await getEIP712Signature(attestor, attestationInput);
      attestationInput.signature = sig;

      // Submit via relayer (user account)
      const tx = await attestationRegistry.connect(user).submitAttestation(attestationInput);
      await tx.wait();

      const discoveredId = await attestationRegistry.getTaggedAttestationId(subjectId, attType, attestor.address);
      expect(discoveredId).to.not.equal(ethers.ZeroHash);

      const savedAtt = await attestationRegistry.getAttestation(discoveredId);
      expect(savedAtt.attestor).to.equal(attestor.address);
      expect(savedAtt.signature).to.equal(sig);
    });

    it("should verify EIP-1271 contract wallet signature", async function () {
      // Deploy mock EIP-1271 contract wallet owned by attestor
      const MockWallet = await ethers.getContractFactory("MockEIP1271Wallet");
      const mockWallet = await MockWallet.deploy(attestor.address);
      await mockWallet.waitForDeployment();
      const walletAddress = await mockWallet.getAddress();

      // Register mock wallet as an ENTITY profile in ProfileRegistry via wallet.execute
      const regCalldata = profileRegistry.interface.encodeFunctionData("registerEntity", [
        ethers.encodeBytes32String("did:web:smart-custody.com"),
        0,
        ethers.ZeroHash,
      ]);
      await mockWallet.connect(attestor).execute(await profileRegistry.getAddress(), regCalldata);

      const subjectId = ethers.encodeBytes32String("NVDA-ASSET-1271");
      const attType = ethers.keccak256(ethers.toUtf8Bytes("CUSTODY_VERIFIED"));
      const validUntil = Math.floor(Date.now() / 1000) + 86400;
      const attestedAt = Math.floor(Date.now() / 1000);

      const attestationInput = {
        id: ethers.ZeroHash,
        attestor: walletAddress,
        attestedAt: attestedAt,
        validUntil: validUntil,
        subjectIdentifier: subjectId,
        attestationType: attType,
        visibility: 0,
        revoked: false,
        evidenceHash: ethers.ZeroHash,
        evidenceURI: "",
        signature: "0x",
        resultData: "0x",
      };

      // Owner of MockEIP1271Wallet signs the EIP-712 payload
      const sig = await getEIP712Signature(attestor, attestationInput);
      attestationInput.signature = sig;

      // Relayer submits
      const tx = await attestationRegistry.connect(user).submitAttestation(attestationInput);
      await tx.wait();

      const discoveredId = await attestationRegistry.getTaggedAttestationId(subjectId, attType, walletAddress);
      expect(discoveredId).to.not.equal(ethers.ZeroHash);

      const savedAtt = await attestationRegistry.getAttestation(discoveredId);
      expect(savedAtt.attestor).to.equal(walletAddress);
    });

    it("should reject attestation submission with an invalid signature", async function () {
      const subjectId = ethers.encodeBytes32String("NVDA-ASSET-BAD-SIG");
      const attType = ethers.keccak256(ethers.toUtf8Bytes("CUSTODY_VERIFIED"));
      const validUntil = Math.floor(Date.now() / 1000) + 86400;

      const attestationInput = {
        id: ethers.ZeroHash,
        attestor: attestor.address,
        attestedAt: Math.floor(Date.now() / 1000),
        validUntil: validUntil,
        subjectIdentifier: subjectId,
        attestationType: attType,
        visibility: 0,
        revoked: false,
        evidenceHash: ethers.ZeroHash,
        evidenceURI: "",
        signature: "0x123456", // Invalid malformed signature
        resultData: "0x",
      };

      await expect(
        attestationRegistry.connect(attestor).submitAttestation(attestationInput)
      ).to.be.revertedWithCustomError(attestationRegistry, "InvalidAttestationSignature");
    });

    it("should reject attestation submission from an unregistered address", async function () {
      const attestationInput = {
        id: ethers.ZeroHash,
        attestor: user.address,
        attestedAt: Math.floor(Date.now() / 1000),
        validUntil: Math.floor(Date.now() / 1000) + 3600,
        subjectIdentifier: ethers.encodeBytes32String("SAMPLE"),
        attestationType: ethers.keccak256(ethers.toUtf8Bytes("SAMPLE")),
        visibility: 0,
        revoked: false,
        evidenceHash: ethers.ZeroHash,
        evidenceURI: "",
        signature: "0x",
        resultData: "0x",
      };

      await expect(
        attestationRegistry.connect(user).submitAttestation(attestationInput)
      ).to.be.revertedWithCustomError(attestationRegistry, "NotAuthorizedAttestor");
    });
  });

  describe("Revocation Mechanics", function () {
    it("should allow the issuing attestor to revoke an attestation", async function () {
      const subjectId = ethers.encodeBytes32String("NVDA-ASSET");
      const attType = ethers.keccak256(ethers.toUtf8Bytes("CUSTODY_VERIFIED"));

      const attestationInput = {
        id: ethers.ZeroHash,
        attestor: attestor.address,
        attestedAt: Math.floor(Date.now() / 1000),
        validUntil: Math.floor(Date.now() / 1000) + 86400,
        subjectIdentifier: subjectId,
        attestationType: attType,
        visibility: 0,
        revoked: false,
        evidenceHash: ethers.ZeroHash,
        evidenceURI: "",
        signature: "0x",
        resultData: "0x",
      };

      await attestationRegistry.connect(attestor).submitAttestation(attestationInput);
      const attId = await attestationRegistry.getTaggedAttestationId(subjectId, attType, attestor.address);

      await expect(attestationRegistry.connect(attestor).revokeAttestation(attId))
        .to.emit(attestationRegistry, "AttestationRevoked")
        .withArgs(attId, attestor.address);

      const savedAtt = await attestationRegistry.getAttestation(attId);
      expect(savedAtt.revoked).to.be.true;
      expect(await attestationRegistry.isAttestationValid(attId)).to.be.false;
    });

    it("should allow an authorized delegate to revoke an attestation", async function () {
      const subjectId = ethers.encodeBytes32String("NVDA-ASSET");
      const attType = ethers.keccak256(ethers.toUtf8Bytes("CUSTODY_VERIFIED"));

      const attestationInput = {
        id: ethers.ZeroHash,
        attestor: attestor.address,
        attestedAt: Math.floor(Date.now() / 1000),
        validUntil: Math.floor(Date.now() / 1000) + 86400,
        subjectIdentifier: subjectId,
        attestationType: attType,
        visibility: 0,
        revoked: false,
        evidenceHash: ethers.ZeroHash,
        evidenceURI: "",
        signature: "0x",
        resultData: "0x",
      };

      await attestationRegistry.connect(attestor).submitAttestation(attestationInput);
      const attId = await attestationRegistry.getTaggedAttestationId(subjectId, attType, attestor.address);

      // Authorize delegate
      await attestationRegistry.connect(attestor).setRevocationDelegate(delegate.address, true);

      // Delegate executes revocation
      await attestationRegistry.connect(delegate).revokeAttestation(attId);
      const savedAtt = await attestationRegistry.getAttestation(attId);
      expect(savedAtt.revoked).to.be.true;
    });

    it("should revert if an unauthorized party tries to revoke an attestation", async function () {
      const subjectId = ethers.encodeBytes32String("NVDA-ASSET");
      const attType = ethers.keccak256(ethers.toUtf8Bytes("CUSTODY_VERIFIED"));

      const attestationInput = {
        id: ethers.ZeroHash,
        attestor: attestor.address,
        attestedAt: Math.floor(Date.now() / 1000),
        validUntil: Math.floor(Date.now() / 1000) + 86400,
        subjectIdentifier: subjectId,
        attestationType: attType,
        visibility: 0,
        revoked: false,
        evidenceHash: ethers.ZeroHash,
        evidenceURI: "",
        signature: "0x",
        resultData: "0x",
      };

      await attestationRegistry.connect(attestor).submitAttestation(attestationInput);
      const attId = await attestationRegistry.getTaggedAttestationId(subjectId, attType, attestor.address);

      await expect(
        attestationRegistry.connect(user).revokeAttestation(attId)
      ).to.be.revertedWithCustomError(attestationRegistry, "UnauthorizedRevoker");
    });
  });
});
