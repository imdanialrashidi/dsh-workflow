# Project instructions

Replace the placeholders with facts specific to this repository. Remove empty sections. Keep this entry point short enough to read on every task.

## Start here

<What this product does and who depends on it.>

- Product outcomes and non-goals belong in [PRODUCT.md](docs/PRODUCT.md).
- Read [ARCHITECTURE.md](docs/ARCHITECTURE.md) when crossing service or storage boundaries.
- Read [DESIGN.md](docs/DESIGN.md) for the public contracts and failure semantics.
- Find supported commands, required CI checks and release evidence in [QUALITY.md](docs/QUALITY.md). Confirm commands against the manifest or CI when the document is stale.

## Repository-specific rules

- Start a change to <critical flow> at <actual entry point>. Existing callers include <paths>.
- Generate <artifact> from <source> using <owning procedure>.
- Preserve <non-obvious invariant>. The affected consumer is <owner or system>.
- For <sensitive path>, consult <code owner or policy>. Approved test environment and synthetic data source are <locations>.
- The release decision belongs to <role>. The recovery procedure lives at <runbook>.

## Working with DSH

Use `quick-fix` for a localized change, `spec` for an unresolved decision, `build` for implementation, `test-design` for difficult coverage, `verify` for checks, `review` for the diff, and `production` for hardening or release readiness. Follow the project's existing merge and release controls.
