import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

export async function deploySuite() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying TAF Reference Implementation Suite with account:", deployer.address);

  // 1. Deploy ProfileRegistry
  const ProfileRegistryFactory = await ethers.getContractFactory("ProfileRegistry");
  const profileRegistry = await ProfileRegistryFactory.deploy();
  await profileRegistry.waitForDeployment();
  const profileRegistryAddress = await profileRegistry.getAddress();
  console.log("✓ ProfileRegistry deployed to:", profileRegistryAddress);

  // 2. Deploy AttestationMerkleTree
  const MerkleTreeFactory = await ethers.getContractFactory("AttestationMerkleTree");
  const merkleTree = await MerkleTreeFactory.deploy();
  await merkleTree.waitForDeployment();
  const merkleTreeAddress = await merkleTree.getAddress();
  console.log("✓ AttestationMerkleTree deployed to:", merkleTreeAddress);

  // 3. Deploy ZKVerifier
  const ZKVerifierFactory = await ethers.getContractFactory("ZKVerifier");
  const zkVerifier = await ZKVerifierFactory.deploy();
  await zkVerifier.waitForDeployment();
  const zkVerifierAddress = await zkVerifier.getAddress();
  console.log("✓ ZKVerifier deployed to:", zkVerifierAddress);

  // 4. Deploy AttestationRegistry
  const AttestationRegistryFactory = await ethers.getContractFactory("AttestationRegistry");
  const attestationRegistry = await AttestationRegistryFactory.deploy(
    profileRegistryAddress,
    merkleTreeAddress,
    zkVerifierAddress
  );
  await attestationRegistry.waitForDeployment();
  const attestationRegistryAddress = await attestationRegistry.getAddress();
  console.log("✓ AttestationRegistry deployed to:", attestationRegistryAddress);

  // Connect MerkleTree to AttestationRegistry
  await merkleTree.setAttestationRegistry(attestationRegistryAddress);
  console.log("✓ Linked AttestationRegistry to AttestationMerkleTree");

  // 5. Deploy VerificationEngine
  const EngineFactory = await ethers.getContractFactory("VerificationEngine");
  const verificationEngine = await EngineFactory.deploy(
    profileRegistryAddress,
    attestationRegistryAddress
  );
  await verificationEngine.waitForDeployment();
  const verificationEngineAddress = await verificationEngine.getAddress();
  console.log("✓ VerificationEngine deployed to:", verificationEngineAddress);

  const deploymentData = {
    network: (await ethers.provider.getNetwork()).name,
    chainId: Number((await ethers.provider.getNetwork()).chainId),
    deployedAt: new Date().toISOString(),
    contracts: {
      ProfileRegistry: profileRegistryAddress,
      AttestationMerkleTree: merkleTreeAddress,
      ZKVerifier: zkVerifierAddress,
      AttestationRegistry: attestationRegistryAddress,
      VerificationEngine: verificationEngineAddress,
    },
  };

  const outputPath = path.join(__dirname, "..", "deployed-addresses.json");
  fs.writeFileSync(outputPath, JSON.stringify(deploymentData, null, 2));
  console.log("✓ Deployment configuration written to deployed-addresses.json\n");

  return {
    profileRegistry,
    merkleTree,
    zkVerifier,
    attestationRegistry,
    verificationEngine,
  };
}

async function main() {
  await deploySuite();
}

if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}
