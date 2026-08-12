# =============================================================================
#  Wink mini-game runtime image
#
#  Stage 1 builds the game from source, so the platform owner can pull the game
#  repository and build without any local toolchain setup.
#  Stage 2 is a plain Nginx image that receives ONLY the build output plus the
#  certified public Wink artifacts — no source, no scripts, no .env, no harness.
# =============================================================================

ARG NODE_IMAGE=node:22.11.0-alpine
ARG NGINX_IMAGE=nginx:1.25.3-alpine
ARG BUILD_OUTPUT_DIR=dist

FROM ${NODE_IMAGE} AS build
ARG BUILD_OUTPUT_DIR
WORKDIR /app

# Install dependencies from the lockfile first so the layer caches well.
COPY package.json package-lock.json ./
RUN npm ci

# .dockerignore keeps .git, node_modules, .env*, docs, and evidence out of the
# build context. Nothing from this stage reaches the runtime image.
COPY . .

RUN npm run build && test -d "/app/${BUILD_OUTPUT_DIR}"


FROM ${NGINX_IMAGE} AS server
ARG BUILD_OUTPUT_DIR

# Fail closed: the deployment must supply the exact allowed parent origins.
ENV ALLOWED_PARENT_ORIGINS="'none'"

COPY ./etc/default.conf.template /etc/nginx/templates/default.conf.template

COPY --from=build /app/${BUILD_OUTPUT_DIR}/ /usr/share/nginx/html/

# Serve the certified bridge and public runtime config explicitly, so the image
# is correct even when a bundler does not emit public/ verbatim.
COPY --from=build /app/public/wink-bridge.js /usr/share/nginx/html/wink-bridge.js
COPY --from=build /app/public/wink-runtime-config.json /usr/share/nginx/html/wink-runtime-config.json

RUN chmod -R 755 /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost/health || exit 1

CMD ["nginx", "-g", "daemon off;"]
