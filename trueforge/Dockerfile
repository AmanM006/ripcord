FROM node:22-alpine
RUN apk add --no-cache bubblewrap socat ripgrep python3 py3-pip && pip3 install --break-system-packages web3
CMD ["npx", "@truefoundry/trueforge"]
