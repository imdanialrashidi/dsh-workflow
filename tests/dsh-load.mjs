// Optional compatibility check against a caller-supplied DSH installation.
import assert from 'node:assert/strict';
import { checkSession } from './dsh-session.mjs';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { mkdir, mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

if (process.argv.length !== 3) {
  throw new Error('Usage: node tests/dsh-load.mjs <directory containing the DSH node_modules>');
}
const repo = dirname(dirname(fileURLToPath(import.meta.url)));
const runtime = createRequire(join(resolve(process.argv[2]), 'package.json'));
const dsh = runtime('@deepseek-ai/dsh/package.json');
const include = name => import(pathToFileURL(runtime.resolve(name)).href);
const { FileSystemSkillProvider } = await include('@deepseek-ai/dsh-skill-filesystem');
const { loadBaselineInstructions } = await include('@deepseek-ai/dsh-agent-instructions');
const temp = await mkdtemp(join(tmpdir(), 'dsh-workflow-load-'));
const home = join(temp, 'home');
const dshHome = join(home, '.dsh');
const agentsHome = join(home, '.agents');
const project = join(temp, 'project');
const env = { PATH: process.env.PATH, HOME: home, DSH_HOME: dshHome, DSH_AGENTS_HOME: agentsHome };
let provider;

try {
  await mkdir(home);
  await mkdir(join(project, '.git'), { recursive: true });
  execFileSync('bash', [join(repo, 'scripts/install.sh')], { env });
  execFileSync('bash', [join(repo, 'scripts/init-project.sh'), project], { env });

  // Use the public provider's host filesystem fallback with watchers disabled.
  // Explicit roots keep lookup isolated from the caller's user and bundled skills.
  const signal = new AbortController().signal;
  const context = { get: () => undefined, logger: console };
  provider = new FileSystemSkillProvider(context, { signal, invalidate() {} }, {
    dshHome, agentsHome, bundledSkillDir: join(temp, 'empty-bundle'), watch: false
  });
  const options = { signal, cwd: project };
  const observed = await provider.list(options);
  if (!Array.isArray(observed)) assert.equal(observed.complete, true);
  const candidates = Array.isArray(observed) ? observed : observed.candidates;
  const expected = ['build', 'production', 'quick-fix', 'review', 'spec', 'test-design', 'verify'];
  assert.deepEqual(candidates.map(item => item.name).sort(), expected);
  const bodies = new Map();
  for (const item of candidates) {
    const loaded = await provider.get(item, options);
    assert.equal(loaded.source, 'user-dsh');
    assert.equal(item.rank, 400);
    assert.equal(loaded.invocation.userInvocable, true);
    assert.equal(loaded.invocation.modelInvocable, true);
    const source = await readFile(join(repo, 'skills', item.name, 'SKILL.md'), 'utf8');
    const body = source.slice(source.indexOf('\n---\n', 4) + 5).trim();
    assert.equal(loaded.content.trim(), body);
    bodies.set(item.name, body);
  }

  const baseline = await loadBaselineInstructions({ ...options, dshHome, agentsHome, maxBytes: 65536 });
  const globalText = (await readFile(join(dshHome, 'AGENTS.md'), 'utf8')).trim();
  const projectText = (await readFile(join(project, 'AGENTS.md'), 'utf8')).trim();
  const first = baseline.text.indexOf(globalText);
  assert.ok(first >= 0 && baseline.text.indexOf(projectText) > first);
  assert.deepEqual(baseline.omitted, []);
  assert.deepEqual(baseline.truncated, []);
  const cli = join(dirname(runtime.resolve('@deepseek-ai/dsh/package.json')), dsh.bin.dsh);
  for (const skillName of ['verify', 'production']) {
    await checkSession({ cli, cwd: project, env, skills: expected, skillName,
      skillBody: bodies.get(skillName), globalText, projectText });
  }
  console.log('DSH %s: seven provider loads, baseline order, headless catalog, /verify and /production injection passed.', dsh.version);
} finally {
  try { await provider?.dispose(); } finally { await rm(temp, { recursive: true, force: true }); }
}
