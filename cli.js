#!/usr/bin/env node
import { mkdtemp, rm, readdir, readFile, mkdir, cp, stat } from 'node:fs/promises';
import { tmpdir, homedir } from 'node:os';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
import { Readable } from 'node:stream';
import { fileURLToPath } from 'node:url';

const REPO = 'danielrispler/skills';
const BRANCH = 'main';
const EXCLUDE = new Set(['deprecated', 'in-progress']); // never shippable

// Extract repo tarball into `dir`, stripping the top-level `skills-main/` prefix.
async function download(dir) {
  const url = `https://codeload.github.com/${REPO}/tar.gz/refs/heads/${BRANCH}`;
  const r = await fetch(url);
  if (!r.ok) throw new Error(`fetch ${url} -> ${r.status}`);
  const tar = spawn('tar', ['xz', '--strip-components=1', '-C', dir], {
    stdio: ['pipe', 'ignore', 'inherit'],
  });
  Readable.fromWeb(r.body).pipe(tar.stdin);
  await new Promise((res, rej) => {
    tar.on('error', rej);
    tar.on('exit', (c) => (c === 0 ? res() : rej(new Error(`tar exit ${c}`))));
  });
}

// Scan skills/internal/<bucket>/<name>/SKILL.md, pulling the frontmatter description.
export async function findSkills(root) {
  // New layout nests buckets under skills/internal; old layout put them under skills.
  const nested = join(root, 'skills', 'internal');
  const base = await stat(nested).then(() => nested).catch(() => join(root, 'skills'));
  const out = [];
  for (const bucket of await readdir(base, { withFileTypes: true })) {
    if (!bucket.isDirectory() || EXCLUDE.has(bucket.name)) continue;
    const bdir = join(base, bucket.name);
    for (const skill of await readdir(bdir, { withFileTypes: true })) {
      if (!skill.isDirectory()) continue;
      const dir = join(bdir, skill.name);
      let desc = '';
      try {
        const md = await readFile(join(dir, 'SKILL.md'), 'utf8');
        desc = md.match(/^description:\s*(.+)$/m)?.[1].trim() ?? '';
      } catch {
        continue; // no SKILL.md -> not a skill
      }
      out.push({ bucket: bucket.name, name: skill.name, desc, dir });
    }
  }
  return out.sort((a, b) => a.bucket.localeCompare(b.bucket) || a.name.localeCompare(b.name));
}

async function main() {
  const p = await import('@clack/prompts');
  const argv = process.argv.slice(2);
  const destArg = argv[argv.indexOf('--dest') + 1];
  const dest = argv.includes('--dest') ? destArg : join(homedir(), '.claude', 'skills');

  p.intro('grab-skills');
  const tmp = await mkdtemp(join(tmpdir(), 'grab-skills-'));
  try {
    const s = p.spinner();
    s.start('Fetching skills from GitHub');
    await download(tmp);
    const skills = await findSkills(tmp);
    s.stop(`Found ${skills.length} skills`);

    const options = {};
    for (const sk of skills) {
      (options[sk.bucket] ??= []).push({
        value: `${sk.bucket}/${sk.name}`,
        label: sk.name,
        hint: sk.desc,
      });
    }

    const picked = await p.groupMultiselect({
      message: 'Pick skills (space to toggle, enter to confirm)',
      options,
      required: false,
    });
    if (p.isCancel(picked)) return p.cancel('Cancelled.');
    if (!picked.length) return p.outro('Nothing selected.');

    await mkdir(dest, { recursive: true });
    for (const val of picked) {
      const sk = skills.find((x) => `${x.bucket}/${x.name}` === val);
      await cp(sk.dir, join(dest, sk.name), { recursive: true });
    }
    p.outro(`Installed ${picked.length} skill(s) to ${dest}`);
  } finally {
    await rm(tmp, { recursive: true, force: true });
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((e) => {
    console.error(e.message);
    process.exit(1);
  });
}
