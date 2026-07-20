import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';
import { findSkills } from './cli.js';

// Run against this repo itself.
const repo = dirname(fileURLToPath(import.meta.url));
const skills = await findSkills(repo);

assert.ok(skills.length > 0, 'should find at least one skill');
const sc = skills.find((s) => s.name === 'smart-coverage');
assert.ok(sc, 'smart-coverage present');
assert.equal(sc.bucket, 'engineering');
assert.ok(sc.desc.length > 0, 'description parsed from frontmatter');
assert.ok(!skills.some((s) => s.bucket === 'in-progress'), 'in-progress excluded');
console.log(`ok: ${skills.length} skills, desc parse + exclude verified`);
