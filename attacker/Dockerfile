FROM ghcr.io/foundry-rs/foundry:latest
WORKDIR /app
USER root
RUN apt-get update && apt-get install -y jq
COPY script.sh .
RUN chmod +x script.sh
ENTRYPOINT ["/bin/sh", "-c"]
CMD ["./script.sh"]
