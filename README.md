# DSH Workflow

A small, repository-independent coding workflow for [DeepSeek Harness (DSH)](https://github.com/deepseek-ai/deepseek-harness). Version 0.2 ships seven skills, project templates, a conflict-aware installer and executable checks. It ties each delivery decision to evidence from the reviewed change.

It is not a plugin, daemon, MCP server, or custom multi-agent framework. It uses DSH's instruction loading, skill discovery, native tools, permissions, and optional subagents.

## Why this exists

Coding agents commonly fail in predictable ways: they guess project commands, skip verification, produce noisy reviews, keep planning instead of implementing, or turn project context into an unmaintainable wall of instructions. DSH Workflow addresses those failure modes with a small set of rules and procedures:

- direct implementation by default, with planning scaled to complexity and risk;
- explicit acceptance criteria and repository-discovered verification commands;
- evidence-driven review that prioritizes real defects over style;
- a bounded repair loop instead of endless review rounds;
- concise, repository-local project knowledge;
- no silent authorization and no invented capabilities.

See [docs/WORKFLOW.md](docs/WORKFLOW.md) for the execution model and [docs/DSH-CAPABILITY-MAP.md](docs/DSH-CAPABILITY-MAP.md) for the verified DSH behavior behind it.

## Verified DSH integration

The seven installed skills and global/project instruction loading were tested on Linux with DSH `0.2.1-rc.2` and `0.2.2-rc.5`, including explicit `/verify` and `/production` injection in headless sessions. The [capability map](docs/DSH-CAPABILITY-MAP.md) distinguishes these checks from session and model behavior.

| Mechanism | Location/behavior |
| --- | --- |
| Global instructions | `$DSH_HOME/AGENTS.md`, defaulting to `~/.dsh/AGENTS.md` |
| User skills | `$DSH_HOME/skills/<name>/SKILL.md` |
| Project instructions | `AGENTS.md` from the project root down to the working directory |
| Model skill access | DSH's `skill` tool and injected skill catalog |
| Explicit user invocation | `/quick-fix`, `/spec`, `/build`, `/verify`, `/review`, `/test-design`, `/production` |

The `/name` form is DSH's user-invocable skill gesture. This repository does not generate slash-command files. See the capability map for evidence and for behavior that remains runtime-unverified.

## Prerequisites

- **DSH** installed from an approved source and pinned to the version your team qualified. Start its Web profile with the installed CLI (`dsh web`).
- **Node.js**, as required by your DSH installation.
- **Bash 3.2 or newer**, Git, and standard Linux or macOS tools (`mv` with no-clobber support, `cp`, `cmp`, `find`, `grep`, `sed`, `awk`, `mktemp`).
- **Linux or macOS.** Windows is not supported by the shell scripts; WSL and Git Bash are unverified.
- No project dependencies are added by the workflow.

## Installation

```sh
git clone https://github.com/imdanialrashidi/dsh-workflow.git
cd dsh-workflow
bash scripts/install.sh --dry-run
bash scripts/install.sh
```

Start a new DSH session afterward. A new session ensures the global instruction baseline is loaded and the skill catalog is current.

To use a non-default DSH home, either export the same variable DSH uses or pass the path explicitly:

```sh
DSH_HOME=/path/to/dsh-home bash scripts/install.sh
bash scripts/install.sh --dsh-home /path/to/dsh-home
```

### What installation writes

```text
$DSH_HOME/AGENTS.md
$DSH_HOME/skills/quick-fix/SKILL.md
$DSH_HOME/skills/spec/SKILL.md
$DSH_HOME/skills/build/SKILL.md
$DSH_HOME/skills/verify/SKILL.md
$DSH_HOME/skills/review/SKILL.md
$DSH_HOME/skills/test-design/SKILL.md
$DSH_HOME/skills/production/SKILL.md
```

It does not modify profiles, `cordis.patch.yml`, credentials, sessions, storages, or project files. It never uses `sudo`, downloads code, or runs a network command.

### Conflicts and backups

- An identical file is left unchanged.
- A differing file is **not** overwritten by default. The installer reports the conflict and exits nonzero, after installing non-conflicting files.
- `--force` replaces a conflicting file only after creating a timestamped backup next to it, such as `SKILL.md.bak.20261122120000.a8K2fB`.
- `--dry-run` reports planned actions and conflicts without creating or changing anything.

A real run stages files beside their destinations and holds a temporary directory lock shared by both scripts. An occupied lock returns an error before any managed file is written. Dry runs create no lock. The explicitly selected root may be a directory alias. Managed child directories must be real directories. A destination file symlink is always a conflict, even if its target has identical contents. Forced replacement backs up the link itself. Use a target owned by the installing user.

Review a conflict before forcing replacement. The file may contain your own global instructions or a customized skill.

## Updating

```sh
git pull --ff-only
bash scripts/install.sh --dry-run
bash scripts/install.sh
```

If a file changed upstream and locally, the default install reports a conflict and preserves your copy. Merge it manually, or use `--force` to replace it with a backup. Remove old backups manually when they are no longer useful.

## Removal

Use the installation summary to identify the global file and the seven `skills/<name>/SKILL.md` files that this pack created. Inspect each path before removal. An identical pre-existing file may have been reported as unchanged. Keep pre-existing and customized files, sibling resources and backups. For a file explicitly replaced with `--force`, restore the intended backup after inspecting it. Remove an empty skill directory with `rmdir` if appropriate. Start a new DSH session afterward.

## Initialize a project

The initializer creates a short project entry point and four focused documents:

```sh
bash scripts/init-project.sh /path/to/project --dry-run
bash scripts/init-project.sh /path/to/project
```

It creates only:

```text
AGENTS.md
docs/PRODUCT.md
docs/ARCHITECTURE.md
docs/DESIGN.md
docs/QUALITY.md
```

Existing files are preserved. The initializer checks the physical project root and requires a real project-local `docs` directory when it already exists. Existing projects can merge the new quality and handoff sections into their owning documents manually. Fill the placeholders with real project information, remove sections that do not apply, and keep the files short enough that an agent can use them.

The project template's `AGENTS.md` points to the other documents; DSH automatically loads the `AGENTS.md`/`CLAUDE.md` instruction chain, not arbitrary files under `docs/`. Do not assume other documents are injected automatically.

## Usage

DSH injects the available skills into the session and uses their descriptions to decide when to load one. You can also invoke a skill explicitly:

```text
/quick-fix Fix the null check in the CSV importer.
/spec Add CSV export for the audit log, preserving existing filters.
/build Implement the accepted CSV export design.
/verify
/review
/test-design The export must handle empty results and a 50 MB stream.
/production Assess the export worker for release. Check tenant isolation, duplicate delivery and recovery after restart.
```

If you prefer natural language, describe the task. The model should load the matching skill when its description applies.

| Skill | Use when | Main output |
| --- | --- | --- |
| `quick-fix` | Small, clear, low-risk fix | Change, targeted check, diff review |
| `spec` | Requirements or acceptance are unresolved | Outcome, criteria, scope, constraints, verification strategy |
| `build` | The change is ready to implement | Coherent implementation and updated tests/docs |
| `verify` | Validation is needed | Executed checks with passed/failed/blocked/unproven/unexecuted statuses |
| `review` | A diff needs defect review | Evidence-backed findings and a bounded repair loop |
| `test-design` | Coverage or failure modes need designing | Focused tests with meaningful failure detection |
| [`production`](skills/production/SKILL.md) | Prepare a project for production or assess a candidate for release | Evidence-backed readiness verdict, blocking risks, operator and recovery procedure |

A typical normal feature:

1. Define or confirm a few observable acceptance criteria.
2. Implement the smallest coherent slice.
3. Run the project's actual checks.
4. Review the diff.
5. Fix actionable findings, rerun affected checks, and re-review only the new changes.

For high-risk changes, add negative-path tests, a security review, and independent review with a fresh-context DSH subagent when available. Subagents are optional. See [docs/REVIEW-POLICY.md](docs/REVIEW-POLICY.md) and [docs/QUALITY-POLICY.md](docs/QUALITY-POLICY.md).

## Example delivery decision

Suppose a customer requests a tenant-filtered export. In `/spec`, agree that an authorized user receives only their tenant’s records and that a denied request creates no file or queued job. In `/build`, use synthetic tenants and exercise the actual export handler. In `/verify`, tie each criterion to its observed result on the candidate. If the worker integration is required and unavailable, report **incomplete** even if the API tests passed. In `/review`, trace the worker's authorization, examine the test changes and record the independent reviewer or the missing review. The release owner receives the revision, CI evidence, rollout signal and recovery procedure. A local typo fix can still finish in `/quick-fix` with one targeted check.

The [research and pilot guide](docs/RESEARCH.md) maps the design to primary sources and gives a paired evaluation for your own projects.

## Architecture

```text
README.md                     Purpose, install/update/remove, usage
AGENTS.md                     Development rules for this repository
global/AGENTS.md              Short instructions installed as $DSH_HOME/AGENTS.md
skills/                       Seven runtime procedures, each with one SKILL.md
docs/RESEARCH.md              Research findings, design decisions and paired pilot
docs/WORKFLOW.md              Decision model and phase transitions
docs/DSH-CAPABILITY-MAP.md    Verified DSH capabilities and limitations
docs/QUALITY-POLICY.md        Evidence, acceptance, and test standards
docs/REVIEW-POLICY.md         Risk tiers, finding quality, repair limits
docs/SECURITY.md              Permissions, secrets, destructive actions, CI
templates/project/            Project AGENTS.md and docs scaffolds
scripts/install.sh            Idempotent, conflict-aware global installer
scripts/init-project.sh       Non-destructive project initializer
scripts/check.sh              Self-validation and isolated script tests
tests/dsh-load.mjs            Optional check against an installed DSH runtime
.github/workflows/quality.yml Minimal CI: checkout and scripts/check.sh
```

The installed footprint is intentionally limited to one global instruction file and seven skill files. The repository documentation is for maintainers and users; it is not copied into every project.

## Verifying this repository

```sh
bash scripts/check.sh
```

The check validates:

- required files and document headings;
- skill frontmatter, kebab-case names, allowed keys, non-empty bodies, and one-file bundle layout;
- shell syntax and executable bits;
- cross-document skill references;
- the CI workflow's pinned action references, explicit checkout credential policy, read-only permissions and absence of repository secret references;
- installer help, dry run, installation, idempotence, conflict handling, backups, symlink safety, path override, empty-path rejection, and root-path rejection;
- project initializer dry run, non-destructive output, repeatability, and missing-target rejection;
- that isolated test runs do not modify seeded credentials or profile files.

Run the optional DSH compatibility check against an installation that already contains the DSH npm packages. It loads both instruction files and all seven skill bodies in a temporary home, then starts separate headless sessions. A loopback responder checks the outgoing catalog and the complete `/verify` and `/production` bodies and returns a fixed response. The test uses a synthetic project, a fixture key and no external model.

```sh
node tests/dsh-load.mjs /path/to/directory-containing-node_modules
```

To practice applying the production verdicts against executable evidence, run `python3 tests/production-cases.py` with Python 3.7+ and its standard SQLite module. It replays a synthetic charge in fresh processes and performs an isolated restore. The output records observations for a reviewer. The [calibration notes](docs/RESEARCH.md#executed-ledger-exercise) give the expected decisions and scope.

CI is configured to run the shell checks on Ubuntu and macOS. It is intentionally minimal and uses no secrets. The check is not a substitute for project-level verification: it does not build an arbitrary repository, start DSH with a model, or exercise a project's tests. Project-level verification must discover those commands from the project itself.

## Troubleshooting

| Symptom | Check |
| --- | --- |
| Skills do not appear | Confirm `$DSH_HOME/skills/<name>/SKILL.md` exists and the frontmatter `name` matches the directory. Start a new session. A same-name project skill shadows the global one. |
| `/name` is treated as plain text | The name must be user-invocable (default) and exist in the current workspace catalog. Check the skill root and name. |
| Global instructions are not applied | Confirm the file is at `$DSH_HOME/AGENTS.md` and DSH is using the same `$DSH_HOME`. Start a new session; global instructions are not watched continuously. |
| Installer reports a conflict | Your file differs. Review it, merge manually, or use `--force` and restore from the generated backup if needed. |
| Writer lock exists | Wait for the process using this target. After a crash, confirm that no installer or initializer is active on the target, then remove only the empty `.dsh-workflow-write.lock` with `rmdir` and retry. |
| Installer refuses the target | The path is the filesystem root, empty, or not a directory. Use a real `$DSH_HOME` path. |
| Project initializer skips a file | The file already exists. It is preserved by design; merge the template manually if appropriate. |
| `bash: ...` syntax errors | The scripts require Bash 3.2 or newer. On Windows, use WSL; native Windows is unsupported. |
| `dsh: command not found` | Install Node.js and run DSH through `npx @deepseek-ai/dsh web` or your installed command. This repository does not install DSH. |
| A check is denied | DSH's approval and sandbox controls apply. Report the check as blocked; do not bypass the policy. |
| CI fails but local checks pass | Check the Bash version and working directory, and run `bash scripts/check.sh` from the repository root. Report the exact failing check. |

## Design decisions and trade-offs

- **Instructions and skills, not a plugin.** This keeps installation portable and avoids duplicating DSH's orchestration, permission, and tool layers.
- **Direct implementation by default.** Planning is optional and scaled to risk; the workflow does not require a specification for every change.
- **Evidence over claims.** Verification distinguishes passed, failed, blocked, unproven, and unexecuted checks.
- **Review is bounded.** Important findings require a concrete failure scenario; repairs are capped at two rounds and re-review is diff-only.
- **Subagents are optional.** They are used for genuinely independent work such as fresh-context review, not as a required stage.
- **No universal test runner.** The workflow discovers each project's own commands instead of imposing a language or build system.
- **Short context, linked detail.** The global file is concise; project knowledge is structured and local.

## Security

See [docs/SECURITY.md](docs/SECURITY.md). The workflow does not grant approvals, bypass sandboxes, or authorize destructive actions. DSH's own controls remain authoritative.

## Status and limitations

- Version 0.2. Linux loader/provider checks cover `0.2.1-rc.2` and `0.2.2-rc.5`. Profile-specific observations remain scoped to the version in the capability map.
- DSH is a developer preview; skill paths, defaults, and tool names can change.
- Both versions delivered the installed instructions, skill catalog and explicitly invoked `/verify` and `/production` bodies to a loopback provider in the headless profile. Autonomous skill selection and decision quality on real projects remain unmeasured.
- On 2026-11-23, the hosted Ubuntu and macOS jobs each passed all 188 repository checks. DSH headless integration was exercised separately on Linux. [GitHub Actions run 45136810552](https://github.com/imdanialrashidi/dsh-workflow/actions/runs/45136810552)
- WSL and Windows behavior remain unverified.
- Project acceptance rates, review effort and production outcomes require measurement on representative tasks. The research guide includes a protocol and example graders.

## Research and references

Start with the [evidence review and project pilot](docs/RESEARCH.md) for dated sources, limitations and implementation choices.

- DSH repository and documentation: [deepseek-ai/deepseek-harness](https://github.com/deepseek-ai/deepseek-harness)
- Anthropic, [How the Claude Code team does code review](https://claude.dev/blog/solving-code-review-at-anthropic/)
- OpenAI, [Harness engineering](https://openai.com/index/harness-engineering/) (original returned HTTP 403 on 2026-10-25; content was read through a text mirror, as noted in the capability map)
- GitHub, [Secure use reference for GitHub Actions](https://docs.github.com/en/actions/reference/security/secure-use)
