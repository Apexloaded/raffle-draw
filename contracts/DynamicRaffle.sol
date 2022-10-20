// SPDX-License-Identifier: SEE LICENSE IN LICENSE
pragma solidity ^0.8.0;

import {VRFCoordinatorV2Interface} from "@chainlink/contracts/src/v0.8/interfaces/VRFCoordinatorV2Interface.sol";
import {VRFConsumerBaseV2} from "@chainlink/contracts/src/v0.8/VRFConsumerBaseV2.sol";
import {EnumerableSet} from "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {MerkleProof} from "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";

contract DynamicRaffle is VRFConsumerBaseV2, Ownable {
    using EnumerableSet for EnumerableSet.Bytes32Set; // Handy for deleteing an element

    VRFCoordinatorV2Interface internal immutable i_COORDINATOR;
    uint64 internal immutable i_subscriptionId;
    bytes32 internal immutable i_keyHash;
    uint32 internal immutable i_callbackGasLimit;
    uint16 internal immutable i_requestConfirmations;
    address internal immutable i_automationRegistry; // we want this raffle to be executed by chainlink automation

    uint32 internal s_numWords;
    bytes32 internal s_merkleRoot;
    EnumerableSet.Bytes32Set internal s_participants;
    EnumerableSet.Bytes32Set internal s_winners;

    event NewParticipants(bytes32 hashedTicketConfirmationNumber);
    event RaffleStarted(uint256 indexed requestId);
    event RaffleWinner(bytes32 indexed raffleWinner);
    event RaffleEnded(uint256 indexed requestId);

    error InvalidTicket(bytes32 hashedTicketConfirmationNumber);
    error AlreadyEntered(bytes32 hashedTiketConfirmationNumber);
    error CallIsNotAnAutomationRegistery();

    modifier onlyAutomationRegister() {
        if (msg.sender != i_automationRegistry) {
            revert CallIsNotAnAutomationRegistery();
        }
        _;
    }

    constructor(
        uint64 subscriptionId,
        address vrfCoordinator,
        bytes32 keyHash,
        uint32 callbackGasLimit,
        uint16 requestConfirmation,
        uint32 numWords,
        address automationRegistry,
        bytes32 merkleRoot
    ) VRFConsumerBaseV2(vrfCoordinator) {
        i_COORDINATOR = VRFCoordinatorV2Interface(vrfCoordinator);
        i_subscriptionId = subscriptionId;
        i_keyHash = keyHash;
        i_callbackGasLimit = callbackGasLimit;
        i_requestConfirmations = requestConfirmation;
        s_numWords = numWords;
        i_automationRegistry = automationRegistry;
        s_merkleRoot = merkleRoot;
    }

    function getHashedTicketConfirmationNumber(
        string memory ticketConfirmationNumber
    ) external pure returns (bytes32) {
        return keccak256(abi.encodePacked(ticketConfirmationNumber));
    }


    function getWinners() external view returns(bytes32 [] memory) {
        return s_winners.values();
    }

    function enterRaffle(
        bytes32 hashedTicketConfirmationNumber,
        bytes32[] memory proof
    ) external {
        if (
            !MerkleProof.verify(
                proof,
                s_merkleRoot,
                hashedTicketConfirmationNumber
            )
        ) revert InvalidTicket(hashedTicketConfirmationNumber);

        if (
            s_participants.contains(hashedTicketConfirmationNumber) ||
            s_winners.contains(hashedTicketConfirmationNumber)
        ) revert AlreadyEntered(hashedTicketConfirmationNumber);

        s_participants.add(hashedTicketConfirmationNumber);

        emit NewParticipants(hashedTicketConfirmationNumber);
    }

    function startRaffle() external onlyAutomationRegister {
        uint256 requestId = i_COORDINATOR.requestRandomWords(
            i_keyHash,
            i_subscriptionId,
            i_requestConfirmations,
            i_callbackGasLimit,
            s_numWords
        );
        emit RaffleStarted(requestId);
    }

    function fulfillRandomWords(
        uint256 _requestId,
        uint256[] memory _randomWords
    ) internal virtual override {
        uint256 length = s_numWords;
        for(uint i = 0; i < length;) {
            bytes32 raffleWinner = s_participants.at(_randomWords[i] % s_participants.length());
            s_winners.add(raffleWinner);
            s_participants.remove(raffleWinner);

            emit RaffleWinner(raffleWinner);

            unchecked {
                ++i;
            }
        }

        emit RaffleEnded(_requestId);
    }
}
