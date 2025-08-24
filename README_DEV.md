# QuantaSeal — Local Docker Dev

## Prereqs (local machine)
- Docker Desktop or Docker Engine
- Make (macOS: `xcode-select --install`)

## Quickstart
```bash
make up           # build & start the dev container
make sh           # open a shell inside the container
make build-guest  # builds RISC Zero guest ELF(s)
make build-host   # builds host binaries
```

**Cursor**: open the repo folder locally; edits happen on your disk, builds happen inside the container.