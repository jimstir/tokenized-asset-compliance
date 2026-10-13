import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";
import {
  ProfileRegistry,
  AttestationRegistry,
  AttestationMerkleTree,
  ZKVerifier,
  VerificationEngine,
  TokenizedAsset,
} from "../typechain-types";

function loadAddresses() {
  const file = path.join(__dirname, "..", "deployed-addresses.json");
  if (!fs.existsSync(file)) {
    console.error("Error: deployed-addresses.json not found. Please run 'npm run deploy:local' or 'npm run seed:nvda' first.");
    process.exit(1);
  }
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function loadDemoAsset() {
  const file = path.join(__dirname, "..", "demo-asset.json");
  if (fs.existsSync(file)) {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  }
  return null;
}

async function getContracts() {
  const deployed = loadAddresses();
  const profileRegistry = (await ethers.getContractAt("ProfileRegistry", deployed.contracts.ProfileRegistry)) as unknown as ProfileRegistry;
  const attestationRegistry = (await ethers.getContractAt("AttestationRegistry", deployed.contracts.AttestationRegistry)) as unknown as AttestationRegistry;
  const attestationMerkleTree = (await ethers.getContractAt("AttestationMerkleTree", deployed.contracts.AttestationMerkleTree)) as unknown as AttestationMerkleTree;
  const zkVerifier = (await ethers.getContractAt("ZKVerifier", deployed.contracts.ZKVerifier)) as unknown as ZKVerifier;
  const verificationEngine = (await ethers.getContractAt("VerificationEngine", deployed.contracts.VerificationEngine)) as unknown as VerificationEngine;

  return {
    ProfileRegistry: profileRegistry,
    AttestationRegistry: attestationRegistry,
    AttestationMerkleTree: attestationMerkleTree,
    ZKVerifier: zkVerifier,
    VerificationEngine: verificationEngine,
  };
}

async function printVerificationReport(assetIdBytes: string) {
  const { VerificationEngine, ProfileRegistry } = await getContracts();
  const report = await VerificationEngine.getVerificationReport(assetIdBytes);
  const asset = await ProfileRegistry.getAsset(assetIdBytes);
  const issuerEntity = await ProfileRegistry.getEntity(report.issuer);

  const stateNames = ["UNVERIFIED", "VERIFIED", "STALE", "REVOKED"];
  const formattedState = stateNames[Number(report.state)];

  let didStr = "";
  try {
    didStr = ethers.decodeBytes32String(issuerEntity.did);
  } catch {
    didStr = issuerEntity.did;
  }

  console.log("\n===================================================");
  console.log("          TOKENIZATION ASSURANCE REPORT            ");
  console.log("===================================================");
  console.log("Asset ID:          ", assetIdBytes);
  console.log("Token Contract:    ", report.tokenContract);
  console.log("Chain ID:           31337 (Local Hardhat)");
  console.log("");
  console.log("Issuer Entity:     ", report.issuer, didStr ? `(${didStr})` : "");
  console.log("Representation:    ", `1:${report.representationRatio}`);
  console.log("Token Supply:      ", report.tokenSupply.toLocaleString());
  console.log("Verified Custody:  ", report.verifiedBacking.toLocaleString(), "Units");
  console.log("");
  console.log("--- Core Tokenholder Rights ---");
  console.log("Redemption Rights:      ", report.hasRedemptionRight ? "YES" : "NO");
  console.log("Insolvency Protection:  ", report.hasInsolvencyProtection ? "YES" : "NO");
  console.log("Native Legal Ownership: ", report.hasNativeOwnership ? "YES" : "NO");
  console.log("");
  console.log("===================================================");
  console.log("VERIFICATION STATE: ", formattedState);
  console.log("===================================================\n");
}

async function inspectContractProperties(tokenAddress: string) {
  const token = await ethers.getContractAt("TokenizedAsset", tokenAddress);

  console.log("\n===================================================");
  console.log("        SMART CONTRACT PROPERTY DISCOVERY          ");
  console.log("===================================================");
  console.log("Token Address:          ", tokenAddress);
  console.log("Implementation Address: ", await token.implementationAddress());
  console.log("Upgrade Admin:          ", await token.upgradeAdmin());
  console.log("Mint Authority:         ", await token.mintAuthority());
  console.log("Burn Authority:         ", await token.burnAuthority());
  console.log("Is Paused:              ", (await token.isPaused()) ? "YES" : "NO");
  console.log("Total Supply:           ", (await token.totalSupply()).toLocaleString());
  console.log("===================================================\n");
}

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  const [signer, account1, account2] = await ethers.getSigners();
  const contracts = await getContracts();

  if (!command || command === "help" || command === "--help") {
    console.log(`
Tokenization Assurance Framework (TAF) CLI

Usage:
  npx taf verify [--asset <assetId>]
  npx taf inspect --token <tokenAddress>
  npx taf entity:register --did <string> [--shielded]
  npx taf asset:register --id <string> --token <address> [--ratio <number>]
  npx taf participant:register [--shielded <key>] --jurisdiction <string>
  npx taf attest:transparent --subject <id> --type <string> --validity <seconds> [--amount <number>]
  npx taf attest:shielded --pubkey <number> --type <string> --validity <seconds>
  npx taf attest:revoke --id <attestationId>
    `);
    return;
  }

  if (command === "verify") {
    let assetId = args[1] === "--asset" ? args[2] : undefined;
    if (!assetId) {
      const demo = loadDemoAsset();
      if (demo) {
        assetId = demo.assetId;
      } else {
        console.error("Error: --asset <id> required.");
        return;
      }
    }
    if (assetId) {
      await printVerificationReport(assetId);
    }
    return;
  }

  if (command === "inspect") {
    let tokenAddress = args[1] === "--token" ? args[2] : undefined;
    if (!tokenAddress) {
      const demo = loadDemoAsset();
      tokenAddress = demo?.tokenAddress;
    }
    if (!tokenAddress) {
      console.error("Error: --token <address> required.");
      return;
    }
    await inspectContractProperties(tokenAddress);
    return;
  }

  if (command === "entity:register") {
    const didIdx = args.indexOf("--did");
    const didStr = didIdx !== -1 ? args[didIdx + 1] : "did:web:example-entity.com";
    const isShielded = args.includes("--shielded");

    const didBytes = ethers.encodeBytes32String(didStr.slice(0, 31));
    const docHash = ethers.keccak256(ethers.toUtf8Bytes("Legal-Documentation"));
    const visibility = isShielded ? 1 : 0;

    const tx = await contracts.ProfileRegistry.connect(signer).registerEntity(didBytes, visibility, docHash);
    await tx.wait();
    console.log(`✓ Entity registered successfully for ${signer.address} (${didStr})`);
    return;
  }

  if (command === "participant:register") {
    const jurIdx = args.indexOf("--jurisdiction");
    const jur = jurIdx !== -1 ? args[jurIdx + 1] : "US";
    const keyIdx = args.indexOf("--shielded");
    const isShielded = keyIdx !== -1;
    const shieldedKey = isShielded ? BigInt(args[keyIdx + 1] || "123456789") : 0n;

    const jurBytes = ethers.encodeBytes32String(jur);
    const keyHash = isShielded ? ethers.keccak256(ethers.toBeHex(shieldedKey, 32)) : ethers.ZeroHash;
    const visibility = isShielded ? 1 : 0;

    const tx = await contracts.ProfileRegistry.connect(signer).registerParticipant(1, keyHash, visibility, jurBytes);
    await tx.wait();
    console.log(`✓ Participant registered successfully for ${signer.address} (Visibility: ${isShielded ? "SHIELDED" : "TRANSPARENT"})`);
    return;
  }

  if (command === "attest:transparent") {
    const subIdx = args.indexOf("--subject");
    const typeIdx = args.indexOf("--type");
    const valIdx = args.indexOf("--validity");
    const amtIdx = args.indexOf("--amount");

    const subjectStr = subIdx !== -1 ? args[subIdx + 1] : "NVDA-TOKEN";
    const typeStr = typeIdx !== -1 ? args[typeIdx + 1] : "CUSTODY_RESERVES";
    const validitySec = valIdx !== -1 ? Number(args[valIdx + 1]) : 86400 * 30;
    const amount = amtIdx !== -1 ? Number(args[amtIdx + 1]) : 1000000;

    const subjectBytes = ethers.encodeBytes32String(subjectStr.slice(0, 31));
    const typeBytes = ethers.keccak256(ethers.toUtf8Bytes(typeStr));
    const validUntil = Math.floor(Date.now() / 1000) + validitySec;

    const resultData = ethers.AbiCoder.defaultAbiCoder().encode(["uint256"], [amount]);

    const attInput = {
      id: ethers.ZeroHash,
      attestor: signer.address,
      attestedAt: Math.floor(Date.now() / 1000),
      validUntil: validUntil,
      subjectIdentifier: subjectBytes,
      attestationType: typeBytes,
      visibility: 0,
      revoked: false,
      evidenceHash: ethers.keccak256(ethers.toUtf8Bytes("Evidence-Artifact")),
      evidenceURI: "ipfs://bafy-evidence",
      signature: "0x",
      resultData: resultData,
    };

    const tx = await contracts.AttestationRegistry.connect(signer).submitAttestation(attInput);
    await tx.wait();
    const attId = await contracts.AttestationRegistry.getTaggedAttestationId(subjectBytes, typeBytes, signer.address);
    console.log(`✓ Attestation submitted successfully! ID: ${attId}`);
    return;
  }

  if (command === "attest:revoke") {
    const idIdx = args.indexOf("--id");
    const attId = idIdx !== -1 ? args[idIdx + 1] : undefined;
    if (!attId) {
      console.error("Error: --id <attestationId> required.");
      return;
    }
    const tx = await contracts.AttestationRegistry.connect(signer).revokeAttestation(attId);
    await tx.wait();
    console.log(`✓ Attestation revoked successfully! ID: ${attId}`);
    return;
  }

  console.log("Unknown command. Run 'npx taf help' for command options.");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
