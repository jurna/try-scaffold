// File-rendering helpers for project scaffolding.
// Idempotent: every writer skips files that already exist (or merges by marker).

import { readFileSync, writeFileSync, existsSync, mkdirSync, copyFileSync } from 'node:fs';
import { resolve, dirname, join, relative } from 'node:path';

import {
  ASSETS_DIR,
  getNodeVersion,
  getOpenApiProcessorPluginVersion,
  getOpenApiProcessorSpringVersion,
  getSpotlessPluginVersion,
} from './versions.mjs';
import {
  APPLICATION_DEV_YAML,
  APPLICATION_TEST_YAML,
  securityConfigSource,
  homeControllerSource,
  mvcIntegrationTestAnnotationSource,
  homeControllerTestsSource,
  openApiMappingYaml,
  openApiProcessorGradleBlock,
  spotlessGradleBlock,
} from './templates.mjs';

const DOTFILES_MARKER = '# === spring-boot-starter additions ===';

/**
 * Append or merge .gitignore content. Preserves existing content; appends our template once.
 */
export function mergeGitignore(projectDir) {
  const target = join(projectDir, '.gitignore');
  const templatePath = resolve(ASSETS_DIR, 'gitignore');
  if (!existsSync(templatePath)) return;
  const templateContent = readFileSync(templatePath, 'utf8');
  if (!existsSync(target)) {
    writeFileSync(target, templateContent, 'utf8');
    return;
  }
  const current = readFileSync(target, 'utf8');
  if (current.includes(DOTFILES_MARKER)) return; // Already appended
  const merged = `${current.trimEnd()}\n\n${DOTFILES_MARKER}\n${templateContent.trim()}\n`;
  writeFileSync(target, merged, 'utf8');
}

function copyAssetIfMissing(assetName, destPath) {
  const assetPath = resolve(ASSETS_DIR, assetName);
  if (!existsSync(assetPath)) return;
  if (existsSync(destPath)) return;
  const destDir = dirname(destPath);
  if (!existsSync(destDir)) mkdirSync(destDir, { recursive: true });
  copyFileSync(assetPath, destPath);
}

function writeTextFileIfMissing(destPath, content) {
  if (existsSync(destPath)) return;
  const destDir = dirname(destPath);
  if (!existsSync(destDir)) mkdirSync(destDir, { recursive: true });
  writeFileSync(destPath, content, 'utf8');
}

/**
 * Apply additional dotfiles after project extraction.
 * @param {string} projectDir
 * @param {{ frontend?: boolean, packageName?: string }} [options]
 */
export function applyDotfiles(projectDir, options = {}) {
  console.log('  📄 Applying dotfiles…');
  mergeGitignore(projectDir);
  copyAssetIfMissing('env.sample', join(projectDir, '.env.sample'));
  copyAssetIfMissing('editorconfig', join(projectDir, '.editorconfig'));
  copyAssetIfMissing('gitattributes', join(projectDir, '.gitattributes'));
  // Optional .vscode recommendations
  copyAssetIfMissing(join('vscode', 'extensions.json'), join(projectDir, '.vscode', 'extensions.json'));
  copyAssetIfMissing(join('vscode', 'settings.json'), join(projectDir, '.vscode', 'settings.json'));
  // DevContainer setup
  copyAssetIfMissing(join('devcontainer', 'devcontainer.json'), join(projectDir, '.devcontainer', 'devcontainer.json'));
  // Coding-conventions guidance for Claude Code
  copyAssetIfMissing('CLAUDE.md', join(projectDir, 'CLAUDE.md'));
  // Optional Node version pinning if front-end present
  try {
    const nodeVersion = getNodeVersion();
    if (nodeVersion) {
      writeTextFileIfMissing(join(projectDir, '.nvmrc'), `${nodeVersion}\n`);
      writeTextFileIfMissing(join(projectDir, '.node-version'), `${nodeVersion}\n`);
    }
  } catch (e) {
    // Non-fatal
  }
}

/**
 * Generate a docker-compose.yml with a MongoDB service for local development.
 * Skipped when the project already has one (idempotent).
 * @param {string} projectDir
 */
export function applyMongoCompose(projectDir) {
  copyAssetIfMissing('docker-compose.yml', join(projectDir, 'docker-compose.yml'));
  console.log('  🐳 docker-compose.yml generated (mongo:8 on port 27017)');
}

/**
 * Patch build.gradle to add the com.diffplug.spotless plugin with palantir-java-format,
 * import ordering, unused-import removal, annotation formatting, and a wildcard-import ban.
 * Wires `compileJava` to depend on `spotlessApply` so every build auto-formats.
 *
 * Always applied — there is no opt-out. Idempotent: skips re-patching if the plugin
 * is already declared.
 */
export function applySpotless(projectDir) {
  const buildGradlePath = join(projectDir, 'build.gradle');
  if (!existsSync(buildGradlePath)) return;

  let content = readFileSync(buildGradlePath, 'utf8');
  if (content.includes('com.diffplug.spotless')) return;

  const { pluginLine, appended } = spotlessGradleBlock({
    pluginVersion: getSpotlessPluginVersion(),
  });

  content = content.replace(
    /(plugins \{[\s\S]*?)(\n\})/,
    `$1${pluginLine}$2`
  );
  content += appended;
  writeFileSync(buildGradlePath, content, 'utf8');

  console.log('  ✨ Spotless configured (palantir-java-format, ratchetFrom origin/master, auto-apply on build)');
}

/**
 * Patch build.gradle to add the io.openapiprocessor.openapi-processor plugin and configure it
 * to generate Spring controller interfaces and Java record DTOs from an existing OpenAPI spec
 * (referenced in-place). Also writes src/api/mapping.yaml with the processor options.
 *
 * Only supports Groovy DSL (gradle-project), which is what create-basic-project.mjs generates.
 */
export function applyOpenApiProcessor(projectDir, specAbsPath, groupId) {
  const buildGradlePath = join(projectDir, 'build.gradle');
  if (!existsSync(buildGradlePath)) return;

  const pluginVersion = getOpenApiProcessorPluginVersion();
  const springVersion = getOpenApiProcessorSpringVersion();
  // Normalize to forward slashes so Gradle string interpolation works on all platforms
  const relSpec = relative(projectDir, specAbsPath).split(/[\\/]/).join('/');

  const { pluginLine, appended } = openApiProcessorGradleBlock({ pluginVersion, springVersion, relSpec });

  let content = readFileSync(buildGradlePath, 'utf8');
  content = content.replace(
    /(plugins \{[\s\S]*?)(\n\})/,
    `$1${pluginLine}$2`
  );
  content += appended;
  writeFileSync(buildGradlePath, content, 'utf8');

  const mappingDir = join(projectDir, 'src', 'api');
  mkdirSync(mappingDir, { recursive: true });
  writeFileSync(join(mappingDir, 'mapping.yaml'), openApiMappingYaml(groupId), 'utf8');

  console.log(`  ✅ OpenAPI processor configured (apiPath: ${relSpec}, model-type: record)`);
}

/**
 * Apply Microsoft single-tenant OAuth2 social login wiring to a freshly extracted project.
 * Writes SecurityConfig.java, HomeController.java, application-dev.yaml, and a test scaffold
 * (src/test/resources/application.yaml, MvcIntegrationTest meta-annotation, HomeControllerTests).
 * Idempotent — skips files that already exist. Only call when `security` is in --deps.
 */
export function applySocialLogin(projectDir, packageName) {
  console.log('  🔐 Generating Microsoft OAuth2 login config…');
  const packagePath = packageName.replace(/\./g, '/');
  const javaRoot = join(projectDir, 'src', 'main', 'java', packagePath);
  const javaTestRoot = join(projectDir, 'src', 'test', 'java', packagePath);

  writeTextFileIfMissing(
    join(projectDir, 'src', 'main', 'resources', 'application-dev.yaml'),
    APPLICATION_DEV_YAML
  );
  writeTextFileIfMissing(
    join(javaRoot, 'config', 'SecurityConfig.java'),
    securityConfigSource(packageName)
  );
  writeTextFileIfMissing(
    join(javaRoot, 'web', 'HomeController.java'),
    homeControllerSource(packageName)
  );
  writeTextFileIfMissing(
    join(projectDir, 'src', 'test', 'resources', 'application.yaml'),
    APPLICATION_TEST_YAML
  );
  writeTextFileIfMissing(
    join(javaTestRoot, 'MvcIntegrationTest.java'),
    mvcIntegrationTestAnnotationSource(packageName)
  );
  writeTextFileIfMissing(
    join(javaTestRoot, 'web', 'HomeControllerTests.java'),
    homeControllerTestsSource(packageName)
  );
}
