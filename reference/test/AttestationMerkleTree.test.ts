import { expect } from "chai";
import { ethers } from "hardhat";
import { AttestationMerkleTree } from "../typechain-types";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";

describe("AttestationMerkleTree", function () {
  let merkleTree: AttestationMerkleTree;
  let owner: HardhatEthersSigner;
  let registry: HardhatEthersSigner;
  let unauthorized: HardhatEthersSigner;

  beforeEach(async function () {
    [owner, registry, unauthorized] = await ethers.getSigners();

    const MerkleTreeFactory = await ethers.getContractFactory("AttestationMerkleTree");
    merkleTree = await MerkleTreeFactory.deploy();
    await merkleTree.setAttestationRegistry(registry.address);
  });

  describe("Leaf Insertion & Root Evolution", function () {
    it("should compute Poseidon4 leaf and update root upon insertion", async function () {
      const initialRoot = await merkleTree.currentRoot();
      expect(await merkleTree.isKnownRoot(initialRoot)).to.be.true;

      const leafData = {
        ownerPubkey: 123456789n,
        attester: registry.address,
        issuedAt: 1700000000n,
        expiresAt: 1730000000n,
      };

      const tx = await merkleTree.connect(registry).insertLeaf(leafData);
      const receipt = await tx.wait();

      const newRoot = await merkleTree.currentRoot();
      expect(newRoot).to.not.equal(initialRoot);
      expect(await merkleTree.totalLeaves()).to.equal(1n);

      // Both initial root and new root are known in history
      expect(await merkleTree.isKnownRoot(initialRoot)).to.be.true;
      expect(await merkleTree.isKnownRoot(newRoot)).to.be.true;
    });

    it("should enforce ring buffer history across 5 insertions", async function () {
      const roots: string[] = [];
      roots.push(await merkleTree.currentRoot());

      for (let i = 0; i < 5; i++) {
        const leafData = {
          ownerPubkey: BigInt(1000 + i),
          attester: registry.address,
          issuedAt: BigInt(1700000000 + i),
          expiresAt: BigInt(1730000000 + i),
        };
        await merkleTree.connect(registry).insertLeaf(leafData);
        roots.push(await merkleTree.currentRoot());
      }

      expect(await merkleTree.totalLeaves()).to.equal(5n);

      // Verify that all historical roots remain valid (within ring buffer size of 50)
      for (const root of roots) {
        expect(await merkleTree.isKnownRoot(root)).to.be.true;
      }

      // Random fake root is not known
      expect(await merkleTree.isKnownRoot(ethers.keccak256(ethers.toUtf8Bytes("fake-root")))).to.be.false;
    });

    it("should revert if non-registry address attempts to insert leaf", async function () {
      const leafData = {
        ownerPubkey: 123456n,
        attester: unauthorized.address,
        issuedAt: 100n,
        expiresAt: 200n,
      };

      await expect(
        merkleTree.connect(unauthorized).insertLeaf(leafData)
      ).to.be.revertedWithCustomError(merkleTree, "OnlyRegistryAllowed");
    });
  });
});
