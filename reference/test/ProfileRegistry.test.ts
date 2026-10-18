import { expect } from "chai";
import { ethers } from "hardhat";
import { ProfileRegistry } from "../typechain-types";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";

describe("ProfileRegistry", function () {
  let profileRegistry: ProfileRegistry;
  let owner: HardhatEthersSigner;
  let issuer: HardhatEthersSigner;
  let auditor: HardhatEthersSigner;
  let participant: HardhatEthersSigner;

  beforeEach(async function () {
    [owner, issuer, auditor, participant] = await ethers.getSigners();

    const ProfileRegistryFactory = await ethers.getContractFactory("ProfileRegistry");
    profileRegistry = await ProfileRegistryFactory.deploy();
    await profileRegistry.waitForDeployment();
  });

  describe("ENTITY Registration", function () {
    it("should allow an entity to register with DID and legal document hash", async function () {
      const did = ethers.encodeBytes32String("did:web:deloitte.com");
      const legalHash = ethers.keccak256(ethers.toUtf8Bytes("Deloitte-Incorporation-2026"));
      const visibility = 0; // TRANSPARENT

      await expect(profileRegistry.connect(auditor).registerEntity(did, visibility, legalHash))
        .to.emit(profileRegistry, "EntityRegistered")
        .withArgs(auditor.address, did, visibility);

      const entity = await profileRegistry.getEntity(auditor.address);
      expect(entity.owner).to.equal(auditor.address);
      expect(entity.did).to.equal(did);
      expect(entity.legalDocumentHash).to.equal(legalHash);
      expect(entity.status).to.be.true;
      expect(await profileRegistry.isRegisteredEntity(auditor.address)).to.be.true;
    });

    it("should allow an operator entity to register and set attestation requirements", async function () {
      const did = ethers.encodeBytes32String("did:web:exchange.com");
      const legalHash = ethers.keccak256(ethers.toUtf8Bytes("Operator-Doc"));
      await profileRegistry.connect(issuer).registerOperatorEntity(did, 0, legalHash);

      const entity = await profileRegistry.getEntity(issuer.address);
      expect(entity.operator).to.be.true;
      expect(entity.status).to.be.true;

      const reqTypes = [
        ethers.keccak256(ethers.toUtf8Bytes("CUSTODY_RESERVES")),
        ethers.keccak256(ethers.toUtf8Bytes("REDEMPTION_RIGHT")),
      ];
      const targetType = ethers.keccak256(ethers.toUtf8Bytes("ASSET"));

      await expect(profileRegistry.connect(issuer).setAttestationRequirement(targetType, reqTypes))
        .to.emit(profileRegistry, "AttestationRequirementSet")
        .withArgs(issuer.address, targetType, reqTypes);

      const fetchedReqs = await profileRegistry.getAttestationRequirements(issuer.address, targetType);
      expect(fetchedReqs).to.deep.equal(reqTypes);
    });

    it("should prevent double registration of the same entity", async function () {
      const did = ethers.encodeBytes32String("did:web:custodian.com");
      const legalHash = ethers.keccak256(ethers.toUtf8Bytes("Legal-Doc"));

      await profileRegistry.connect(auditor).registerEntity(did, 0, legalHash);

      await expect(
        profileRegistry.connect(auditor).registerEntity(did, 0, legalHash)
      ).to.be.revertedWithCustomError(profileRegistry, "EntityAlreadyRegistered");
    });
  });

  describe("ASSET Registration", function () {
    it("should allow an asset to be registered by a verified issuer entity", async function () {
      // 1. First register the issuer entity
      const did = ethers.encodeBytes32String("did:web:issuer.com");
      const legalHash = ethers.keccak256(ethers.toUtf8Bytes("Issuer-Doc"));
      await profileRegistry.connect(issuer).registerEntity(did, 0, legalHash);

      // 2. Register asset
      const assetIdBytes = ethers.encodeBytes32String("NVDA-STOCK-TOKEN");
      const tokenAddress = ethers.Wallet.createRandom().address;

      const assetId = {
        assetId: assetIdBytes,
        chainId: 31337,
        issuer: issuer.address,
        tokenContract: tokenAddress,
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

      await expect(profileRegistry.connect(issuer).registerAsset(assetId, assetMetadata))
        .to.emit(profileRegistry, "AssetRegistered")
        .withArgs(assetIdBytes, tokenAddress, issuer.address);

      const savedAsset = await profileRegistry.getAsset(assetIdBytes);
      expect(savedAsset.id.assetId).to.equal(assetIdBytes);
      expect(savedAsset.id.issuer).to.equal(issuer.address);
      expect(savedAsset.status).to.be.true;
    });

    it("should reject asset registration if the issuer is not a registered entity", async function () {
      const assetIdBytes = ethers.encodeBytes32String("UNAUTHORIZED-ASSET");
      const fakeIssuer = ethers.Wallet.createRandom().address;

      const assetId = {
        assetId: assetIdBytes,
        chainId: 31337,
        issuer: fakeIssuer,
        tokenContract: ethers.Wallet.createRandom().address,
      };

      const assetMetadata = {
        assetId: assetIdBytes,
        timestamp: Math.floor(Date.now() / 1000),
        representationRatio: 1,
        attestationIds: [],
        redemptionRightAttestationId: ethers.ZeroHash,
        insolvencyProtection: ethers.ZeroHash,
        nativeOwnership: ethers.ZeroHash,
        extensionMetadata: [],
      };

      await expect(
        profileRegistry.connect(owner).registerAsset(assetId, assetMetadata)
      ).to.be.revertedWithCustomError(profileRegistry, "InvalidIssuer");
    });
  });

  describe("PARTICIPANT Registration", function () {
    it("should register a participant with transparent visibility", async function () {
      const participantType = 1; // Retail
      const jurisdiction = ethers.encodeBytes32String("US");

      await expect(
        profileRegistry.connect(participant).registerParticipant(participantType, ethers.ZeroHash, 0, jurisdiction)
      )
        .to.emit(profileRegistry, "ParticipantRegistered")
        .withArgs(participant.address, ethers.ZeroHash, 0);

      const p = await profileRegistry.getParticipant(participant.address);
      expect(p.user).to.equal(participant.address);
      expect(p.participantType).to.equal(participantType);
      expect(p.visibility).to.equal(0);
      expect(p.jurisdiction).to.equal(jurisdiction);
    });

    it("should register a shielded participant with Baby Jubjub key hash and address(0)", async function () {
      const participantType = 2; // Accredited
      const fakeShieldedKeyHash = ethers.keccak256(ethers.toUtf8Bytes("babyjubjub-pubkey-sample"));
      const jurisdiction = ethers.encodeBytes32String("CH"); // Switzerland

      await profileRegistry.connect(participant).registerParticipant(participantType, fakeShieldedKeyHash, 1, jurisdiction);

      // Indexed by shieldedKeyHash and user address is address(0) to prevent on-chain linking
      const p = await profileRegistry.getParticipantByShieldedKey(fakeShieldedKeyHash);
      expect(p.user).to.equal(ethers.ZeroAddress);
      expect(p.shieldedKeyHash).to.equal(fakeShieldedKeyHash);
      expect(p.visibility).to.equal(1); // SHIELDED
    });
  });
});
