import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFile, readdir } from 'node:fs/promises';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outputRoot = join(projectRoot, '.output');
const extensionRoot = join(outputRoot, 'chrome-mv3');
const packageJson = JSON.parse(
  await readFile(join(projectRoot, 'package.json'), 'utf8'),
);
const archivePath = join(
  outputRoot,
  `yomiato-${packageJson.version}-chrome.zip`,
);
const runtimeNetworkPattern =
  /\bfetch\s*\(|\bXMLHttpRequest\b|\bWebSocket\b|navigator\.sendBeacon\s*\(|\bEventSource\b/;
const knownBrowserCompatibilityChunkPattern =
  /(?:^|\/)chunks\/browser-[^/]+\.js$/;

async function listFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const entryPath = join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await listFiles(entryPath)));
    } else {
      files.push(entryPath);
    }
  }

  return files;
}

function relativeFileSet(files, root) {
  return new Set(
    files.map((filePath) => relative(root, filePath).split('\\').join('/')),
  );
}

function assertExactArray(actual, expected, label) {
  assert.deepEqual(
    [...(actual ?? [])].sort(),
    [...expected].sort(),
    `${label} must be exactly ${JSON.stringify(expected)}`,
  );
}

function assertLocalAssetReferences(content, filePath) {
  const references = [
    ...content.matchAll(/(?:src|href)=["']([^"']+)["']/gi),
    ...content.matchAll(/url\(\s*["']?([^\)"']+)["']?\s*\)/gi),
  ];

  for (const [, reference] of references) {
    assert(
      !/^(?:https?:)?\/\//i.test(reference) &&
        !/^(?:data|javascript):/i.test(reference),
      `${relative(projectRoot, filePath)} contains an external asset reference: ${reference}`,
    );
  }
}

function assertNoInlineScripts(content, filePath) {
  for (const match of content.matchAll(/<script\b([^>]*)>/gi)) {
    assert(
      /(?:^|\s)src\s*=/i.test(match[1]),
      `${relative(projectRoot, filePath)} contains an inline script`,
    );
  }
}

async function verifyManifest() {
  const manifestPath = join(extensionRoot, 'manifest.json');
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));

  assert.equal(manifest.manifest_version, 3, 'Manifest V3 is required');
  assertExactArray(manifest.permissions, ['activeTab'], 'permissions');
  assertExactArray(
    manifest.optional_permissions,
    ['tabs'],
    'optional_permissions',
  );
  assert.equal(
    'host_permissions' in manifest,
    false,
    'host_permissions must not be declared',
  );
  assert.equal(
    'content_scripts' in manifest,
    false,
    'content_scripts must not be declared',
  );
  assert.equal(
    'externally_connectable' in manifest,
    false,
    'externally_connectable must not be declared',
  );
  assert.equal(
    'web_accessible_resources' in manifest,
    false,
    'web_accessible_resources must not be declared',
  );
  assert.equal(
    'optional_host_permissions' in manifest,
    false,
    'optional_host_permissions must not be declared',
  );
  assert.equal(
    'content_security_policy' in manifest,
    false,
    'content_security_policy must not be declared',
  );

  for (const requiredFile of [
    manifest.background?.service_worker,
    manifest.action?.default_popup,
  ]) {
    assert(
      typeof requiredFile === 'string',
      'Manifest must declare the background worker and popup',
    );
    await readFile(join(extensionRoot, requiredFile));
  }

  return manifest;
}

async function verifyExtensionFiles() {
  const files = await listFiles(extensionRoot);
  const relativeFiles = relativeFileSet(files, extensionRoot);
  assert(relativeFiles.size > 0, 'The production extension must not be empty');

  for (const file of relativeFiles) {
    assert(!file.endsWith('.map'), `${file} is a source map`);
    assert(
      !/(?:^|\/)(?:test|tests|fixture|fixtures|docs)(?:\/|$)/i.test(file),
      `${file} is not allowed in the store ZIP`,
    );
  }

  for (const filePath of files) {
    if (!/\.(?:html|css)$/i.test(filePath)) {
      continue;
    }

    const content = await readFile(filePath, 'utf8');
    assertLocalAssetReferences(content, filePath);
    if (filePath.endsWith('.html')) {
      assertNoInlineScripts(content, filePath);
    }
  }

  const textFiles = files.filter((filePath) =>
    /\.(?:html|css|js)$/i.test(filePath),
  );
  for (const filePath of textFiles) {
    const content = await readFile(filePath, 'utf8');
    assert(
      !/sourceMappingURL/i.test(content),
      `${filePath} contains a source map`,
    );
    assert(!/\beval\s*\(/.test(content), `${filePath} contains eval`);
    assert(
      !/\bnew\s+Function\s*\(/.test(content),
      `${filePath} contains a dynamically constructed function`,
    );
    if (/\.js$/i.test(filePath) && runtimeNetworkPattern.test(content)) {
      const relativePath = relative(extensionRoot, filePath)
        .split('\\')
        .join('/');
      assert(
        knownBrowserCompatibilityChunkPattern.test(relativePath),
        `${relative(projectRoot, filePath)} contains a runtime network API`,
      );
    }
  }

  return relativeFiles;
}

async function verifyApplicationSource() {
  const sourceFiles = (await listFiles(join(projectRoot, 'src'))).filter(
    (filePath) => /\.(?:ts|tsx|js|jsx|css|html)$/i.test(filePath),
  );
  for (const filePath of sourceFiles) {
    const content = await readFile(filePath, 'utf8');
    assert(
      !runtimeNetworkPattern.test(content),
      `${relative(projectRoot, filePath)} contains a runtime network API`,
    );
    assert(!/\beval\s*\(/.test(content), `${filePath} contains eval`);
    assert(
      !/\bnew\s+Function\s*\(/.test(content),
      `${filePath} contains a dynamically constructed function`,
    );
  }
}

async function verifyArchive(extensionFiles) {
  const archiveEntries = execFileSync('unzip', ['-Z1', archivePath], {
    cwd: projectRoot,
    encoding: 'utf8',
  })
    .trim()
    .split('\n')
    .filter(Boolean);
  const archiveFileSet = new Set(archiveEntries);

  assert.deepEqual(
    [...archiveFileSet].sort(),
    [...extensionFiles].sort(),
    'The store ZIP must contain exactly the production extension files',
  );
  for (const file of archiveFileSet) {
    assert(!file.endsWith('.map'), `${file} is a source map`);
    assert(
      !/(?:^|\/)(?:test|tests|fixture|fixtures|docs)(?:\/|$)/i.test(file),
      `${file} is not allowed in the store ZIP`,
    );
  }
}

const manifest = await verifyManifest();
const extensionFiles = await verifyExtensionFiles();
await verifyApplicationSource();
await verifyArchive(extensionFiles);

console.log(
  `Release verification passed: Manifest V3, minimal permissions, ${extensionFiles.size} production files, and ZIP contents verified.`,
);
console.log(
  `Permissions: ${manifest.permissions.join(', ')}; optional permissions: ${manifest.optional_permissions.join(', ')}.`,
);
