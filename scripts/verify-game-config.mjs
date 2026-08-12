#!/usr/bin/env node

/**
 * Cross-check the values game.config.sh derived in shell against the canonical
 * Node contract, then confirm the committed runtime config belongs to the same
 * game and environment.
 *
 * game.config.sh keeps its own derivation so deploy.sh stays dependency-free;
 * this script is what makes that duplication safe. Any drift between the two
 * fails the deploy before a single image or stack is touched.
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  BRIDGE_VERSION,
  PROTOCOL_VERSION,
  catalogAllowedOrigins,
  deriveGamePlan,
  isUuid,
} from './wink-contract.mjs';

const REQUIRED_ENV = Object.freeze([
  'GAME_SLUG',
  'GAME_ID',
  'ENVIRONMENT',
  'DOMAIN',
  'ALLOWED_PARENT_ORIGINS',
  'STACK_NAME',
  'SERVICE_NAME',
  'ROUTER_NAME',
  'REGISTRY',
  'IMAGE_NAME',
  'PROTOCOL_VERSION',
  'BRIDGE_VERSION',
]);

export function assertGameConfig(env) {
  const missing = REQUIRED_ENV.filter((key) => !env[key]);
  if (missing.length > 0) {
    throw new Error(`WINK_GAME_CONFIG_INCOMPLETE: ${missing.join(',')}`);
  }
  if (!isUuid(env.GAME_ID)) {
    throw new Error('WINK_GAME_ID_INVALID');
  }

  const plan = deriveGamePlan({
    slug: env.GAME_SLUG,
    environment: env.ENVIRONMENT,
  });

  const expected = {
    DOMAIN: plan.domain,
    ALLOWED_PARENT_ORIGINS: plan.allowedParentOrigins.join(' '),
    STACK_NAME: plan.stackName,
    SERVICE_NAME: plan.serviceName,
    ROUTER_NAME: plan.routerName,
    REGISTRY: plan.registry,
    IMAGE_NAME: plan.imageName,
    PROTOCOL_VERSION: String(PROTOCOL_VERSION),
    BRIDGE_VERSION: BRIDGE_VERSION,
  };

  const drift = Object.entries(expected)
    .filter(([key, value]) => env[key] !== value)
    .map(([key, value]) => `${key}(expected ${value}, got ${env[key]})`);
  if (drift.length > 0) {
    throw new Error(`WINK_GAME_CONFIG_DRIFT: ${drift.join('; ')}`);
  }

  return plan;
}

export async function verifyGameConfig({
  env = process.env,
  rootDir = process.cwd(),
} = {}) {
  const plan = assertGameConfig(env);

  const configPath = path.join(rootDir, 'public', 'wink-runtime-config.json');
  let config;
  try {
    config = JSON.parse(await fs.readFile(configPath, 'utf8'));
  } catch {
    throw new Error('WINK_RUNTIME_CONFIG_UNREADABLE');
  }
  if (
    config.gameId !== env.GAME_ID ||
    config.environment !== plan.environment ||
    config.allowedParentOrigins.join(' ') !== plan.allowedParentOrigins.join(' ')
  ) {
    throw new Error('WINK_RUNTIME_CONFIG_MISMATCH');
  }

  return Object.freeze({
    schemaVersion: 1,
    code: 'WINK_GAME_CONFIG_OK',
    slug: plan.slug,
    environment: plan.environment,
    domain: plan.domain,
    imageRepository: plan.imageRepository,
    stack: plan.stackName,
    service: plan.serviceFullName,
    catalogAllowedOrigins: catalogAllowedOrigins(plan),
  });
}

const invokedPath = process.argv[1] ? path.resolve(process.argv[1]) : null;
if (invokedPath === fileURLToPath(import.meta.url)) {
  try {
    process.stdout.write(`${JSON.stringify(await verifyGameConfig())}\n`);
  } catch (error) {
    process.stderr.write(
      `${error instanceof Error ? error.message : 'WINK_GAME_CONFIG_INVALID'}\n`,
    );
    process.exitCode = 2;
  }
}
