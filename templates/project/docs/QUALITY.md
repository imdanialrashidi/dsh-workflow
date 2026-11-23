# Quality

Own commands, test strategy, and the definition of done. Keep commands current; a stale command is worse than a missing one.

## Commands

| Purpose | Command (link the owning manifest or CI job) | Expected result |
| --- | --- | --- |
| Focused test | `<command>` | `<pass condition>` |
| Full test suite | `<command>` | `<pass condition>` |
| Type check | `<command>` | `<pass condition>` |
| Lint/format check | `<command>` | `<pass condition>` |
| Build | `<command>` | `<pass condition>` |
| Runtime smoke test | `<command>` | `<what to observe>` |

If a command is unavailable in an environment, report the check as blocked with the missing prerequisite. Do not replace it with an invented command.

## Test layers

| Layer | Scope | Where | When to run |
| --- | --- | --- | --- |
| Unit | <isolated behavior> | `<path>` | Changed logic |
| Integration | <boundary or dependency> | `<path>` | Changed contract |
| End-to-end | <user or system flow> | `<path>` | High-risk or cross-cutting change |
| Manual/runtime | <observable behavior> | `<procedure>` | Behavior not covered above |

## Risk areas

- `<area>`: `<why it is risky and what evidence is required>`
- `<area>`: `<why it is risky and what evidence is required>`

## Test conventions

- <Naming, fixtures, factories, timeouts, isolation rules.>
- <What may be mocked and what must remain real.>
- <How flaky tests are investigated and quarantined.>

## CI

<Workflow file, required jobs, supported platforms, and what CI does not cover. Link the workflow.>

## Manual checks

- <Check requiring a real environment, device, or browser.>
- <Check requiring credentials or a service that CI cannot provide.>

## Definition of done

- Every agreed criterion has current evidence on this revision. A failed requirement needs repair. A missing required observation keeps the handoff incomplete.
- Focused checks pass; broader checks have a recorded status.
- Failures, blockers, unproven claims, and unexecuted checks are reported.
- Review findings are resolved or explicitly accepted with an owner and reason.
- Documentation owned by the change is updated.

## Release handoff for this project

Fill this in only for a deliverable with deployment or distribution consequences. Link the existing CI run, PR or runbook and keep sensitive values out of the record.

| Decision or observation | Project evidence |
| --- | --- |
| Reviewed revision and deliverable | <commit plus any local changes, build identifier or artifact digest> |
| Required human approval and checks | <owner, protected branch or environment, trusted CI run and status> |
| Dependency or build changes | <approved registry, locked inputs, scan disposition, SBOM or signed provenance verification when required> |
| Compatibility and rollout | <affected consumers, order, first cohort, configuration or migration steps> |
| Detect and recover | <signal, observation window, stop threshold, operator, rollback or forward-repair procedure and rehearsal result> |
| Residual risk | <decision owner, mitigation, follow-up date or trigger> |

A local build, an independent technical review, owner approval and an observed production rollout are separate pieces of evidence.

## Related documents

- Product: [PRODUCT.md](PRODUCT.md)
- Architecture: [ARCHITECTURE.md](ARCHITECTURE.md)
- Design: [DESIGN.md](DESIGN.md)
