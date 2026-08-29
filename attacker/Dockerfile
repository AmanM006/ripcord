FROM ghcr.io/foundry-rs/foundry:latest
WORKDIR /app
RUN apk add --no-cache jq
COPY script.sh .
RUN chmod +x script.sh
CMD ["./script.sh"]
