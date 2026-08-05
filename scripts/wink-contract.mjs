/**
 * Single source of truth for the Wink iframe pilot contract.
 *
 * Every other script in this repository derives its pins from here. Do not
 * duplicate these literals elsewhere and do not edit them per game: the bridge
 * artifact is certified by version, protocol, byte length, and checksum.
 */

export const BRIDGE_VERSION = '9.0.0';
export const PROTOCOL_VERSION = 1;
export const BRIDGE_SHA256 =
  'afe2a789466c3d68f4eec7d8cf2e718f45a29a19a5d8b9eb8c4cec10b18f31eb';
export const BRIDGE_BYTES = 35_128;

/**
 * Provenance of the certified artifact in the Wink repository. This records
 * where the bytes came from; it is deliberately NOT compared against the live
 * HEAD of a local Wink checkout, because a game repository must build without
 * one.
 */
export const BRIDGE_SOURCE = Object.freeze({
  repository: 'wink',
  commit: 'efc50ed4a27cb55f351c257350e1993d385e4a3f',
  artifact: 'game-template/wink-bridge.js',
  manifest: 'game-template/wink-bridge.manifest.json',
});

export const LOCAL_GAME_ORIGIN = 'http://127.0.0.1:5173';
export const HARNESS_ORIGIN = 'http://127.0.0.1:8787';

export const ENVIRONMENTS = Object.freeze(['dev', 'prod']);

/**
 * Per-environment public authorities and deployment naming.
 *
 * `dev` is the certified pilot environment. `prod` names are derived with the
 * same scheme and are pinned to the pilot production parent that
 * `generate-wink-runtime-config.mjs` has always enforced; promoting a game to
 * production still requires the separate platform-owner approval described in
 * game-template/docs/PRODUCTION_READINESS.md.
 */
export const ENVIRONMENT_CONTRACT = Object.freeze({
  dev: Object.freeze({
    parentOrigins: Object.freeze([
      'https://dev-winkgames.papastudio.net',
      HARNESS_ORIGIN,
    ]),
    apiBase: 'https://dev-api-winkgames.papastudio.net/api/v1',
    domainPrefix: 'dev-',
    stackName: 'papastudio-winkgames-dev-games',
    imagePrefix: 'winkgames/dev/',
    routerPrefix: 'winkgames-minigame-dev-',
  }),
  // Production is not a target a game developer may point anything at. It is
  // recorded here only so derived names stay in one place. `verify-handoff.mjs`
  // refuses any manifest whose environment is not `dev`, the harness refuses a
  // production API base, and promoting a game to production additionally needs
  // the platform-owner approval described in docs/PRODUCTION_READINESS.md.
  prod: Object.freeze({
    parentOrigins: Object.freeze(['https://winkgames.papastudio.net']),
    apiBase: 'https://api-winkgames.papastudio.net/api/v1',
    domainPrefix: '',
    stackName: 'papastudio-winkgames-games',
    imagePrefix: 'winkgames/prod/',
    routerPrefix: 'winkgames-minigame-prod-',
  }),
});

export const REGISTRY = 'registry2.papagroup.net';
export const DOMAIN_SUFFIX = '.papastudio.net';

/** Hostnames a game may never claim, even if its slug would produce them. */
export const RESERVED_HOSTNAMES = Object.freeze([
  'winkgames.papastudio.net',
  'dev-winkgames.papastudio.net',
  'api-winkgames.papastudio.net',
  'dev-api-winkgames.papastudio.net',
]);

export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export const SHA256_PATTERN = /^[0-9a-f]{64}$/;

/** Values that must never appear in a public artifact or a derived name. */
export const SECRET_SHAPE =
  /(?:TOKEN|SECRET|API_BASE|ANONYMOUS|PRIMARY|REFRESH|AUTHORIZATION|COOKIE|PASSWORD)/i;

export function isEnvironment(value) {
  return ENVIRONMENTS.includes(value);
}

export function isSlug(value) {
  return (
    typeof value === 'string' &&
    value.length >= 2 &&
    value.length <= 48 &&
    SLUG_PATTERN.test(value)
  );
}

export function isUuid(value) {
  return typeof value === 'string' && UUID_PATTERN.test(value);
}

export function isExactOrigin(value) {
  if (typeof value !== 'string' || value === '*' || value.length === 0) {
    return false;
  }
  try {
    const parsed = new URL(value);
    return (
      (parsed.protocol === 'http:' || parsed.protocol === 'https:') &&
      parsed.username === '' &&
      parsed.password === '' &&
      parsed.origin === value
    );
  } catch {
    return false;
  }
}

export function containsSecretShape(value) {
  if (typeof value === 'string') return SECRET_SHAPE.test(value);
  if (Array.isArray(value)) return value.some(containsSecretShape);
  if (value && typeof value === 'object') {
    return Object.entries(value).some(
      ([key, child]) => SECRET_SHAPE.test(key) || containsSecretShape(child),
    );
  }
  return false;
}

/**
 * Derive every deployment name for one game from its slug and environment.
 *
 * `game.config.sh` performs the same derivation in shell so the deploy script
 * stays dependency-free; `verify-game-config.mjs` compares the two and fails
 * closed on any drift.
 */
export function deriveGamePlan({ slug, environment }) {
  if (!isSlug(slug)) {
    throw new Error('WINK_GAME_SLUG_INVALID');
  }
  if (!isEnvironment(environment)) {
    throw new Error('WINK_ENVIRONMENT_INVALID');
  }

  const env = ENVIRONMENT_CONTRACT[environment];
  const domain = `${env.domainPrefix}${slug}${DOMAIN_SUFFIX}`;
  if (RESERVED_HOSTNAMES.includes(domain)) {
    throw new Error('WINK_GAME_DOMAIN_RESERVED');
  }

  const plan = Object.freeze({
    environment,
    slug,
    domain,
    gameOrigin: `https://${domain}`,
    localGameOrigin: LOCAL_GAME_ORIGIN,
    allowedParentOrigins: Object.freeze([...env.parentOrigins]),
    apiBase: env.apiBase,
    stackName: env.stackName,
    serviceName: slug,
    serviceFullName: `${env.stackName}_${slug}`,
    routerName: `${env.routerPrefix}${slug}`,
    registry: REGISTRY,
    imageName: `${env.imagePrefix}${slug}`,
    imageRepository: `${REGISTRY}/${env.imagePrefix}${slug}`,
    protocolVersion: PROTOCOL_VERSION,
    bridgeVersion: BRIDGE_VERSION,
  });

  if (containsSecretShape(plan)) {
    throw new Error('WINK_GAME_PLAN_FORBIDDEN_SHAPE');
  }
  return plan;
}

/**
 * The exact allowed origins to register on this game's backend catalog row: the
 * deployed origin, plus the local dev origin on `dev` so the harness can load
 * the game before it is deployed anywhere.
 */
export function catalogAllowedOrigins(plan) {
  return plan.environment === 'dev'
    ? [plan.gameOrigin, LOCAL_GAME_ORIGIN]
    : [plan.gameOrigin];
}
