#[allow(missing_docs, clippy::too_many_arguments)]
        pub mod boundless_market_contract {
            alloy::sol! {
            #![sol(all_derives)]
            #![sol(extra_derives(serde::Serialize, serde::Deserialize))]
            // Copyright 2025 RISC Zero, Inc.
//
// Use of this source code is governed by the Business Source License
// as found in the LICENSE-BSL file.
pragma solidity ^0.8.20;

import {Math} from "@openzeppelin/contracts/utils/math/Math.sol";
import {SafeCast} from "@openzeppelin/contracts/utils/math/SafeCast.sol";
import {IBoundlessMarket} from "../IBoundlessMarket.sol";
import {RequestId} from "./RequestId.sol";

using OfferLibrary for Offer global;

/// @title Offer Struct and Library
/// @notice Represents an offer and provides functions to validate and compute offer-related data.
struct Offer {
    /// @notice Price at the start of the bidding period, it is minimum price a prover will receive for job.
    uint256 minPrice;
    /// @notice Price at the end of the bidding period, this is the maximum price the client will pay.
    uint256 maxPrice;
    /// @notice Time at which bidding starts, in seconds since the UNIX epoch.
    uint64 biddingStart;
    /// @notice Length of the "ramp-up period," measured in seconds since bidding start.
    /// @dev Once bidding starts, the price begins to "ramp-up." During this time, the price rises
    /// each block until it reaches `maxPrice.
    uint32 rampUpPeriod;
    /// @notice Timeout for the lock, expressed as seconds from bidding start.
    /// @dev Once locked, if a valid proof is not submitted before this deadline, the prover can
    /// be "slashed", which refunds the price to the requester and takes the prover stake.
    ///
    /// Additionally, the fee paid by the client is zero for proofs delivered after this time.
    /// Note that after this time, and before `timeout` a proof can still be delivered to fulfill
    /// the request. This applies both to locked and unlocked requests; if a proof is delivered
    /// after this timeout, no fee will be paid from the client.
    uint32 lockTimeout;
    /// @notice Timeout for the request, expressed as seconds from bidding start.
    /// @dev After this time the request is considered completely expired and can no longer be
    /// fulfilled. After this time, the `slash` action can be completed to finalize the transaction
    /// if it was locked but not fulfilled.
    uint32 timeout;
    /// @notice Bidders must stake this amount as part of their bid.
    uint256 lockStake;
}


// Copyright 2025 RISC Zero, Inc.
//
// Use of this source code is governed by the Business Source License
// as found in the LICENSE-BSL file.
pragma solidity ^0.8.20;

struct AssessorJournalCallback {
    /// @notice The index of the fill in the request
    uint16 index;
    /// @notice The address of the contract to call back
    address addr;
    /// @notice Maximum gas to use for the callback
    uint96 gasLimit;
}
// Copyright 2025 RISC Zero, Inc.
//
// Use of this source code is governed by the Business Source License
// as found in the LICENSE-BSL file.
pragma solidity ^0.8.24;

using RequestLockLibrary for RequestLock global;

/// @notice Stores information about requests that have been locked.
/// @dev RequestLock is an internal structure that is modified at various points in the proof lifecycle.
/// Fields can be valid or invalid depending where in the lifecycle we are. Integrators should not rely on RequestLock
/// for determining the status of a request. Instead, they should always use BoundlessMarket's public functions.
///
/// Packed to fit into 3 slots.
struct RequestLock {
    ///
    /// Storage slot 0
    ///
    /// @notice The address of the prover that locked the request _or_ the address of the prover that fulfilled the request.
    address prover;
    /// @notice The final timestamp at which the locked request can be fulfilled for payment by the locker.
    uint64 lockDeadline;
    /// @notice The number of seconds from the lockDeadline to where the request expires.
    /// @dev Represented as a delta so that it can be packed into 2 slots.
    uint24 deadlineDelta;
    /// @notice Flags that indicate the state of the request lock.
    uint8 requestLockFlags;
    ///
    /// Storage slots 1
    ///
    /// @notice The price that the prover will be paid for fulfilling the request.
    uint96 price;
    // Prover stake that may be taken if a proof is not delivered by the deadline.
    uint96 stake;
    ///
    /// Storage slot 2
    ///
    /// @notice Keccak256 hash of the request. During fulfillment, this value is used
    /// to check that the request completed is the request that was locked, and not some other
    /// request with the same ID.
    /// @dev This digest binds the full request including e.g. the offer and input. Technically,
    /// all that is required is to bind the requirements. If there is some advantage to only binding
    /// the requirements here (e.g. less hashing costs) then that might be worth doing.
    ///
    /// There is another option here, which would be to have the request lock mapping index
    /// based on request digest instead of index. As a friction, this would introduce a second
    /// user-facing concept of what identifies a request.
    bytes32 requestDigest;
}


// Copyright 2025 RISC Zero, Inc.
//
// Use of this source code is governed by the Business Source License
// as found in the LICENSE-BSL file.
pragma solidity ^0.8.24;

using TransientPriceLibrary for TransientPrice global;

/// Struct encoding the validated price for a request, intended for use with transient storage.
struct TransientPrice {
    /// Boolean set to true to indicate the request was validated.
    bool valid;
    uint96 price;
}


// Copyright 2025 RISC Zero, Inc.
//
// Use of this source code is governed by the Business Source License
// as found in the LICENSE-BSL file.
pragma solidity ^0.8.24;

using FulfillmentContextLibrary for FulfillmentContext global;

/// @title FulfillmentContext
/// @notice A struct for storing validated fulfillment information in transient storage
/// @dev This struct is designed to be packed into a single uint256 for efficient transient storage
struct FulfillmentContext {
    /// @notice Boolean set to true to indicate the request is internally consistent and signed.
    bool valid;
    /// @notice Boolean set to true to indicate that the request is expired.
    bool expired;
    /// @notice The validated price for the request
    uint96 price;
}

/// @title FulfillmentContextLibrary
/// @notice Library for packing, unpacking, and storing FulfillmentContext structs
/// @dev Uses bit manipulation to pack all fields into a single uint256 for transient storage

// Copyright 2025 RISC Zero, Inc.
//
// Use of this source code is governed by the Business Source License
// as found in the LICENSE-BSL file.
pragma solidity ^0.8.20;

import {ProofRequest, ProofRequestLibrary} from "./ProofRequest.sol";
import {Account} from "./Account.sol";
import {Callback, CallbackLibrary} from "./Callback.sol";
import {Offer, OfferLibrary} from "./Offer.sol";
import {Predicate, PredicateLibrary} from "./Predicate.sol";
import {Input, InputType, InputLibrary} from "./Input.sol";
import {Requirements, RequirementsLibrary} from "./Requirements.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {IBoundlessMarket} from "../IBoundlessMarket.sol";
import {IERC1271} from "@openzeppelin/contracts/interfaces/IERC1271.sol";

using LockRequestLibrary for LockRequest global;

/// @title Lock Request Struct and Library
/// @notice Message sent by a prover to indicate that they intend to lock the given request.
struct LockRequest {
    /// @notice The proof request that the prover is locking.
    ProofRequest request;
}


// Copyright 2025 RISC Zero, Inc.
//
// Use of this source code is governed by the Business Source License
// as found in the LICENSE-BSL file.
pragma solidity ^0.8.20;

struct AssessorCallback {
    /// @notice The index of the fill in the request
    uint16 index;
    /// @notice The address of the contract to call back
    address addr;
    /// @notice Maximum gas to use for the callback
    uint96 gasLimit;
}
// Copyright 2025 RISC Zero, Inc.
//
// Use of this source code is governed by the Business Source License
// as found in the LICENSE-BSL file.
pragma solidity ^0.8.20;

import {RequestId} from "./RequestId.sol";
import {Account} from "./Account.sol";
import {Callback, CallbackLibrary} from "./Callback.sol";
import {Offer, OfferLibrary} from "./Offer.sol";
import {Predicate, PredicateLibrary} from "./Predicate.sol";
import {Input, InputType, InputLibrary} from "./Input.sol";
import {Requirements, RequirementsLibrary} from "./Requirements.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {IBoundlessMarket} from "../IBoundlessMarket.sol";
import {IERC1271} from "@openzeppelin/contracts/interfaces/IERC1271.sol";

using ProofRequestLibrary for ProofRequest global;

/// @title Proof Request Struct and Library
/// @notice Represents a proof request with its associated data and functions.
struct ProofRequest {
    /// @notice Unique ID for this request, constructed from the client address and a 32-bit index.
    RequestId id;
    /// @notice Requirements of the delivered proof.
    /// @dev Specifies the program that must be run, constrains the value of the journal, and specifies a callback required to be called when the proof is delivered.
    Requirements requirements;
    /// @notice A public URI where the program (i.e. image) can be downloaded.
    /// @dev This URI will be accessed by provers that are evaluating whether to bid on the request.
    string imageUrl;
    /// @notice Input to be provided to the zkVM guest execution.
    Input input;
    /// @notice Offer specifying how much the client is willing to pay to have this request fulfilled.
    Offer offer;
}


// Copyright 2025 RISC Zero, Inc.
//
// Use of this source code is governed by the Business Source License
// as found in the LICENSE-BSL file.
pragma solidity ^0.8.24;

using CallbackLibrary for Callback global;

/// @title Callback Struct and Library
/// @notice Represents a callback configuration for proof delivery
struct Callback {
    /// @notice The address of the contract to call back
    address addr;
    /// @notice Maximum gas to use for the callback
    uint96 gasLimit;
}


// Copyright 2025 RISC Zero, Inc.
//
// Use of this source code is governed by the Business Source License
// as found in the LICENSE-BSL file.
pragma solidity ^0.8.24;

import {Predicate, PredicateLibrary} from "./Predicate.sol";
import {Callback, CallbackLibrary} from "./Callback.sol";

using RequirementsLibrary for Requirements global;

struct Requirements {
    bytes32 imageId;
    Callback callback;
    Predicate predicate;
    bytes4 selector;
}


// Copyright 2025 RISC Zero, Inc.
//
// Use of this source code is governed by the Business Source License
// as found in the LICENSE-BSL file.
pragma solidity ^0.8.20;

/// @title Selector - A representation of the bytes4 selector and its index within a batch.
/// @dev This is only used as part of the AssessorJournal and AssessorReceipt.
struct Selector {
    /// @notice Index within a batch where the selector is required.
    uint16 index;
    /// @notice The actual required selector.
    bytes4 value;
}
// Copyright 2025 RISC Zero, Inc.
//
// Use of this source code is governed by the Business Source License
// as found in the LICENSE-BSL file.
pragma solidity ^0.8.20;

import {IBoundlessMarket} from "../IBoundlessMarket.sol";

type RequestId is uint256;

using RequestIdLibrary for RequestId global;


// Copyright 2025 RISC Zero, Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

pragma solidity ^0.8.20;

import {Fulfillment} from "./types/Fulfillment.sol";
import {AssessorReceipt} from "./types/AssessorReceipt.sol";
import {ProofRequest} from "./types/ProofRequest.sol";
import {RequestId} from "./types/RequestId.sol";

#[sol(rpc)]
interface IBoundlessMarket {
    /// @notice Event logged when a new proof request is submitted by a client.
    /// @dev Note that the signature is not verified by the contract and should instead be verified
    /// by the receiver of the event.
    /// @param requestId The ID of the request.
    /// @param request The proof request details.
    /// @param clientSignature The signature of the client.
    event RequestSubmitted(RequestId indexed requestId, ProofRequest request, bytes clientSignature);

    /// @notice Event logged when a request is locked in by the given prover.
    /// @param requestId The ID of the request.
    /// @param prover The address of the prover.
    /// @param request The proof request details.
    /// @param clientSignature The signature of the client.
    event RequestLocked(RequestId indexed requestId, address prover, ProofRequest request, bytes clientSignature);

    /// @notice Event logged when a request is fulfilled.
    /// @param requestId The ID of the request.
    /// @param prover The address of the prover fulfilling the request.
    /// @param fulfillment The fulfillment details.
    event RequestFulfilled(RequestId indexed requestId, address indexed prover, Fulfillment fulfillment);

    /// @notice Event logged when a proof is delivered that satisfies the request's requirements.
    /// @dev It is possible for this event to be logged multiple times for a single request. The
    /// first event logged will always coincide with the `RequestFulfilled` event and the fulfilled flag on the request being set.
    /// @param requestId The ID of the request.
    /// @param prover The address of the prover delivering the proof.
    /// @param fulfillment The fulfillment details.
    event ProofDelivered(RequestId indexed requestId, address indexed prover, Fulfillment fulfillment);

    /// Event when a prover is slashed is made to the market.
    /// @param requestId The ID of the request.
    /// @param stakeBurned The amount of stake burned.
    /// @param stakeTransferred The amount of stake transferred to either the fulfilling prover or the market.
    /// @param stakeRecipient The address of the stake recipient. Typically the fulfilling prover, but can be the market.
    event ProverSlashed(
        RequestId indexed requestId, uint256 stakeBurned, uint256 stakeTransferred, address stakeRecipient
    );

    /// @notice Event when a deposit is made to the market.
    /// @param account The account making the deposit.
    /// @param value The value of the deposit.
    event Deposit(address indexed account, uint256 value);

    /// @notice Event when a withdrawal is made from the market.
    /// @param account The account making the withdrawal.
    /// @param value The value of the withdrawal.
    event Withdrawal(address indexed account, uint256 value);
    /// @notice Event when a stake deposit is made to the market.
    /// @param account The account making the deposit.
    /// @param value The value of the deposit.
    event StakeDeposit(address indexed account, uint256 value);
    /// @notice Event when a stake withdrawal is made to the market.
    /// @param account The account making the withdrawal.
    /// @param value The value of the withdrawal.
    event StakeWithdrawal(address indexed account, uint256 value);

    /// @notice Event when the contract is upgraded to a new version.
    /// @param version The new version of the contract.
    event Upgraded(uint64 indexed version);

    /// @notice Event emitted during fulfillment if a request was fulfilled, but payment was not
    /// transferred because at least one condition was not met. See the documentation on
    /// `IBoundlessMarket.fulfill` for more information.
    /// @dev The payload of the event is an ABI encoded error, from the errors on this contract.
    /// If there is an unexpired lock on the request, the order, the prover holding the lock may
    /// still be able to receive payment by sending another transaction.
    /// @param error The ABI encoded error.
    event PaymentRequirementsFailed(bytes error);

    /// @notice Event emitted when a callback to a contract fails during fulfillment
    /// @param requestId The ID of the request that was being fulfilled
    /// @param callback The address of the callback contract that failed
    /// @param error The error message from the failed call
    event CallbackFailed(RequestId indexed requestId, address callback, bytes error);

    /// @notice Error when a request is locked when it was not required to be.
    /// @param requestId The ID of the request.
    /// @dev selector 0xa9057651
    error RequestIsLocked(RequestId requestId);

    /// @notice Error when a request is not locked or priced during a fulfillment.
    /// Either locking the request, or calling the `IBoundlessMarket.priceRequest` function
    /// in the same transaction will satisfy this requirement.
    /// @param requestId The ID of the request.
    /// @dev selector 0xc274d3e3
    error RequestIsNotLockedOrPriced(RequestId requestId);

    /// @notice Error when a request is not locked when it was required to be.
    /// @param requestId The ID of the request.
    /// @dev selector d2be005d
    error RequestIsNotLocked(RequestId requestId);

    /// @notice Error when a request is fulfilled when it was not required to be.
    /// @param requestId The ID of the request.
    /// @dev selector 0x1cfdeebb
    error RequestIsFulfilled(RequestId requestId);

    /// @notice Error when a request is slashed when it was not required to be.
    /// @param requestId The ID of the request.
    /// @dev selector 0x64620c9a
    error RequestIsSlashed(RequestId requestId);

    /// @notice Error when a request lock is no longer valid, as the lock deadline has passed.
    /// @param requestId The ID of the request.
    /// @param lockDeadline The lock deadline of the request.
    /// @dev selector 0xcfe6a8fd
    error RequestLockIsExpired(RequestId requestId, uint64 lockDeadline);

    /// @notice Error when a request is no longer valid, as the deadline has passed.
    /// @param requestId The ID of the request.
    /// @param deadline The deadline of the request.
    /// @dev selector 0x873fd26b
    error RequestIsExpired(RequestId requestId, uint64 deadline);

    /// @notice Error when a request is still valid, as the deadline has yet to pass.
    /// @param requestId The ID of the request.
    /// @param deadline The deadline of the request.
    /// @dev selector 0x79c66ab0
    error RequestIsNotExpired(RequestId requestId, uint64 deadline);

    /// @notice Error when unable to complete request because of insufficient balance.
    /// @param account The account with insufficient balance.
    /// @dev selector 0x897f6c58
    error InsufficientBalance(address account);

    /// @notice Error when a signature did not pass verification checks.
    /// @dev selector 0x8baa579f
    error InvalidSignature();

    /// @notice Error when a request is malformed or internally inconsistent.
    /// @dev selector 0x41abc801
    error InvalidRequest();

    /// @notice Error when transfer of funds to an external address fails.
    /// @dev selector 0x90b8ec18
    error TransferFailed();

    /// @notice Error when providing a seal with a different selector than required.
    /// @dev selector 0xb8b38d4c
    error SelectorMismatch(bytes4 required, bytes4 provided);

    /// @notice Error when the batch size exceeds the limit.
    /// @dev selector efc954a6
    error BatchSizeExceedsLimit(uint256 batchSize, uint256 limit);

    /// @notice Check if the given request has been locked (i.e. accepted) by a prover.
    /// @dev When a request is locked, only the prover it is locked to can be paid to fulfill the job.
    /// @param requestId The ID of the request.
    /// @return True if the request is locked, false otherwise.
    function requestIsLocked(RequestId requestId) external view returns (bool);

    /// @notice Check if the given request resulted in the prover being slashed
    /// (i.e. request was locked in but proof was not delivered)
    /// @dev Note it is possible for a request to result in a slash, but still be fulfilled
    /// if for example another prover decided to fulfill the request altruistically.
    /// This function should not be used to determine if a request was fulfilled.
    /// @param requestId The ID of the request.
    /// @return True if the request resulted in the prover being slashed, false otherwise.
    function requestIsSlashed(RequestId requestId) external view returns (bool);

    /// @notice Check if the given request has been fulfilled (i.e. a proof was delivered).
    /// @param requestId The ID of the request.
    /// @return True if the request is fulfilled, false otherwise.
    function requestIsFulfilled(RequestId requestId) external view returns (bool);

    /// @notice For a given locked request, returns when the lock expires.
    /// @dev If the request is not locked, this function will revert.
    /// @param requestId The ID of the request.
    /// @return The expiration time of the lock on the request.
    function requestLockDeadline(RequestId requestId) external view returns (uint64);

    /// @notice For a given locked request, returns when request expires.
    /// @dev If the request is not locked, this function will revert.
    /// @param requestId The ID of the request.
    /// @return The expiration time of the request.
    function requestDeadline(RequestId requestId) external view returns (uint64);

    /// @notice Deposit Ether into the market to pay for proof.
    /// @dev Value deposited is msg.value and it is credited to the account of msg.sender.
    function deposit() external payable;

    /// @notice Withdraw Ether from the market.
    /// @dev Value is debited from msg.sender.
    /// @param value The amount to withdraw.
    function withdraw(uint256 value) external;

    /// @notice Check the deposited balance, in Ether, of the given account.
    /// @param addr The address of the account.
    /// @return The balance of the account.
    function balanceOf(address addr) external view returns (uint256);

    /// @notice Withdraw funds from the market's treasury.
    /// @dev Value is debited from the market's account.
    /// @param value The amount to withdraw.
    function withdrawFromTreasury(uint256 value) external;

    /// @notice Withdraw funds from the market' stake treasury.
    /// @dev Value is debited from the market's account.
    /// @param value The amount to withdraw.
    function withdrawFromStakeTreasury(uint256 value) external;

    /// @notice Deposit stake into the market to pay for lockin stake.
    /// @dev Before calling this method, the account owner must approve the contract as an allowed spender.
    function depositStake(uint256 value) external;
    /// @notice Permit and deposit stake into the market to pay for lockin stake.
    /// @dev This method requires a valid EIP-712 signature from the account owner.
    function depositStakeWithPermit(uint256 value, uint256 deadline, uint8 v, bytes32 r, bytes32 s) external;
    /// @notice Withdraw stake from the market.
    function withdrawStake(uint256 value) external;
    /// @notice Check the deposited balance, in HP, of the given account.
    function balanceOfStake(address addr) external view returns (uint256);

    /// @notice Submit a request such that it is publicly available for provers to evaluate and bid on.
    /// Any `msg.value` sent with the call will be added to the balance of `msg.sender`.
    /// @dev Submitting the transaction only broadcasts it, and is not a required step.
    /// This method does not validate the signature or store any state related to the request.
    /// Verifying the signature here is not required for protocol safety as the signature is
    /// checked when the request is locked, and during fulfillment (by the assessor).
    /// @param request The proof request details.
    /// @param clientSignature The signature of the client.
    function submitRequest(ProofRequest calldata request, bytes calldata clientSignature) external payable;

    /// @notice Lock the request to the prover, giving them exclusive rights to be paid to
    /// fulfill this request, and also making them subject to slashing penalties if they fail to
    /// deliver. At this point, the price for fulfillment is also set, based on the reverse Dutch
    /// auction parameters and the time at which this transaction is processed.
    /// @dev This method should be called from the address of the prover.
    /// @param request The proof request details.
    /// @param clientSignature The signature of the client.
    function lockRequest(ProofRequest calldata request, bytes calldata clientSignature) external;

    /// @notice Lock the request to the prover, giving them exclusive rights to be paid to
    /// fulfill this request, and also making them subject to slashing penalties if they fail to
    /// deliver. At this point, the price for fulfillment is also set, based on the reverse Dutch
    /// auction parameters and the time at which this transaction is processed.
    /// @dev This method uses the provided signature to authenticate the prover.
    /// @param request The proof request details.
    /// @param clientSignature The signature of the client.
    /// @param proverSignature The signature of the prover.
    function lockRequestWithSignature(
        ProofRequest calldata request,
        bytes calldata clientSignature,
        bytes calldata proverSignature
    ) external;

    /// @notice Fulfills a batch of requests. See IBoundlessMarket.fulfill for more information.
    /// @param fills The array of fulfillment information.
    /// @param assessorReceipt The Assessor's guest fulfillment information verified to confirm the
    /// request's requirements are met.
    function fulfill(Fulfillment[] calldata fills, AssessorReceipt calldata assessorReceipt)
        external
        returns (bytes[] memory paymentError);

    /// @notice Fulfills a batch of requests and withdraw from the prover balance. See IBoundlessMarket.fulfill for more information.
    /// @param fills The array of fulfillment information.
    /// @param assessorReceipt The Assessor's guest fulfillment information verified to confirm the
    /// request's requirements are met.
    function fulfillAndWithdraw(Fulfillment[] calldata fills, AssessorReceipt calldata assessorReceipt)
        external
        returns (bytes[] memory paymentError);

    /// @notice Verify the application and assessor receipts for the batch, ensuring that the provided
    /// fulfillments satisfy the requests.
    /// @param fills The array of fulfillment information.
    /// @param assessorReceipt The Assessor's guest fulfillment information verified to confirm the
    /// request's requirements are met.
    function verifyDelivery(Fulfillment[] calldata fills, AssessorReceipt calldata assessorReceipt) external view;

    /// @notice Checks the validity of the request and then writes the current auction price to
    /// transient storage.
    /// @dev When called within the same transaction, this method can be used to fulfill a request
    /// that is not locked. This is useful when the prover wishes to fulfill a request, but does
    /// not want to issue a lock transaction e.g. because the stake is too high or to save money by
    /// avoiding the gas costs of the lock transaction.
    /// @param request The proof request details.
    /// @param clientSignature The signature of the client.
    function priceRequest(ProofRequest calldata request, bytes calldata clientSignature) external;

    /// @notice A combined call to `IBoundlessMarket.priceRequest` and `IBoundlessMarket.fulfill`.
    /// The caller should provide the signed request and signature for each unlocked request they
    /// want to fulfill. Payment for unlocked requests will go to the provided `prover` address.
    /// @param requests The array of proof requests.
    /// @param clientSignatures The array of client signatures.
    /// @param fills The array of fulfillment information.
    /// @param assessorReceipt The Assessor's guest fulfillment information verified to confirm the
    /// request's requirements are met.
    function priceAndFulfill(
        ProofRequest[] calldata requests,
        bytes[] calldata clientSignatures,
        Fulfillment[] calldata fills,
        AssessorReceipt calldata assessorReceipt
    ) external returns (bytes[] memory paymentError);

    /// @notice A combined call to `IBoundlessMarket.priceRequest` and `IBoundlessMarket.fulfillAndWithdraw`.
    /// The caller should provide the signed request and signature for each unlocked request they
    /// want to fulfill. Payment for unlocked requests will go to the provided `prover` address.
    /// @param requests The array of proof requests.
    /// @param clientSignatures The array of client signatures.
    /// @param fills The array of fulfillment information.
    /// @param assessorReceipt The Assessor's guest fulfillment information verified to confirm the
    /// request's requirements are met.
    function priceAndFulfillAndWithdraw(
        ProofRequest[] calldata requests,
        bytes[] calldata clientSignatures,
        Fulfillment[] calldata fills,
        AssessorReceipt calldata assessorReceipt
    ) external returns (bytes[] memory paymentError);

    /// @notice Submit a new root to a set-verifier.
    /// @dev Consider using `submitRootAndFulfill` to submit the root and fulfill in one transaction.
    /// @param setVerifier The address of the set-verifier contract.
    /// @param root The new merkle root.
    /// @param seal The seal of the new merkle root.
    function submitRoot(address setVerifier, bytes32 root, bytes calldata seal) external;

    /// @notice Combined function to submit a new root to a set-verifier and call fulfill.
    /// @dev Useful to reduce the transaction count for fulfillments.
    /// @param setVerifier The address of the set-verifier contract.
    /// @param root The new merkle root.
    /// @param seal The seal of the new merkle root.
    /// @param fills The array of fulfillment information.
    /// @param assessorReceipt The Assessor's guest fulfillment information verified to confirm the
    /// request's requirements are met.
    function submitRootAndFulfill(
        address setVerifier,
        bytes32 root,
        bytes calldata seal,
        Fulfillment[] calldata fills,
        AssessorReceipt calldata assessorReceipt
    ) external returns (bytes[] memory paymentError);

    /// @notice Combined function to submit a new root to a set-verifier and call fulfillAndWithdraw.
    /// @dev Useful to reduce the transaction count for fulfillments.
    /// @param setVerifier The address of the set-verifier contract.
    /// @param root The new merkle root.
    /// @param seal The seal of the new merkle root.
    /// @param fills The array of fulfillment information.
    /// @param assessorReceipt The Assessor's guest fulfillment information verified to confirm the
    /// request's requirements are met.
    function submitRootAndFulfillAndWithdraw(
        address setVerifier,
        bytes32 root,
        bytes calldata seal,
        Fulfillment[] calldata fills,
        AssessorReceipt calldata assessorReceipt
    ) external returns (bytes[] memory paymentError);

    /// @notice Combined function to submit a new root to a set-verifier and call priceAndFulfill.
    /// @dev Useful to reduce the transaction count for fulfillments.
    /// @param setVerifier The address of the set-verifier contract.
    /// @param root The new merkle root.
    /// @param seal The seal of the new merkle root.
    /// @param fills The array of fulfillment information.
    /// @param assessorReceipt The Assessor's guest fulfillment information verified to confirm the
    /// request's requirements are met.
    function submitRootAndPriceAndFulfill(
        address setVerifier,
        bytes32 root,
        bytes calldata seal,
        ProofRequest[] calldata requests,
        bytes[] calldata clientSignatures,
        Fulfillment[] calldata fills,
        AssessorReceipt calldata assessorReceipt
    ) external returns (bytes[] memory paymentError);

    /// @notice Combined function to submit a new root to a set-verifier and call priceAndFulfillAndWithdraw.
    /// @dev Useful to reduce the transaction count for fulfillments.
    /// @param setVerifier The address of the set-verifier contract.
    /// @param root The new merkle root.
    /// @param seal The seal of the new merkle root.
    /// @param fills The array of fulfillment information.
    /// @param assessorReceipt The Assessor's guest fulfillment information verified to confirm the
    /// request's requirements are met.
    function submitRootAndPriceAndFulfillAndWithdraw(
        address setVerifier,
        bytes32 root,
        bytes calldata seal,
        ProofRequest[] calldata requests,
        bytes[] calldata clientSignatures,
        Fulfillment[] calldata fills,
        AssessorReceipt calldata assessorReceipt
    ) external returns (bytes[] memory paymentError);

    /// @notice When a prover fails to fulfill a request by the deadline, this method can be used to burn
    /// the associated prover stake.
    /// @dev The provers stake has already been transferred to the contract when the request was locked.
    ///      This method just burn the stake.
    /// @param requestId The ID of the request.
    function slash(RequestId requestId) external;

    /// @notice EIP 712 domain separator getter.
    /// @return The EIP 712 domain separator.
    function eip712DomainSeparator() external view returns (bytes32);

    /// @notice Returns the assessor imageId and its url.
    /// @return The imageId and its url.
    function imageInfo() external view returns (bytes32, string memory);

    /// Returns the address of the token used for stake deposits.
    // solhint-disable-next-line func-name-mixedcase
    function STAKE_TOKEN_CONTRACT() external view returns (address);
}
// Copyright 2025 RISC Zero, Inc.
//
// Use of this source code is governed by the Business Source License
// as found in the LICENSE-BSL file.
pragma solidity ^0.8.20;

import {AssessorCallback} from "./AssessorCallback.sol";
import {Selector} from "./Selector.sol";
import {RequestId} from "./RequestId.sol";

/// @title AssessorReceipt Struct and Library
/// @notice Represents the output of the assessor and proof of correctness, allowing request fulfillment.
struct AssessorReceipt {
    /// @notice Cryptographic proof for the validity of the execution results.
    /// @dev This will be sent to the `IRiscZeroVerifier` associated with this contract.
    bytes seal;
    /// @notice Optional callbacks committed into the journal.
    AssessorCallback[] callbacks;
    /// @notice Optional selectors committed into the journal.
    Selector[] selectors;
    /// @notice Address of the prover
    address prover;
}
// Copyright 2025 RISC Zero, Inc.
//
// Use of this source code is governed by the Business Source License
// as found in the LICENSE-BSL file.
// SPDX-License-Identifier: BUSL-1.1
pragma solidity ^0.8.24;

using PredicateLibrary for Predicate global;

/// @title Predicate Struct and Library
/// @notice Represents a predicate and provides functions to create and evaluate predicates.
struct Predicate {
    PredicateType predicateType;
    bytes data;
}

enum PredicateType {
    DigestMatch,
    PrefixMatch
}


// Copyright 2025 RISC Zero, Inc.
//
// Use of this source code is governed by the Business Source License
// as found in the LICENSE-BSL file.
pragma solidity ^0.8.20;

using InputLibrary for Input global;

/// @title Input Types and Library
/// @notice Provides functions to create and handle different types of inputs.
enum InputType {
    Inline,
    Url
}

/// @notice Represents an input with a type and data.
struct Input {
    InputType inputType;
    bytes data;
}


// Copyright 2025 RISC Zero, Inc.
//
// Use of this source code is governed by the Business Source License
// as found in the LICENSE-BSL file.
pragma solidity ^0.8.20;

import {RequestId} from "./RequestId.sol";

using FulfillmentLibrary for Fulfillment global;

/// @title Fulfillment Struct and Library
/// @notice Represents the information posted by the prover to fulfill a request and get paid.
struct Fulfillment {
    /// @notice ID of the request that is being fulfilled.
    RequestId id;
    /// @notice EIP-712 digest of request struct.
    bytes32 requestDigest;
    /// @notice Image ID of the guest that was verifiably executed to satisfy the request.
    /// @dev Must match the value in the request's requirements.
    bytes32 imageId;
    // TODO: Add a flag in the request to decide whether to post the journal. Note that
    // if the journal and journal digest do not need to be delivered to the client, imageId will
    // be replaced with claim digest, since it is captured in the requirements on the request,
    // checked by the Assessor guest.
    /// @notice Journal committed by the guest program execution.
    /// @dev The journal is checked to satisfy the predicate specified on the request's requirements.
    bytes journal;
    /// @notice Cryptographic proof for the validity of the execution results.
    /// @dev This will be sent to the `IRiscZeroVerifier` associated with this contract.
    bytes seal;
}


// Copyright 2025 RISC Zero, Inc.
//
// Use of this source code is governed by the Business Source License
// as found in the LICENSE-BSL file.
pragma solidity ^0.8.20;

import {RequestId} from "./RequestId.sol";

using AssessorCommitmentLibrary for AssessorCommitment global;

/// @title Assessor Commitment Struct
/// @notice Represents the structured commitment used as a leaf in the Assessor guest Merkle tree guest.
struct AssessorCommitment {
    /// @notice The index of the request in the tree.
    uint256 index;
    /// @notice The request ID.
    RequestId id;
    /// @notice The request digest.
    bytes32 requestDigest;
    /// @notice The claim digest.
    bytes32 claimDigest;
}


// Copyright 2025 RISC Zero, Inc.
//
// Use of this source code is governed by the Business Source License
// as found in the LICENSE-BSL file.
pragma solidity ^0.8.20;

import {AssessorCallback} from "./AssessorCallback.sol";
import {Selector} from "./Selector.sol";

/// @title Assessor Journal Struct
/// @notice Represents the structured journal of the Assessor guest which verifies the signature(s)
/// from client(s) and that the requirements are met by claim digest(s) in the Merkle tree committed
/// to by the given root.
struct AssessorJournal {
    /// @notice The (optional) callbacks for the requests committed by the assessor.
    AssessorCallback[] callbacks;
    /// @notice The (optional) selectors for the requests committed by the assessor.
    /// @dev This is used to verify the fulfillment of the request against its selector's seal.
    Selector[] selectors;
    /// @notice Root of the Merkle tree committing to the set of proven claims.
    /// @dev In the case of a batch of size one, this may simply be the eip712Digest of the `AssessorCommitment`.
    bytes32 root;
    /// @notice The address of the prover that produced the assessor receipt.
    address prover;
}

}
}
        