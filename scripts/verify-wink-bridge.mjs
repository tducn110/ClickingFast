#!/usr/bin/env node

/**
 * Fail-closed check that this game still ships the certified Wink bridge.
 *
 * Verifies four things:
 *   1. public/wink-bridge.js matches the pinned bytes and checksum;
 *   2. public/wink-bridge.lock.json agrees with the artifact and the contract;
 *   3. public/wink-runtime-config.json is a valid public config for its
 *      environment;
 *   4. the HTML entrypoint loads the bridge before any other script.
 *
 * The entrypoint check is framework-agnostic: it only requires that no other
 * `src=` or `type="module"` script tag precedes /wink-bridge.js. Override the
 * entry file with WINK_INDEX_HTML when the game does not use ./index.html.
 */

import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  BRIDGE_BYTES,
  BRIDGE_SHA256,
  BRIDGE_SOURCE,
  BRIDGE_VERSION,
  ENVIRONMENT_CONTRACT,
  PROTOCOL_VERSION,
  containsSecretShape,
  isEnvironment,
  isExactOrigin,
  isUuid,
} from './wink-contract.mjs';

const BRIDGE_SRC = '/wink-bridge.js';
const CONFIG_KEYS = Object.freeze([
  'allowedParentOrigins',
  'bridgeVersion',
  'environment',
  'gameId',
  'protocolVersion',
]);

function digest(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

export function assertRuntimeConfig(config) {
  if (
    !config ||
    typeof config !== 'object' ||
    Array.isArray(config) ||
    JSON.stringify(Object.keys(config).sort()) !==
      JSON.stringify([...CONFIG_KEYS].sort()) ||
    !isUuid(config.gameId) ||
    !isEnvironment(config.environment) ||
    config.protocolVersion !== PROTOCOL_VERSION ||
    config.bridgeVersion !== BRIDGE_VERSION ||
    !Array.isArray(config.allowedParentOrigins) ||
    config.allowedParentOrigins.length === 0 ||
    config.allowedParentOrigins.some((origin) => !isExactOrigin(origin)) ||
    new Set(config.allowedParentOrigins).size !==
      config.allowedParentOrigins.length ||
    containsSecretShape(config)
  ) {
    throw new Error('Wink runtime config does not match the public contract');
  }

  const expected = ENVIRONMENT_CONTRACT[config.environment].parentOrigins;
  const isLoopbackOnlyOverride = config.allowedParentOrigins.every((origin) =>
    origin.startsWith('http://127.0.0.1:'),
  );
  const matchesEnvironment =
    config.allowedParentOrigins.length === expected.length &&
    config.allowedParentOrigins.every((origin, i) => origin === expected[i]);

  // A committed config must name the exact environment parents. An all-loopback
  // config is tolerated because Track A generates one temporarily for the
  // local-FE run; it must never be committed or deployed.
  if (!matchesEnvironment && !isLoopbackOnlyOverride) {
    throw new Error(
      `Wink runtime config parents do not match the ${config.environment} contract`,
    );
  }
  return config;
}

/**
 * Return the ordered list of `<script>` tags so the bridge can be proven to
 * load first regardless of bundler or framework.
 */
export function scriptTags(html) {
  return [...html.matchAll(/<script\b[^>]*>/gi)].map((match) => ({
    tag: match[0],
    index: match.index,
    src: /\bsrc\s*=\s*["']([^"']+)["']/i.exec(match[0])?.[1] ?? null,
    isModule: /\btype\s*=\s*["']module["']/i.test(match[0]),
  }));
}

export function assertBridgeLoadsFirst(html, entryName = 'index.html') {
  const tags = scriptTags(html);
  const bridgeIndex = tags.findIndex(
    (tag) => tag.src === BRIDGE_SRC || tag.src === BRIDGE_SRC.slice(1),
  );
  if (bridgeIndex === -1) {
    throw new Error(
      `${entryName} must load <script src="${BRIDGE_SRC}"></script> before game code`,
    );
  }
  const earlier = tags
    .slice(0, bridgeIndex)
    .find((tag) => tag.src !== null || tag.isModule);
  if (earlier) {
    throw new Error(
      `${entryName} loads ${earlier.src ?? 'an inline module'} before ${BRIDGE_SRC}`,
    );
  }
  return true;
}

export async function verifyWinkBridge({
  rootDir = process.cwd(),
  indexHtml = process.env.WINK_INDEX_HTML || 'index.html',
} = {}) {
  const publicDir = path.join(rootDir, 'public');
  let artifact;
  let lock;
  let config;
  let html;
  try {
    const [artifactBuffer, lockText, configText, htmlText] = await Promise.all([
      fs.readFile(path.join(publicDir, 'wink-bridge.js')),
      fs.readFile(path.join(publicDir, 'wink-bridge.lock.json'), 'utf8'),
      fs.readFile(path.join(publicDir, 'wink-runtime-config.json'), 'utf8'),
      fs.readFile(path.join(rootDir, indexHtml), 'utf8'),
    ]);
    artifact = artifactBuffer;
    lock = JSON.parse(lockText);
    config = JSON.parse(configText);
    html = htmlText;
  } catch (error) {
    throw new Error(
      `Required Wink artifact is missing or unreadable: ${
        error instanceof Error ? error.message : 'unknown error'
      }`,
    );
  }

  const sha256 = digest(artifact);
  if (sha256 !== BRIDGE_SHA256 || artifact.byteLength !== BRIDGE_BYTES) {
    throw new Error(
      `Vendored bridge is not the certified build (bytes=${artifact.byteLength} sha256=${sha256})`,
    );
  }
  if (
    lock?.name !== 'wink-bridge' ||
    lock.bridgeVersion !== BRIDGE_VERSION ||
    lock.protocolVersion !== PROTOCOL_VERSION ||
    lock.sha256 !== BRIDGE_SHA256 ||
    lock.bytes !== artifact.byteLength ||
    lock.source?.commit !== BRIDGE_SOURCE.commit
  ) {
    throw new Error(
      'public/wink-bridge.lock.json does not match the certified artifact; run npm run sync:wink-bridge',
    );
  }

  assertRuntimeConfig(config);
  assertBridgeLoadsFirst(html, indexHtml);

  return Object.freeze({
    bridgeVersion: lock.bridgeVersion,
    protocolVersion: lock.protocolVersion,
    sha256,
    bytes: artifact.byteLength,
    environment: config.environment,
    gameId: config.gameId,
    parents: config.allowedParentOrigins.length,
  });
}

const invokedPath = process.argv[1] ? path.resolve(process.argv[1]) : null;
if (invokedPath === fileURLToPath(import.meta.url)) {
  try {
    const evidence = await verifyWinkBridge();
    console.log(
      `wink bridge verified version=${evidence.bridgeVersion}` +
        ` protocol=${evidence.protocolVersion} bytes=${evidence.bytes}` +
        ` sha256=${evidence.sha256} environment=${evidence.environment}` +
        ` gameId=${evidence.gameId} parents=${evidence.parents}`,
    );
  } catch (error) {
    console.error(
      error instanceof Error ? error.message : 'Wink bridge verification failed',
    );
    process.exitCode = 1;
  }
}
