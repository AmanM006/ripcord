#!/bin/sh

# Poll until deploy-addresses.json exists
while [ ! -f /shared/deploy-addresses.json ]; do
  echo "Waiting for /shared/deploy-addresses.json..."
  sleep 2
done

ATTACKER=$(cat /shared/deploy-addresses.json | jq -r '.Attacker')

if [ "$TRIGGER_MODE" = "manual" ]; then
  echo "Attacker ready. Run manually via: docker compose exec attacker-runner cast send $ATTACKER \"attack(uint256)\" 10000000000000000000 --private-key 0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d --rpc-url \$RPC_URL"
  tail -f /dev/null
else
  sleep 10
  echo "Starting attack loop on $ATTACKER..."
  while true; do
    cast send $ATTACKER "attack(uint256)" 10000000000000000000 --private-key 0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d --rpc-url $RPC_URL
    sleep 3
  done
fi
