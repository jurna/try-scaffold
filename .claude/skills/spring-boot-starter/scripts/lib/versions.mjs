#!/usr/bin/env node
// Version utilities, Spring Initializr fetch/extract, and CLI arg parsing.

import { readFileSync, existsSync, unlinkSync, createWriteStream } from 'node:fs';
import { pipeline } from 'node:stream/promises';
import { Readable } from 'node:stream';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
export const ROOT_DIR = process.env.ROOT_DIR || resolve(__dirname, '..', '..');
const VERSIONS_FILE = process.env.VERSIONS_FILE || resolve(ROOT_DIR, 'versions.json');
export const ASSETS_DIR = resolve(ROOT_DIR, 'assets');

/** Default timeout for HTTP requests (10 seconds) */
const FETCH_TIMEOUT_MS = 10_000;

/** Cached versions.json data — parsed once per process */
let _versionsCache = undefined;

/** Read a value from versions.json (cached after first read) */
function getVersionValue(key, defaultValue = '') {
  if (_versionsCache === undefined) {
    _versionsCache = existsSync(VERSIONS_FILE)
      ? JSON.parse(readFileSync(VERSIONS_FILE, 'utf8'))
      : null;
  }
  if (_versionsCache === null) return defaultValue;
  const value = _versionsCache[key];
  return value != null && String(value).trim() !== '' ? String(value) : defaultValue;
}

export function getJavaVersion() { return getVersionValue('javaVersion', '25'); }
export function getBootPreferredMajor() { return getVersionValue('springBootPreferredMajor', '4'); }
export function getBootFallback() { return getVersionValue('springBootFallback', '4.0.5'); }
export function getTemurinVersion() { return getVersionValue('temurinVersion', '25'); }
export function getGraalvmVersion() { return getVersionValue('graalvmVersion', '25'); }
export function getNodeVersion() { return getVersionValue('nodeVersion', '24.15.0'); }
export function getNpmVersion() { return getVersionValue('npmVersion', '11.12.1'); }
export function getViteVersion() { return getVersionValue('viteVersion', '8'); }
export function getVueVersion() { return getVersionValue('vueVersion', '3'); }
export function getPiniaVersion() { return getVersionValue('piniaVersion', '3'); }
export function getVueRouterVersion() { return getVersionValue('vueRouterVersion', '5'); }
export function getReactVersion() { return getVersionValue('reactVersion', '19'); }
export function getReactRouterVersion() { return getVersionValue('reactRouterVersion', '7'); }
export function getAngularVersion() { return getVersionValue('angularVersion', '21'); }
export function getBootstrapVersion() { return getVersionValue('bootstrapVersion', '5.3.8'); }
export function getBootstrapIconsVersion() { return getVersionValue('bootstrapIconsVersion', '1.13.1'); }
export function getTestcontainersVersion() { return getVersionValue('testcontainersVersion', '2.0.0'); }
export function getSpringFrameworkVersion() { return getVersionValue('springFrameworkVersion', '7.0'); }
export function getHibernateVersion() { return getVersionValue('hibernateVersion', '7.1'); }
export function getOpenApiProcessorPluginVersion() { return getVersionValue('openApiProcessorPluginVersion', '2026.1'); }
export function getOpenApiProcessorSpringVersion() { return getVersionValue('openApiProcessorSpringVersion', '2026.3.1'); }
export function getSpotlessPluginVersion() { return getVersionValue('spotlessPluginVersion', '8.4.0'); }
export function getArchUnitVersion() { return getVersionValue('archUnitVersion', '1.4.2'); }
export function getArchUnitSpringVersion() { return getVersionValue('archUnitSpringVersion', '1.2.0'); }
export function getPmdPluginVersion() { return getVersionValue('pmdPluginVersion', '7.14.0'); }
export function getSpotbugsGradlePluginVersion() { return getVersionValue('spotbugsGradlePluginVersion', '6.5.1'); }
export function getSpotbugsToolVersion() { return getVersionValue('spotbugsToolVersion', '4.9.8'); }
export function getFindSecBugsVersion() { return getVersionValue('findSecBugsVersion', '1.14.0'); }
export function getErrorProneGradlePluginVersion() { return getVersionValue('errorProneGradlePluginVersion', '5.1.0'); }
export function getErrorProneCoreVersion() { return getVersionValue('errorProneCoreVersion', '2.41.0'); }
export function getNullAwayVersion() { return getVersionValue('nullAwayVersion', '0.13.4'); }
export function getJSpecifyVersion() { return getVersionValue('jSpecifyVersion', '1.0.0'); }
export function getJacocoToolVersion() { return getVersionValue('jacocoToolVersion', '0.8.13'); }

/**
 * Strip legacy qualifiers (.RELEASE, .GA) that Spring Boot 4+ no longer uses.
 * E.g. "4.0.2.RELEASE" → "4.0.2", "4.0.2" → "4.0.2"
 */
function stripLegacyQualifier(version) {
  return version.replace(/\.(RELEASE|GA)$/i, '');
}

/**
 * Check whether a Spring Boot version has been published to the central repository.
 * Returns true if the artifact can be found (HTTP 200).
 */
async function isBootVersionPublished(version) {
  const groupPath = 'org/springframework/boot/spring-boot';
  const url = `https://repo1.maven.org/maven2/${groupPath}/${version}/spring-boot-${version}.pom`;
  try {
    const res = await fetch(url, { method: 'HEAD', signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Resolve preferred Spring Boot version with fallback.
 * Fetches the default boot version from start.spring.io metadata,
 * validates it has been published, and strips legacy qualifiers.
 * Only considers versions ≥ 4.x.
 */
export async function resolveBootVersion(preferredMajor, fallback) {
  preferredMajor = preferredMajor || getBootPreferredMajor();
  fallback = fallback || getBootFallback();
  try {
    const response = await fetch('https://start.spring.io', {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (!response.ok) {
      console.error(`Warning: start.spring.io returned HTTP ${response.status}. Using fallback ${fallback}.`);
      return fallback;
    }
    let metadata;
    try {
      metadata = await response.json();
    } catch {
      console.error(`Warning: start.spring.io returned invalid JSON. Using fallback ${fallback}.`);
      return fallback;
    }

    // Try multiple metadata paths (API may evolve)
    const fetched = metadata?.bootVersion?.default
      || metadata?.platformVersion?.default
      || metadata?.bootVersion;

    if (!fetched || typeof fetched !== 'string') {
      console.error(`Warning: could not read bootVersion from start.spring.io metadata. Using fallback ${fallback}.`);
      return fallback;
    }

    const cleaned = stripLegacyQualifier(fetched);

    if (cleaned.startsWith(`${preferredMajor}.`)) {
      // Verify the version has been published
      if (await isBootVersionPublished(cleaned)) {
        return cleaned;
      }
      console.error(`⚠️  Spring Boot ${cleaned} (from start.spring.io) is not published yet. Using fallback ${fallback}.`);
      return fallback;
    }

    // start.spring.io default doesn't match our preferred major — scan available versions
    const values = metadata?.bootVersion?.values || [];
    const candidates = values
      .map(v => typeof v === 'string' ? v : v?.id)
      .filter(Boolean)
      .map(stripLegacyQualifier)
      .filter(v => v.startsWith(`${preferredMajor}.`) && !v.includes('-'));
    // Pick the highest stable version from the list
    if (candidates.length > 0) {
      candidates.sort((a, b) => b.localeCompare(a, undefined, { numeric: true }));
      if (await isBootVersionPublished(candidates[0])) {
        return candidates[0];
      }
    }

    console.error(
      `⚠️  start.spring.io default bootVersion (${fetched}) does not match preferred major ${preferredMajor}. Using fallback ${fallback}. Override with --boot-version if needed.`
    );
    return fallback;
  } catch (err) {
    console.error(`Warning: Failed to fetch bootVersion from start.spring.io: ${err?.message || String(err)}. Using fallback ${fallback}.`);
    return fallback;
  }
}

/** Normalize dependency list, ensuring unique comma-separated values */
export function joinDependencies(...args) {
  const all = args.join(',').split(',').map(s => s.trim()).filter(Boolean);
  return [...new Set(all)].join(',');
}

/**
 * Download a file from a URL and stream it to disk.
 * Uses Node.js built-in fetch API with streaming to avoid loading the entire
 * response into memory.
 */
export async function downloadFile(url, dest) {
  console.log(`  ⬇  Downloading from ${new URL(url).hostname}…`);
  const response = await fetch(url, { signal: AbortSignal.timeout(60_000) });
  if (!response.ok) {
    throw new Error(`Failed to download: HTTP ${response.status} ${response.statusText}`);
  }
  const fileStream = createWriteStream(dest);
  await pipeline(Readable.fromWeb(response.body), fileStream);
}

/**
 * Extract a zip file to the current directory.
 * Uses platform-appropriate tools (unzip on Unix, PowerShell on Windows).
 */
export function extractZip(zipPath) {
  if (process.platform === 'win32') {
    execFileSync('powershell', [
      '-NoLogo', '-NoProfile', '-Command',
      `Expand-Archive -Path '${zipPath}' -DestinationPath '.' -Force`,
    ], { stdio: 'inherit' });
  } else {
    execFileSync('unzip', ['-q', zipPath], { stdio: 'inherit' });
  }
}

/**
 * Download and extract a Spring Boot project from start.spring.io.
 * Automatically strips legacy .RELEASE/.GA qualifiers from bootVersion.
 */
export async function downloadAndExtractProject(params) {
  if (params.bootVersion) {
    params.bootVersion = stripLegacyQualifier(params.bootVersion);
  }
  const query = Object.entries(params)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join('&');
  const url = `https://start.spring.io/starter.zip?${query}`;
  const zipFile = `${params.baseDir}.zip`;

  await downloadFile(url, zipFile);
  console.log('  📦 Extracting project…');
  extractZip(zipFile);
  unlinkSync(zipFile);

  console.log('  ✅ Project extracted successfully.');
}

/**
 * Parse CLI arguments into an object with flags and positional args.
 */
export function parseArgs(argv) {
  const args = argv.slice(2);
  const flags = {};
  const positional = [];
  let i = 0;
  while (i < args.length) {
    if (args[i] === '--boot-version') {
      flags.bootVersion = args[i + 1];
      i += 2;
    } else if (args[i] === '--deps') {
      flags.deps = args[i + 1];
      i += 2;
    } else if (args[i] === '--project-type') {
      flags.projectType = args[i + 1];
      i += 2;
    } else if (args[i] === '--frontend') {
      flags.frontend = args[i + 1];
      i += 2;
    } else if (args[i] === '--openapi-spec') {
      flags.openapiSpec = args[i + 1];
      i += 2;
    } else if (args[i] === '-h' || args[i] === '--help') {
      flags.help = true;
      i += 1;
    } else if (args[i] === '--') {
      positional.push(...args.slice(i + 1));
      break;
    } else if (args[i].startsWith('-')) {
      console.error(`Unknown option: ${args[i]}`);
      flags.help = true;
      i += 1;
    } else {
      positional.push(args[i]);
      i += 1;
    }
  }
  return { flags, positional };
}
