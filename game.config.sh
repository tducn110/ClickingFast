#!/bin/sh
# =============================================================================
#  Wink mini-game — deployment configuration
#
#  Edit ONLY the PER-GAME INPUT block. Everything below it is derived from the
#  slug and environment, and scripts/verify-game-config.mjs re-derives the same
#  values from the canonical Node contract and fails the deploy on any drift.
#
#  This file is public metadata. Never put a token, password, or secret here.
# =============================================================================

# ----------------------------- PER-GAME INPUT --------------------------------
# Slug: lowercase letters, digits, single hyphens. Becomes the subdomain, the
# service name, and the registry path.
GAME_SLUG="clicking-fast"

# Display metadata (not used by the runtime contract).
GAME_TITLE="Clicking Fast"
GAME_DESCRIPTION="Clicking Fast — Winkgames mini-game"

# The game UUID. Must match public/wink-runtime-config.json and the catalog row
# id of the environment below — the two environments have different ids. On dev
# it is the UUID the developer generated before building; on prod it is the one
# the CMS generated when the row was created, so that row has to exist first.
GAME_ID="e6089d19-cfaa-4cf1-9b42-3a3763d826cd"

# "dev" or "prod". Promoting to prod additionally requires the platform-owner
# approval described in game-template/docs/PRODUCTION_READINESS.md.
ENVIRONMENT="dev"
# ---------------------------- /PER-GAME INPUT --------------------------------


# ============================ DERIVED — DO NOT EDIT ==========================
PROTOCOL_VERSION="1"
BRIDGE_VERSION="9.0.0"
REGISTRY="registry2.papagroup.net"
NETWORK="traefik-public"
NGINX_PORT="80"
CERT_RESOLVER="myresolver"
REPLICAS="1"
RESTART_POLICY="on-failure"

case "${ENVIRONMENT}" in
  dev)
    DOMAIN="dev-${GAME_SLUG}.papastudio.net"
    ALLOWED_PARENT_ORIGINS="https://dev-winkgames.papastudio.net http://127.0.0.1:8787"
    STACK_NAME="papastudio-winkgames-dev-games"
    IMAGE_NAME="winkgames/dev/${GAME_SLUG}"
    ROUTER_NAME="winkgames-minigame-dev-${GAME_SLUG}"
    ;;
  prod)
    DOMAIN="${GAME_SLUG}.papastudio.net"
    ALLOWED_PARENT_ORIGINS="https://winkgames.papastudio.net"
    STACK_NAME="papastudio-winkgames-games"
    IMAGE_NAME="winkgames/prod/${GAME_SLUG}"
    ROUTER_NAME="winkgames-minigame-prod-${GAME_SLUG}"
    ;;
  *)
    printf '%s\n' 'WINK_ENVIRONMENT_INVALID' >&2
    return 2 2>/dev/null || exit 2
    ;;
esac

SERVICE_NAME="${GAME_SLUG}"
SERVICE_FULL_NAME="${STACK_NAME}_${SERVICE_NAME}"
IMAGE_REPOSITORY="${REGISTRY}/${IMAGE_NAME}"
