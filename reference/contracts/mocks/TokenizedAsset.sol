// SPDX-License-Identifier: CC0-1.0
pragma solidity ^0.8.24;

import {TAFTypes} from "../libraries/TAFTypes.sol";
import {IVerificationEngine} from "../interfaces/IVerificationEngine.sol";

/**
 * @title TokenizedAsset
 * @notice Sample ERC-20 tokenized asset integrating TAF verification checks and contract discovery properties.
 */
contract TokenizedAsset {
    string public name;
    string public symbol;
    uint8 public constant decimals = 18;
    uint256 public totalSupply;

    bytes32 public immutable assetId;
    IVerificationEngine public verificationEngine;

    address public owner;
    address public mintAuthority;
    address public burnAuthority;
    address public upgradeAdmin;
    address public implementationAddress; // Simulated logic address for proxy discovery
    bool public isPaused;

    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
    event Minted(address indexed to, uint256 amount, bytes32 indexed attestationId);
    event Burned(address indexed from, uint256 amount, bytes32 indexed attestationId);
    event Paused(bool status);

    error OnlyOwner();
    error OnlyMintAuthority();
    error OnlyBurnAuthority();
    error ContractIsPaused();
    error InsufficientBalance();
    error InsufficientAllowance();
    error MintingDisallowedByVerificationState(TAFTypes.VerificationState state);

    modifier onlyOwner() {
        if (msg.sender != owner) revert OnlyOwner();
        _;
    }

    modifier whenNotPaused() {
        if (isPaused) revert ContractIsPaused();
        _;
    }

    constructor(
        string memory _name,
        string memory _symbol,
        bytes32 _assetId,
        address _engineAddress
    ) {
        name = _name;
        symbol = _symbol;
        assetId = _assetId;
        verificationEngine = IVerificationEngine(_engineAddress);
        owner = msg.sender;
        mintAuthority = msg.sender;
        burnAuthority = msg.sender;
        upgradeAdmin = msg.sender;
        implementationAddress = address(this);
    }

    function setVerificationEngine(address _engineAddress) external onlyOwner {
        verificationEngine = IVerificationEngine(_engineAddress);
    }

    function setPaused(bool _paused) external onlyOwner {
        isPaused = _paused;
        emit Paused(_paused);
    }

    function setAuthorities(address _mintAuth, address _burnAuth) external onlyOwner {
        mintAuthority = _mintAuth;
        burnAuthority = _burnAuth;
    }

    /**
     * @notice Mints new tokens referencing a supporting custody attestation.
     *         Checks that verification state is active (not STALE, REVOKED, or UNVERIFIED).
     */
    function mint(address to, uint256 amount, bytes32 attestationId) external whenNotPaused {
        if (msg.sender != mintAuthority && msg.sender != owner) {
            revert OnlyMintAuthority();
        }

        // Check Verification Engine state if initialized
        if (address(verificationEngine) != address(0)) {
            TAFTypes.VerificationState state = verificationEngine.evaluateVerificationState(assetId);
            if (state == TAFTypes.VerificationState.REVOKED) {
                revert MintingDisallowedByVerificationState(state);
            }
        }

        totalSupply += amount;
        balanceOf[to] += amount;
        emit Transfer(address(0), to, amount);
        emit Minted(to, amount, attestationId);
    }

    /**
     * @notice Burns tokens upon redemption, referencing a custody reduction attestation.
     */
    function burn(address from, uint256 amount, bytes32 attestationId) external whenNotPaused {
        if (msg.sender != burnAuthority && msg.sender != owner && msg.sender != from) {
            revert OnlyBurnAuthority();
        }

        if (balanceOf[from] < amount) {
            revert InsufficientBalance();
        }

        balanceOf[from] -= amount;
        totalSupply -= amount;
        emit Transfer(from, address(0), amount);
        emit Burned(from, amount, attestationId);
    }

    function transfer(address to, uint256 amount) external whenNotPaused returns (bool) {
        if (balanceOf[msg.sender] < amount) revert InsufficientBalance();
        balanceOf[msg.sender] -= amount;
        balanceOf[to] += amount;
        emit Transfer(msg.sender, to, amount);
        return true;
    }

    function approve(address spender, uint256 amount) external returns (bool) {
        allowance[msg.sender][spender] = amount;
        emit Approval(msg.sender, spender, amount);
        return true;
    }

    function transferFrom(address from, address to, uint256 amount) external whenNotPaused returns (bool) {
        if (balanceOf[from] < amount) revert InsufficientBalance();
        if (allowance[from][msg.sender] < amount) revert InsufficientAllowance();

        allowance[from][msg.sender] -= amount;
        balanceOf[from] -= amount;
        balanceOf[to] += amount;
        emit Transfer(from, to, amount);
        return true;
    }
}
