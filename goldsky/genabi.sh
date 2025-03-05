
npx hardhat compile
cat artifacts-zk/contracts/validators/SessionKeyValidator.sol/SessionKeyValidator.json | jq ".abi" > goldsky/session-key-validator.abi.json
cat artifacts-zk/contracts/AccountFactory.sol/AccountFactory.json  | jq ".abi" > goldsky/agw/1.0.0/AccountFactory.json
cat artifacts-zk/contracts/AGWAccount.sol/AGWAccount.json | jq ".abi" > goldsky/agw/1.0.0/AGWAccount.json