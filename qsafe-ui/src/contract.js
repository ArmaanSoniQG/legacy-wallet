export const VERIFIER_ADDR = '0x8f75c8fc358785327E4ecf9c85a8B46F3908c6E9'; // ⬅ update if redeployed

export const REGISTRY_ADDR =
  '0x419cb698532bdbf6bab16bf55934a3938be3acce';   // 0x + 40 hex chars

export const ABI = [
  'function recordDilithiumSignature(bytes32,bytes)',
  'function isValidSignature(bytes32,bytes) view returns (bytes4)'
];
