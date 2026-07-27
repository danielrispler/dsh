// Offline self-check: run findSkills against this repo, no network.
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { readdirSync, readFileSync, existsSync, statSync } from 'node:fs';
import { findSkills } from './cli.js';

const repo = dirname(fileURLToPath(import.meta.url));
const skills = await findSkills(repo);

assert.ok(skills.length > 0, 'should find at least one skill');

// Internal skill: smart-coverage in engineering bucket, description parsed.
const sc = skills.find((s) => s.name === 'smart-coverage');
assert.ok(sc, 'smart-coverage present');
assert.equal(sc.group, 'engineering', 'internal group = bucket');
assert.ok(sc.desc.length > 0, 'description parsed from frontmatter');

// External skill: grill-me under external/mattpocock-skills.
const grill = skills.find((s) => s.name === 'grill-me');
assert.ok(grill, 'grill-me present');
assert.equal(grill.group, 'external/mattpocock-skills', 'external group = external/<repo>');

// Exclusions: in-progress and deprecated segments never appear.
assert.ok(!skills.some((s) => s.group === 'in-progress'), 'in-progress excluded');
assert.ok(!skills.some((s) => s.group.endsWith('/deprecated') || s.group === 'deprecated'), 'deprecated excluded');

// Mirror-tree dedup: caveman (plugins/) and ponytail (.openclaw/) appear once each.
const cavemen = skills.filter((s) => s.name === 'caveman');
assert.equal(cavemen.length, 1, 'caveman not double-counted from plugins/ mirror');
const ponytails = skills.filter((s) => s.name === 'ponytail');
assert.equal(ponytails.length, 1, 'ponytail not double-counted from .openclaw/ mirror');

console.log(`ok: ${skills.length} skills — internal + external found, exclusions + mirror dedup verified`);

// --- Plugin marketplace sync: plugins/ ↔ marketplace.json ↔ enabledPlugins ----
const pluginsDir = join(repo, 'plugins');
if (existsSync(pluginsDir)) {
  const dirs = readdirSync(pluginsDir, { withFileTypes: true })
    .filter((e) => e.isDirectory()).map((e) => e.name).sort();

  const mkt = JSON.parse(readFileSync(join(repo, '.claude-plugin', 'marketplace.json'), 'utf8'));
  const settings = JSON.parse(readFileSync(join(repo, '.claude', 'settings.json'), 'utf8'));
  const enabled = settings.enabledPlugins || {};

  const mktByName = new Map(mkt.plugins.map((p) => [p.name, p]));
  const mktSources = new Set(mkt.plugins.map((p) => p.source));

  for (const name of dirs) {
    const mf = join(pluginsDir, name, '.claude-plugin', 'plugin.json');
    assert.ok(existsSync(mf), `plugins/${name} has .claude-plugin/plugin.json`);
    const pname = JSON.parse(readFileSync(mf, 'utf8')).name;
    assert.equal(pname, name, `plugins/${name} plugin.json name matches dir`);
    assert.ok(mktByName.has(pname), `${pname} listed in marketplace.json`);
    assert.ok(mktSources.has(`./plugins/${name}`), `marketplace source ./plugins/${name} present`);
    assert.equal(enabled[`${pname}@dsh`], true, `${pname}@dsh enabled in settings.json`);
  }
  // No stale entries pointing at non-existent dirs.
  for (const p of mkt.plugins) {
    assert.ok(dirs.includes(p.name), `marketplace plugin ${p.name} has a plugins/ dir`);
    assert.ok(statSync(join(repo, p.source)).isDirectory(), `source ${p.source} exists`);
  }
  for (const key of Object.keys(enabled)) {
    const name = key.replace(/@dsh$/, '');
    assert.ok(dirs.includes(name), `enabledPlugins ${key} has a plugins/ dir`);
  }
  console.log(`ok: ${dirs.length} plugins — plugins/ ↔ marketplace.json ↔ enabledPlugins in sync`);
}
