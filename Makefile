SHELL := /bin/bash
DOCKER := docker compose -f docker-compose.dev.yml

.PHONY: up sh build-guest build-host clean

up:            ## Start dev container
	$(DOCKER) up -d --build

sh:            ## Shell into container
	$(DOCKER) exec -it dev bash

build-guest:   ## Build guest/ELF with RISC Zero toolchain
	$(DOCKER) exec -it dev bash -lc 'cargo risczero build'

build-host:    ## Build host binaries
	$(DOCKER) exec -it dev bash -lc 'cargo build --release'

clean:         ## Clean cargo targets
	$(DOCKER) exec -it dev bash -lc 'cargo clean'