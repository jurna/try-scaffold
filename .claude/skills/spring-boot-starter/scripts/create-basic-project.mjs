#!/usr/bin/env node
// Script to create a basic Spring Boot project from start.spring.io

import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  getJavaVersion, resolveBootVersion,
  downloadAndExtractProject, parseArgs, applyDotfiles, applyOpenApiProcessor,
  applySocialLogin, applyMongoCompose,
} from './lib/versions.mjs';

function usage() {
  console.log(`Usage: node create-basic-project.mjs [PROJECT_NAME] [GROUP_ID] [ARTIFACT_ID] [PACKAGE_NAME] [JAVA_VERSION]
Options:
  --boot-version <version>   Override Spring Boot version
  --deps <dep1,dep2,...>     Comma-separated Spring Initializr dependency IDs
  --openapi-spec <path>      Path to an existing OpenAPI spec (auto-detected if omitted)
  -h|--help                  Show this help`);
}

/**
 * Locate an OpenAPI spec to wire into the generated project.
 * If an explicit path is given, resolve and verify it.
 * Otherwise probe the current working directory for common spec locations.
 * Returns the absolute path, or null if nothing is found.
 */
function resolveOpenApiSpec(explicit) {
  if (explicit) {
    const abs = resolve(explicit);
    if (!existsSync(abs)) throw new Error(`OpenAPI spec not found: ${explicit}`);
    return abs;
  }
  for (const rel of ['contracts/openapi.yaml', 'contract/openapi.yaml', 'openapi.yaml']) {
    const abs = resolve(rel);
    if (existsSync(abs)) return abs;
  }
  return null;
}

const { flags, positional } = parseArgs(process.argv);

if (flags.help) {
  usage();
  process.exit(0);
}

const projectName = positional[0] || 'my-spring-boot-app';
const groupId = positional[1] || 'com.example';
const artifactId = positional[2] || projectName;
const packageName = positional[3] || `${groupId}.app`;
const javaVersion = positional[4] || getJavaVersion();
const bootVersion = flags.bootVersion || await resolveBootVersion();
const dependencies = flags.deps || '';

console.log(`Creating basic Spring Boot project with Boot=${bootVersion}, Java=${javaVersion}`);

try {
  await downloadAndExtractProject({
    type: 'gradle-project',
    language: 'java',
    bootVersion,
    baseDir: projectName,
    groupId,
    artifactId,
    name: artifactId,
    description: 'Basic+Spring+Boot+application',
    packageName,
    packaging: 'jar',
    javaVersion,
    dependencies,
    configurationFileFormat: 'yaml',
  });
  applyDotfiles(projectName, { frontend: false, packageName });
  const specPath = resolveOpenApiSpec(flags.openapiSpec);
  if (specPath) applyOpenApiProcessor(projectName, specPath, groupId);
  const depList = dependencies.split(',').map(s => s.trim()).filter(Boolean);
  if (depList.includes('data-mongodb')) {
    applyMongoCompose(projectName);
  }
  if (depList.includes('security')) {
    applySocialLogin(projectName, packageName);
  }
} catch (err) {
  console.error(`✗ Failed to create project: ${err?.message || String(err)}`);
  process.exit(1);
}

console.log(`✓ Basic Spring Boot project created successfully in ./${projectName}`);
console.log(`  cd ${projectName}`);
console.log('  ./gradlew bootRun');
