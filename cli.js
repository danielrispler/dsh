#!/usr/bin/env node
// grab-skills — interactive skill picker for closed-net GitLab.
// Downloads the repo archive over HTTP (public-read, no auth), lets you
// cherry-pick skills per bucket, copies chosen dirs into ~/.claude/skills.
import { spawn } from 'node:child_process';
import { Readable } from 'node:stream';
import { readdirSync, readFileSync, mkdirSync, cpSync, existsSync, mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir, homedir } from 'node:os';
import { fileURLToPath } from 'node:url';

// --- Config: FILL ME before publishing to the internal mirror ---------------
const GITLAB_BASE = process.env.GITLAB_BASE || 'https://gitlab.internal';      // FILL ME (origin)
const PROJECT_PATH = process.env.SKILLS_PROJECT || 'platform/skills';           // FILL ME (namespace/project)

// --- Skill discovery --------------------------------------------------------

// A path is excluded if any segment is a bucket we never ship.
const EXCLUDED = new Set(['deprecated', 'in-progress']);
const excluded = (rel) => rel.split('/').some((seg) => EXCLUDED.has(seg));

function parseDescription(skillMd) {
  const text = readFileSync(skillMd, 'utf8');
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!m) return '';
  const lines = m[1].split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const dm = lines[i].match(/^description:\s*(.*)$/);
    if (!dm) continue;
    const val = dm[1].trim();
    if (val === '>' || val === '|' || val === '') {
      // block scalar or empty: gather following indented lines until dedent
      const parts = [];
      for (let j = i + 1; j < lines.length; j++) {
        if (/^\S/.test(lines[j])) break;            // dedent = next key, stop
        if (lines[j].trim() !== '') parts.push(lines[j].trim());
      }
      return parts.join(' ').trim();
    }
    return val.replace(/^['"]|['"]$/g, '');
  }
  return '';
}

// Recurse a dir, yield every SKILL.md's parent dir as { dir, rel }.
function* walkSkills(base, root) {
  if (!existsSync(base)) return;
  const stack = [base];
  while (stack.length) {
    const dir = stack.pop();
    let entries;
    try { entries = readdirSync(dir, { withFileTypes: true }); } catch { continue; }
    for (const e of entries) {
      const full = join(dir, e.name);
      if (e.isDirectory()) stack.push(full);
      else if (e.name === 'SKILL.md') yield { dir, rel: full.slice(root.length + 1) };
    }
  }
}

// findSkills(root) → [{ group, name, desc, dir }], sorted, dedup-safe.
export function findSkills(root) {
  const out = [];
  const seen = new Set();
  const add = (group, dir, rel) => {
    if (excluded(rel)) return;
    const name = dir.split('/').pop();
    const key = `${group}/${name}`;
    if (seen.has(key)) return;                       // last-write-wins guard within a group
    seen.add(key);
    out.push({ group, name, dir, desc: parseDescription(join(dir, 'SKILL.md')) });
  };

  // Internal: skills/internal/<bucket>/<name>/ (fallback: skills/<bucket>/<name>/ mid-reorg).
  const internalBase = existsSync(join(root, 'skills/internal'))
    ? join(root, 'skills/internal')
    : join(root, 'skills');
  if (existsSync(internalBase)) {
    for (const bucket of readdirSync(internalBase, { withFileTypes: true })) {
      if (!bucket.isDirectory() || bucket.name === 'external') continue;
      for (const s of walkSkills(join(internalBase, bucket.name), root)) {
        add(bucket.name, s.dir, s.rel);
      }
    }
  }

  // External: skills/external/<repo>/skills/** only — ignores the duplicate
  // plugins/*/skills and .openclaw/skills mirror trees that live outside <repo>/skills/.
  const extBase = join(root, 'skills/external');
  if (existsSync(extBase)) {
    for (const repo of readdirSync(extBase, { withFileTypes: true })) {
      if (!repo.isDirectory()) continue;
      for (const s of walkSkills(join(extBase, repo.name, 'skills'), root)) {
        add(`external/${repo.name}`, s.dir, s.rel);
      }
    }
  }

  out.sort((a, b) => (a.group + a.name).localeCompare(b.group + b.name));
  return out;
}

// --- Download + extract -----------------------------------------------------

async function downloadArchive(ref, destDir) {
  const repo = PROJECT_PATH.split('/').pop();
  const url = `${GITLAB_BASE}/${PROJECT_PATH}/-/archive/${ref}/${repo}-${ref}.tar.gz`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`archive fetch ${res.status} ${res.statusText}: ${url}`);
  // Pipe body → `tar xz --strip-components=1` (strips GitLab's project-ref-<sha> top dir).
  await new Promise((resolve, reject) => {
    const tar = spawn('tar', ['xz', '--strip-components=1', '-C', destDir], { stdio: ['pipe', 'inherit', 'inherit'] });
    tar.on('error', reject);
    tar.on('close', (code) => (code === 0 ? resolve() : reject(new Error(`tar exit ${code}`))));
    Readable.fromWeb(res.body).pipe(tar.stdin);
  });
}

// --- Main -------------------------------------------------------------------

function parseArgs(argv) {
  const args = { ref: process.env.SKILLS_REF || 'main', dest: join(homedir(), '.claude', 'skills') };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--ref') args.ref = argv[++i];
    else if (argv[i] === '--dest') args.dest = argv[++i];
    else if (argv[i] === '--help' || argv[i] === '-h') args.help = true;
  }
  return args;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log(`grab-skills — pick skills from the internal GitLab archive.
Usage: npx grab-skills [--ref <branch>] [--dest <dir>]
Env: GITLAB_BASE, SKILLS_PROJECT, SKILLS_REF`);
    return;
  }

  const p = await import('@clack/prompts');
  const tmp = mkdtempSync(join(tmpdir(), 'grab-skills-'));
  try {
    p.intro('grab-skills');
    const s = p.spinner();
    s.start(`Fetching ${PROJECT_PATH}@${args.ref} from ${GITLAB_BASE}`);
    await downloadArchive(args.ref, tmp);
    const skills = findSkills(tmp);
    s.stop(`Found ${skills.length} skills`);
    if (!skills.length) return p.cancel('No skills found in archive.');

    const options = {};
    for (const sk of skills) {
      (options[sk.group] ??= []).push({ value: sk.name, label: sk.name, hint: sk.desc });
    }

    const picked = await p.groupMultiselect({
      message: 'Pick skills (space to toggle, enter to confirm)',
      options,
      required: false,
    });
    if (p.isCancel(picked)) return p.cancel('Cancelled.');
    if (!picked.length) return p.outro('Nothing selected.');

    mkdirSync(args.dest, { recursive: true });
    const byName = new Map(skills.map((sk) => [sk.name, sk]));
    for (const name of picked) {
      const target = join(args.dest, name);
      if (existsSync(target)) p.log.warn(`Overwriting existing ${name}`);
      cpSync(byName.get(name).dir, target, { recursive: true });
    }
    p.outro(`Installed ${picked.length} skill(s) to ${args.dest}`);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
}

// Run main() only when invoked directly (not when imported for tests).
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((e) => { console.error(e.message); process.exit(1); });
}
