//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import {VRFCoordinatorV2Interface} from "@chainlink/contracts/src/v0.8/interfaces/VRFCoordinatorV2Interface.sol";
import {VRFConsumerBaseV2} from "@chainlink/contracts/src/v0.8/VRFConsumerBaseV2.sol";
import {EnumerableSet} from "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

contract StaticRaffle is VRFConsumerBaseV2, Ownable {
    using EnumerableSet for EnumerableSet.Bytes32Set; // Handy for deleteing an element

    VRFCoordinatorV2Interface internal immutable i_COORDINATOR;
    uint64 internal immutable i_subscriptionId;
    bytes32 internal immutable i_keyHash;
    uint32 internal immutable i_callbackGasLimit;
    uint16 internal immutable i_requestConfirmations;

    uint32 internal s_numWords;
    bool internal s_isRaffleStarted;
    EnumerableSet.Bytes32Set internal s_participants;
    EnumerableSet.Bytes32Set internal s_winners;

    event RaffleStarted(uint256 indexed requestId);
    event RaffleWinner(bytes32 indexed raffleWinner);
    event RaffleEnded(uint256 indexed requestId);

    error RaffleCanBeRunOnlyOnce();

    modifier onlyOnce() {
        if (s_isRaffleStarted) revert RaffleCanBeRunOnlyOnce();
        _;
    }

    constructor(
        bytes32[] memory participants,
        uint64 subscriptionId,
        address vrfCoordinator,
        bytes32 keyHash,
        uint32 callbackGasLimit,
        uint16 requestConfirmation,
        uint32 numWords
    ) VRFConsumerBaseV2(vrfCoordinator) {
        i_COORDINATOR = VRFCoordinatorV2Interface(vrfCoordinator);
        i_subscriptionId = subscriptionId;
        i_keyHash = keyHash;
        i_callbackGasLimit = callbackGasLimit;
        i_requestConfirmations = requestConfirmation;
        s_numWords = numWords;

        // loop through participants array and allocate s_participants
        uint256 length = participants.length;
        for (uint256 i = 0; i < length; ) {
            s_participants.add(participants[i]);
            unchecked {
                ++i;
            }
        }
    }

    function runRaffle() external onlyOwner onlyOnce {
        s_isRaffleStarted = true;
        requestRandomWords();
    }

    function getWinners() external view returns(bytes32 [] memory) {
        return s_winners.values();
    }

    function requestRandomWords() internal {
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
