#!/usr/bin/env node

/**
 * Build a throwaway image, run the real Nginx, and assert the security headers
 * on every route the Wink runtime depends on. The temporary image/container is
 * removed afterwards.
 *
 * Env:
 *   GAME_SLUG                            names the temporary image (required)
 *   WINK_DOCKER_ALLOWED_PARENT_ORIGINS   frame-ancestors value under test
 *   WINK_DOCKER_IMAGE                    reuse an existing image instead of building
 */

import { execFile } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { isSlug } from './wink-contract.mjs';

const execFileAsync = promisify(execFile);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const slug = process.env.GAME_SLUG || '';
if (!process.env.WINK_DOCKER_IMAGE && !isSlug(slug)) {
  console.error(
    'GAME_SLUG is required (source ./game.config.sh first) or set WINK_DOCKER_IMAGE',
  );
  process.exit(2);
}

const imageOverride = process.env.WINK_DOCKER_IMAGE || null;
const image =
  imageOverride || `winkgames-${slug}:header-smoke-${process.pid}`;
const container = `winkgames-${slug || 'game'}-header-smoke-${process.pid}`;
const allowedParentOrigins =
  process.env.WINK_DOCKER_ALLOWED_PARENT_ORIGINS || "'none'";
const expectedHeaders = {
  'content-security-policy': `frame-ancestors ${allowedParentOrigins}`,
  'referrer-policy': 'no-referrer',
  'x-content-type-options': 'nosniff',
};
const routes = [
  '/health',
  '/',
  '/play/deep-link',
  '/wink-runtime-config.json',
  '/wink-bridge.js',
];

async function docker(args, options = {}) {
  return execFileAsync('docker', args, {
    cwd: ROOT,
    maxBuffer: 10 * 1024 * 1024,
    ...options,
  });
}

async function imageExists() {
  try {
    await docker(['image', 'inspect', image]);
    return true;
  } catch {
    return false;
  }
}

async function waitForPort() {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    try {
      const { stdout } = await docker(['port', container, '80/tcp']);
      const match = stdout.match(/127\.0\.0\.1:(\d+)/);
      if (match) return Number(match[1]);
    } catch {
      // The container may still be starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  throw new Error('Docker header smoke container did not expose a port');
}

async function waitForHealth(baseUrl) {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    try {
      const response = await fetch(`${baseUrl}/health`);
      if (response.status === 200) return;
    } catch {
      // The Nginx worker may still be starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  throw new Error('Docker header smoke container did not become healthy');
}

async function assertRoute(baseUrl, route) {
  const response = await fetch(`${baseUrl}${route}`);
  if (response.status !== 200) {
    throw new Error(`${route} returned HTTP ${response.status}`);
  }
  for (const [name, expected] of Object.entries(expectedHeaders)) {
    const actual = response.headers.get(name);
    if (actual !== expected) {
      throw new Error(
        `${route} missing expected ${name}: ${JSON.stringify(actual)} !== ${JSON.stringify(expected)}`,
      );
    }
  }
  if (route === '/health' && (await response.text()) !== 'OK') {
    throw new Error('/health did not return OK');
  }
}

async function run() {
  let builtImage = false;
  try {
    if (!imageOverride) {
      await docker(['build', '--pull=false', '-t', image, '.']);
      builtImage = true;
    } else if (!(await imageExists())) {
      throw new Error(
        `Docker image ${image} does not exist; build it first or omit WINK_DOCKER_IMAGE`,
      );
    }

    await docker([
      'run',
      '-d',
      '--rm',
      '--name',
      container,
      '-p',
      '127.0.0.1::80',
      '--env',
      `ALLOWED_PARENT_ORIGINS=${allowedParentOrigins}`,
      image,
    ]);
    const port = await waitForPort();
    const baseUrl = `http://127.0.0.1:${port}`;
    await waitForHealth(baseUrl);
    for (const route of routes) {
      await assertRoute(baseUrl, route);
    }
    console.log(
      `docker headers verified image=${image} routes=${routes.length} frameAncestors=${allowedParentOrigins}`,
    );
  } finally {
    await docker(['rm', '-f', container]).catch(() => {});
    if (builtImage) {
      await docker(['image', 'rm', image]).catch(() => {});
    }
  }
}

run().catch((error) => {
  console.error(
    error instanceof Error
      ? error.message
      : 'Docker header smoke verification failed',
  );
  process.exitCode = 1;
});
