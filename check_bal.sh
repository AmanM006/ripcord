#!/bin/sh
TOKEN=$(cat /shared/deploy-addresses.json | jq -r .MockToken)
ATTACKER=$(cat /shared/deploy-addresses.json | jq -r .Attacker)
VAULT=$(cat /shared/deploy-addresses.json | jq -r .Vault)
cast call $TOKEN "balanceOf(address)(uint256)" $ATTACKER --rpc-url http://anvil:8545
cast call $TOKEN "balanceOf(address)(uint256)" $VAULT --rpc-url http://anvil:8545
