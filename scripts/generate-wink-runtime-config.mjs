#!/usr/bin/env node

/**
 * Generate the public Wink runtime config for this game.
 *
 * Parent origins are derived from ENVIRONMENT, so the common case needs only
 * the game identity:
 *
 *   GAME_ID=<uuid> ENVIRONMENT=dev node scripts/generate-wink-runtime-config.mjs
 *
 * ALLOWED_PARENT_ORIGINS may override the derived list for the Track A
 * all-local run (Wink FE on 127.0.0.1:3001). That override is temporary and
 * must never be committed or deployed.
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  BRIDGE_VERSION,
  ENVIRONMENT_CONTRACT,
  PROTOCOL_VERSION,
  containsSecretShape,
  isEnvironment,
  isExactOrigin,
  isUuid,
} from './wink-contract.mjs';

const LOOPBACK_HOSTNAMES = ['127.0.0.1', 'localhost', '[::1]', '::1'];

function isLoopback(hostname) {
  return LOOPBACK_HOSTNAMES.includes(hostname);
}

export function generateWinkRuntimeConfig(input) {
  if (containsSecretShape(input)) {
    throw new Error('Wink runtime config cannot contain authority');
  }
  if (!isUuid(input.gameId)) {
    throw new Error('Wink runtime config gameId is invalid');
  }
  if (!isEnvironment(input.environment)) {
    throw new Error('Wink runtime config environment is invalid');
  }
  if (
    input.protocolVersion !== PROTOCOL_VERSION ||
    input.bridgeVersion !== BRIDGE_VERSION
  ) {
    throw new Error('Wink runtime config version pins are invalid');
  }

  const origins = input.allowedParentOrigins;
  if (
    !Array.isArray(origins) ||
    origins.length === 0 ||
    origins.some((origin) => !isExactOrigin(origin)) ||
    new Set(origins).size !== origins.length
  ) {
    throw new Error('Wink runtime config parent origins are invalid');
  }

  if (input.environment === 'prod') {
    const expected = ENVIRONMENT_CONTRACT.prod.parentOrigins;
    if (
      origins.length !== expected.length ||
      origins.some((origin, index) => origin !== expected[index])
    ) {
      throw new Error(
        'Production Wink runtime config requires the exact pilot parent',
      );
    }
  } else {
    for (const origin of origins) {
      const url = new URL(origin);
      if (url.protocol !== 'https:' && !isLoopback(url.hostname)) {
        throw new Error(
          'Development parents require HTTPS or exact loopback HTTP',
        );
      }
    }
  }

  return Object.freeze({
    gameId: input.gameId,
    environment: input.environment,
    protocolVersion: input.protocolVersion,
    bridgeVersion: input.bridgeVersion,
    allowedParentOrigins: Object.freeze([...origins]),
  });
}

export async function writeWinkRuntimeConfig(input, outputPath) {
  if (
    typeof outputPath !== 'string' ||
    outputPath.length === 0 ||
    containsSecretShape(outputPath)
  ) {
    throw new Error('Wink runtime config output path is invalid');
  }
  const config = generateWinkRuntimeConfig(input);
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, `${JSON.stringify(config, null, 2)}\n`);
  return config;
}

function resolveParentOrigins(environment) {
  const override = (process.env.ALLOWED_PARENT_ORIGINS || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (override.length > 0) {
    return override;
  }
  if (!isEnvironment(environment)) {
    throw new Error('Wink runtime config environment is invalid');
  }
  return [...ENVIRONMENT_CONTRACT[environment].parentOrigins];
}

async function runCli() {
  const environment = process.env.ENVIRONMENT;
  const outputPath = path.resolve(
    process.cwd(),
    process.env.OUTPUT_PATH || 'public/wink-runtime-config.json',
  );
  const config = await writeWinkRuntimeConfig(
    {
      gameId: process.env.GAME_ID,
      environment,
      protocolVersion: PROTOCOL_VERSION,
      bridgeVersion: BRIDGE_VERSION,
      allowedParentOrigins: resolveParentOrigins(environment),
    },
    outputPath,
  );
  console.log(
    `wink runtime config generated environment=${config.environment}` +
      ` protocol=${config.protocolVersion}` +
      ` parents=${config.allowedParentOrigins.length}` +
      ` output=${path.relative(process.cwd(), outputPath)}`,
  );
}

const invokedPath = process.argv[1] ? path.resolve(process.argv[1]) : null;
if (invokedPath === fileURLToPath(import.meta.url)) {
  runCli().catch((error) => {
    console.error(
      error instanceof Error
        ? error.message
        : 'Wink runtime config generation failed',
    );
    process.exitCode = 1;
  });
}
