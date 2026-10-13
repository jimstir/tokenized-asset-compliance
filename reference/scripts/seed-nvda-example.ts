import { ethers } from "hardhat";
import { deploySuite } from "./deploy";
import * as fs from "fs";
import * as path from "path";

async function main() {
  console.log("\n=======================================================");
  console.log("       SEEDING TOKENIZED NVDA STOCK ASSET SCENARIO      ");
  console.log("=======================================================\n");

  const [deployer, issuerSigner, custodianSigner, legalSigner] = await ethers.getSigners();
  const suite = await deploySuite();

  // 1. Register ENTITY Profiles
  console.log("1. Registering Authorized Entities...");
  const custodianDid = ethers.encodeBytes32String("did:web:custodian.com");
  const custodianDocHash = ethers.keccak256(ethers.toUtf8Bytes("Qualified-Custodian-Charter-2026"));
  await suite.profileRegistry.connect(custodianSigner).registerEntity(custodianDid, 0, custodianDocHash);
  console.log("   ✓ Custodian Registered:", custodianSigner.address, "(did:web:custodian.com)");

  const legalDid = ethers.encodeBytes32String("did:web:legalcounsel.com");
  const legalDocHash = ethers.keccak256(ethers.toUtf8Bytes("SEC-Legal-Opinion-Letter"));
  await suite.profileRegistry.connect(legalSigner).registerEntity(legalDid, 0, legalDocHash);
  console.log("   ✓ Legal Counsel Registered:", legalSigner.address, "(did:web:legalcounsel.com)");

  const issuerDid = ethers.encodeBytes32String("did:web:nvda-issuer.com");
  const issuerDocHash = ethers.keccak256(ethers.toUtf8Bytes("SPV-Articles-Of-Incorporation"));
  await suite.profileRegistry.connect(issuerSigner).registerEntity(issuerDid, 0, issuerDocHash);
  console.log("   ✓ Asset Issuer Registered:", issuerSigner.address, "(did:web:nvda-issuer.com)");

  // 2. Deploy Tokenized Asset
  console.log("\n2. Deploying TokenizedAsset (NVDA) Contract...");
  const assetId = ethers.encodeBytes32String("NVDA-STOCK-2026");
  const TokenFactory = await ethers.getContractFactory("TokenizedAsset");
  const token = await TokenFactory.connect(issuerSigner).deploy(
    "NVIDIA Corporation (Tokenized)",
    "NVDA",
    assetId,
    await suite.verificationEngine.getAddress()
  );
  await token.waitForDeployment();
  const tokenAddress = await token.getAddress();
  console.log("   ✓ NVDA Token deployed to:", tokenAddress);

  // 3. Issue Attestations
  console.log("\n3. Issuing Independent Compliance Attestations...");
  const validUntil = Math.floor(Date.now() / 1000) + 86400 * 30; // 30 days validity

  // A. Custody Reserve Attestation: 1,000,000 NVDA shares in physical vault
  const custodyAtt = {
    id: ethers.ZeroHash,
    attestor: custodianSigner.address,
    attestedAt: Math.floor(Date.now() / 1000),
    validUntil: validUntil,
    subjectIdentifier: assetId,
    attestationType: ethers.keccak256(ethers.toUtf8Bytes("CUSTODY_RESERVES")),
    visibility: 0,
    revoked: false,
    evidenceHash: ethers.keccak256(ethers.toUtf8Bytes("Vault-Receipt-Audit-001")),
    evidenceURI: "ipfs://bafybeicg2ush5nhu7nacvn4cdjh22pdauuzy4v7vhox4v3w2376fbq5vy4",
    signature: "0x1234",
    resultData: ethers.AbiCoder.defaultAbiCoder().encode(["uint256"], [1000000]),
  };
  await suite.attestationRegistry.connect(custodianSigner).submitAttestation(custodyAtt);
  const custodyAttId = await suite.attestationRegistry.getTaggedAttestationId(
    assetId,
    custodyAtt.attestationType,
    custodianSigner.address
  );
  console.log("   ✓ Custody Attestation Submitted (1,000,000 NVDA Shares) ID:", custodyAttId);

  // B. Redemption Right Attestation
  const redemptionAtt = {
    id: ethers.ZeroHash,
    attestor: legalSigner.address,
    attestedAt: Math.floor(Date.now() / 1000),
    validUntil: validUntil,
    subjectIdentifier: assetId,
    attestationType: ethers.keccak256(ethers.toUtf8Bytes("REDEMPTION_RIGHT")),
    visibility: 0,
    revoked: false,
    evidenceHash: ethers.keccak256(ethers.toUtf8Bytes("Offering-Prospectus-Redemption")),
    evidenceURI: "ipfs://bafy-prospectus",
    signature: "0x1234",
    resultData: "0x",
  };
  await suite.attestationRegistry.connect(legalSigner).submitAttestation(redemptionAtt);
  const redemptionAttId = await suite.attestationRegistry.getTaggedAttestationId(
    assetId,
    redemptionAtt.attestationType,
    legalSigner.address
  );
  console.log("   ✓ Redemption Right Attestation Submitted ID:", redemptionAttId);

  // C. Insolvency Protection Attestation
  const insolvencyAtt = {
    id: ethers.ZeroHash,
    attestor: legalSigner.address,
    attestedAt: Math.floor(Date.now() / 1000),
    validUntil: validUntil,
    subjectIdentifier: assetId,
    attestationType: ethers.keccak256(ethers.toUtf8Bytes("INSOLVENCY_PROTECTION")),
    visibility: 0,
    revoked: false,
    evidenceHash: ethers.keccak256(ethers.toUtf8Bytes("Bankruptcy-Remote-SPV-Trust")),
    evidenceURI: "ipfs://bafy-trust",
    signature: "0x1234",
    resultData: "0x",
  };
  await suite.attestationRegistry.connect(legalSigner).submitAttestation(insolvencyAtt);
  const insolvencyAttId = await suite.attestationRegistry.getTaggedAttestationId(
    assetId,
    insolvencyAtt.attestationType,
    legalSigner.address
  );
  console.log("   ✓ Insolvency Protection Attestation Submitted ID:", insolvencyAttId);

  // D. Native Ownership Title Attestation
  const ownershipAtt = {
    id: ethers.ZeroHash,
    attestor: legalSigner.address,
    attestedAt: Math.floor(Date.now() / 1000),
    validUntil: validUntil,
    subjectIdentifier: assetId,
    attestationType: ethers.keccak256(ethers.toUtf8Bytes("NATIVE_OWNERSHIP")),
    visibility: 0,
    revoked: false,
    evidenceHash: ethers.keccak256(ethers.toUtf8Bytes("Transfer-Agent-Direct-Registration")),
    evidenceURI: "ipfs://bafy-drs",
    signature: "0x1234",
    resultData: "0x",
  };
  await suite.attestationRegistry.connect(legalSigner).submitAttestation(ownershipAtt);
  const ownershipAttId = await suite.attestationRegistry.getTaggedAttestationId(
    assetId,
    ownershipAtt.attestationType,
    legalSigner.address
  );
  console.log("   ✓ Native Legal Ownership Attestation Submitted ID:", ownershipAttId);

  // 4. Register Asset in Profile Registry
  console.log("\n4. Registering ASSET Profile...");
  const assetIdRecord = {
    assetId: assetId,
    chainId: 31337,
    issuer: issuerSigner.address,
    tokenContract: tokenAddress,
  };

  const assetMetadata = {
    assetId: assetId,
    timestamp: Math.floor(Date.now() / 1000),
    representationRatio: 1, // 1:1
    attestationIds: [custodyAttId],
    redemptionRightAttestationId: redemptionAttId,
    insolvencyProtection: insolvencyAttId,
    nativeOwnership: ownershipAttId,
    extensionMetadata: [],
  };

  await suite.profileRegistry.connect(issuerSigner).registerAsset(assetIdRecord, assetMetadata);
  console.log("   ✓ ASSET Profile Registered with linked Attestations!");

  // 5. Mint Tokens
  console.log("\n5. Minting Tokens Under Active Custody Proof...");
  await token.connect(issuerSigner).mint(issuerSigner.address, 1000000, custodyAttId);
  console.log("   ✓ Minted 1,000,000 NVDA Tokens to Issuer Wallet");

  // 6. Query Verification Report
  console.log("\n6. Running Verification Engine Evaluation...\n");
  const report = await suite.verificationEngine.getVerificationReport(assetId);

  const stateNames = ["UNVERIFIED", "VERIFIED", "STALE", "REVOKED"];
  const formattedState = stateNames[Number(report.state)];

  console.log("===================================================");
  console.log("          TOKENIZATION ASSURANCE REPORT            ");
  console.log("===================================================");
  console.log("Asset Name:         NVIDIA Corporation (Tokenized)");
  console.log("Asset ID:          ", assetId);
  console.log("Token Contract:    ", report.tokenContract);
  console.log("Chain ID:           31337 (Local Hardhat)");
  console.log("");
  console.log("Issuer Entity:     ", report.issuer, "(did:web:nvda-issuer.com)");
  console.log("Representation:     1:1");
  console.log("Token Supply:      ", report.tokenSupply.toLocaleString());
  console.log("Verified Custody:  ", report.verifiedBacking.toLocaleString(), "NVDA Shares");
  console.log("Custody Attestor:  ", custodianSigner.address, "(did:web:custodian.com)");
  console.log("");
  console.log("Attested Timestamp:", new Date(Number(custodyAtt.attestedAt) * 1000).toUTCString());
  console.log("Valid Until:       ", new Date(Number(custodyAtt.validUntil) * 1000).toUTCString(), "(Active)");
  console.log("");
  console.log("--- Core Tokenholder Rights ---");
  console.log("Redemption Rights:      YES (Attestation:", redemptionAttId.slice(0, 10) + "...)");
  console.log("Insolvency Protection:  YES (Attestation:", insolvencyAttId.slice(0, 10) + "...)");
  console.log("Native Legal Ownership: YES (Attestation:", ownershipAttId.slice(0, 10) + "...)");
  console.log("");
  console.log("===================================================");
  console.log("VERIFICATION STATE:", formattedState);
  console.log("===================================================\n");

  // Save NVDA details for CLI inspection
  const demoData = {
    assetId: assetId,
    tokenAddress: tokenAddress,
    issuer: issuerSigner.address,
    custodian: custodianSigner.address,
    legalCounsel: legalSigner.address,
    custodyAttestationId: custodyAttId,
    redemptionAttestationId: redemptionAttId,
  };
  fs.writeFileSync(path.join(__dirname, "..", "demo-asset.json"), JSON.stringify(demoData, null, 2));
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
