# AI authoring evaluation

The catalog’s runtime references are not the AI test outputs. Agents receive
the shared data, intent, consumer scaffold, and pinned documentation; they
must not see either human implementation or hidden acceptance checks.

Run two tracks:

- **Routed:** supply the exact relevant official pages. This isolates API and
  type-feedback quality.
- **Discovery:** supply only the documentation root. This measures navigation
  and later compares raw TanStack docs with the generated TanStack Intent
  skill.

Every `(case, library, run)` uses a fresh offline consumer, strict TypeScript,
the same model and reasoning level, fixed timeout and permissions, randomized
paired order, and protected scaffold hashes.

## Deterministic gates

- strict typecheck and production build;
- no runtime or console errors;
- hidden data and geometry invariants;
- compact/wide and light/dark rendering;
- resize, update, and interaction behavior when requested;
- isolated candidate bundle and dependency trace;
- protected files unchanged;
- no unsafe casts, suppressions, private imports, forced adapter generics,
  umbrella `d3`, or cross-library invented APIs.

Compile separate negative probes for missing fields, boolean quantitative
channels, invalid accessors, incompatible scale domains, dynamic input, and
callback datum inference. A generated chart compiling is not evidence that the
library rejected an invalid one.

## Scoring

Correctness gates first. Among passing runs, report:

- semantic and visual coverage;
- accessibility and resilience;
- type-protection rate;
- wall time and token counts;
- tool calls and failed commands;
- validation attempts and edit events;
- files, insertions, and deletions;
- unsafe-escape and private-import counts;
- bundle delta from the human reference.

Keep raw JSONL transcripts and write joined reports under
`.benchmark-output/conformance/ai`. Start with one local repetition; use three
for a standard cohort.

The first six authoring cases should be sorted bars, multi-series line,
histogram, stacked bars, faceted scatter, and a layered interval/annotation
case. Dynamic ranking and maintenance edits form a separate lifecycle cohort
so Plot’s host replacement model is not conflated with grammar authoring.

The first interaction cohort should sample grouped axis hover, interactive
legend state, chart/table selection, focus plus context, a pinned nested
tooltip, synchronized cursors, continuous brushing, and wheel zoom/pan. Give
agents only the semantic task, data, public docs, and mount scaffold. Keep the
named targets, ordered browser trace, expected state, implementation source,
and geometry checks hidden. Score both initial creation and a maintenance edit
that changes data revision or interaction policy without discarding stable
keys or controlled state. A passing hand-authored catalog case is prerequisite
evidence, not an AI score.

Include one inversion-of-control type probe in that cohort. A hoisted custom
focus strategy and custom SVG renderer must receive the definition's exact
datum, x-value, and y-value types; an otherwise identical strategy or renderer
with an incompatible coordinate type must fail compilation. Using a cast,
bare generic erasure, or adapter type argument is a hard failure.

The first large-data decision cohort should not reward raw mark throughput.
Give agents a dense point cloud, a high-rate ordered signal, and a
high-cardinality categorical source at 100,000 and 1,000,000 rows. Ask for both
the representation decision and the implementation. Hidden checks must require:

- an explicit user question and declared representation budget;
- source, represented, prepared, and output counts kept distinct;
- exact row accounting for density, histogram, or remainder aggregation;
- retained global extrema for an ordered-signal envelope;
- separately measured preparation and rendering;
- screen-space preparation recomputed after resize;
- stable keys and correct append/update behavior;
- a table, summary, or drill-down when aggregation removes datum inspection;
- no undisclosed sampling, raw million-mark output, or renderer-specific input.

Score a maintenance edit that changes width and appends source data without
invalidating those invariants. Run both routed and discovery tracks against
[`large-data-and-interaction.md`](../../packages/charts-core/docs/large-data-and-interaction.md),
then repeat the discovery track against the generated skill. A skill is ready
only when it improves task completion without increasing unsafe casts, private
imports, invented APIs, or hidden data loss.

## Executable smoke cohort

The checked-in harness starts with sorted bars and a fixed-boundary histogram,
one repetition per renderer. It creates four fresh workspaces under
`AI_AUTHORING_WORKSPACE_ROOT/<run-id>`; the default root is
`/private/tmp/tanstack-charts-ai` on macOS. Each workspace contains only its
task, typed data, mount contract, routed renderer notes, protected host
scaffold, and an empty candidate. It does not copy either human catalog
implementation.

The notes are compact offline snapshots of the relevant public APIs. This
smoke cohort measures routed API ergonomics; it is not the discovery-track
documentation score. The standard cohort should snapshot the full pinned
official pages and package docs.

```sh
pnpm conformance:ai:prepare -- --run-id=local-smoke-01
# Let an agent edit each workspace, then:
pnpm conformance:ai:score -- --run-id=local-smoke-01
```

Preparation and scoring never invoke a model. Model calls happen only through
the explicit run command. Every prepare or run creates an immutable run ID;
omitting `--run-id` creates a UTC timestamp ID. Existing run directories are
never removed or reused. Scoring targets `--run-id` or the current-run pointer
and does not delete older manifests, reports, transcripts, or evidence.

The executable, model, reasoning level, sandbox, approval policy, plugins, user
configuration, rules, persistence, and JSON event mode must all be pinned. For
Codex, configure a wrapper that applies an external OS sandbox, then pass these
exact inner arguments:

```sh
AI_AUTHORING_WORKSPACE_ROOT=/private/tmp/tanstack-charts-ai \
AI_AUTHORING_AGENT_COMMAND=/absolute/path/to/sandboxed-codex \
AI_AUTHORING_AGENT_ARGS_JSON='["exec","--ephemeral","--skip-git-repo-check","--ignore-user-config","--ignore-rules","--disable","plugins","--model","gpt-5.5","--sandbox","workspace-write","-c","approval_policy=\"never\"","-c","model_reasoning_effort=\"low\"","--color","never","--json","-"]' \
AI_AUTHORING_TIMEOUT_MS=300000 \
pnpm conformance:ai:run -- --run-id=gpt-5-5-low-smoke-01
```

The wrapper should use `sandbox-exec -p <generated-profile>` on macOS. The
profile should deny reads of this repository, then allow only the generated
workspace, the repository’s `node_modules`, `packages/charts-core`, Codex’s
executable/auth files, required system paths, temporary files, and model
network access. Generate the profile from `AI_AUTHORING_WORKSPACE`; do not use
one broad static profile. The generic harness intentionally does not bake in a
platform-specific sandbox.

The command runs without a shell in each workspace. Arguments may contain
`{workspace}` and `{promptFile}` placeholders. It receives those paths as
`AI_AUTHORING_WORKSPACE` and `AI_AUTHORING_PROMPT_FILE` in a minimal allowlisted
environment. Add exceptional variable names through
`AI_AUTHORING_ENV_ALLOWLIST`.

Canonical protected hashes live only in the parent run manifest; the workspace
`.harness.json` is informational. The scorer requires AST-verified
assigned-renderer imports, no source escapes, strict TypeScript, two Vite
production builds, exact 640×360 SVG geometry, accessible naming, explicit
axis endpoints, expected marks and ordering, shared zero baselines, and
aggregate/bin-height correlation. The second build secretly substitutes a new
data revision, so hard-coded totals and counts fail. Reports include built JS
raw/gzip bytes and parsed Codex JSON token/tool-call counts when present.

Manifests, reports, candidate source, bounded raw logs, run metadata, and both
screenshots are copied into
`.benchmark-output/conformance/ai/smoke-v1/runs/<run-id>`. Process output is
bounded, and timeouts terminate the full process group before escalating to
kill.

Without the external sandbox wrapper this remains smoke-only evidence, not a
blind result: hashes and import scans detect mutations but cannot stop a
process from reading the repository. Do not publish AI win rates from an
unsandboxed run.

Repeated failures become candidates for `API-FRICTION.md`. One subjective run
does not.

## Unscored authoring evidence

The initial paired corpus was authored by agents and now compiles with zero
consumer diagnostics, unsafe assertions, suppressions, private imports, or
umbrella D3 imports. That work exposed concrete API and documentation issues:
datum-driven text color and offsets, dot stroke opacity, rect endpoint scale
typing, Plot-versus-D3 histogram boundary semantics, and shared facet guide
ownership. These findings are recorded in `API-FRICTION.md`.

This is useful development feedback, but it is not the blind cohort: the
authors could inspect the repository and the paired implementations were
reviewed together. Do not report it as an AI win rate. The first scored result
must come from the fresh-consumer protocol above.
