#!/bin/sh
# =============================================================================
#  Wink mini-game deployment
#
#  Usage:
#    ./deploy.sh --check-only
#        Regenerate the public runtime config and run every local gate. No
#        Docker or registry mutation.
#
#    ./deploy.sh --build-push
#        Run the gates, build an immutable image tagged git-<sha>, push it, and
#        print the resulting sha256 digest.
#
#    ./deploy.sh --deploy   <digest-image> artifacts/minigame-pilot/<file>.json
#    ./deploy.sh --rollback <digest-image> artifacts/minigame-pilot/<file>.json
#        Deploy or roll back the Swarm service to an exact immutable digest and
#        record the previous/next digest pair for reversal.
#
#  Every game identity value comes from game.config.sh and is re-validated
#  against the canonical Node contract before anything is mutated. No harness
#  secret, primary token, or scoped token is read by this script.
# =============================================================================

set -eu
umask 077

if [ ! -f "./game.config.sh" ]; then
  printf '%s\n' 'WINK_GAME_CONFIG_MISSING' >&2
  exit 2
fi

# shellcheck source=/dev/null
. ./game.config.sh

MODE="${1:-}"
case "${MODE}" in
  --check-only|--build-push)
    if [ "$#" -ne 1 ]; then
      printf '%s\n' 'WINK_DEPLOY_ARGUMENT_INVALID' >&2
      exit 2
    fi
    ;;
  --deploy|--rollback)
    if [ "$#" -ne 3 ]; then
      printf '%s\n' 'WINK_DEPLOY_ARGUMENT_INVALID' >&2
      exit 2
    fi
    ;;
  *)
    printf '%s\n' 'WINK_DEPLOY_ARGUMENT_INVALID' >&2
    exit 2
    ;;
esac

# --- Source must be an exact, clean, reviewed commit -------------------------
SOURCE_SHA="$(git rev-parse HEAD)"
if ! printf '%s\n' "${SOURCE_SHA}" | grep -Eq '^[0-9a-f]{40}$' || \
   ! git diff --quiet || \
   ! git diff --cached --quiet || \
   [ -n "$(git status --porcelain --untracked-files=normal)" ]; then
  printf '%s\n' 'WINK_SOURCE_INVALID' >&2
  exit 2
fi

IMAGE_TAG="git-${SOURCE_SHA}"
TAGGED_IMAGE="${IMAGE_REPOSITORY}:${IMAGE_TAG}"
ESCAPED_REPOSITORY="$(printf '%s' "${IMAGE_REPOSITORY}" | sed 's/[.[\*^$\/]/\\&/g')"
DIGEST_PATTERN="^${ESCAPED_REPOSITORY}@sha256:[0-9a-f]{64}$"

# --- Local gates, always, before any mutation --------------------------------
export GAME_ID GAME_SLUG ENVIRONMENT PROTOCOL_VERSION BRIDGE_VERSION
export ALLOWED_PARENT_ORIGINS DOMAIN STACK_NAME SERVICE_NAME ROUTER_NAME
export REGISTRY IMAGE_NAME
export OUTPUT_PATH="./public/wink-runtime-config.json"

node scripts/generate-wink-runtime-config.mjs
node scripts/verify-game-config.mjs
npm run verify:wink-bridge
npm test
npm run typecheck
npm run build
WINK_DOCKER_ALLOWED_PARENT_ORIGINS="${ALLOWED_PARENT_ORIGINS}" \
npm run verify:docker-headers

# Regenerating the config must not change a reviewed commit.
if ! git diff --quiet -- "${OUTPUT_PATH}"; then
  printf '%s\n' 'WINK_RUNTIME_CONFIG_NOT_COMMITTED' >&2
  exit 2
fi

if [ "${MODE}" = "--check-only" ]; then
  printf '%s\n' "{\"schemaVersion\":1,\"code\":\"WINK_CHECK_OK\",\"slug\":\"${GAME_SLUG}\",\"environment\":\"${ENVIRONMENT}\",\"sourceSha\":\"${SOURCE_SHA}\"}"
  exit 0
fi

# --- Build and publish an immutable image ------------------------------------
if [ "${MODE}" = "--build-push" ]; then
  if docker manifest inspect "${TAGGED_IMAGE}" >/dev/null 2>&1; then
    printf '%s\n' 'WINK_IMAGE_TAG_EXISTS' >&2
    exit 2
  fi

  docker build -t "${TAGGED_IMAGE}" .
  PUSH_OUTPUT="$(mktemp "${TMPDIR:-/tmp}/wink-push.XXXXXX")"
  trap 'rm -f "${PUSH_OUTPUT}"' EXIT HUP INT TERM
  docker push "${TAGGED_IMAGE}" | tee "${PUSH_OUTPUT}"
  PUSH_DIGEST="$(
    sed -n 's/.*digest: \(sha256:[0-9a-f]\{64\}\).*/\1/p' \
      "${PUSH_OUTPUT}" | tail -n 1
  )"
  DIGEST_IMAGE="${IMAGE_REPOSITORY}@${PUSH_DIGEST}"
  if ! printf '%s\n' "${DIGEST_IMAGE}" | grep -Eq "${DIGEST_PATTERN}"; then
    printf '%s\n' 'WINK_IMAGE_DIGEST_INVALID' >&2
    exit 1
  fi
  printf '%s\n' "{\"schemaVersion\":1,\"code\":\"WINK_IMAGE_PUBLISHED\",\"slug\":\"${GAME_SLUG}\",\"environment\":\"${ENVIRONMENT}\",\"sourceSha\":\"${SOURCE_SHA}\",\"taggedImage\":\"${TAGGED_IMAGE}\",\"digestImage\":\"${DIGEST_IMAGE}\"}"
  exit 0
fi

# --- Deploy or roll back to an exact digest ----------------------------------
DIGEST_IMAGE="$2"
ROLLBACK_METADATA_PATH="$3"
if ! printf '%s\n' "${DIGEST_IMAGE}" | grep -Eq "${DIGEST_PATTERN}"; then
  printf '%s\n' 'WINK_IMAGE_DIGEST_INVALID' >&2
  exit 2
fi
case "${ROLLBACK_METADATA_PATH}" in
  artifacts/minigame-pilot/*) ;;
  *)
    printf '%s\n' 'WINK_ROLLBACK_METADATA_PATH_INVALID' >&2
    exit 2
    ;;
esac
if ! printf '%s\n' "${ROLLBACK_METADATA_PATH}" | \
     grep -Eq '^artifacts/minigame-pilot/[A-Za-z0-9._/-]+\.json$' || \
   printf '%s\n' "${ROLLBACK_METADATA_PATH}" | grep -Eq '(^|/)\.\.(/|$)|//'; then
  printf '%s\n' 'WINK_ROLLBACK_METADATA_PATH_INVALID' >&2
  exit 2
fi
ROLLBACK_METADATA_DIR="$(dirname "${ROLLBACK_METADATA_PATH}")"
if [ ! -d "${ROLLBACK_METADATA_DIR}" ]; then
  printf '%s\n' 'WINK_ROLLBACK_METADATA_PATH_INVALID' >&2
  exit 2
fi
ARTIFACT_ROOT="$(CDPATH= cd -- artifacts/minigame-pilot && pwd -P)"
ROLLBACK_METADATA_DIR="$(CDPATH= cd -- "${ROLLBACK_METADATA_DIR}" && pwd -P)"
case "${ROLLBACK_METADATA_DIR}" in
  "${ARTIFACT_ROOT}"|"${ARTIFACT_ROOT}"/*) ;;
  *)
    printf '%s\n' 'WINK_ROLLBACK_METADATA_PATH_INVALID' >&2
    exit 2
    ;;
esac
ROLLBACK_METADATA_PATH="${ROLLBACK_METADATA_DIR}/$(basename "${ROLLBACK_METADATA_PATH}")"
if [ -L "${ROLLBACK_METADATA_PATH}" ] || [ -e "${ROLLBACK_METADATA_PATH}" ]; then
  printf '%s\n' 'WINK_ROLLBACK_METADATA_PATH_INVALID' >&2
  exit 2
fi

STACK_FILE="$(mktemp "${TMPDIR:-/tmp}/wink-stack.XXXXXX")"
ROLLBACK_METADATA_TMP=""
cleanup() {
  rm -f "${STACK_FILE}"
  if [ -n "${ROLLBACK_METADATA_TMP}" ]; then
    rm -f "${ROLLBACK_METADATA_TMP}"
  fi
}
trap cleanup EXIT HUP INT TERM

{
  echo "version: '3.8'"
  echo "services:"
  echo "  ${SERVICE_NAME}:"
  echo "    image: ${DIGEST_IMAGE}"
  echo "    networks:"
  echo "      - ${NETWORK}"
  echo "    labels:"
  echo "      - \"traefik.enable=true\""
  echo "      - 'traefik.http.routers.${ROUTER_NAME}.rule=Host(\`${DOMAIN}\`)'"
  echo "      - \"traefik.http.routers.${ROUTER_NAME}.entrypoints=websecure\""
  echo "      - \"traefik.http.routers.${ROUTER_NAME}.tls=true\""
  echo "      - \"traefik.http.routers.${ROUTER_NAME}.tls.certresolver=${CERT_RESOLVER}\""
  echo "      - \"traefik.http.services.${ROUTER_NAME}.loadbalancer.server.port=${NGINX_PORT}\""
  echo "    environment:"
  echo "      - \"ALLOWED_PARENT_ORIGINS=${ALLOWED_PARENT_ORIGINS}\""
  echo "    deploy:"
  echo "      replicas: ${REPLICAS}"
  echo "      restart_policy:"
  echo "        condition: ${RESTART_POLICY}"
  echo "      update_config:"
  echo "        parallelism: 1"
  echo "        order: start-first"
  echo "        failure_action: rollback"
  echo "      rollback_config:"
  echo "        parallelism: 1"
  echo "        order: stop-first"
  echo "      resources:"
  echo "        limits:"
  echo "          cpus: '0.50'"
  echo "          memory: 256M"
  echo "        reservations:"
  echo "          cpus: '0.05'"
  echo "          memory: 64M"
  echo "    logging:"
  echo "      driver: json-file"
  echo "      options:"
  echo "        max-size: 10m"
  echo "        max-file: '3'"
  echo "networks:"
  echo "  ${NETWORK}:"
  echo "    external: true"
} > "${STACK_FILE}"

docker stack config -c "${STACK_FILE}" >/dev/null
PREVIOUS_IMAGE="$(
  docker service inspect "${SERVICE_FULL_NAME}" \
    --format '{{.Spec.TaskTemplate.ContainerSpec.Image}}' 2>/dev/null || true
)"
if [ -z "${PREVIOUS_IMAGE}" ]; then
  PREVIOUS_IMAGE="absent"
fi

docker stack deploy --with-registry-auth \
  -c "${STACK_FILE}" "${STACK_NAME}"

ATTEMPTS="0"
CURRENT_REPLICAS=""
CURRENT_IMAGE=""
UPDATE_STATE=""
while [ "${ATTEMPTS}" -lt 24 ]; do
  CURRENT_REPLICAS="$(
    docker service ls --filter "name=${SERVICE_FULL_NAME}" \
      --format '{{.Replicas}}'
  )"
  CURRENT_IMAGE="$(
    docker service inspect "${SERVICE_FULL_NAME}" \
      --format '{{.Spec.TaskTemplate.ContainerSpec.Image}}' 2>/dev/null || true
  )"
  UPDATE_STATE="$(
    docker service inspect "${SERVICE_FULL_NAME}" \
      --format '{{if .UpdateStatus}}{{.UpdateStatus.State}}{{end}}' \
      2>/dev/null || true
  )"
  if [ "${CURRENT_REPLICAS}" = "${REPLICAS}/${REPLICAS}" ] && \
     [ "${CURRENT_IMAGE}" = "${DIGEST_IMAGE}" ] && \
     { [ -z "${UPDATE_STATE}" ] || [ "${UPDATE_STATE}" = "completed" ]; }; then
    break
  fi
  ATTEMPTS=$((ATTEMPTS + 1))
  sleep 5
done
if [ "${CURRENT_REPLICAS}" != "${REPLICAS}/${REPLICAS}" ] || \
   [ "${CURRENT_IMAGE}" != "${DIGEST_IMAGE}" ] || \
   { [ -n "${UPDATE_STATE}" ] && [ "${UPDATE_STATE}" != "completed" ]; }; then
  printf '%s\n' 'WINK_DEPLOY_HEALTH_FAILED' >&2
  exit 1
fi
curl --fail --silent --show-error --max-time 10 \
  "https://${DOMAIN}/health" >/dev/null

ACTION="${MODE#--}"
CREATED_AT="$(date -u '+%Y-%m-%dT%H:%M:%SZ')"
ROLLBACK_METADATA_TMP="$(mktemp "${ROLLBACK_METADATA_PATH}.tmp.XXXXXX")"
printf '%s\n' \
  "{\"schemaVersion\":1,\"action\":\"${ACTION}\",\"createdAt\":\"${CREATED_AT}\",\"slug\":\"${GAME_SLUG}\",\"environment\":\"${ENVIRONMENT}\",\"sourceSha\":\"${SOURCE_SHA}\",\"stack\":\"${STACK_NAME}\",\"service\":\"${SERVICE_NAME}\",\"previousImage\":\"${PREVIOUS_IMAGE}\",\"nextImage\":\"${DIGEST_IMAGE}\",\"result\":\"healthy\"}" \
  > "${ROLLBACK_METADATA_TMP}"
chmod 0600 "${ROLLBACK_METADATA_TMP}"
mv "${ROLLBACK_METADATA_TMP}" "${ROLLBACK_METADATA_PATH}"
ROLLBACK_METADATA_TMP=""

printf '%s\n' "{\"schemaVersion\":1,\"code\":\"WINK_DEPLOY_OK\",\"action\":\"${ACTION}\",\"service\":\"${SERVICE_FULL_NAME}\",\"domain\":\"${DOMAIN}\"}"
