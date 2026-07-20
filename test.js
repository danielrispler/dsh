// Offline self-check: run findSkills against this repo, no network.
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';
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
