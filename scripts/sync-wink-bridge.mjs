#!/usr/bin/env node

/**
 * Write public/wink-bridge.lock.json for the vendored certified bridge.
 *
 *   node scripts/sync-wink-bridge.mjs
 *     Verify public/wink-bridge.js against the pinned contract and (re)write
 *     the lock. Needs no Wink checkout — this is the normal path for a game
 *     developer and for CI.
 *
 *   node scripts/sync-wink-bridge.mjs --from <wink>/game-template
 *     Also re-copy the artifact from a certified template directory first.
 *     WINK_TEMPLATE_DIR is honoured as an equivalent to --from.
 *
 * Provenance is recorded from the pinned contract, never read from a local Git
 * HEAD: the bytes are what is certified, not the checkout they were copied in.
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
  PROTOCOL_VERSION,
} from './wink-contract.mjs';

function digest(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

export function buildBridgeLock(artifact) {
  const sha256 = digest(artifact);
  if (
    sha256 !== BRIDGE_SHA256 ||
    artifact.byteLength !== BRIDGE_BYTES
  ) {
    throw new Error(
      `Bridge artifact is not the certified build (bytes=${artifact.byteLength} sha256=${sha256})`,
    );
  }
  return {
    name: 'wink-bridge',
    bridgeVersion: BRIDGE_VERSION,
    protocolVersion: PROTOCOL_VERSION,
    sha256,
    bytes: artifact.byteLength,
    source: { ...BRIDGE_SOURCE },
  };
}

async function readCertifiedArtifact(templateDir) {
  const artifactPath = path.join(templateDir, 'wink-bridge.js');
  const manifestPath = path.join(templateDir, 'wink-bridge.manifest.json');
  let artifact;
  let manifest;
  try {
    [artifact, manifest] = await Promise.all([
      fs.readFile(artifactPath),
      fs.readFile(manifestPath, 'utf8').then(JSON.parse),
    ]);
  } catch {
    throw new Error(
      `Certified Wink template is unreadable at ${templateDir}; omit --from to use the vendored artifact`,
    );
  }
  if (
    manifest.bridgeVersion !== BRIDGE_VERSION ||
    manifest.protocolVersion !== PROTOCOL_VERSION
  ) {
    throw new Error('Certified Wink template does not match the pinned contract');
  }
  return artifact;
}

export async function syncWinkBridge({
  rootDir = process.cwd(),
  templateDir = null,
} = {}) {
  const publicDir = path.join(rootDir, 'public');
  const bridgePath = path.join(publicDir, 'wink-bridge.js');

  let artifact;
  if (templateDir) {
    artifact = await readCertifiedArtifact(templateDir);
    await fs.mkdir(publicDir, { recursive: true });
    await fs.writeFile(bridgePath, artifact);
  } else {
    try {
      artifact = await fs.readFile(bridgePath);
    } catch {
      throw new Error(
        'public/wink-bridge.js is missing; copy the certified artifact or pass --from <wink>/game-template',
      );
    }
  }

  const lock = buildBridgeLock(artifact);
  await fs.writeFile(
    path.join(publicDir, 'wink-bridge.lock.json'),
    `${JSON.stringify(lock, null, 2)}\n`,
  );
  return Object.freeze(lock);
}

function parseTemplateDir(argv) {
  const index = argv.indexOf('--from');
  if (index === -1) {
    return process.env.WINK_TEMPLATE_DIR || null;
  }
  const value = argv[index + 1];
  if (!value || value.startsWith('--')) {
    throw new Error('Usage: node scripts/sync-wink-bridge.mjs [--from <dir>]');
  }
  return path.resolve(value);
}

const invokedPath = process.argv[1] ? path.resolve(process.argv[1]) : null;
if (invokedPath === fileURLToPath(import.meta.url)) {
  try {
    const lock = await syncWinkBridge({
      templateDir: parseTemplateDir(process.argv.slice(2)),
    });
    console.log(
      `wink bridge lock written version=${lock.bridgeVersion}` +
        ` protocol=${lock.protocolVersion}` +
        ` bytes=${lock.bytes} sha256=${lock.sha256}`,
    );
  } catch (error) {
    console.error(
      error instanceof Error ? error.message : 'Wink bridge sync failed',
    );
    process.exitCode = 1;
  }
}
