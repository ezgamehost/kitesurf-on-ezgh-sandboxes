# Kitesurf for EZGH Sandboxes: the engine built from source, served by Miniflare (workerd).

# ---- build: Kitesurf's Bazel build of the engine bundle (Rust -> WebAssembly, JS bundles) ----
FROM node:22-bookworm AS build
ARG KITESURF_REF=4a2903813a22b08d4f3cc64a4b35339d0293a5d1
ARG BAZELISK_VERSION=v1.30.0
ARG BAZELISK_SHA256=a248ae2b2b62b5baebb748f6fba7203bff1a27e5d01b55399a8406744cb539e8

RUN curl -fsSLo /usr/local/bin/bazel \
      "https://github.com/bazelbuild/bazelisk/releases/download/${BAZELISK_VERSION}/bazelisk-linux-amd64" \
 && echo "${BAZELISK_SHA256}  /usr/local/bin/bazel" | sha256sum -c - \
 && chmod +x /usr/local/bin/bazel \
 && npm install --global pnpm@9.15.4

# Bazel's Python rules refuse to run as root.
USER node
WORKDIR /home/node/kitesurf
RUN git init -q && git fetch -q --depth 1 https://github.com/cloudflare/kitesurf.git "${KITESURF_REF}" \
 && git checkout -q FETCH_HEAD \
 && pnpm install --frozen-lockfile \
 && bazel build //packages/engine:dist //packages/engine:assets \
 && mkdir /home/node/out \
 && cp -RL bazel-bin/packages/engine/dist /home/node/out/dist \
 && cp -RL bazel-bin/packages/engine/public /home/node/out/public \
 && cp LICENSE NOTICE /home/node/out/

# ---- runtime ----
FROM node:22-bookworm-slim
WORKDIR /app
COPY sandbox/package.json sandbox/package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=build /home/node/out/ ./
COPY sandbox/serve.mjs sandbox/bridge.mjs sandbox/start.sh ./
USER node
# A sandbox doesn't run the image's command; `docker run` does.
CMD ["/app/start.sh"]
