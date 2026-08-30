#!/bin/sh
VAULT=$(cat /shared/deploy-addresses.json | jq -r .Vault)
cast call $VAULT "totalTVL()(uint256)" --rpc-url http://anvil:8545
