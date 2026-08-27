# TanStack Charts API friction log

This is the durable feedback loop for building the API with itself. It records
observed difficulty from examples, production migrations, tests, and agent
evaluations so later API, documentation, and TanStack Intent skill work is
based on evidence.

Last updated: 2026-08-27

## Triage rule

| Owner         | Use when                                                                 |
| ------------- | ------------------------------------------------------------------------ |
| API           | Correct code is repeatedly verbose, error-prone, ambiguous, or untypable |
| Documentation | The API is sound but the correct pattern is hard to discover             |
| Skill         | The difficulty is data analysis, chart choice, or multi-step authoring   |
| Application   | The behavior is specific to Stats or another product                     |
| Tooling       | The issue is imports, bundle inspection, testing, or generation          |

Do not hide API problems in a skill. Do not add runtime inference merely to
save an agent a few tokens. Treat direct D3 values and compact TanStack
primitives as peers: preserve D3-compatible inputs and output while choosing
the clearest, smallest ownership boundary for the task.

## Entry format

Each entry records:

- status: `open`, `monitoring`, or `resolved`;
- owner and severity;
- the concrete task where it appeared;
- expected and actual authoring experience;
- decision and verification;
- follow-up if the evidence is not yet sufficient.

## Index

| ID    | Finding                                                        | Owner                 | Status     |
| ----- | -------------------------------------------------------------- | --------------------- | ---------- |
| F-001 | Configured D3 scales required a TanStack wrapper               | API                   | resolved   |
| F-002 | Responsive range ownership was unclear                         | Documentation         | resolved   |
| F-003 | Scale requirements ignored mark dimensionality                 | API                   | resolved   |
| F-004 | A radius channel silently imported continuous D3               | API                   | resolved   |
| F-005 | Curved area topology was implemented independently             | API                   | resolved   |
| F-006 | Explicit domain construction is repetitive                     | API/Skill             | resolved   |
| F-007 | Runtime and adapters bypassed strict scales                    | API                   | resolved   |
| F-008 | D3 motion would currently burden every DOM host                | API                   | resolved   |
| F-009 | Color semantics were overloaded onto grouping and paint        | API                   | resolved   |
| F-010 | D3 curves require one TanStack grammar bridge                  | API                   | resolved   |
| F-011 | Adapters performed dynamic preparation twice                   | API                   | resolved   |
| F-012 | Render callbacks omit diagnostic metrics                       | API                   | resolved   |
| F-013 | Bar series identity also changed bar geometry                  | API                   | resolved   |
| F-014 | Responsive nicing duplicates layout calculations               | API                   | resolved   |
| F-015 | Legacy scale helpers compete with the D3-first API             | API                   | resolved   |
| F-016 | Stats animated export still renders through Plot               | Integration/API       | monitoring |
| F-017 | React migration rebuilt a static definition                    | Documentation         | resolved   |
| F-018 | Stats derivations still invalidate dynamic input               | Application           | resolved   |
| F-019 | Custom tooltip formatting leaked float artifacts               | Application           | resolved   |
| F-020 | Axis focus could not select a single nearest point             | API                   | resolved   |
| F-021 | Native tooltips only accept plain text                         | API                   | resolved   |
| F-022 | Native tooltips could not be pinned                            | API                   | resolved   |
| F-023 | Fixed margins clip or waste guide space                        | API                   | resolved   |
| F-024 | Co-located benchmark cases defeated tree shaking               | Tooling               | resolved   |
| F-025 | Bundle maintenance clobbered comparison reports                | Tooling               | resolved   |
| F-026 | Facet summaries omitted the overall result                     | Tooling               | resolved   |
| F-027 | Pnpm validation attempted an interactive purge                 | Tooling               | resolved   |
| F-028 | Field channels accepted incompatible value types               | API                   | resolved   |
| F-029 | Dynamic hosts allowed omitted input                            | API                   | resolved   |
| F-030 | Heterogeneous dynamic marks erased datum types                 | API                   | resolved   |
| F-031 | Positional scales were disconnected from channels              | API                   | resolved   |
| F-032 | Memoized adapter internals erase generic types                 | API                   | resolved   |
| F-033 | Point coordinate values remain broad                           | API/Docs              | resolved   |
| F-034 | Text color and offset required mark duplication                | API                   | resolved   |
| F-035 | Plot legends confused the primary SVG measurement              | Tooling               | resolved   |
| F-036 | Presence-only visual checks overstated parity                  | Tooling               | resolved   |
| F-037 | Facets repeat shared axes in every panel                       | API                   | resolved   |
| F-038 | Plot and D3 threshold arrays mean different things             | Documentation         | resolved   |
| F-039 | Dots could not express stroke opacity                          | API                   | resolved   |
| F-040 | Bundle ceilings allowed silent universal growth                | Tooling               | resolved   |
| F-041 | Bounded segments and caps required custom marks                | API                   | resolved   |
| F-042 | Hoisted tooltip options lose callback context                  | API/Docs              | resolved   |
| F-043 | Streamgraph layout escaped the native stack                    | API/Docs              | resolved   |
| F-044 | Difference fills need crossing interpolation                   | API/Docs              | resolved   |
| F-045 | Arrow endpoints could not express vector fields                | API                   | resolved   |
| F-046 | Mirrored labels required duplicate text marks                  | API                   | resolved   |
| F-047 | Unique Delaunay edges are not obvious                          | API/Docs              | resolved   |
| F-048 | Responsive waffle packing lacks final bounds                   | API/Docs              | resolved   |
| F-049 | Plot and d3-hexbin use different units                         | Documentation         | resolved   |
| F-050 | Plot proportion units depend on transform scope                | Documentation         | resolved   |
| F-051 | Beeswarm layout needs responsive pixel preparation             | API/Docs              | resolved   |
| F-052 | Ranking preparation depended on D3 callback overloads          | API/Docs              | resolved   |
| F-053 | Data-bound annotations can escape auto margins                 | API/Docs              | resolved   |
| F-054 | D3 reducer output needs empty-safe narrowing                   | Documentation         | monitoring |
| F-055 | Horizontal areas required renderer internals                   | API                   | resolved   |
| F-056 | Conformance tooling assumed Plot was the reference             | Tooling               | resolved   |
| F-057 | D3 hierarchy coordinates use screen-space y                    | API/Docs              | resolved   |
| F-058 | Radar checks ignored polar labels                              | Tooling               | resolved   |
| F-059 | Vite cached a newly added package subpath                      | Tooling/API           | resolved   |
| F-060 | Geometry similarity could not gate exact layouts               | Tooling               | resolved   |
| F-061 | Catalog metadata validation was browser-bound                  | Tooling               | resolved   |
| F-062 | Interaction checks were selector-bound                         | Tooling               | resolved   |
| F-063 | Resolved scales cannot map pixels back to values               | API/Docs              | resolved   |
| F-064 | Scroll-clipped labels failed containment                       | Tooling               | resolved   |
| F-065 | Logical views required fake DOM roots                          | Tooling               | resolved   |
| F-066 | Disabling native focus required a custom strategy              | API                   | resolved   |
| F-067 | Reference wrappers duplicated accessible roots                 | Tooling               | resolved   |
| F-068 | Source audit omitted shared implementation files               | Tooling               | resolved   |
| F-069 | Strict containment exposed a clipped Plot guide                | Application           | resolved   |
| F-070 | ECharts brush injected an undeclared toolbox                   | Application           | resolved   |
| F-071 | Formatter crossed into the Stats parity worktree               | Tooling               | resolved   |
| F-072 | Wide brush ticks exceeded a locked right margin                | Application           | resolved   |
| F-073 | Scenario state overstated interaction quality                  | Tooling               | resolved   |
| F-074 | Axis focus distance created sparse cursor gaps                 | Documentation         | monitoring |
| F-075 | Controlled interactions omitted behavior semantics             | API/Docs              | resolved   |
| F-076 | Compact charts could not keep only one axis guide              | API                   | resolved   |
| F-077 | Transient host focus survived blur and cancellation            | API                   | resolved   |
| F-078 | Renderer completion signals were incomparable                  | Tooling               | resolved   |
| F-079 | Large-data timing hid representation cost                      | Tooling/Skill         | resolved   |
| F-080 | Benchmark adapters drifted from shared geometry                | Tooling               | resolved   |
| F-081 | Pointer probes confused tooltip presence with state            | Tooling               | resolved   |
| F-082 | Dormant DOM-host work accumulated across dashboards            | API                   | resolved   |
| F-083 | One-shot pointer timing hid sustained cursor work              | Tooling               | resolved   |
| F-084 | Gesture and viewport costs were conflated                      | Tooling               | resolved   |
| F-085 | Grid style repeated on every rule                              | API                   | resolved   |
| F-086 | Finding status drifted from the index                          | Tooling               | resolved   |
| F-087 | Custom focus strategies erased application types               | API                   | resolved   |
| F-088 | Update counts hid key and latest-wins correctness              | Tooling               | resolved   |
| F-089 | Custom SVG renderers erased scene point types                  | API                   | resolved   |
| F-090 | Source exports hid packed-package failures                     | Tooling               | resolved   |
| F-091 | Adapter coordinate generics broke explicit arity               | API                   | resolved   |
| F-092 | Packed documentation linked outside its tarball                | Docs/Tooling          | resolved   |
| F-093 | Filtered stress runs overwrote canonical reports               | Tooling               | resolved   |
| F-094 | Custom marks conflated point and scale values                  | API/Docs              | resolved   |
| F-095 | Long matrices treated one browser stall as deterministic       | Tooling               | resolved   |
| F-096 | Export smoke tests drifted from package manifests              | Tooling               | resolved   |
| F-097 | Lifecycle page errors passed the memory soak                   | Tooling               | resolved   |
| F-098 | Filtered conformance runs overwrote full reports               | Tooling               | resolved   |
| F-099 | Invalid cells remained eligible for fastest rankings           | Tooling               | resolved   |
| F-100 | Spatial-index updates skipped focused UI repaint               | API                   | resolved   |
| F-101 | Page errors could age into retryable timeouts                  | Tooling               | resolved   |
| F-102 | AI recipes hid direct D3 dependency ownership                  | Docs/Tooling          | resolved   |
| F-103 | Mixed valid and unknown filters narrowed benchmark scope       | Tooling               | resolved   |
| F-104 | Catalog embeds lacked a production-safe contract               | Tooling               | resolved   |
| F-105 | Competing documentation roots drifted                          | Docs/Tooling          | resolved   |
| F-106 | Build-context theme looked fully resolved                      | Documentation         | resolved   |
| F-107 | Authored SVG tab indexes were ignored                          | API                   | resolved   |
| F-108 | Interaction point color differed from rendered fill            | API                   | resolved   |
| F-109 | Grouped focus could duplicate the focused series               | API                   | resolved   |
| F-110 | Hexagon radius mapping accepted invalid source values          | API                   | resolved   |
| F-111 | Adapter aspect-ratio geometry diverged on first render         | API                   | resolved   |
| F-112 | Reference rules could not render dashed strokes                | API                   | resolved   |
| F-113 | Direct runtime factories cannot infer later definitions        | API/Docs              | monitoring |
| F-114 | Gradient stop tokens disappeared from standalone exports       | API                   | resolved   |
| F-115 | Documentation checks did not validate code snippets            | Tooling               | resolved   |
| F-116 | Build context was mistaken for resolved plot geometry          | Documentation         | resolved   |
| F-117 | Non-Cartesian examples duplicated coordinate engines           | API                   | resolved   |
| F-118 | Serialized SVG discarded interaction semantics                 | API/Application       | monitoring |
| F-119 | Catalog hosting crossed repository ownership                   | Tooling               | resolved   |
| F-120 | Key-only focus collapsed duplicate observations                | API                   | resolved   |
| F-121 | SVG callback was not a rendering-pipeline boundary             | API                   | resolved   |
| F-122 | Dense scene aggregation overflowed the call stack              | API                   | resolved   |
| F-123 | Framework adapters repeated runtime ownership                  | API                   | resolved   |
| F-124 | Name-only inventories masked undocumented contracts            | Docs/Tooling          | resolved   |
| F-125 | Adapter surface classes disappeared across lifecycles          | API                   | resolved   |
| F-126 | Executable comparisons had no public documentation             | Docs/Tooling          | resolved   |
| F-127 | Catalog source hid data transformation dependencies            | Docs/Tooling          | resolved   |
| F-128 | Chart-owned data reactivity duplicated application state       | API                   | resolved   |
| F-129 | Responsive relayout restarted chart animation                  | API                   | resolved   |
| F-130 | Adapter options duplicated chart behavior                      | API                   | resolved   |
| F-131 | Stable identity repeated inferable key channels                | API                   | resolved   |
| F-132 | Factory unions disrupt D3's generic inference                  | API                   | monitoring |
| F-133 | Clipped ancestors trapped native tooltips                      | API                   | resolved   |
| F-134 | Demo fixtures modeled charts instead of source data            | Docs/Tooling          | resolved   |
| F-135 | Published release lacked a repository baseline marker          | Tooling/Release       | resolved   |
| F-136 | Comparison conflated workspace and published source            | Tooling/Docs          | resolved   |
| F-137 | Latest docs installed an incompatible published API            | Docs/Release          | resolved   |
| F-138 | Publisher pin predated explicit trust permissions              | Tooling/Release       | resolved   |
| F-139 | Top-level entries bypassed tarball validation                  | Tooling/Release       | resolved   |
| F-140 | Behavior config could erase responsive datum inference         | API                   | monitoring |
| F-141 | Vitest followed pnpm workspace symlinks                        | Tooling               | resolved   |
| F-142 | Package verification reinstalled during release builds         | Tooling/Release       | resolved   |
| F-143 | The `ci` script name collided with pnpm's clean install        | Tooling/Docs          | resolved   |
| F-144 | Action pin checks accepted invalid commit lengths              | Tooling               | resolved   |
| F-145 | Changesets included private workspaces in version plans        | Tooling/Release       | resolved   |
| F-146 | Octane hydration used a unit-test timeout                      | Tooling               | resolved   |
| F-147 | Release automation duplicated validated work                   | Tooling/Release       | resolved   |
| F-148 | Publisher failure returned before its workers settled          | Tooling/Release       | resolved   |
| F-149 | Release checks could stall or accept an unbound tag            | Tooling/Release       | resolved   |
| F-150 | Nx worktree caches followed the common Git directory           | Tooling               | monitoring |
| F-151 | Artifact actions targeted deprecated Node 20                   | Tooling               | resolved   |
| F-152 | Version bumps invalidated workspace bundle evidence            | Tooling/Release       | resolved   |
| F-153 | Changesets left release-facing version claims behind           | Tooling/Release       | resolved   |
| F-154 | Root barrels crossed the browser host boundary                 | API/Tooling           | resolved   |
| F-155 | Optional tooltip code burdened every chart consumer            | API                   | resolved   |
| F-156 | Releases stranded manual Unreleased migration notes            | Tooling/Release       | monitoring |
| F-157 | Conformance monitoring blocked unrelated changes               | Tooling               | resolved   |
| F-158 | Focus presentation was fixed to one renderer marker            | API                   | resolved   |
| F-159 | Axis scale and presentation controls were interleaved          | API                   | resolved   |
| F-160 | Responsive tick labels had no collision policy                 | API                   | resolved   |
| F-161 | Tooltip anchors could not fix coordinates independently        | API                   | resolved   |
| F-162 | Focus styling required duplicate marks                         | API                   | resolved   |
| F-163 | Cross-row transforms lacked a public ownership boundary        | API                   | resolved   |
| F-164 | Sankey widths required a custom scene renderer                 | API                   | resolved   |
| F-165 | Incidental D3 utilities leaked into core paths                 | API/Tooling           | resolved   |
| F-166 | Grouped tooltip order diverged from mark position              | API                   | resolved   |
| F-167 | D3 declarations require a browser image global                 | Tooling               | monitoring |
| F-168 | Native interaction copied DOM-renderer policy                  | API                   | resolved   |
| F-169 | CSS theme defaults reach the native scene compiler             | API                   | resolved   |
| F-170 | Text measurement omits native typography                       | API                   | resolved   |
| F-171 | Packed declarations assume one platform global set             | Tooling               | resolved   |
| F-172 | Metro skipped the fixture-owned Babel runtime                  | Tooling               | resolved   |
| F-173 | Metro retained the complete universal barrel                   | API/Tooling           | monitoring |
| F-174 | OIDC release cannot claim a new npm package name               | Tooling               | monitoring |
| F-175 | Native SVG resource normalization collapsed authored IDs       | Application           | resolved   |
| F-176 | Large marks were focused by distant anchor points              | API                   | monitoring |
| F-177 | Bubble overlap inherited incidental source order               | Application           | resolved   |
| F-178 | Custom-template examples exposed DOM mutation plumbing         | Docs/Tooling          | resolved   |
| F-179 | Animation clocks drift at fixed frame indices                  | Tooling               | monitoring |
| F-180 | Chart host hid animated presentation geometry                  | Tooling/API           | resolved   |
| F-181 | Tween tracks could not preserve interruption velocity          | API                   | resolved   |
| F-182 | Per-series transition overrides did not inherit defaults       | API                   | resolved   |
| F-183 | Motion policy was centralized in renderer setup                | API/Tooling           | resolved   |
| F-184 | Cross-type marks lacked a shared morph topology                | API                   | monitoring |
| F-185 | Control reflow turned a morph into a resize                    | Application           | resolved   |
| F-186 | Focus states bypassed the optional physics runtime             | API                   | resolved   |
| F-187 | Crosshair motion required an application-owned frame loop      | API                   | resolved   |
| F-188 | Paired interaction assertions assumed equal timing             | Tooling               | monitoring |
| F-189 | The motion spike exposed duplicate configuration surfaces      | API                   | resolved   |
| F-190 | Static conformance sampled active motion                       | Tooling               | resolved   |
| F-191 | Axis tick styling and edge alignment required shell work       | API                   | resolved   |
| F-192 | SVG letterboxing shifted pointer hit testing                   | API                   | resolved   |
| F-193 | Fixed catalog height hid compact responsive examples           | Tooling/App           | resolved   |
| F-194 | Behavior runs omitted the interactive input                    | Tooling               | resolved   |
| F-195 | Release versions matched dependency substrings                 | Tooling               | resolved   |
| F-196 | Focus decorations suppressed the primary indicator             | API                   | resolved   |
| F-197 | Workspace validation omitted comparison provenance             | Tooling               | resolved   |
| F-198 | Union-valued axes rejected configured D3 scales                | API                   | resolved   |
| F-199 | Support metadata hid outside-definition authoring              | Docs/Tooling          | monitoring |
| F-200 | Generic mark composition widened channel types                 | API                   | resolved   |
| F-201 | Visible Voronoi cells required custom D3 paths                 | API/Docs              | resolved   |
| F-202 | Density contours hid responsive geometry behind a custom mark  | API/Docs              | resolved   |
| F-203 | D3 contour v4 runtime APIs were absent from its declarations   | Tooling               | resolved   |
| F-204 | Scalar-grid contours hid topology behind a custom mark         | API/Docs              | resolved   |
| F-205 | Force layouts hid static settlement behind case utilities      | API/Docs              | resolved   |
| F-206 | Tidy trees hid hierarchy construction in definition builders   | API/Docs              | resolved   |
| F-207 | D3 arc contexts overstated the required Canvas surface         | Tooling/API           | resolved   |
| F-208 | Sunburst definitions exposed partition and arc DTOs            | API/Docs              | resolved   |
| F-209 | Facets typed child points as grouping rows                     | API                   | resolved   |
| F-210 | Definition-shape audit ignored complete definition factories   | Tooling               | resolved   |
| F-211 | Responsive builders defer nested axis callback inference       | API                   | monitoring |
| F-212 | Transposed composites lacked a horizontal line mark            | API                   | resolved   |
| F-213 | Regression fits were hidden in case-owned endpoint preparation | API/Docs              | resolved   |
| F-214 | Marginal views required reserved-domain manual plotting        | API/Docs              | resolved   |
| F-215 | Ridgeline profiles lost categories to numeric surrogates       | API/Docs              | resolved   |
| F-216 | Violin envelopes encoded categories as numeric endpoints       | API/Docs              | resolved   |
| F-217 | Mosaic cells hid two normalization denominators                | API/Docs              | resolved   |
| F-218 | Decorative scene fragments lost point ownership                | API                   | resolved   |
| F-219 | Responsive bar caps required guessed plot widths               | API/Docs              | resolved   |
| F-220 | Framed labels estimate glyph bounds by character count         | API                   | monitoring |
| F-221 | Roadmap evidence existence allowed false verification          | Tooling               | resolved   |
| F-222 | View composition coupled placement to grid semantics           | API/Docs              | resolved   |
| F-223 | Remote catalog modules could not participate in SSR            | Tooling/App           | resolved   |
| F-224 | Packed consumers masked a runtime D3 dependency                | Tooling               | resolved   |
| F-225 | Noninteractive SSR emitted hidden focus geometry               | API/Tooling           | resolved   |
| F-226 | Worker runtimes rejected bundled CSV parsing                   | Tooling               | resolved   |
| F-227 | Catalog bundles omitted data license notices                   | Tooling               | resolved   |
| F-228 | Catalog definitions captured the initial server width          | Application           | resolved   |
| F-229 | Catalog publishing raced its React dependency                  | Tooling/Release       | resolved   |
| F-230 | CI repeated unaffected work across every partition             | Tooling               | monitoring |
| F-231 | Packed consumers serialized independent verification           | Tooling/Release       | resolved   |
| F-232 | Benchmark shards repeated setup and skewed work                | Tooling               | monitoring |
| F-233 | Dismissal could click through a composed tooltip               | API                   | resolved   |
| F-234 | Recharts point replacement canceled activation events          | Application           | monitoring |
| F-235 | Structured tooltip rows could not interleave details           | API                   | monitoring |
| F-236 | Paint parity normalized patterns but not gradients             | Tooling               | resolved   |
| F-237 | Focused rules had no matchable presentation points             | API                   | resolved   |
| F-238 | Callback parameter shapes were inconsistent                    | API/Tooling           | resolved   |
| F-239 | Example keys collapsed distinct source rows                    | Application           | resolved   |
| F-240 | Rolling paths morphed samples instead of shifting them         | API                   | resolved   |
| F-241 | Motion ignored authored SVG clips                              | API                   | resolved   |
| F-242 | Paged history required overlaid chart hosts                    | API                   | resolved   |
| F-243 | Long-press focus duplicated host pointer geometry              | API                   | resolved   |
| F-244 | Focus cursor width depended on private band inference          | API                   | resolved   |
| F-245 | Focus-filtered bands could not act as cursor geometry          | API                   | resolved   |
| F-246 | Scene updates cleared active motion guide placement            | API                   | resolved   |
| F-247 | Custom mounts were not React catalog descriptors               | Tooling/App           | resolved   |
| F-248 | Release finalization targeted the workflow head                | Tooling/Release       | monitoring |
| F-249 | Interrupted motion retained stale presentation state           | API                   | resolved   |
| F-250 | Host accessibility diverged across render paths                | API                   | resolved   |
| F-251 | The architecture made D3 implementation sound mandatory        | Documentation         | resolved   |
| F-252 | Catalog sidebar links duplicated case metadata                 | Docs/Tooling          | resolved   |
| F-253 | Compact scales accepted structurally invalid pairs             | API                   | resolved   |
| F-254 | View composition types were broader than runtime               | API                   | resolved   |
| F-255 | Public import maps could drift from package exports            | Documentation/Tooling | resolved   |
| F-256 | Shared host policy retained browser-only modules               | API/Tooling           | resolved   |
| F-257 | The release package graph leaked into application setup        | API/Docs/Tooling      | resolved   |
| F-258 | Tooltip chrome required specificity overrides                  | API/Documentation     | resolved   |
| F-259 | Chart resources cannot declare patterns                        | API                   | open       |
| F-260 | Static guides cannot express stroke treatment                  | API                   | open       |
| F-261 | Cartesian bars cannot round only exposed corners               | API                   | open       |
| F-262 | Mark inference accepted an unsupported style option            | API                   | resolved   |
| F-263 | Chromium transport suspension interrupted catalog previews     | Tooling               | resolved   |
| F-264 | Drillable sunbursts required rebuilding hierarchy rows         | API/Documentation     | resolved   |
| F-265 | Sunburst motion lost hierarchy across enter and exit           | API                   | resolved   |
| F-266 | Path-token motion distorted polar sectors                      | API/Tooling           | resolved   |
| F-267 | Stress timeouts entered a class temporal dead zone             | Tooling               | resolved   |
| F-268 | Animated arc flags became invalid fractional path values       | API                   | resolved   |
| F-269 | Angular mounted its browser host during server rendering       | API                   | resolved   |
| F-270 | Catalog migration left generated release evidence stale        | Tooling               | resolved   |
| F-271 | Radial focus collapsed angular cross-sections to centroids     | API                   | resolved   |
| F-272 | Pointer probes armed between transient inactive frames         | Tooling               | resolved   |
| F-273 | Catalog cases could not declare an application viewport height | Tooling               | resolved   |
| F-274 | Upstream example clones had no drift boundary                  | Tooling               | resolved   |
| F-275 | Preview transparency validation rejected semantic IDs          | Tooling               | resolved   |
| F-276 | Definition coverage assumed a combined renderer module         | Tooling               | resolved   |
| F-277 | Preview errors omitted the failing catalog case                | Tooling               | resolved   |
| F-278 | Renderer checks could validate matching approximations         | Tooling               | resolved   |
| F-279 | Radial grids could not render authored fills                   | API                   | resolved   |
| F-280 | Chart motion did not reach HTML tooltips                       | API                   | resolved   |
| F-281 | Bars could not express an authored outline                     | API                   | resolved   |
| F-282 | Collection actions followed the viewport instead of the card   | Application           | resolved   |
| F-283 | Interactive chart shells rendered inert controls               | Application           | resolved   |
| F-284 | Stagger timing required repeated callback arithmetic           | API                   | resolved   |
| F-285 | Absolute catalog links lost their docs navigation tab          | Documentation         | resolved   |
| F-286 | Browser imports treated raw JSON as a source module            | Tooling               | resolved   |
| F-287 | Motion renderers required definition type extraction           | API                   | resolved   |
| F-288 | Generated examples exposed shared implementation scaffolding   | Tooling/API           | resolved   |
| F-289 | Catalog workbenches exposed runtime bootstrap files            | Tooling               | resolved   |
| F-290 | Public examples imported a private workspace package           | Tooling               | resolved   |
| F-291 | Renderer capability injection depended on module identity      | API/Tooling           | resolved   |
| F-292 | Fixed preview paints ignored the selected site theme           | Tooling               | resolved   |
| F-293 | Root scale slots blocked named axes                            | API                   | resolved   |
| F-294 | Automatic mark renderers imposed shared host plumbing          | API                   | resolved   |
| F-295 | Line marks forced round endpoints                              | API                   | resolved   |
| F-296 | Axis titles could not carry authored typography or paint       | API                   | resolved   |
| F-297 | Focus ring paint required generated SVG selectors              | API                   | resolved   |

## Findings

### F-001 — Configured D3 scales required a TanStack wrapper

- Status: resolved
- Severity: high
- Observed in: explicit-scale bundle spike
- Friction: authors had to wrap `scaleLinear()` with `configuredScale(...)`
  even though the D3 callable already contained the complete contract.
- Decision: accept raw callable, copyable D3 scale instances directly and
  direct D3 factories when Charts should infer the domain.
- Verification: positional scale tests cover linear, UTC, band centering,
  reversal, responsive copying, and source-scale immutability.

### F-002 — Responsive range ownership was unclear

- Status: resolved
- Severity: medium
- Observed in: documentation conversion to raw D3 scales
- Friction: normal D3 examples configure both domain and range, while a
  container-responsive chart cannot know its final pixel range at definition
  time.
- Decision: a configured instance carries an author-owned semantic domain; a
  factory delegates domain inference to Charts. TanStack copies either scale
  and owns its responsive range.
- Verification: the responsive-scale tests cover copying, range replacement,
  reversal, and source immutability. A source audit of the complete authored
  conformance catalog found no configured positional chart scale with an
  application-owned pixel range. The remaining `.range(...)` calls are
  intentional color/radius mappings, screen-space preparation, or interaction
  copies using `scene.chart`; the recipes distinguish all three.

### F-003 — Scale requirements ignored mark dimensionality

- Status: resolved
- Severity: high
- Observed in: strict compiler integration, positionless charts, and
  one-dimensional rules
- Friction: requiring both `x` and `y` correctly rejected incomplete
  Cartesian definitions, but also forced `x: null` and `y: null` onto geo,
  polar, and other positionless charts. A horizontal or vertical rule likewise
  had to describe an axis it could never materialize.
- Decision: derive each axis requirement from the marks' scale phantoms. A
  materialized dimension requires a configured scale. A dimension whose marks
  all expose `never` requires an explicit `null` reserved entry and rejects a
  configured phantom axis at the precise authored type boundary. Every
  definition explicitly declares both reserved entries. Mixed charts require
  every dimension materialized by any constituent mark. Runtime validation
  requires both reserved entries, rejects `null` for channels that materialize,
  and renders guides only for configured axes. It cannot recover type-only
  scale phantoms after a custom mark or stored definition has been erased.
- Verification: focused type-contract and configured-scale tests cover
  required Cartesian axes, mixed charts, explicit null positionless axes,
  rejected configured phantom axes, one-dimensional rules, deferred custom
  marks, erased definitions, runtime guards, and guide suppression. Root
  typecheck passes.

### F-004 — A radius channel silently imported continuous D3

- Status: resolved
- Severity: high
- Observed in: representative-mark and spatial bundle traces
- Friction: importing `dot` retained `scaleRadial` and the full continuous D3
  scale graph even when every dot used a fixed radius.
- Decision: radius values are pixels by default. Data-driven area mapping
  requires a supplied `scaleRadial` or compatible callable. The object form
  accepts a factory when Charts should infer `[0, maximum]`; bare callables
  remain direct radius mappers.
- Verification: representative marks returned to 7.81 kB gzip from 15.39 kB;
  raw D3 radial mapping has behavior coverage.

### F-005 — Curved area topology was implemented independently

- Status: resolved
- Severity: high
- Observed in: D3 correctness audit
- Friction: joining two independently curved line paths was not equivalent to
  D3 area topology.
- Decision: `d3Curve` delegates curved line and area generation to `d3-shape`.
  Straight SVG paths remain dependency-free renderer serialization.
- Verification: line and area curve tests pass against D3-generated paths.

### F-006 — Explicit domain construction is repetitive

- Status: resolved
- Severity: medium
- Observed in: recipe, sandbox, shared fixture, and TanStack Stats migrations
- Friction: every positional scale needs a complete, empty-safe domain. The
  correct expression varies for linear, time, band, stacked, diverging, and
  interval data.
- Decision: a supplied D3 scale factory asks Charts to infer a domain from all
  materialized mark channels that use the scale. A configured scale instance
  keeps its application-owned domain. Factory-created categorical domains use
  first-seen order; quantitative and temporal domains use finite extents; bar,
  area, and interval baselines participate in zero inclusion. `nice` runs
  after domain inference. Empty channels retain the D3 factory's native
  domain. Color factories follow their D3 semantics: continuous and quantize
  scales infer finite extents, quantile and sequential-quantile scales receive
  the observed numeric population, and threshold scales require authored cut
  points. An authored range is applied before continuous multi-stop inference
  so the inferred domain has one stop per palette color.
- Sandbox evidence: the real-data dashboard passes the original AAPL, TSA,
  San Francisco temperature, and Seattle weather rows through one accessor-
  driven sparkline definition. Its positional factories infer both axes; the
  authored area baseline carries visual padding into the materialized y
  channels. The industry stack, Simpsons heatmap, penguin scatter, car summary,
  and survey views likewise keep only semantic ordering or authored cuts
  explicit.
- Stats evidence: unzoomed UTC, zero-inclusive numeric, stacked, and stream
  domains now come from materialized channels. Zoom viewports, categorical
  ordering, and semantic color assignments remain configured instances.
- Documentation evidence: quick starts and core recipes removed empty-safe
  `extent` and `max` setup when the result only repeated mark channels. Recipes
  still configure normalized ranges, thresholds, shared facet domains, and
  transform boundaries explicitly.
- Catalog evidence: every explicit domain in the 100-case authored catalog was
  classified by intent. Inferred extents and first-seen order replaced
  benchmark-only padding, complete observed-date ranges, totals, and category
  restatements in both TanStack and reference sources. Twenty-one exported
  domain helpers disappeared, including the shared `timeDomain` and the
  first-case `gapValueDomain`. Normalized coordinates, thresholds, fixed
  interaction viewports, transform coordinate spaces, shared comparison
  domains, and ordering that must survive subsets remain explicit. Guide
  assertions no longer justify otherwise redundant domains. Reference defaults
  are not assumed equivalent: the slopegraph uses Plot's mark-domain
  `sort: { x: null, color: null }` to request the same first-seen period and
  color order as TanStack without restoring categorical arrays.
- Scope: the same lifecycle applies to Cartesian, color, polar, grouped-bar,
  and mark-local radius scales. Explicit instances remain necessary for
  thresholds, fixed comparison windows, shared facet domains, stable semantic
  color assignments, and interaction viewports.
- Verification: focused core tests cover numeric, temporal, band, ordinal,
  continuous, quantize, quantile, sequential-quantile, threshold, polar,
  grouped-bar, and radius inference; zero baselines; nicening; empty data;
  explicit empty domains; factory configuration; palette stop alignment;
  fixed instance domains; rejection of mixed-type quantitative and temporal
  channels; strictly positive and strictly negative inferred log domains with
  zero and mixed-sign rejection; and clear failures when quantitative color
  scales receive nonnumeric values. The slopegraph passes responsive initial/update
  conformance with identical `Before`, `After` guides and category paints at
  both widths. Root typecheck passes.

### F-007 — Runtime and adapters bypassed strict scales

- Status: resolved
- Severity: high
- Observed in: strict compiler integration audit
- Friction: an isolated strict scene function was insufficient while the
  vanilla runtime, dynamic definitions, React, Octane, and nested facets still
  entered the transitional inferred-scale compiler.
- Decision: make `createChartScene` the only runtime compiler and migrate every
  internal consumer to raw supplied scales or explicit null axes.
- Verification: runtime tests cover dynamic missing-scale failure; facets,
  shared fixtures, benchmarks, the sandbox, React, Octane, and the Stats
  canary all use the same strict compiler. No production compiler calls the
  inferred scale builder.

### F-008 — D3 motion would currently burden every DOM host

- Status: resolved
- Severity: medium
- Observed in: interpolation bundle audit
- Friction: `d3-interpolate` adds about 3.82 kB gzip if imported by the normal
  reconciler, including charts that never animate.
- Decision: define an injectable motion driver or separate animated host
  boundary before replacing native interpolation and easing.

### F-009 — Color semantics were overloaded onto grouping and paint

- Status: resolved
- Severity: medium
- Observed in: catalog comparison with Observable Plot and the color/fill API
  audit
- Friction: `z` simultaneously meant geometric grouping, interaction identity,
  and color-scale input. Authors either supplied a grouping channel that did
  not actually group the geometry or bypassed the color scale and legend with
  `fill` or `stroke`.
- Decision: color-capable built-in marks expose a semantic `color` channel.
  It supplies the color scale and legend, while `z` remains responsible for
  geometric grouping and interaction/key scope. For compatibility, omitting
  `color` reuses the existing `z` values as color input without allocating
  another channel array. Authored `fill` and `stroke` remain final paint
  overrides. The automatic theme ordinal scale remains the no-configuration
  default; configured instances retain fixed semantic mappings and factories
  infer as described in F-006. The theme palette applies only to the built-in
  ordinal scale. A D3 color factory must receive `color.range` or return a
  scale with an authored string range/interpolator; bare D3 defaults are
  numeric or empty and fail instead of becoming invalid CSS paint.
- Group inference: when `z` is omitted, connected line and area marks use
  discrete `color` to partition paths because one row-level color channel
  necessarily identifies those paths. Bars use it as series identity after
  stacked or explicit grouped geometry is known. Continuous color cannot infer
  a series. Explicit `z` remains authoritative and can differ from `color`;
  color never selects stacked versus grouped geometry.
- Legend behavior: `colorLegend` uses swatches for categorical scales, a
  gradient for continuous and sequential scales, and exact stepped bins and
  boundaries for quantize, quantile, and threshold scales.
- Catalog evidence: examples use `color` when a field describes paint
  semantics, retain `z` when it actually groups geometry, and keep literal
  `fill` or `stroke` when the reference color is direct paint. Raw fixture and
  transform modules no longer own palettes or final paint. The remaining
  datum-driven final paint accessor is the labeled heatmap's foreground
  contrast rule. Fifty-one redundant color-domain declarations were removed;
  30 semantic mappings, thresholds, and stable envelopes remain. Twenty-four
  legacy `z` paint fallbacks became `color`, and the only remaining z-only
  catalog options define grouped-bar slot geometry.
- Verification: focused color-scale, Cartesian mark-color, radial mark-color,
  geo mark-color, line-group sentinel, and legend tests pass with root
  typecheck. Null and empty-string path groups remain distinct. All 100 catalog
  cases pass artifact and static loading checks, and the focused catalog and
  core guards pass. The full repository matrix passes 2,848 tests. Across the
  complete catalog-inference branch, including the later key and text-layout
  work and strict inference guards, the locked D3 line scene grows by 1,609
  minified bytes and 509 gzip bytes, and the representative-mark entry grows
  by 2,740 minified bytes and 797 gzip bytes. The optional geo entry's isolated
  color work grows by 978
  minified bytes and 335 gzip bytes.

### F-010 — D3 curves require one TanStack grammar bridge

- Status: resolved
- Severity: low
- Observed in: optional curve integration
- Friction: authors write `d3Curve(curveMonotoneX)` instead of supplying the D3
  curve factory directly.
- Decision: keep the bridge while it gives one curve value both line and area
  semantics. Keep the convenient root and universal exports alongside the exact
  `@tanstack/charts/d3/shape` entry; supported bundlers remove the bridge and
  its D3 line and area generators when unused.
- Verification: direct D3 curve entries, Cartesian curve tests, packed
  declarations, and documentation examples cover both barrel and exact-subpath
  forms.

### F-011 — Adapters performed dynamic preparation twice on mount

- Status: resolved
- Severity: high
- Observed in: TanStack Charts sandbox migration
- Friction: `ChartSurface` creates a temporary runtime and prepares the dynamic
  definition for initial markup. The mounted DOM host creates another runtime
  and immediately prepares the same input again. A preparation counter reads
  two before the first interactive update.
- Expected: one logical chart mount performs expensive preparation once.
- Decision: superseded by F-128. Charts no longer owns data preparation.
  Adapter prerender and mount still share one runtime for renderer handoff, but
  application reactivity owns transformed data and asynchronous cleanup.
- Verification: React and Octane dynamic mounts, hydration, and SSR retain
  complete initial markup without a preparation lifecycle.

### F-012 — Render callbacks omit diagnostic metrics

- Status: resolved
- Severity: low
- Observed in: TanStack Charts sandbox migration
- Friction: `onRender` exposes the scene and elements but not render count,
  reason, or duration. The sandbox can count callbacks, but it lost the prior
  host's resize/update reason and timing diagnostics.
- Current decision: keep a local render counter. Add core metrics only if
  performance tooling or another production consumer needs them.

### F-013 — Bar series identity also changed bar geometry

- Status: resolved
- Severity: high
- Observed in: package-ranking sandbox and TanStack Stats migrations
- Friction: `barY` and `barX` interpreted every `z` value as an implicit
  side-by-side subgroup, dividing a primary band with TanStack-owned math. Nine
  unique package identities made the Stats snapshot bars roughly one pixel
  thick and shifted each away from its categorical tick.
- Expected: the supplied D3 band scale completely owns bar position and
  thickness. Series or color identity must not silently change geometry.
- Decision: a single quantitative bar channel is a length and stacks
  implicitly at repeated positions. Explicit endpoints opt out of stacking but
  remain compatible with orthogonal `layout: group()` positioning. Side-by-side
  geometry requires `layout: group()`, optionally with a copied D3 band scale.
  `z` supplies series identity; discrete `color` may infer identity only after
  geometry is selected. `layout: stack()` exposes order, reversal, diverging,
  normalization, centering, and wiggle offsets for bars and areas while
  preserving the default implicit stack.
- Verification: focused tests cover implicit diverging bars, normalized and
  ordered stacks, area stacks, explicit endpoints with grouping, explicit
  grouping, source-scale immutability, and continuous-color rejection. Catalog
  conformance case 72 passes with explicit stacked endpoints adjacent to an
  independent grouped bar.

### F-014 — Responsive nicing duplicates layout calculations

- Status: resolved
- Severity: medium
- Observed in: strict D3-scale migration of the TanStack Stats canary
- Friction: Stats owns the semantic domains, but preserving its previous
  responsive nicing required it to reproduce TanStack's inner plot size and
  tick-count formulas before calling D3's `nice(tickCount)`.
- Expected: an application should supply semantic data policy without
  duplicating private guide-layout calculations.
- Decision: `nice` is a chart scale option applied after factory domain
  inference, using the explicit count or the resolved guide tick count. This
  keeps domain-dependent mutation out of the factory while persistent D3
  configuration such as padding, clamping, and interpolation stays inside the
  factory.
- Verification: factory scale tests cover default and explicit nicing;
  definitions no longer duplicate private inner-size calculations.

### F-015 — Legacy scale helpers compete with the D3-first API

- Status: resolved
- Severity: high
- Observed in: strict migration of fixtures, sandbox, and Stats, followed by
  the 15 KiB representative React bundle target
- Friction: `scaleUtc`, `scaleTime`, `scaleLog`, `scaleSymlog`, `scaleSqrt`,
  `configuredScale`, `ChartScaleTransform`, and inferred scale types remain
  exported beside native `d3-scale` values. Their names are easier for both
  humans and agents to select accidentally even though the strict compiler no
  longer consumes inferred axis options.
- Decision: remove the legacy inferred scale and transform surface after its
  historical tests and bundle fixtures have been relabeled or deleted. Keep
  D3 imports visibly sourced from `d3-scale` for its complete semantics. Offer
  the deliberately smaller linear, band, point, and ordinal subset only from
  exact `@tanstack/charts-scales/*` entries, with no root export. The compact
  package is a constrained bundle option, not a second general-purpose scale
  API.
- Verification: the obsolete scale, radius, color, curve, transform, and
  spatial wrappers and subpaths are gone; the inferred-scale builder and its
  tests are deleted; fixtures and histogram benchmarks use direct `d3.bin`;
  differential tests cover the compact subset against D3; packed-consumer
  checks resolve every exact entry. The complete compact family is 1,877 gzip
  bytes, and a representative compact React line is 14,227 gzip bytes without
  retaining `d3-scale`, `d3-format`, or `d3-interpolate`.

### F-016 — Stats animated export still renders through Plot

- Status: monitoring
- Severity: high
- Owner: Integration/API
- Observed in: TanStack Stats default-renderer cutover
- Friction: the live route and static export use TanStack Charts by default,
  but GIF and WebM frame generation still calls the Observable Plot export
  renderer. Plot therefore remains a production dependency after the runtime
  cutover.
- Decision: render animated frames through TanStack scenes using the same
  prepared Stats data, then compare decoded timing, dimensions, colors,
  legends, and frame contents against the existing output.
- Verification: pending animated export parity tests and removal of the Plot
  frame generator.

### F-017 — React migration rebuilt a static definition

- Status: resolved
- Severity: high
- Observed in: TanStack Stats default-renderer cutover
- Friction: the first migration created a static chart definition inside
  `useMemo(..., [props])`. React creates a new props object for every component
  render, so the definition changed identity and reset runtime memoization even
  when every chart-relevant value was unchanged.
- Decision: define one dynamic chart at module scope and pass a narrowed input
  object containing only scene-relevant values. The runtime's shallow input
  equality now ignores parent-only legend, footer, ref, and callback changes;
  resolved chart height comes from the dynamic build context.
- Verification: the Stats figure typecheck and lint pass, while core and
  adapter tests cover stable-definition input invalidation and one preparation
  per mount.

### F-018 — Stats derivations still invalidate dynamic input

- Status: resolved
- Severity: medium
- Owner: Application
- Observed in: TanStack Stats default-renderer cutover
- Friction: the chart definition is stable, but `NPMStatsChart` still derives
  arrays and accessor functions during its application render. Those values
  are legitimate chart inputs, so new identities cause a redraw even when an
  unrelated parent update leaves their semantics unchanged.
- Decision: keep equality honest in the chart runtime and use definition
  identity as the application reactivity boundary. TanStack.com now caches the
  definition behind a narrow semantic revision object that includes every
  scene-relevant value while excluding parent-only legend, export, and
  playback state. Do not hide unstable application values behind generic deep
  equality in TanStack Charts.
- Verification: TanStack.com PR
  [#1083](https://github.com/TanStack/tanstack.com/pull/1083) implements the
  revision boundary for `NPMStatsChart`. A review regression confirmed that
  unrelated parent state no longer recreates the definition. The site's 135
  tests, typecheck, lint, and production build pass, and the deployed npm
  stats route renders its TanStack chart without browser errors or warnings.

### F-019 — Custom tooltip formatting leaked float artifacts

- Status: resolved
- Severity: high
- Owner: Application
- Observed in: TanStack Stats tooltip parity and ECharts axis-pointer catalog
  case
- Friction: the automatic host tooltip uses locale-aware number formatting,
  but Stats supplied `formatGroup` and then formatted values below 1,000 with
  `Number.prototype.toString()`. Normalized values exposed full floating-point
  artifacts such as `0.4863476502659163`.
- Decision: keep numeric presentation policy in the application callback and
  use `Intl.NumberFormat('en-US')`, matching the existing Plot tooltip.
- Verification: the Stats formatting test covers integers, normalized
  fractions, negative compact values, thousands, and millions. The core
  runtime test proves its automatic formatter also suppresses float artifacts.

### F-020 — Axis focus could not select a single nearest point

- Status: resolved
- Severity: high
- Owner: API
- Observed in: TanStack Stats tooltip parity and pinned nested-chart tooltip
- Friction: `focusX` and `focusY` intentionally return one point per series at
  an axis value. Observable Plot's `pointerX` and `pointerY` select only the
  nearest point while prioritizing that axis, so stacked and segmented charts
  could not preserve their existing interaction without a custom strategy.
- Decision: add tree-shakeable `focusNearestX` and `focusNearestY` strategies.
  Keep `focusX` and `focusY` for grouped cross-section tooltips, and omit the
  strategy for ordinary two-dimensional nearest-point focus.
- Verification: focused strategy tests cover singleton X/Y selection,
  secondary-axis tie-breaking, keyboard navigation, and grouped-mode
  preservation. Stats uses the singleton modes for stacked and bar charts.

### F-021 — Native tooltips only accept plain text

- Status: resolved
- Severity: medium
- Owner: API
- Observed in: TanStack Stats tooltip parity and framework adapter parity
- Friction: the host assigns formatter output with `textContent`. Selection
  and values can match Plot, but an application cannot render structured rows,
  colored series swatches, or interactive content through the native tooltip
  option.
- Decision: add a framework-neutral display model with a title, labeled rows,
  and optional swatch colors. The automatic path reuses visible axis labels,
  groups a shared axis value, renders series swatches, and understands ranges
  and stacked lengths. Ordered `items` cover channels, scalar datum fields, and
  derived point text; `sort` controls grouped-series order. Point, pointer,
  group-center, and custom anchors combine with fixed or ordered fallback
  placements. `content` remains the escape hatch for application-specific
  grouped structure without accepting arbitrary DOM. Every framework adapter
  adds a native body-composition boundary with the focused points, resolved
  content, native `defaultBody`, pinned state, and a dismissal action. Chart
  behavior remains definition-owned; adapter props, slots, snippets, templates,
  and directive options only render framework content into the core-owned body
  mount.
- Verification: core DOM-host tests cover automatic grouped swatches,
  accessible row text, ordered point fields, grouped sorting, UTC date
  formatting, interval ranges, stacked lengths, legacy plaintext formatting,
  all anchor forms, placement fallback, and selectable pinned content. Catalog
  cases 34, 35, and 65 exercise point, group-center, and pointer anchoring.
  All three pass every Chromium interaction scenario across revisions, widths,
  and themes. React, Preact, Solid, Vue, Svelte, Angular, Lit, Alpine, and
  Octane adapter tests prove native-body composition and cleanup. Framework
  lifecycle suites additionally cover nested charts, stable body mounting,
  typed and sorted points, transient inertness, pinned dialog semantics, and
  dismissal. With framework and core packages external, no adapter adds more
  than 1.4 kB gzip. No new runtime library was introduced; React DOM is now
  declared as the React adapter's portal peer.

### F-022 — Native tooltips could not be pinned

- Status: resolved
- Severity: medium
- Owner: API
- Observed in: TanStack Stats tooltip parity
- Friction: Observable Plot lets a pointer click freeze the current tip while
  the pointer leaves or moves elsewhere. The TanStack host always cleared focus
  on mouse leave, so inspecting a dense value required holding the pointer
  still. The nested-detail case also needed focus styling without painting an
  empty transient custom-body shell before activation.
- Decision: pointer clicks, Enter, and Space pin the focused point by default;
  another activation or Escape releases it, and `sticky: false` opts out.
  Pinned native content allows text selection. Activation still calls
  `onSelect`, and the option adds no separate interaction dependency.
  `visibility: 'pinned'` keeps focus and inline state active while suppressing
  the tooltip element and adapter body until activation.
- Verification: the DOM-host regression covers pinning, ignored pointer
  movement while pinned, mouse leave, Escape, repinning, click release, text
  selection, keyboard activation, and the `sticky: false` opt-out. React body
  lifecycle coverage proves pin-only focus creates no shell or body, pinning
  mounts one non-modal dialog and nested body, and release hides and unmounts
  both. Case 84 passes every click, keyboard dismissal, close-button,
  revision-update, accessible-dialog, and nested-host scenario at 320px and
  640px with 99.6% diagnostic geometry.

### F-023 — Fixed margins clip or waste guide space

- Status: resolved
- Severity: high
- Owner: API
- Observed in: TanStack Stats renderer parity
- Friction: core previously resolved fixed margin heuristics before scales,
  formatted ticks, titles, and rotations existed. Stats compensated with
  duplicated character-width estimates and large manual margins, yet labels
  could still escape a clipped SVG. The strict zero-failure CI gate later made
  the same existing mistake blocking in two conformance examples: a locked
  64px left margin left the rotated y-axis title 1.35px outside the surface
  under Linux font metrics. A long 11px x-axis title was also wider than its
  entire 320px surface.
- Decision: make omitted margin sides automatic. Solve the minimum guide bounds
  from formatted text, anchors, and rotations; treat numeric sides as hard
  overrides; expose resolved bounds for aligned application UI. Candidate
  generation now precedes rotated-label collision thinning, while containment
  remains a separate constraint. The final thinned bounds feed the iterative
  margin solver. Content-dependent examples omit margin locks, and axis titles
  use the same compact 10px typography as ticks below 360px.
- Verification: six guide-bound tests cover deterministic measurement, anchors,
  baselines, rotation, translated groups, and all four sides. Five scene-layout
  tests cover long labels and titles, rotated endpoints, narrow-to-wide
  reclamation, side locks, and single mark rendering. DOM tests cover inherited
  family, style, stretch, weight, direction, letter spacing, exact painted
  bounds, measurer replacement, coalesced font completion, and cleanup. Stats
  supplies neither Charts margins nor title offsets; its timeline consumes the
  resolved scene margin. TypeScript, focused lint, browser containment across
  every Stats shape, and bundle ceilings pass. The stacked-area, streamgraph,
  and narrow Likert cases pass the same 320px and 640px containment contract in
  local Chromium. Pull-request CI remains the cross-platform release gate.

### F-024 — Co-located benchmark cases defeated tree shaking

- Status: resolved
- Severity: high
- Owner: Tooling/API
- Observed in: cross-library bundle and browser comparison matrix; executable
  catalog production loading
- Friction: re-exporting one benchmark mount from a module containing four
  top-level chart definitions retained every TanStack mark. Line, bar, area,
  and scatter therefore produced the same 52.48 kB minified artifact even
  though the public mark modules are tree-shakeable. The same failure recurred
  when a shared conformance mount module imported `react-dom` for Recharts:
  TanStack's isolated case grew from 22.40 to 80.90 kB gzip despite never
  calling the Recharts helper. It recurred a second time when cross-library
  adapters read exported stress-mode aliases: normal bundles retained 194
  bytes of probe scheduling in Chart.js, Recharts, and Plot, and 509 bytes in
  ECharts. The production catalog later repeated the boundary failure through
  two broad `import.meta.glob('./cases/*/*.ts')` registries. Its default entry
  registered 584 implementation and raw-source imports, including every
  comparison renderer, data/helper modules, and a `tanstack.test.ts` file.
  Even after the production graph was narrowed, its public source entry was
  still the conformance `tanstack.ts` adapter. Opening an example in the docs
  therefore started on mount plumbing and followed shared harness modules
  instead of showing the chart definition; some sandboxes contained source
  from unrelated examples.
- Decision: give each chart type an isolated entry module and share only the
  renderer-free host setup. Renderer-specific helpers with runtime imports
  live in separate modules. Tier variants also use direct build-time globals;
  exported or locally aliased tier constants are not assumed to propagate
  across modules. The catalog keeps metadata, exact TanStack loaders, and exact
  comparison loaders in separate registries; only `?compare=1` dynamically
  imports the comparison registry. Production publication goes further: it
  copies only the recursive ESM closure rooted at each exact implementation
  entry. Raw-source wrappers, the standalone application, and the comparison
  registry are not part of the artifact. Do not rely on purity annotations,
  minifier-specific interprocedural analysis, or a render-time branch to
  establish a bundle boundary.
- Verification: emitted TanStack artifacts contain only the selected mark
  class, and the four minified and compressed measurements are distinct. The
  tiered line bundles also separate as expected: TanStack gzip is 18.12 kB
  basic, 18.42 kB interactive, and 20.65 kB advanced; Chart.js interactive
  similarly adds its legend and tooltip plugins. After moving `rechartsMount`
  to its own module, the composed Recharts comparison restored TanStack to
  22.40 kB gzip versus Recharts at 168.56 kB and passed the quick visual gate.
  The comparison builder now rejects any normal artifact with nonzero bytes
  from `comparison/stress`; direct build-time globals reduce that contribution
  to zero for all five libraries, and `pnpm benchmark:check` passes. The
  catalog graph gate now proves exactly 100 TanStack, 68 Plot, 21 Recharts, and
  11 ECharts implementations plus their isolated raw-source entries. Source
  entries for case support, fixtures, and harnesses remain lazy, tests stay
  excluded, and no raw-source wrapper enters the initial or published graph.
  Every published TanStack root receives the same static-closure
  comparison-package check. The schema-v3 artifact validator rejects
  unreferenced files, unsafe paths, missing imports, invalid preloads, invalid
  authored-source roles, and a comparison module not marked debug-only. The
  source catalog now publishes one case-local `example.tsx` root per case.
  Conformance adapters import that public definition, while the docs runtime
  supplies its own hidden React mount entry and rejects any relative import
  that leaves the case directory. `pnpm catalog:examples:check` validates all
  188 public roots, their default exports, definition-first source order,
  adapter ownership, unused source, and isolated relative source closures. The
  largest public TypeScript closure contains four files. The shadcn generator
  prunes unused variant helpers before writing each public example, while
  hidden catalog adapters retain deterministic preview framing and focus.

### F-025 — Bundle maintenance clobbered the full comparison report

- Status: resolved
- Severity: medium
- Owner: Tooling/API
- Observed in: tiered cross-library benchmark validation
- Friction: `benchmark:check` and `benchmark:update-baseline` wrote their
  size-only result to the canonical comparison paths. Running normal
  verification after a full browser matrix silently discarded the mount,
  update, and output-complexity measurements.
- Decision: baseline maintenance commands report their own result without
  writing the canonical comparison files. Explicit size and browser benchmark
  commands still write the selected facets. Baseline checks write a separate
  complete candidate file; pinned CI uploads it on failure or explicit manual
  request so an intentional change can use the canonical runner measurements.
- Verification: the bundle baseline passes without changing the restored
  standard comparison report, and its candidate artifact includes passing
  references as well as failures that appear in the concise console output.
  Linux x64/Node 24.18.0 measurements confirmed that the renderer-neutral SVG
  host added 2,811–2,849 minified bytes across the 12 TanStack fixtures while
  polar, geo, and canvas modules retained zero bytes. The reviewed values now
  form the canonical baseline without widening its 3%/512-byte tolerance.

### F-026 — Facet rollup tables did not explain the overall result

- Status: resolved
- Severity: medium
- Owner: Tooling
- Observed in: review of the tiered cross-library benchmark report
- Friction: each measurement facet had a normalized summary table, but the
  report still required a reader to interpret several hundred values and
  combine capability, bundle, timing, and renderer caveats themselves.
- Decision: derive a short narrative from the same JSON summaries and place it
  at the top of every Markdown report. Store the paragraphs in
  `narrativeSummary` so downstream reports can reuse them without scraping
  Markdown.
- Verification: the standard report summarizes all 60 library/chart/tier cases
  and 120 browser scenarios before the detailed facet tables.

### F-027 — Pnpm validation attempted an interactive purge

- Status: resolved
- Severity: low
- Owner: Tooling
- Observed in: Octane showcase demo validation and the `0.0.1`
  release-evidence audit
- Friction: `pnpm exec prettier` attempted to remove and reinstall the existing
  workspace modules, then aborted because validation ran without a TTY. The
  already-installed Prettier, TypeScript, Vite, and Vitest binaries worked
  directly without changing dependencies.
- Expected: repository formatting, build, typecheck, and test commands run
  non-interactively against the existing install.
- Decision: pin the repository package manager and lockfile, then use the
  documented pnpm scripts against that install rather than bypassing package
  management with ad hoc binary paths. Keep CI mode consistent between install
  and validation: pnpm 11 changes `enableGlobalVirtualStore` under CI, so
  mixing a CI install with a non-CI `pnpm exec` correctly reports the install
  as incompatible.
- Verification: repeated `pnpm exec prettier`, TypeScript, Vitest, Vite,
  benchmark, bundle, catalog, and conformance commands had run
  non-interactively without requesting a module purge. The polar/geo task
  reproduced the warning after a CI install followed by a non-CI exec;
  `pnpm_config_verify_deps_before_run=warn` identified the changed global
  virtual-store setting, and consistently using `CI=true` restored all
  documented commands without another purge. The release-evidence worktree
  reproduced the non-TTY abort with pinned pnpm `11.15.1`; its already-installed
  Prettier `3.9.6` binary verified the changed Markdown without mutating the
  install.
- Follow-up: identify why the current worktree install mode differs from the
  non-CI validation mode, then make documented checks preserve that mode
  without an implicit purge.

### F-028 — Field channels accepted incompatible value types

- Status: resolved
- Severity: high
- Owner: API
- Observed in: public type-safety audit
- Friction: a numeric channel accepted any existing datum key, including a
  boolean field, and failed only by filtering every value at runtime.
- Decision: field-name channels now include only keys whose values satisfy the
  channel contract. Accessors remain the explicit derivation path.
- Verification: compile-time contracts accept numeric, categorical, and date
  fields while rejecting boolean and missing fields without assertions.

### F-029 — Dynamic hosts allowed omitted input

- Status: resolved
- Severity: high
- Owner: API
- Observed in: core, React, and Octane adapter type audit
- Friction: `input` was optional even when the definition was dynamic, so a
  chart could compile and then receive `undefined`.
- Decision: host and adapter options are correlated static/dynamic unions.
  Dynamic definitions require their inferred input; static definitions reject
  it. The DOM boundary also guards untyped JavaScript callers.
- Verification: core, React JSX, and Octane TSRX contracts reject missing,
  extra, and incorrectly shaped input, including dynamic definitions whose
  input type is `undefined` or `void`. `ChartHost.update` retains the same
  correlation, callback datum inference remains exact, and a widened
  static-or-dynamic definition must be narrowed before use. Runtime tests cover
  mount and update. Without `exactOptionalPropertyTypes`, TypeScript still
  permits explicit `input: undefined` on a static definition; non-undefined
  static input is rejected.

### F-030 — Heterogeneous dynamic marks erased datum types

- Status: resolved
- Severity: high
- Owner: API
- Observed in: the Stats history/latest definition migration
- Friction: conditional chart branches with different datum types widened
  callbacks to `unknown`, forcing explicit mark generics or datum guards.
- Decision: `defineChart` infers the complete returned specification and
  derives the callback datum union from its marks. Positionless rules contribute
  `never` because they emit no interaction points.
- Verification: Stats uses no definition annotation or consumer assertion, and
  a compile-time contract preserves an exact heterogeneous datum union.

### F-031 — Positional scales were disconnected from channels

- Status: resolved
- Severity: high
- Owner: API
- Observed in: D3-native authoring type audit
- Friction: a string channel could be paired with a linear scale and a date
  channel with a band scale despite both sides being statically known.
- Decision: built-in marks with provable positional semantics carry phantom
  x/y output types. Point-coordinate and scale-domain phantoms are independent:
  they default to the same values for ordinary marks, while rectangles and
  cells infer every materialized endpoint for scale compatibility without
  misrepresenting their runtime focus-point value. `ChartSpec` links the scale
  phantoms to configured D3 scales and axis formatters, widening literals to
  their normal string, number, or Date type. Bare `ChartSpec`, custom marks,
  facets, and explicitly widened mark options remain intentionally broad.
  `ChartScale` remains the explicit advanced unchecked scale escape hatch.
- Verification: compile-time contracts infer band/string, linear, UTC,
  implicit-index, static, dynamic, and heterogeneous definitions and reject
  swapped configured scales without consumer casts. Separate positive
  contracts prove that specialized specs pass through facets, optional
  rectangle endpoints remain inferred, widened rectangle options remain
  compatible, and custom marks and `ChartScale` retain the unchecked path.
  Public `ChartMarkPointX`/`ChartMarkPointY` helpers expose interaction values
  separately from `ChartMarkScaleX`/`ChartMarkScaleY`. The explicit helpers
  ship from the advanced
  `mark/scale-values` subpath: exporting them from the ergonomic root changed
  esbuild symbol ordering by 1–5 gzip bytes despite erasing at runtime, so the
  exact ordinary-bundle gate rejected that shape.
  Negative contracts reject incompatible rectangle and cell scales. The
  catalog's size-only strict audit rejects all eight known-invalid TanStack
  programs without suppressions, including categorical rectangle endpoints on
  a linear scale. The separation is declaration-only and adds no runtime
  statements.
- Remaining edge: the parallel-coordinates case showed that a categorical
  literal union is widened to `string` before axis compatibility is checked.
  This keeps `scaleBand<string>` ergonomic but rejects the equally valid
  `scaleBand<ParallelMetric>`. The AI guide and compact documentation map now
  state the required `scaleBand<string>()` boundary so agents do not cast or
  repeatedly debug it. This documented boundary is accepted for the current
  grammar; reopen the finding if authoring evidence justifies accepting both
  narrow and widened domains without weakening incompatible-scale rejection.

### F-032 — Memoized adapter internals erase generic types

- Status: resolved
- Severity: low
- Owner: API
- Observed in: React and Octane adapter type audit
- Friction: the memoized rendering surface stores definitions and runtimes in
  a non-generic component boundary, requiring two contained internal
  assertions per adapter. Public definitions, props, callbacks, and input
  remain inferred.
- Decision: move generic runtime ownership into the shared
  `@tanstack/charts/adapter` controller. The memoized framework surfaces now
  receive only prerendered markup and retain no definitions or runtimes.
- Verification: React and Octane compile without the private definition or
  runtime assertions, preserve public inference, and pass their adapter tests.

### F-033 — Point coordinate values remain broad

- Status: resolved
- Severity: medium
- Owner: API/Documentation
- Observed in: callback type audit
- Friction: `point.datum` is exact, but `point.xValue` and `point.yValue` remain
  `ChartValue`, so direct coordinate use may require normal TypeScript
  narrowing.
- Decision: derive point-coordinate types from the x/y phantom types already
  carried by marks and propagate them through inferred definitions, scenes,
  runtimes, focus and spatial protocols, DOM hosts, React, and Octane.
  Positionless marks contribute no point-coordinate type. Public generics keep
  broad defaults for explicitly erased or custom boundaries, while ordinary
  consumers specify no new generics and use no assertions.
- Verification: strict compile contracts cover string, number, and Date
  coordinates; heterogeneous x/y unions; grouped focus; tooltip, focus,
  selection, render, and spatial callbacks; static and dynamic host updates;
  and React and Octane adapter inference. Core and React pass 90 focused tests,
  both Octane matrices pass four tests, and the AI guide now teaches inferred
  coordinates and normal union narrowing. The emitted change is
  declaration-only with no runtime statements added.

### F-034 — Text color and offset required mark duplication

- Status: resolved
- Severity: medium
- Owner: API
- Observed in: Plot catalog multi-line end labels and labeled heatmap
- Friction: `text.fill` accepted only one constant color, text had no
  categorical color channel, and labels could not apply a pixel offset. The
  multi-line case needed one filtered text mark per series to retain its color;
  the heatmap needed two filtered marks solely for contrast; direct end labels
  could not move clear of their final point.
- Expected: one text mark maps datum-driven literal color or a supplied color
  scale, and can apply constant `dx`/`dy` without changing data-space values.
- Decision: text accepts a literal-color accessor or `z` backed by the chart
  color scale, and constant `dx`/`dy` offsets are applied after positional
  scales. Group identity and resolved color survive in interaction points.
- Verification: the multi-line case now uses one colored endpoint text mark;
  the heatmap uses one contrast-color accessor instead of two filtered marks.
  Focused mark tests cover resolved categorical colors and pixel offsets, and
  strict TypeScript passes without assertions.

### F-035 — Plot legends confused the primary SVG measurement

- Status: resolved
- Severity: medium
- Owner: Tooling
- Observed in: Observable Plot catalog conformance runner and gallery
- Friction: Plot can emit a small legend or swatch SVG before the chart SVG.
  Selecting the first `svg` therefore measured the swatch as the primary
  visualization, undercounted total SVG output, and compared chart labels
  against the wrong bounds.
- Expected: geometry, accessibility, output size, and guide containment reflect
  the complete renderer output without assuming either library emits one SVG.
- Decision: choose the largest rendered SVG as the primary chart, sum the
  serialized bytes of every SVG, and test every SVG text element against the
  chart container. Exclude labels whose computed display, visibility, or
  opacity makes them non-rendered; a hidden SVG text node has no containment
  contract. Plot legends intentionally allow endpoint labels to overflow their
  small owner SVG while remaining visible inside the container.
- Verification: the runner and gallery now aggregate every emitted SVG, while
  primary geometry uses the chart-sized SVG and multi-SVG legend labels are
  checked against the same container-level visibility contract as chart
  labels. The label-free Recharts sunburst can now use `display: none`
  directly instead of zero-size transparent text.

### F-036 — Presence-only visual checks overstated parity

- Status: resolved
- Severity: high
- Owner: Tooling
- Observed in: first review of the Observable Plot catalog screenshots
- Friction: the gate treated one primitive as sufficient regardless of the
  expected count, normalized geometry against each mark's own bounds, and did
  not associate categorical labels with positions. A five-bin Plot histogram
  therefore passed a seven-bin expectation, reordered bars looked equivalent,
  and repeated facet axes were invisible to the report.
- Decision: enforce expected primitive counts as minima, normalize diagnostic
  geometry against the chart SVG, and allow cases to assert categorical guide
  sequences, maximum label repetition, and corresponding computed data-mark
  paints. Paint comparison canonicalizes computed `rgb()`/`rgba()` and
  driver-reported three-, four-, six-, or eight-digit hex colors. Equivalent
  interpolation output may differ by one channel unit because Plot and direct
  D3 scale paths round colors differently.
- Verification: the corrected histogram boundary contract renders all seven
  bins, explicit bar domains preserve category order, paired paints pass for
  all implemented cases, and the Anscombe case now fails specifically because
  Charts repeats its shared y-axis four times. The ECharts polar line and
  scatter drivers report hex colors while TanStack inspection reads computed
  RGB; both now pass the six-variant standard paint gate without case-specific
  color rewriting.

### F-037 — Facets repeat shared axes in every panel

- Status: resolved
- Severity: medium
- Owner: API
- Observed in: Anscombe quartet catalog comparison
- Friction: `facet` compiles every panel as a complete nested chart. With shared
  domains, Charts emits the same y-axis in all four panels while Plot emits one
  shared outer y-axis. The repeated labels consume space and weaken the default
  small-multiple layout.
- Decision: facets with compatible resolved scales now own guides at their
  outer edges by default. The facet reserves one measured outer guide band,
  gives every cell the same inner plot width and height, retains each cell's
  grid, draws y axes only on the left edge and x axes only on the bottom edge,
  and emits each shared axis title once. `axes: "cell"` explicitly restores
  complete per-panel guides for independent scales. Outer mode rejects
  differing domains, tick labels, directions, guide options, guide themes,
  manual cell margins, and per-cell legends instead of displaying a
  misleading shared axis. Its guide prepass preserves initialized channels but
  suppresses mark rendering, so data marks render only once.
- Verification: focused facet tests cover one shared y guide, bottom x guides,
  single shared titles, equal inner plot spans, explicit independent cell
  axes, a render-free guide prepass, and an actionable incompatible-scale
  error. All 73 core tests pass.
  The standard Anscombe matrix passes its count, paint, containment,
  accessibility, and maximum-label-repetition gates at 320, 640, and 960
  pixels in light and dark mode, with 99.0% diagnostic geometry similarity,
  clean strict types, and a 20.11 kB versus 83.54 kB gzip pair.

### F-038 — Plot and D3 threshold arrays mean different things

- Status: resolved
- Severity: medium
- Owner: Documentation
- Observed in: paired histogram catalog case
- Friction: Plot treated an explicit threshold array as the complete bin
  boundary sequence, while `d3.bin().thresholds(array)` treated the same values
  as interior cuts inside its configured domain. Passing `[30, …, 80]` to both
  produced five Plot bins and seven D3 bins over `[20, 90]`.
- Density evidence: Plot exposes density thresholds in readability units that
  are 100 times the underlying `d3-contour` density. Passing the same explicit
  values to `Plot.density` and `contourDensity().thresholds(...)` therefore
  produced different level sets.
- Decision: describe bins in terms of a complete boundary sequence. Plot
  receives the sequence directly; D3 receives the first and last values as its
  domain and the interior values through `thresholds`. Plot density fixtures
  retain Plot's readability units. The first-party `densityContour` mark uses
  `d3-contour`'s weighted-observations-per-CSS-pixel-squared unit directly, so
  the factor of 100 never leaks into the Charts API.
- Verification: the paired case now renders seven bins on both sides, and the
  migration recipe records the conversion without custom bin math. The paired
  density case passes six native thresholds to `densityContour`; only its Plot
  fixture retains the corresponding values multiplied by 100.

### F-039 — Dots could not express stroke opacity

- Status: resolved
- Severity: low
- Owner: API
- Observed in: bubble scatter catalog comparison
- Friction: the Plot reference used a subtle outline, but `dot` exposed
  `stroke` and `strokeWidth` without `strokeOpacity`, making every TanStack
  outline visibly darker.
- Decision: add `strokeOpacity` to `DotOptions` and pass it through the existing
  scene style and SVG renderer.
- Verification: the scatter case now uses the same `0.28` opacity, and the
  composite mark test verifies both scene dots retain the option.

### F-040 — Bundle ceilings allowed silent universal growth

- Status: resolved
- Severity: high
- Owner: Tooling
- Observed in: expanding the Plot conformance catalog with optional marks
- Friction: the package bundle check used gzip ceilings with enough unused
  headroom for optional feature work to add code to every ordinary chart
  without failing. Several direct D3 composition entries were measured but
  had no product budget.
- Decision: every package measurement now declares one of three policies.
  Ordinary scene, SVG, DOM, React, custom-scale, and representative-mark
  consumers are byte-locked. Optional features have isolated gzip budgets;
  comparison and exploratory kernels remain measurement-only. Baseline
  changes require an explicit reviewed command, including decreases, so saved
  bytes cannot become silent future headroom. Input-boundary checks use only
  modules with retained output bytes, so an imported-but-eliminated module
  cannot create a false pass or failure. The compact React line has a hard
  reviewed ceiling; tooltip and portal are measured as separate increments.
- Verification: repeated builds match the exact minified and gzip baseline.
  `pnpm bundle:check` passes the locked consumers and the tightened histogram,
  facet, curve, time, transform, spatial, arrow, frame, link, and tick feature
  budgets. The reviewed focus-cleanup and per-axis-guide change reduced every
  locked minified entry by 133–250 bytes; gzip fell by 14–29 bytes for static
  scenes and rose by 43 bytes for the DOM host, 35 bytes for the React
  adapter, and 21 bytes for the React line consumer. Those exact results are
  now locked rather than hidden inside unused ceiling headroom. The canonical
  byte lock runs on pinned Ubuntu 24.04 and Node 24.18.0; this prevents runner
  and compressor upgrades from masquerading as library-size changes. The
  bundle-reduction work locks the compact scene at 6,711 gzip bytes and its
  React consumer at 14,227. Tooltip adds 3,381 bytes and portal adds another 806. Retained-output assertions prove the base excludes tooltip, portal,
  React tooltip composition, and the D3 scale/format/interpolate stack.
  Replacing the core-owned D3 ordinal default required reviewed 0.05 KiB
  adjustments to the tick and polar-composition feature ceilings; all other
  policy changes are exact locks or new isolated budgets.
- Follow-up evidence: merging the declarative-mark audit with the cursor,
  crosshair, controlled-focus, and live-viewport work preserved both sets of
  default runtime contracts. The old branch-local ceilings then produced 33
  failures even though retained-input checks still proved that optional marks,
  transforms, layouts, interactions, and D3 dependencies remained isolated.
- Follow-up decision: regenerate the ten exact universal locks from the merged
  runtime and set every affected product or isolated-feature ceiling tightly
  above that reviewed output. Keep policy kinds, relative baselines, required
  and forbidden input groups, and added-module allowlists unchanged.
- Follow-up verification: all 145 bundle entries pass. The compact scene is
  10.28 KiB gzip under 10.3 KiB, its React consumer is 26.48 KiB under 26.6
  KiB, coordinated views add 5.31 KiB under 5.35 KiB, and the audited DOM-host
  increments are 0.09 KiB for signals, 2.55 for legends, 3.75 for cursors,
  3.65 for handles, 19.71 for brush, and 20.28 for zoom. Required/forbidden
  input groups and relative ownership boundaries remain unchanged.

### F-041 — Bounded segments and caps required custom marks

- Status: resolved
- Severity: high
- Owner: API
- Observed in: error-bar, boxplot, lollipop, dumbbell, and candlestick catalog
  cases
- Friction: `ruleX` and `ruleY` intentionally span the complete chart, while
  rects cannot represent a zero-width segment. These common recipes otherwise
  required case-local `createMark` implementations and repeated bandwidth
  math for caps.
- Decision: add tree-shakeable `link` and `tickX`/`tickY` marks over the
  existing rule scene node. Link owns typed endpoint channels and interaction
  identity; ticks derive their default length from the perpendicular band
  scale and accept an explicit pixel length. Repeated statistical composition
  is a separate boundary: `boxRows` eagerly turns arbitrary source rows into
  Tukey summary and outlier rows with direct lineage, while `boxX` and `boxY`
  reuse that transform and render through native link, bar, tick, and dot
  children. The Tukey operation stays atomic; separate quartile, fence,
  whisker, and outlier calls could still drift after independent filtering.
- Shared contracts: box marks reuse the same private sorted-quantile kernel as
  the public quantile reducer, the established grouped-index and source-lineage
  conventions, and the generic child-mark composition kernel. They add no
  second interval primitive or renderer path.
- Verification: the five bounded-segment catalog families pass initial and
  updated responsive geometry, paint, containment, accessibility, and
  strict-type checks. Focused box tests cover exact quartiles and Tukey
  whiskers, singleton and zero-IQR groups, invalid values, horizontal
  transposition, global outlier order, raw-row lineage, repeated
  initialization, derived motion data, and one summary interaction target per
  group. Case 15 now passes raw Morley observations directly to `boxY` with no
  case-owned quantile or summary module. Isolated link, tick, and box consumers
  protect their respective bundle boundaries while byte-locked ordinary
  consumers remain unchanged.
- Preparation follow-up: direct `boxRows` tests prove field and accessor input,
  exact equivalence with both convenience marks, precise category inference,
  immutable source data, invalid-group handling, aggregate and single-row
  lineage, and the absence of presentation-only mark keys. Root, universal,
  and exact-subpath exports expose the same eager transform.

### F-042 — Hoisted host tooltip options lose callback context

- Status: resolved
- Severity: low
- Owner: Documentation/API
- Observed in: pointer and grouped-tooltip catalog cases
- Friction: an inline `mountChart` options literal infers the tooltip datum,
  but assigning the literal to a local variable before the call removes
  contextual typing from `tooltip.format` and `formatGroup`. Strict TypeScript
  then requires a `ChartPoint<Row>` parameter annotation. During ordered-item
  design, a shared callback name with different value parameters across the
  channel, field, and derived-item union caused the same loss inside an inline
  `items` array.
- Current decision: ordered items use one uniformly typed
  `text(point, context)` callback, preserving contextual datum and coordinate
  types for every item kind. The extension form
  `{ use: tooltip, format(point) {} }` remains inside `defineChart`, so the
  definition supplies contextual datum and coordinate types at the exact
  option location. For a separately hoisted complete tooltip object, document
  an explicit `ChartTooltipOptions` annotation as a normal type-introduction
  boundary; never recommend a cast.
- Follow-up: if raw-host examples repeat this pattern, add a small
  definition-correlated options helper rather than weakening callback types.

### F-043 — Streamgraph layout escaped the native stack

- Status: resolved
- Severity: medium
- Owner: API/Documentation
- Observed in: streamgraph catalog case
- Friction: Charts exposed a tidy-row `wiggle` stack but not inside-out order or
  a zero-origin policy. The case therefore pivoted 1,708 observations into
  wide rows, invoked D3, rebased every interval, cloned source records, and fed
  explicit endpoints to `areaY`.
- Research: Observable Plot is not D3 wiggle with only a different origin. Its
  sparse handling, equal-peak ordering, and baseline phase also differ. The
  compatibility target is the existing TanStack/D3 recipe, not exact Plot
  endpoints.
- Decision: `StackOrder` includes `inside-out` and delegates its peak/tie and
  balancing semantics to D3's exported `stackOrderInsideOut`. `wiggle` keeps
  D3's dense zero-imputed layout, then shifts the completed matrix once so the
  global minimum generated start is zero. The order stays explicit, and
  wiggle is documented for nonnegative layers.
- Shared boundary: `stackExtents` applies the same policy to `areaY`, `areaX`,
  `barY`, `barX`, `stackRowsY`, and `stackRowsX`. Positions and series remain
  first-seen. Missing cells influence layout as zero but emit no synthetic row
  or interaction point. Reverse changes geometric order without changing
  returned row order or lineage.
- Verification: focused tests cover canonical and reversed endpoints, sparse
  cells, duplicate rejection, first-seen positions, zero origin, thickness,
  transposition, and source indexes. Case 21 consumes the untouched industry
  rows and retains all 1,708 raw datum identities. Browser conformance passes
  the six responsive/theme scenarios with clean types, 93.8% diagnostic
  geometry, 54 authored lines, and 37.73 KiB gzip versus Plot's 53 lines and
  91.65 KiB. The exact stack transform is 2.25 KiB gzip under its reviewed
  2.30 KiB budget; intentional shared stack growth is recorded in the
  representative-mark baseline.

### F-044 — Difference fills require explicit crossing interpolation

- Status: resolved
- Severity: medium
- Owner: API/Documentation
- Observed in: actual-versus-forecast difference catalog case
- Friction: mapping two series directly to `areaY` produces an overlapping
  ribbon, not semantic positive and negative lobes. Correct output requires
  finding every sign change, linearly interpolating its exact crossing, and
  duplicating that boundary into the adjacent positive and negative segments.
  The first recipe assigned a segment to every sample; consecutive samples
  with the same sign therefore produced degenerate one-point paths instead of
  one contiguous lobe.
- Decision: add granular `differenceY` and `differenceX` composite marks. They
  accept the two boundary channels directly, classify semantic positive and
  negative runs, and render decorative area children plus two interactive raw
  boundary lines. Crossings resolve after final x/y scales: the mark intersects
  the straight rendered segments in screen space, then inverts that point back
  to semantic values. Both positional scales must support inversion. This keeps
  fills exact under log, power, symlog, reversed, numeric, and temporal scales
  instead of silently assuming affine data-space interpolation.
- Shared boundary: Difference reuses the resolved-layout adoption seam first
  established for Hexbin and Delaunay, then composes ordinary `areaX`/`areaY`,
  `lineX`/`lineY`, composite namespacing, child interaction filtering, motion,
  grouping, inferred keys, and transform lineage. Case 33 also replaces its
  private rolling reducer with the same grouped `window(..., reduce: "mean")`
  contract used by the moving-average and Bollinger cases. Regression shares
  the composition and transposed marks, but none of Difference's crossing math.
- Verification: focused tests cover exact linear, Date, and nonlinear log
  crossings in both orientations; zero plateaus; invalid semantic and mapped
  gaps; grouped series; stable lobe keys; fill suppression; raw line identity;
  states; motion; lineage; and non-invertible scale errors. Case 33 contains no
  lobe geometry or custom rolling reducer and passes responsive browser visual,
  geometry, paint, containment, accessibility, and strict-type gates at 89.8%
  diagnostic geometry, 68 authored lines, and 42.90 KiB gzip versus Plot's 89
  lines and 92.70 KiB. The isolated Difference fixture is 23.03 KiB gzip, a
  6.37 KiB increment under its 6.5 KiB cap. Exact package, universal types,
  packed runtime, documentation, TypeScript, and bundle-isolation gates pass.

### F-045 — Arrow endpoints could not express pixel-space vector fields

- Status: resolved
- Severity: medium
- Owner: API
- Observed in: vector-field catalog case
- Friction: `arrow` correctly maps both endpoints through chart scales, but
  direction fields need a scaled anchor plus per-datum pixel length and
  rotation. Converting pixel lengths into data units would vary with viewport,
  domain, and measured plot bounds.
- Decision: add an optional `vector` mark with typed anchor, length, rotation,
  grouping, and identity channels. It shares the arrowhead geometry helper but
  remains a separate tree-shakeable entry point. Zero degrees points up,
  rotation is clockwise, and start, middle, and end anchors are explicit.
- Verification: the native vector-field pair passes at 320 and 640 pixels with
  96.4% diagnostic geometry similarity, clean strict types, and 0.22× Plot
  gzip. Its isolated static-SVG consumer is 13.49 kB gzip; byte-locked ordinary
  consumers remain unchanged.

### F-046 — Mirrored labels required duplicate text marks

- Status: resolved
- Severity: medium
- Owner: API
- Observed in: tidy hierarchy tree catalog case
- Friction: tree branches and leaves need opposite anchors and pixel offsets,
  but `text.anchor`, `dx`, `dy`, and `rotate` accepted constants only. The same
  node rows had to be filtered into two otherwise identical text marks.
- Decision: allow typed accessors for these presentation channels while
  retaining their constant shorthand. The change remains isolated to consumers
  that import the text mark.
- Verification: the hierarchy case now maps all ten labels through one text
  mark with inferred node types. Focused tests verify per-row anchor, rotation,
  and offset output.

### F-047 — Unique Delaunay edges are not obvious from halfedges

- Status: resolved
- Severity: medium
- Owner: API/Documentation
- Observed in: Delaunay spatial-network catalog case
- Friction: `d3-delaunay` exposes triangles, halfedges, and hull indexes rather
  than a ready-made unique edge list. A correct link recipe must take one side
  of each paired halfedge and separately close the convex hull. The recipe also
  triangulated raw weight and economy units. Final x/y pixel ranges are
  anisotropic, so 8 of 63 revision-zero edges changed at a representative
  resolved aspect ratio even though the total edge count stayed constant.
- Decision: keep Delaunay optional, but expose a first-party granular
  `delaunayLink` mark that accepts source points and runs against resolved
  screen coordinates. The definition-coverage audit found repeated final-scale
  or final-bounds work in Delaunay, density, hexbin, dodge, Voronoi, and waffle
  cases; the case-owned extraction is implementation evidence, not the target
  authoring API. The private kernel derives adjacency from triangle and hull
  edges and emits each undirected pair once. This avoids both copied halfedge
  arithmetic and `delaunay.neighbors()` ending before every real triangle edge
  is visited on numerically damaged inputs. Source `z` partitions topology.
  Each partition is ordered by stable point key before
  triangulation because D3 otherwise resolves cocircular and coincident ties
  from input order. Presentation and motion accessors receive a derived edge
  datum with both endpoint rows, indexes, keys, and semantic coordinates
  instead of inheriting an arbitrary endpoint's channels.
- Verification: case 37 now passes source cars directly to `delaunayLink` and
  contains no D3 import, prepared endpoint DTO, copied scale, or manual edge
  loop. Every 320/640/960 light/dark variant renders 63 matching links and
  clears the 63-link geometry floor. The matrix passes visual review at 97.5%
  mean diagnostic geometry, produces clean strict types, and is 0.41× Plot
  gzip. Focused tests cover
  final-aspect-ratio diagonal changes, complete-pair domains, categorical and
  temporal scales without inversion, `z` isolation, facets, stable endpoint
  keys, input-reordered cocircular and coincident ties, interaction midpoints,
  raw-row lineage, and empty, singleton, two-point, coincident, and collinear
  inputs. The isolated mark adds 8.16 KiB gzip over native links within its
  8.25 KiB ceiling, of which 7.14 KiB is the Delaunay kernel. Retained
  input and packed-consumer gates keep Delaunay and its transitive geometry
  dependencies out of root, universal, ordinary-link, representative, and
  adapter bundles.

### F-048 — Responsive waffle packing cannot see final inner bounds

- Status: resolved
- Severity: low
- Owner: API/Documentation
- Observed in: responsive waffle unit-chart catalog case
- Friction: data preparation receives requested outer width and height, while
  the mark's final inner bounds are known only after guide and legend layout.
  The recipe can choose a near-square grid but cannot guarantee the same cell
  aspect ratio after a top legend consumes space.
- Decision: the repetition threshold is met for deterministic mark-local work
  after positional scales and final inner bounds resolve. `createMark` now
  supports a pure `resolveLayout` result when a mark must contribute final color
  channels, labels, derived states, or a child render closure before rendering,
  without restoring a reactive `prepare` graph. Initial channels remain the
  only positional-domain input. Voronoi establishes the narrower boundary: an
  ordinary render callback already has final scales and bounds, so geometry
  that contributes no derived channels or focus points does not need the
  resolved-layout lifecycle.
- Decomposition: `resolveLayout` is only the scheduling boundary. Projection is
  one smaller internal contract: per-axis helpers retain the source row and
  index while adding `xValue`/`x` or `yValue`/`y` without discarding mark-owned
  fields. `materializeLayoutXYRows` adds a shared complete-pair rule for
  two-axis consumers. Dodge uses one projector; hexbin, Delaunay, and Voronoi
  compose both. Voronoi uses those helpers during ordinary rendering, proving
  that projection is reusable independently of lifecycle scheduling. Delaunay
  also establishes direct child-mark adoption with hexbin:
  `adoptResolvedChildMark` forwards a non-layout child's channels, states,
  labels, and render closure while rejecting nested layout resolution. Indexed
  reduction remains separate. Algorithm kernels such as dodge, Delaunay,
  hexagonal binning, and waffle packing stay pure and named. This is not a
  universal layout callback or reactive transform graph.
- The waffle proof adds one reusable one-to-many identity rule: child geometry
  keys extend the source point key. State and motion lookup use the longest
  matching point-key prefix, so many tiles retain one source datum, index, and
  motion context without exposing derived tile rows.
- Verification: lifecycle tests cover bounded repeated resolution,
  final render-once behavior, derived color and legend inference, automatic
  labels, immutable positional domains, derived state rows, and source
  lineage. The first screen-space reducer proof, case 43 `hexbin`, passes the
  standard 320/640/960 light/dark conformance matrix at 99.5% diagnostic
  geometry similarity with clean strict types. The reviewed compiler baseline
  adds at most 255 gzip bytes; `d3-hexbin` remains absent from the ordinary
  hexagon bundle. Case 41 now accepts the 26 source frequency rows directly,
  allocates cumulative units, and fits square cells from final bounds after its
  legend resolves. Focus, state, motion, and geometry retain the original row
  identity instead of exposing 100 derived cell rows. Its 320/640/960
  light/dark conformance matrix passes with clean strict types; the isolated
  mark adds 1.50 KiB gzip over the frame fixture and retains no D3 geometry.
  Dodge projects one measured axis; hexbin, Delaunay, and Voronoi compose both
  projectors. Delaunay adopts native `link` through the same narrow helper that
  hexbin uses for `hexagon`. Voronoi directly emits structured areas during
  ordinary rendering because it derives neither channels nor focus points. All
  retain semantic and pixel anchors without copied scales in case code.
- Follow-up: preserve a hexbin bin's direct pixel center during rendering
  before migrating density, avoiding its remaining
  invert-to-semantic-to-map round trip. Keep Delaunay relation and Voronoi cell
  kernels private until another visible topology mark proves a broader
  boundary.

### F-049 — Plot hexbin width and d3-hexbin radius use different units

- Status: resolved
- Severity: medium
- Owner: Documentation/Skills
- Observed in: hexagonally binned density catalog case
- Friction: Plot's `binWidth` is the horizontal distance between neighboring
  centers, while `d3-hexbin.radius` is the center-to-vertex radius. Passing half
  the Plot width to D3 changed bin membership and the resulting color
  thresholds even though the rendered hexagon radius matched.
- Decision: `@tanstack/charts/spatial/hexbin` accepts Plot-style `binWidth` and
  converts internally with `radius = binWidth / sqrt(3)`. Rendered hexagon
  radius remains a separate option because it controls the visible gap. The
  mark owns final-scale mapping and inversion, reducer outputs, stable keys,
  interaction points, and raw-row lineage.
- Verification: case 43 now passes raw observations directly to the mark and
  contains no copied scale, manual extent, inverse mapping, or bin DTO. The
  standard paired matrix passes at 99.5% diagnostic geometry similarity with
  matching threshold paints and clean strict types. The isolated spatial
  bundle is 17.66 kB gzip, 1.47 kB above the existing hexagon scene and below
  its 2 kB incremental budget; retained-input gates keep `d3-hexbin` out of the
  ordinary hexagon bundle.

### F-050 — Plot proportion units depend on transform scope

- Status: resolved
- Severity: medium
- Owner: Documentation/Skills
- Observed in: faceted distribution catalog case
- Friction: Plot's percentage display uses transformed values in `[0, 100]`,
  and `proportion` normalizes globally while faceted histograms generally need
  `proportion-facet`. Treating either output as a fraction produces incorrect
  domains or comparisons between panels.
- Decision: keep normalization scope explicit in the transform definition.
  Case 51 groups `binX` by `species`, then calls `normalize` with the same
  group, `basis: "sum"`, and `as: "proportion"`. The resulting fractions use
  a `[0, 0.4]` domain and `Intl.NumberFormat` percent labels. No facet-specific
  reducer or prepared bin DTO is needed; Plot's `[0, 100]` percentage units
  remain a reference-library distinction rather than a Charts API contract.
- Shared boundary: `binX` owns fixed thresholds, counts, and aggregate source
  lineage. `normalize` owns the per-species denominator and retains each bin as
  its immediate source. `facet` owns the responsive panels. Explicit species
  order, fixed domains, percent wording, and empty-bin display policy remain
  authored meaning.
- Verification: focused revision tests cover 16 nonempty bins, explicit facet
  order, fixed 500-gram boundaries, exact per-species counts and sums, and
  nested identity from normalized rows through aggregate bins to raw penguins.
  The TanStack source contains no D3 bin import or preparation helper. Quick
  browser conformance passes responsive visual, geometry-count, paint,
  containment, accessibility, and strict-type gates at 35.71 KiB gzip versus
  Plot's 87.89 KiB, with 95 authored lines versus 56.

### F-051 — Beeswarm layout is responsive pixel-space preparation

- Status: resolved
- Severity: medium
- Owner: API/Documentation
- Observed in: beeswarm distribution catalog case
- Friction: collision radii are pixels, while the input measure and rendered
  coordinates are data-space values. A direct D3-force composition must map
  through explicit responsive scales, settle the simulation synchronously, and
  invert displaced positions back into chart values.
- Decision: add tree-shakeable `dodgeX` / `dodgeY` dot layouts on the
  resolved-layout lifecycle from F-048. A greedy dodge preserves the measured
  coordinate exactly and avoids teaching authors a heavier force simulation.
  Radius stays configured once on `dot`; the layout resolver receives final
  plot bounds, scaled measured positions, and final pixel radii.
- First-principles follow-up: expose that narrow seam as `createDotLayout`.
  Authors choose the derived axis and semantic anchor, then return one final
  coordinate per materialized row from `DotLayoutResolveContext`. The utility
  validates the public descriptor while `dot` retains scheduling, row
  identity, interaction, state, and motion. This is reusable custom placement,
  not an arbitrary resolved-mark lifecycle or a second renderer API.
- Verification: case 52 now passes source cars directly to `dot` with
  `layout: dodgeY(...)`; it owns no force simulation, parallel scale, inverted
  coordinate, or positioned DTO. The full 320/640/960 light/dark matrix passes
  at 99.8% mean diagnostic geometry similarity with clean strict types and
  0.35x Plot gzip. Focused tests protect exact measured positions, every
  anchor, variable radius, categorical scales, invalid-row lineage, stable
  identity, state and motion ownership, transposition, deterministic repeats,
  and facet-local layout. The isolated feature adds 0.57 KiB gzip over an
  ordinary dot chart and retains no `d3-force`. The reviewed shared dot
  integration moves the representative gzip baseline by 650 bytes;
  retained-input gates keep the dodge kernel out of ordinary dot and
  representative bundles. Randomized review matched Observable Plot placement
  across 1,000 seeds and found no collisions across another 200 stress seeds.
  Dense identical inputs remain quadratic: 1,000 dots took roughly 0.5–0.8
  seconds and 2,000 took roughly 2–6 seconds, so an indexed neighbor query is
  the follow-up before documenting this layout for large swarms.
- Extension verification: focused tests cover custom x and y placement,
  responsive bounds, variable radii, output-length and finite-coordinate
  validation, raw-row identity, exports, and unchanged built-in dodge behavior.
  Consumers that do not instantiate a dot layout retain none of its resolver.

### F-052 — Ranking preparation depended on D3 callback overloads

- Status: resolved
- Severity: low
- Owner: API/Documentation
- Observed in: empirical CDF and bump-ranking catalog cases
- Friction: both definitions needed row-preserving ranks, but direct
  `d3-array` ranking accepted only projected numeric arrays cleanly and did not
  retain row lineage or grouped transform semantics.
- Decision: use the public typed `rank` transform with explicit value, group,
  order, and tie policies. It returns flat source-linked rows that remain valid
  mark data, so definitions do not project values into a parallel array or
  recover source identity afterward.
- Verification: the empirical CDF and bump-ranking definitions import public
  `rank`, compile strictly without assertions or D3 array imports, and retain
  source rows in their line, dot, and text marks. Focused transform tests cover
  grouped rank calculation and explicit ordering. Fresh quick browser
  conformance passes visual and strict-type gates at 97.9% and 96.3%
  diagnostic geometry similarity respectively.

### F-053 — Data-bound annotations can escape automatic guide margins

- Status: resolved
- Severity: low
- Owner: API/Documentation
- Observed in: multi-line end labels, slopegraph, indexed lines, connected
  scatter, extrema annotations, and grouped reducer bars
- Friction: removing redundant numeric domains exposed that automatic layout
  measured guides but not data-bound text. Labels at an inferred maximum
  escaped the top of the surface even though that margin side was unlocked.
  The bump-ranking conformance example later locked its right margin to the
  reference renderer's 160px heuristic, which left its longest direct label
  8.64px outside the surface under Ubuntu font metrics.
- Decision: built-in text marks expose their positioned labels to the existing
  monotonic margin solver. It measures anchors, `dx`/`dy`, rotation, font
  metrics, and responsive scale positions without calling mark render.
  Explicit margin sides and `margin: 0` remain locks; `clip: true` keeps clipped
  plots authoritative. Custom marks can opt in with `layoutLabels`.
  Content-dependent examples leave the relevant side unlocked instead of
  copying another renderer's fixed margin.
- Verification: focused core layout/text tests pass, mark render remains
  single-pass, and all six affected cases pass containment at 320 and 640 px
  across initial and updated data. The grouped/stacked ordering checks in the
  same scoped Chromium run also pass. Reusing the axis label-bound arithmetic
  keeps the isolated automatic text-margin cost to 219 minified bytes / 85 gzip
  bytes for the locked line scene and 524 minified bytes / 178 gzip bytes for
  the representative-mark entry, with no new dependency.
  The bump-ranking case passes 320px and 640px containment in local Chromium
  with its right margin resolved from the direct labels. Pull-request CI
  remains the cross-platform release gate.

### F-054 — D3 reducer output needs empty-safe narrowing

- Status: monitoring
- Severity: low
- Owner: Documentation/Skills
- Observed in: percentile-ribbon, lag-autocorrelation, and error-bars catalog
  cases
- Friction: `d3-array` quantiles correctly return `undefined` for empty groups,
  while chart channels require definite numeric summaries. Lag preparation is
  also clearer and less error-prone with `pairs` than with manual indexing.
- Decision: the public eager `groupBy` plus granular `quantile`
  reducer now owns grouped percentile output and source lineage. Use it beside
  `areaY` and `lineY` for the quantile ribbon. Keep adjacent lag preparation
  as an ordinary typed function and preserve explicit empty-result guards;
  this does not require a reactive transform graph. `deviation` is sample
  deviation and returns `NaN` for fewer than two finite values; an error-bar
  definition that wants a zero-width singleton interval keeps that fallback
  explicit in its authored reducer.
- Verification: Case 14 filters to contributing observations, groups once
  through public mean/deviation outputs, retains typed lineage, and tests its
  singleton policy without a summary DTO. Case 61 now groups the 1,708 raw
  industry observations once through public p10, p50, and p90 reducers and
  feeds the same 122 aggregate rows directly to ordinary area and line marks.
  Focused tests prove definite numeric output, empty-input and nonfinite-group
  behavior, quantile order, exact source indexes and object identity, D3
  interpolation parity, stable date keys, and source closure. Existing exact
  transform bundle gates pass. Browser conformance passes at 96.9% diagnostic
  geometry with clean visual and type gates; TanStack uses 50 authored lines
  and 38.34 KiB gzip versus Plot's 47 lines and 92.64 KiB.

### F-055 — Horizontal areas required renderer internals

- Status: resolved
- Severity: medium
- Owner: API
- Observed in: violin-distribution catalog case
- Friction: `areaY` could express vertical envelopes, but its horizontal
  counterpart required a case-local `createMark`, manual channels, scene
  nodes, grouping, and a direct D3 area generator. The result had no standard
  interaction points and duplicated renderer ownership in application code.
- Decision: add a tree-shakeable `areaX` mark with typed `x1`, `x2`, `y`, `z`,
  key, and visual channels. Keep its implementation and `d3AreaXCurve` bridge
  in separate subpaths so straight areas and all existing `areaY`/`d3Curve`
  consumers retain their dependency boundaries.
- Verification: focused `areaX` tests continue to cover exact D3 horizontal
  area topology, interaction values, invalid-row segmentation, channel
  rejection, package exports, and the isolated smooth static-SVG boundary. The
  violin case later moved to its narrower semantic mark; it is no longer the
  active verification for this general interval-area API.

### F-056 — Conformance tooling assumed Plot was the reference

- Status: resolved
- Severity: high
- Owner: Tooling
- Observed in: expanding the paired corpus from Observable Plot to Recharts
  and Apache ECharts
- Friction: reference filenames, gallery panels, source audits, bundle loops,
  visual result keys, selectors, summaries, and failure messages each encoded
  a Plot-versus-TanStack branch. Adding Recharts through a second runner would
  have duplicated the protocol and allowed the suites to drift. The catalog
  parser also silently discarded newer geometry roles, guide assertions, and
  interaction assertions.
- Decision: each case may select `referenceRenderer: "recharts"` or
  `"echarts"` while omitted metadata defaults to Observable Plot. One renderer
  mapping now drives the existing runner and gallery, and the catalog strictly
  validates and preserves all assertion metadata. ECharts guide checks classify
  actual rendered SVG path/line bounds and text transforms in benchmark code;
  they do not inspect renderer models or private APIs. Existing Plot result
  keys and Plot-only summary fields remain compatible.
- Verification: strict typecheck passes; the unchanged Plot line case passes
  its isolated bundle/type audit; Recharts and ECharts cases pass quick
  responsive initial/update geometry, paint, guides, containment,
  accessibility, bundle, performance, interaction, and type checks through the
  same runner. Eight single-grid ECharts cases gate rendered y-axis sequences
  or multiplicity; the synchronized two-grid case deliberately omits a generic
  axis assertion because ownership is ambiguous.

### F-057 — D3 hierarchy coordinates use screen-space y

- Status: resolved
- Severity: medium
- Owner: API/Documentation
- Observed in: Recharts bundle-size treemap comparison
- Friction: `d3-hierarchy` treemap output uses screen coordinates where `y`
  increases downward. Feeding normalized `y0`/`y1` values into a normal
  Cartesian scale silently flips the layout vertically. The case also ran D3
  against a fixed 100-by-100 square, sorted the hierarchy outside the
  definition, and stretched those rectangles through scales. Squarified row
  topology depends on the final aspect ratio, and D3 padding is measured in
  pixels, so the normalized preparation retained only 86.9% baseline geometry
  similarity and hid responsive work behind apparently simple native marks.
- Decision: expose `treemap` from the exact optional
  `@tanstack/charts/hierarchy/treemap` entry. It accepts semantic path rows or
  explicit `nodeId` / `parentId` channels, materializes nonnegative values once,
  and reuses the private flat-hierarchy builder and node-context materializer
  established by `treeLayout`. Authored child order is the default; optional
  immutable sort contexts and the `squarify`, `binary`, `dice`, `slice`, and
  `slice-dice` shorthands cover common tiling. `method` also accepts a
  D3-compatible treemap tiler over the mark's private hierarchy copy,
  preserving direct algorithm composition without exposing mutable hierarchy
  nodes as chart data. Each resolved-layout pass tiles that private copy
  against the final plot width and height, retains D3's
  downward-increasing screen coordinates internally, and emits interactive
  leaf rectangles without x/y scales or coordinate DTO preparation. Stable
  `TreemapNode` values carry hierarchy metadata, aggregate value, ancestor IDs,
  direct source lineage, and source indexes into color, paint, state, label,
  tooltip, and motion callbacks. Optional centered labels use the chart's text
  measurer and render only when measured bounds plus label padding fit the
  painted cell. Stateful resquarification remains outside the public method
  list so repeated layout passes are deterministic.
- Verification: case 74 now passes selected Flare rows directly to the exact
  mark and contains no case-owned hierarchy conversion, cell DTO, D3 layout,
  scale inversion, or label-width heuristic. Focused core, export, case, and
  catalog suites pass 41 tests, and strict workspace TypeScript passes. The
  exact source entry is 6.06 KiB gzip versus 2.74 KiB for the equivalent D3
  stratify-and-treemap kernel, a 3.32 KiB wrapper increment within its 3.5 KiB
  ceiling. Packed consumers pass with a 6.16 KiB exact treemap mark. The
  standard responsive browser matrix passes native support, clean types, and
  visual review at 99.4% diagnostic geometry similarity; inspected output
  matches the reference topology, colors, and labels. The Charts definition is
  45 lines versus 129 for Recharts, its measured consumer is 25.49 kB versus
  138.09 kB gzip, and its median mount and update times are 0.37x and 0.50x the
  reference.
- Callable-method follow-up: focused tests pass a native D3 tiler directly,
  reject non-finite, reversed, and out-of-bounds leaf coordinates, and prove
  the shorthand path remains deterministic. Public types and exact-subpath
  documentation expose the callable without adding it to ordinary chart
  bundles.

### F-058 — Radar checks ignored polar labels

- Status: resolved
- Severity: medium
- Owner: Tooling
- Observed in: Recharts simple-radar comparison
- Friction: the conformance case asserted only the filled radar polygon. It
  reported 100% geometry similarity while the TanStack composition omitted all
  five radial tick labels and placed the six angle labels at a different
  offset. The case also used a smaller radius and margin than the official
  reference.
- Decision: the reference uses its documented 80% radius and 20 px margin.
  The native polar composition uses `radialGrid`, `angleGrid`, and
  `radialArea`; guide label callbacks preserve Recharts' eight-pixel
  angle-label offset, rotated 30-degree radial axis, baselines, and distinct
  angle/radius label colors. All eleven labels remain data-bearing visual
  geometry so an omission cannot pass again.
- Verification: focused responsive initial/update conformance passes at 320
  and 640 px with all eleven labels present, matching paints, no overflow,
  100.0% diagnostic geometry similarity, clean strict types, and 0.16×
  Recharts gzip. The standard matrix also passes at 320, 640, and 960 px in
  light and dark themes without a case-local coordinate renderer.

### F-059 — Vite cached a newly added package subpath

- Status: resolved
- Severity: low
- Owner: Tooling/API
- Observed in: live conformance gallery after the `areaX` extraction
- Friction: the focused benchmark and fresh builds resolved
  `@tanstack/charts/d3/area-x`, but the already-running Vite gallery had cached
  the package export map before that subpath existed. Its dynamic TanStack
  module returned HTTP 500, leaving case 63 at `pending` while Plot rendered.
- Decision: retain the granular curve subpath, and also export
  `d3AreaXCurve` from the established package root beside `areaX`. The gallery
  example now uses the normal root import, so API work hot-reloads without a
  hidden source import or forced server restart. Renderer loading and mounting
  are isolated per panel; a future module error replaces `pending` with an
  explicit local error instead of leaving a blank chart.
- Verification: the unchanged live server now serves the case module with HTTP 200. After reload the gallery reports one SVG, three areas, three links, three
  dots, and populated timing/node/size metrics. Focused quick conformance passes
  responsive initial/update visual and strict-type gates at 98.4% diagnostic
  geometry similarity and 0.23× Plot gzip; the production gallery build passes
  with the per-panel error boundary.

### F-060 — Geometry similarity could not gate exact layouts

- Status: resolved
- Severity: medium
- Owner: Tooling
- Observed in: beeswarm horizontal-position correction
- Friction: normalized bounding-box similarity was reported only as a corpus
  diagnostic. A previous beeswarm layout with visible horizontal drift still
  passed every visual gate at about 99.0%, while a global threshold would be
  invalid for cases whose reference and target intentionally emit different
  primitive topology.
- Decision: allow deterministic cases to declare a validated
  `minimumGeometrySimilarity` from zero to one. The floor applies separately
  to every viewport, theme, initial render, and revised render; cases without a
  floor retain diagnostic-only behavior.
- Verification: the corrected force recipe cleared its 99.5% floor with a
  minimum score of 99.71%. The native Plot-compatible dodge layout changes the
  deterministic cross-axis packing and clears its reconciled 99.4% floor with
  a 99.489% minimum across the full matrix; the prior visibly drifting 99.0%
  recipe still fails. Radar clears a 99.99% floor with a minimum score above
  99.999%. All remain clean under strict type auditing.

### F-061 — Catalog metadata validation was browser-bound

- Status: resolved
- Severity: medium
- Owner: Tooling
- Observed in: publishing the conformance gallery as native case and embed
  routes
- Friction: the only strict case metadata parser lived beside
  `import.meta.glob`, so Node publication tooling either had to duplicate the
  schema or trust raw JSON. A duplicate validator would drift as interaction
  scenarios and additional reference renderers were added.
- Decision: move metadata parsing into an environment-neutral TypeScript
  module. The Vite catalog and Node artifact publisher consume the same parser;
  the publisher adds only publication invariants such as unique IDs/orders,
  directory-name agreement, safe routes, and a closed module allowlist.
- Verification: strict typecheck passes, `catalog:check` validates all current
  cases, and `catalog:build` generates schema-v3 `catalog.json` plus the exact
  implementation closure and authored-source role metadata from the same
  parsed metadata. TanStack.com renders detail and embed routes from that
  structure rather than generated HTML.

### F-062 — Interaction checks were selector-bound

- Status: resolved
- Severity: high
- Owner: Tooling
- Observed in: expanding tooltip checks into crosshairs, legends, linked
  selection, and ECharts references
- Friction: the prior visual inspector dispatched one synthetic
  `pointermove` at a renderer-specific SVG element and asserted a CSS selector.
  It could not express clicks, keyboard input, drag, wheel, multiple views, or
  semantic state, and assertions reused mutated mounts. ECharts' generated SVG
  paths also have no stable role classes suitable for this contract.
- Decision: interaction cases declare ordered semantic scenarios. Each
  implementation supplies a benchmark-only driver that resolves named anchors
  to viewport coordinates and reports serializable state. A separate behavior
  runner fresh-mounts each scenario and uses native Playwright mouse, keyboard,
  drag, and wheel input. Named views and optional driver geometry remove the
  single-largest-SVG assumption.
- Verification: 16 interaction cases pass native pointer, click, keyboard,
  drag, wheel, pointer-leave, and in-place revision-update scenarios for both
  renderers, starting revisions, and quick-profile widths with zero type
  diagnostics or unsafe assertions. Uncaught browser errors fail the active
  step. The legend, brush paint, and synchronized-crosshair checks read actual
  rendered SVG output rather than only case-owned state. The shared metadata
  parser and published `catalog.json` preserve the scenario schema.

### F-063 — Resolved scales cannot map pixels back to values

- Status: resolved
- Severity: medium
- Owner: API/Documentation
- Observed in: focus-plus-context, continuous brush, wheel zoom/pan, and
  scale-handle cases
- Friction: `ChartScene.scales.x` exposes semantic-to-pixel `map`, but not an
  inverse operation. A snapped overview click can scan known datum positions,
  but continuous brush, pan, zoom, and free data-space selection need a
  correct pixel-to-value mapping for the configured scale. Before the
  first-party interaction migrations, cases 83, 88, 89, 90, 91, and 92
  repeated the same copy-range-invert setup.
- Current decision: do not implement a universal inverse or a second scale
  algorithm. `ResolvedScale` now preserves an optional native `invert` from
  the responsive configured-scale copy. First-party interactions can consume
  that capability and apply explicit semantic snapping such as `utcDay.round`
  without pretending every scale is invertible. The shared interaction-axis
  kernel accepts explicit ordered candidates when the interaction should map
  pixels to the nearest observed value; this is distinct from a general scale
  inverse. Its internal continuous `invert` remains unclamped so zoom can pan a
  whole window before applying semantic extent constraints; `valueAt` retains
  clipped pointer behavior. Inversion remains for genuine continuous
  pixel-to-value behavior.
  Resolved geometry should retain both semantic and pixel anchors so child
  rendering does not map to pixels, invert to values, and map again.
- Existing verification: numeric and UTC scales round-trip through `map` and
  `invert`, reversed y ranges invert correctly, band scales expose no false
  inverse, and the authored scale remains immutable. Case 43 uses the public
  inverse to return screen-space bin centers to semantic coordinates. The
  packed and retained-input gates pass with no optional spatial algorithm in
  the ordinary core consumer. Exact-subpath `continuousCursor` now composes
  two interaction axes over the final x/y ranges. Case 88 contains no copied
  scale or authored `.invert()` call and covers reversed axes, numeric and
  temporal inversion, clamping, controlled acceptance, and static/hosted
  guide paint. Case 89 supplies its 12 observed UTC dates to the same axis
  kernel; `brushX` nearest-snaps forward and reverse selections without a
  copied scale or case-authored inverse. Case 90 now uses the same resolved
  continuous boundary through `zoomX`; the case contains no copied scale,
  authored inverse, or transform-to-domain conversion. Case 91 supplies its
  ordered observed dates to `handleX`; the candidate axis maps and snaps the
  playhead without a copied scale or scale inverse. Case 92 supplies its valid
  event-end dates to the same handle and maps its track through the final x and
  semantic y scales without manual scale-to-DOM conversion.
- Cursor projection verification: the independent cursor-controller tests
  cover configured-scale `valueAt`, reversed y ranges, normalized resize
  behavior, semantic programmatic anchors, and scenes without a matching
  scale. The configured scale remains the owner of any application-supplied
  inversion, clamping, and precision policy.
- Decision: no scale-level nearest API is needed. Continuous interactions use
  the configured scale's native inverse; finite interactions use the shared
  explicit-candidate axis. Reopen only if a real interaction cannot fit either
  boundary.

### F-064 — Scroll-clipped labels failed containment

- Status: resolved
- Severity: medium
- Owner: Tooling
- Observed in: scrollable resource timeline
- Friction: the visual gate compared every SVG text box with the outer case
  container. A first correction intersected every label with its clipping
  ancestors, which made partially clipped labels pass and omitted fully
  clipped labels globally.
- Decision: containment tests each original label box and reports ancestor
  clipping separately. Only a case-owned
  `data-conformance-scroll-viewport` may omit a scrolling tick whose anchor is
  outside that viewport; a partially clipped label whose anchor remains inside
  still fails. The TanStack timeline uses native responsive UTC ticks; the
  ECharts reference uses a weekly ruler. In both, the declared scroll viewport
  owns clipping without weakening the global containment check.
- Verification: the strict check first caught TanStack's partially clipped
  `Jan 19` tick at 320 px. After the explicit tick policy, both renderers pass
  initial and revised containment with zero overflow or clipping at 320 and
  640 px. Real wheel input reaches `scrollLeft = 260`, and in-place revision
  updates preserve that scroll position and the semantic domain in both
  renderers with no captured page errors.
- Interaction-audit evidence: passing containment did not preserve usable
  schedule context. At 320 px and `scrollLeft = 260`, all five lane labels
  were fully offscreen, and the then-current three-tick policy left only “February”
  visible. The chart remained mathematically correct but no longer identified
  the visible resource lanes.
- Resolution: the case now keeps resource labels in a fixed rail while only
  the time surface scrolls. Responsive date ticks, a visible overflow cue,
  keyboard task focus, task details, and a complete semantic schedule preserve
  context without weakening the clipping rule.
- Verification: both renderers pass post-scroll lane visibility, focused
  offscreen-task auto-scroll, task-detail text, real wheel input, scrolled
  geometry, screenshots, and update-time scroll preservation at every standard
  width and theme.

### F-065 — Logical views required fake DOM roots

- Status: resolved
- Severity: medium
- Owner: Tooling
- Observed in: synchronized ECharts multi-grid cursors
- Friction: named-view geometry and pointer-leave validation required a DOM
  element for every logical view. ECharts owns two grids inside one SVG, so the
  first implementation added invisible case-local marker elements solely for
  the harness.
- Decision: a conformance driver may report viewport-relative logical
  `viewBounds`. Visual normalization and behavior validation use those bounds
  when no DOM root exists.
- Verification: the ECharts markers are removed. Both renderers normalize
  against their actual plot bounds, producing 100.0% diagnostic geometry
  similarity. Both synchronized crosshairs are asserted from rendered SVG
  lines before and after in-place data revisions rather than inferred from the
  shared semantic date.

### F-066 — Disabling native focus required a custom strategy

- Status: resolved
- Severity: low
- Owner: API
- Observed in: free cursor, continuous brush, and wheel zoom cases
- Friction: an application that owns all pointer semantics had to define three
  no-op `resolve`, `group`, and `navigation` methods merely to keep the DOM
  host from running native datum focus.
- Decision: export `focusDisabled` from the isolated
  `@tanstack/charts/focus/disabled` entry point. Do not add a branch or export
  to the universal host/root path.
- Verification: all three custom-gesture cases use the shared strategy and
  keep native focus out of their pointer path. The first root-export attempt
  changed an ordinary line bundle by one gzip byte and was rejected; the
  isolated subpath restores every exact universal bundle baseline.

### F-067 — Reference wrappers duplicated accessible roots

- Status: resolved
- Severity: medium
- Owner: Tooling
- Observed in: ECharts and Recharts conformance adapters
- Friction: both shared adapters named an outer wrapper while their renderer
  also emitted a nested named SVG. Presence-only accessibility checks passed
  the duplicate chart semantics.
- Decision: require a named chart root and reject nested roots with the same
  accessible name. ECharts keeps its focusable wrapper as the sole
  `role="application"` owner and hides its generated SVG from the accessibility
  tree. Recharts keeps its rendered SVG as the sole named `role="img"` owner.
- Verification: focused DOM tests enforce one named root for both adapters.
  The strict browser gate first failed the three affected legacy Recharts
  cases, then all three passed after the shared adapter correction.

### F-068 — Source audit omitted shared implementation files

- Status: resolved
- Severity: low
- Owner: Tooling
- Observed in: ECharts comparison source-line ratios
- Friction: bundle bytes included the shared ECharts mount, but “authored
  implementation surface” counted only each renderer entry file. The report
  therefore favored any reference that moved setup into a local shared module.
- Decision: use one canonical source-closure loader for the catalog viewer,
  comparison report, and published artifact. Count each transitive authored
  file under `benchmarks/conformance` once and classify it as entry, case
  support, fixture, or harness. Expose harness metrics separately but exclude
  them from authored totals and ratios so shared mounting infrastructure does
  not become case-authoring surface.
- Verification: focused loader tests cover static and dynamic local imports,
  nested shared fixtures, cross-case fixtures, renderer-entry exclusion,
  harness separation, UTF-8 bytes, and newline-aware LF, CRLF, and CR counts.
  The comparison report emits the same role totals and paths, and the
  schema-v3 artifact checker recomputes and deep-compares both implementation
  closures for every case.

### F-069 — Strict containment exposed a clipped Plot guide

- Status: resolved
- Severity: low
- Owner: Application
- Observed in: the interval-timeline reference implementation
- Friction: Observable Plot's default left margin clipped every long task
  label at the SVG boundary. The earlier containment check used clipped boxes,
  so the broken reference still passed.
- Decision: keep the strict original-box gate and configure the Plot reference
  with the margin its labels require. TanStack remains on automatic margins;
  this is reference-case setup, not a core API change.
- Verification: the interval timeline passes initial and revised containment
  at 320 and 640 px, with geometry similarity improving from 96.1% to 97.4%.

### F-070 — ECharts brush injected an undeclared toolbox

- Status: resolved
- Severity: low
- Owner: Application
- Observed in: ECharts brush-range reference case
- Friction: registering `BrushComponent` caused its preprocessor to inject a
  toolbox option, but the modular reference had not registered
  `ToolboxComponent`. ECharts rendered the brush while logging a missing
  component error, so the catalog looked correct with an invalid modular
  dependency graph.
- Decision: explicitly register and type `ToolboxComponent` in the brush
  reference. Keep this reference-library dependency out of TanStack Charts.
- Verification: the brush reference mounts in the live catalog without the
  ECharts missing-toolbox error and retains its rendered brush interaction.

### F-071 — Formatter crossed into the Stats parity worktree

- Status: resolved
- Severity: low
- Owner: Tooling
- Observed in: the repository-wide formatting gate
- Friction: the Stats parity checkout is a separate nested Git worktree, but
  the root Prettier command descended into it and reported 65 unrelated source
  and generated files as Charts formatting failures.
- Decision: exclude `tanstack.com-parity/` in the Charts `.prettierignore`.
  The parity worktree keeps its own formatting ownership and commands.
- Verification: the root formatting gate checks only TanStack Charts sources
  and no longer reports files from the nested worktree.

### F-072 — Wide brush ticks exceeded a locked right margin

- Status: resolved
- Severity: low
- Owner: Application
- Observed in: the 960px brush-range conformance variant
- Friction: the case locked all four margins to match the ECharts plot frame,
  then relied on TanStack's default responsive UTC formatter. At 960px the
  formatter expanded the final tick to “December,” which exceeded the locked
  24px right margin by three pixels. The quick 320/640 profile did not expose
  it.
- Decision: keep the intentional geometry lock and explicitly format month
  ticks with locale-stable abbreviated UTC names, matching the reference
  chart's presentation. Automatic margins remain the default when a side is
  not locked.
- Verification: the full 320/640/960 light/dark case matrix passes initial and
  revised containment, its 99.1% geometry floor, rendered brush paint, and all
  drag scenarios at 99.2% mean geometry similarity.

### F-073 — Scenario state overstated interaction quality

- Status: resolved
- Severity: high
- Owner: Tooling
- Observed in: interaction UX audit across conformance cases 80–92
- Friction: ordered semantic scenarios solved renderer-specific selectors, but
  most assertions read JSON from a case-owned driver. Several values are
  constants or are regenerated from source data. An overlay can fail to paint,
  an axis can remain stale, focus can be lost, or a live region can remain
  empty while the scenario passes.
- Evidence: the current green suite missed an overflowing grouped tooltip,
  disappearing scroll-lane labels, sparse-date cursor dead zones, invisible
  value feedback, pointer-only sliders, scroll trapping, and synthesized
  handle geometry. Initial-state screenshots also omit the interactive state
  where these failures occur.
- Decision: retain semantic drivers for target resolution and serializable
  application state, but add checkpoint assertions against rendered DOM text,
  attributes, geometry, focus ownership, live regions, chart/page scroll, and
  responsive bounds. Let scenarios request screenshots after meaningful
  interaction steps.
- Verification: the grammar now covers touch, separate pointer phases,
  cancellation, captured movement, pixel/line/page wheel modes, bounded waits,
  revisions, and screenshots. Rendered assertions cover text, attributes,
  roles, focus, bounds, dimensions, and element/page scroll. Named composite
  regions are inspected honestly alongside chart images and applications.
  All 16 interaction cases pass both renderers, revisions, 320/640/960 px, and
  light/dark themes with zero captured page errors.

### F-074 — Axis focus distance created sparse cursor gaps

- Status: monitoring
- Severity: high
- Owner: Documentation
- Observed in: snapped grouped tooltip and synchronized-cursor cases
- Friction: `focusX` correctly groups the nearest x value, but the DOM host's
  default `maxFocusDistance = 48` still applies. At 960 px, April and May in
  the synchronized-cursor case were 111.6 px apart; the 55.8 px midpoint
  exceeded the threshold and cleared both cursors instead of snapping.
- Expected: an authored axis pointer that says it snaps to the nearest shared
  date remains active across the plot.
- Current decision: do not change the safe global proximity default. Axis
  pointer recipes and skills must choose an explicit distance policy based on
  interval spacing or continuous nearest-axis behavior. Cases 80 and 87 need
  midpoint and edge coverage.
- Verification: cases 80 and 87 now use an explicit continuous nearest-x
  policy and pass midpoint, first/last edge, pointer-leave, keyboard, touch,
  rendered crosshair, and revision checks at every standard width.
- Documentation verification:
  `packages/charts-core/docs/large-data-and-interaction.md` now places
  `maxFocusDistance` beside the four axis-focus strategies and distinguishes
  continuous snapping from finite proximity.
- Follow-up: reassess the API only if authoring evaluations still require
  case-specific pixel calculations after reading the guide.

### F-075 — Controlled interactions omitted behavior semantics

- Status: resolved
- Severity: high
- Owner: API/Documentation
- Observed in: interactive legend, chart/table selection, focus/context, brush,
  wheel zoom, scrubber, and editable-range cases
- Friction: the earlier guidance taught scale copying and D3 inversion, but
  the examples then hand-built pointer capture, wheel math,
  snapping, and overlays. Their value math passes while keyboard semantics,
  touch, cancellation, out-of-bounds clamping, visible values, and recovery
  controls are missing or inconsistent. The interactive legend additionally
  duplicated keyed-set normalization, row filtering, responsive height math,
  HTML buttons, swatches, pressed state, and focus preservation outside the
  chart definition. The chart/table case filtered source rows, conditionally
  created a second interactive dot mark, and translated host `onSelect` points
  back into application IDs even though the chart already owned activation.
- Current decision: the repetition threshold for a first-party boundary is
  met. `controlledSignal` is the shared typed snapshot/callback boundary; it
  creates no chart-owned store or subscription graph. `interactiveColorLegend`
  now owns domain-ordered toggling, post-domain series visibility, responsive
  layout, native browser controls, and a static fallback while the application
  owns the accepted snapshot and persistence. `keyedSelection` now reuses the
  signal for semantic point activation, and `whenSelected` filters an ordinary
  authored mark after domains resolve while removing its duplicate interaction
  points. Exact-subpath `brushX` now uses the same boundary and owns final-scale
  painting, inversion or candidate snapping, reverse normalization, pointer
  and touch lifecycle, cancellation, keyboard sliders, host containment and
  teardown, and a static fallback. Exact-subpath `continuousCursor` composes
  the same signal and interaction-axis boundary across x and y, then owns
  unsnapped final-scale inversion, guide and label paint, transient pointer and
  touch previews, controlled pinning, leave/cancel cleanup, toggle/Escape
  clearing, and host teardown without importing brush or D3 policy.
  Exact-subpath `zoomX` now binds a controlled semantic window to the final x
  scale and owns focus-gated wheel capture, pointer-anchored zoom, drag and
  horizontal-wheel pan, touch and keyboard input, clamping, cancellation, and
  teardown. D3 Zoom remains private to that optional DOM control. Exact-subpath
  `handleX` binds one controlled semantic x value to ordered candidates and
  owns final-scale track, rule and handle paint, nearest snapping, pointer and
  touch capture, cancellation, keyboard slider semantics, and teardown without
  sharing brush, cursor, zoom, or D3 policy. Applications retain accepted
  windows, visible-row and y-domain policy, forms, tables, semantic controls,
  summaries, recovery controls, independent-host layout, and persistence.
  Complete linked views inside one chart host can use `viewGrid` and one shared
  host interaction lifecycle.
- Existing verification: the recorded before-state cases 83 and 89 use real
  optional `d3-brush`, and case 90 uses optional `d3-zoom`; cases 91 and 92 pair direct
  manipulation with native semantic controls. Pointer, keyboard, touch,
  cancellation, clamping, recovery, screenshots, and update preservation pass
  across the full matrix. Practical `d3-brush` plus selection and `d3-zoom`
  plus selection kernels are isolated at 16.20 and 15.91 kB gzip with
  independent budgets. Case 83 now imports first-party `brushX` in the overview
  definition and contains no TanStack-owned D3 import, SVG overlay, effect,
  copied scale, or selected-row preparation. Its one-dimensional interaction
  axis is shared infrastructure for mapping, inversion, snapping, ordering,
  clamping, and keyboard stepping, while D3 remains private to the optional DOM
  control. Focused behavior, renderer, axis, type, export, and case tests pass;
  the quick paired browser matrix passes every pointer, touch, cancellation,
  semantic-control, update, visual, and type scenario at 99.9% diagnostic
  geometry. Brush regressions additionally cover synchronous controlled
  rejection, later external updates while a touch terminal is pending,
  reversed scales, constrained handle ARIA ranges, and mouse/touch teardown.
  The optional brush adds 19.24 KiB gzip over the ordinary DOM host under its
  20 KiB cap; ordinary root, universal, and DOM entries retain no brush, axis,
  `d3-brush`, or `d3-selection` input. Case 81 now uses one grouped raw-row line mark and
  the controlled interactive legend. Its full browser matrix passes native
  click, Enter, Space, 44-pixel targets, focus retention, controlled updates,
  both renderers, two revisions, light/dark themes, and 320/640/960px layouts
  at 98.6% geometry similarity. Focused signal, legend, host, Canvas, definition,
  export, and type tests pass. The signal is 0.09 KiB gzip; the interactive
  legend adds 2.07 KiB over the ordinary DOM host and stays out of root and
  universal entries. Case 82 now keeps the full raw rows in both ordinary dot
  marks, resolves activation through a stable semantic key, preserves complete
  x/y domains, and paints the selected mark as a decorative post-domain
  overlay without adding a second focus target. Focused controller and case
  tests cover typed pointer, keyboard, and clear reasons; ignored nullish keys;
  canonical key identity; complete multi-fragment Waffle selection; stable
  selection across reordered revisions; and static SVG output. The paired
  quick browser matrix passes all four semantic scenarios for Recharts and
  Charts across both revisions and 320/640px layouts; focused native-host
  coverage also passes accessibility activation, pointer selection, and blank
  clearing.
- Continuous-cursor follow-up: case 88 now uses `continuousCursor` in one
  ordinary definition. Rules, marker, optional axis labels, final-scale
  inversion, transient pointer/touch previews, controlled pinning, leave and
  cancellation, toggle/Escape clearing, and teardown moved out of the case.
  The shared interaction-axis kernel owns mapping, inversion, clamping,
  cloning, and reversed ranges; the guide-node kernel is shared with focus
  guides without importing datum focus or motion. The case retains only its
  semantic sliders, live status, rounding, and conformance driver. Focused
  behavior, static SVG, host, type, export, and case tests cover numeric and
  temporal scales, controlled acceptance and rejection, pointer and touch,
  updates, and source ownership. The isolated DOM-host fixture has a 5 KiB
  incremental cap, adds 3.63 KiB, and forbids focus-guide, brush, tooltip,
  legend, selection, and D3 inputs.
- Brush second proof: case 89 now uses the same exact-subpath `brushX` as case 83. The definition supplies observed UTC candidates, so the interaction axis
  owns final-scale mapping, nearest snapping, reverse normalization, and
  keyboard indices without a copied scale or case-authored inverse. Brush
  painting, forward/reverse drag, pointer and touch cancellation, semantic
  handles, shortcut metadata, controlled commit, resize synchronization, and
  teardown moved out of the case. Monthly cohort selection, accepted range,
  and the live AAPL summary remain application-owned. Focused tests pass, and
  the quick paired browser matrix passes every interaction, visual, geometry,
  update, and strict type gate at 98.7% diagnostic geometry.
- Zoom follow-up: case 90 now uses exact-subpath `zoomX` in one ordinary
  definition. The behavior owns final-scale inversion, wheel normalization and
  focus gating, pointer-anchored zoom, drag and horizontal-wheel pan, touch and
  keyboard input, clamping, cancellation, controlled updates, and teardown.
  The case retains the accepted semantic window, visible-row and y-domain
  policy, live status, Reset control, persistence, and conformance observation.
  The React effect, second SVG, D3 imports, copied scale, transform conversion,
  and case-owned gesture listeners are gone. Focused behavior and case tests
  cover numeric and temporal windows, controlled updates, focus, input modes,
  limits, responsive replacement, teardown, and source ownership. The exact
  optional bundle fixture isolates D3 Zoom and Selection from root, universal,
  ordinary DOM, brush, cursor, legend, and selection consumers. It adds 20,429
  bytes, or 19.95 KiB gzip, over the ordinary DOM host under its 20 KiB cap.
  The quick paired browser matrix passes unfocused page scrolling, focus-gated
  pixel/line/page wheel zoom, horizontal-wheel pan, pointer drag, touch
  activation and pan, keyboard, Reset, revisions, visual, and strict type
  scenarios at 98.6% diagnostic geometry. TanStack uses 512 authored lines and
  51.59 kB gzip versus ECharts' 727 lines and 172.82 kB.
- Scale-handle follow-up: cases 91 and 92 now use exact-subpath `handleX` in
  their ordinary definitions. The behavior maps ordered semantic candidates
  through the final x scale, paints the track, optional rule and handle, and
  owns nearest snapping, pointer and touch capture, cancellation,
  Arrow/Home/End input, accessible slider state, focus paint, resize
  synchronization, and teardown. Case 91 retains the accepted frame, playback
  clock, transport controls, status, and announcements. Its overlay import, copied scene
  geometry, second SVG, range input, and case-owned pointer lifecycle are gone.
  Focused behavior and case tests cover validation, semantic cross values,
  static paint, input modes, controlled updates, playback timing, exact types,
  and source ownership. Packed runtime, declaration, type-inference, and exact
  subpath isolation checks pass. The exact DOM-host fixture adds 3,740 bytes,
  or 3.65 KiB gzip, over the ordinary host under a 5 KiB cap. It retains only
  the controlled signal, candidate axis, value-cloning range kernel, and
  handle controller; root, universal, cursor, brush, zoom, native, and
  unrelated consumers retain no handle or D3 input. Case 91's quick matrix
  passes 1/1 behavior plus visual and strict type gates at 320 and 640 px
  across both revisions with 99.0% geometry. TanStack uses 539 authored lines
  and 39.58 kB gzip versus the reference's 856 lines and 167.93 kB. Case 92
  reuses the handle at a semantic lane with no rule and passes behavior,
  visual, and strict types at 99.9% geometry. Its date input, validation, event
  constraint, commit state, status, and exact-value alternative remain
  application-owned; its overlay, scale-to-DOM mapping, range input, and
  case-owned gesture lifecycle are gone.
- Synchronized-cursor follow-up: case 87 needs no controlled focus signal.
  One `viewGrid` host lets grouped x focus select one view-grouped dot per date,
  while child focus guides retarget inside their own plots. Native sticky
  tooltip state owns pin, leave, Escape, keyboard activation, and update
  restoration. The external live summary can observe focus and selection, but
  the host does not expose pinned state in those callbacks; the case therefore
  mirrors pin toggles from `onSelect`. Keep that observability gap monitoring,
  but do not add controlled focus or a chart-owned store unless an independent-
  host consumer proves it necessary.
- Independent-host cursor follow-up: `createChartCursor` and `cursorHost`
  centralize focus-value synchronization and free normalized coordinates when
  views do not share one host. Controller and renderer-host tests cover
  programmatic state, pinning, cancellation, Escape, subscription cleanup, and
  the absence of invented free-cursor keyboard stepping. Faceted regressions
  retain the exact emitting cell through optional local `origin` identity when
  semantic values collide, leave `type: 'none'` outer scales unprojected, map
  values through each cell's scale and formatter, and suppress a guide when
  its authoritative cell projector rejects the value.
- Controlled-authority follow-up: brush, handle, and continuous-cursor hosts
  previously left the proposed terminal geometry painted when the application
  rejected a synchronous change. They now repaint from the accepted signal
  snapshot after pointer, touch, keyboard, pin, and clear proposals. Focused
  tests assert both the proposed callback value and the restored visible and
  ARIA state without relying on a framework rerender.
- Inversion follow-up: a continuous cursor with an omitted `valueAt` now uses
  the resolved invertible scale. Explicit callbacks still override that
  default, and an explicit `undefined` keeps coordinate-only behavior for a
  scale-less axis. Missing or non-invertible scales fail with an axis-specific
  diagnostic. This removes repeated scale-copy/range/invert glue while keeping
  direct control available.
- Accessibility follow-up: `zoomX({ keyboard: false })` no longer advertises
  an application role, keyboard shortcuts, or instructions and keeps its
  surface out of sequential focus order. Destroying an active zoom reports
  `onActiveChange(false)` so application state cannot outlive its owner.
- Documentation verification:
  the interaction, legend, accessibility, installation, reference, and bundle
  guides document the controlled boundary, categorical series-identity rule,
  include-hidden domain policy, native-button/static-fallback split, semantic
  keyed selection, decorative post-domain marks, controlled horizontal brush,
  controlled continuous cursor, controlled scale handles, controlled
  horizontal zoom, application-owned semantic cursor and window controls,
  linked tables and fixed-window policy, exact imports, host lifecycle, and
  React Native limitations.
  The generated package docs are synced from the root documentation tree.
- Decision: the audited interaction families now have explicit definition or
  application boundaries. Keep keyed selection
  separate from interactive-legend toggle and brush-range policy, and keep
  application table, summary, recovery, validation, playback, and persistence
  UI outside Charts. Reopen only when a concrete case repeats missing behavior
  semantics rather than product policy.

### F-076 — Compact charts could not keep only one axis guide

- Status: resolved
- Severity: medium
- Owner: API
- Observed in: pinned tooltip with a nested mini bar chart
- Friction: the mini chart needs x-period labels but no y guide. `guides` is an
  all-or-nothing chart boolean, so `guides: false` removed both axes and left
  four bars without temporal context.
- Expected: compact and nested charts can independently show or hide each axis
  guide without custom rendering.
- Decision: use `axis: false` at the narrow scale configuration layer while
  retaining `guides: false` as the positionless-chart shorthand. Grid
  visibility is independent from axis visibility.
- Verification: scene-layout tests cover x-only, y-only, both, and neither,
  including automatic margins and grid suppression. The nested-tooltip case
  retains period labels while hiding its y guide. The full 79-case matrix
  protects existing facet and ordinary-guide behavior. Exact bundle baselines
  record the reviewed change.

### F-077 — Transient host focus survived blur and cancellation

- Status: resolved
- Severity: high
- Owner: API
- Observed in: snapped tooltip and synchronized-cursor interaction audit
- Friction: the host establishes pointer and keyboard focus, but leaving the
  chart through normal keyboard focus movement can leave an unpinned tooltip
  and crosshair visible. The pointer path listens for movement and mouseleave,
  but not pointer cancellation, which can leave stale state after a canceled
  touch gesture.
- Expected: transient focus clears when the chart no longer owns keyboard or
  pointer interaction. Explicit application pinning remains controlled by the
  application.
- Decision: add scoped focus-out and pointer-cancel cleanup in the DOM host
  without changing selection or pinned application state.
- Verification: the shared DOM-host tests cover focus moving within the same
  cross-realm chart, focus moving to an adjacent control, pointer cancellation,
  and explicit selection preservation. Interaction scenarios cover blur,
  touch cancellation, pointer cancellation, and pinned state. Core, React, and
  Octane test suites plus the full 79-case matrix pass.

### F-078 — Renderer completion signals were incomparable

- Status: resolved
- Severity: high
- Owner: Tooling
- Observed in: cross-library mount, update, and streaming stress work
- Friction: synchronous adapter return time was the only shared boundary.
  ECharts also exposes renderer events, while the other adapters did not, so a
  naïve comparison could either stop before progressive work completed or let
  one renderer report completion before the common browser-frame boundary.
- Decision: report synchronous commit, first-frame proxy, and two-frame settle
  proxy separately. Every adapter crosses the same frame barriers. Renderer
  signals are additive where available and fail through a bounded watchdog
  instead of acting as an early-success fallback.
- Verification: production-minified quick raw-line cells mount and update
  across TanStack Charts, Chart.js, ECharts, Recharts, and Observable Plot
  without an unsettled operation. Raw samples and all three boundaries are
  retained in the JSON result.

### F-079 — Large-data timing hid representation cost

- Status: resolved
- Severity: high
- Owner: Tooling/Skill
- Observed in: million-row stress-design review
- Friction: timing only renderer rows rewards pre-aggregation without exposing
  its cost, while timing a million direct SVG marks rewards a visualization no
  user should ship. “Rendered marks” also incorrectly described a line path,
  SVG points, and canvas commands as the same unit.
- Decision: keep raw-frontier, product, and encoded lanes separate. Record
  source rows, represented rows, prepared rows, output nodes/canvas pixels, and
  preparation time independently. Smart density, envelope, histogram, and
  top-plus-Other workloads must account for every source row and stay within
  an explicit prepared-row budget.
- Verification: deterministic tests cover source accounting, output budgets,
  global-extrema preservation, fixed histogram and density grids, top-category
  remainder accounting, true append prefix identity, and every update shape.
  Validation-only digest hashing is excluded from preparation timing. The
  runner rejects cross-library digest differences and never creates a combined
  raw/encoded rank. Density preparation materializes only occupied cells:
  100,000 rows produce 1,909 shared marks in the quick fixture rather than
  asking some renderers to discard 139 empty marks. The package's large-data
  guide now turns those invariants into a problem-first, skill-ready decision
  and validation procedure. The AI evaluation plan now requires routed and
  discovery cohorts to preserve row accounting, extrema, output budgets,
  preparation ownership, resize behavior, and semantic alternatives at
  100,000 and 1,000,000 source rows before the generated skill can pass.

### F-080 — Benchmark adapters drifted from shared geometry

- Status: resolved
- Severity: high
- Owner: Tooling
- Observed in: first cross-library stress smoke runs
- Friction: appended line and scatter values were clipped because Chart.js and
  ECharts kept their mount-time x maximum; variable point `size` meant radius
  in three adapters, diameter in ECharts, and a remapped area in Recharts.
  Observable Plot's default figure margin also reduced an authored 800×400
  chart to 720×360.
- Decision: derive numeric x domains from the current canonical input on every
  render, define stress `size` as CSS-pixel radius, adapt diameter/shape APIs at
  their boundary, and normalize Plot's benchmark root margin. Output geometry
  is validated before a timing cell is accepted.
- Verification: the five-library 10,000-row raw-line smoke passes append and
  resize updates with exact 800×400 output. Adapter probes verify retained
  items or path vertices, numeric endpoint visibility, and post-update
  dimensions from the rendered scene, controller metadata, renderer model, or
  serialized SVG geometry as appropriate. Those probes caught a remaining
  TanStack adapter bug: the scene resized to 560×440 while its 100%-sized SVG
  stayed inside an 800×400 container. Updating container ownership alongside
  `host.update` closed it. The final quick matrix passes all 40 cells across
  TanStack Charts, Chart.js, ECharts, Recharts, and Observable Plot.

### F-081 — Pointer probes confused tooltip presence with state

- Status: resolved
- Severity: high
- Owner: Tooling
- Observed in: trusted interactive-scatter stress timing
- Friction: timing two fixed animation frames and then checking for any
  tooltip-like DOM could accept a tooltip that was already active. ECharts'
  broad descendant-text heuristic also matched persistent renderer DOM, so
  moving outside the chart could not prove an inactive baseline.
- Decision: move outside the chart, wait for the adapter's exact tooltip to
  become inactive, arm the trusted event capture, and resolve only on the first
  observed inactive-to-active transition. The ECharts benchmark gives its
  tooltip an explicit class rather than inferring state from arbitrary
  descendants.
- Verification: five repeated trusted probes activate from a confirmed
  inactive state for TanStack Charts, Chart.js, ECharts, Recharts, and
  Observable Plot in the 40-cell quick matrix.

### F-082 — Dormant DOM-host work accumulated across dashboards

- Status: resolved
- Severity: medium
- Owner: API
- Observed in: 64-chart dashboard stress profiling
- Friction: every fixed-width render still measured container bounds and
  refreshed computed font styles twice. Hosts without focus or `onRender` also
  queried DOM nodes they could not use.
- Decision: resolve explicit widths without layout reads, refresh DOM text
  state once per render boundary, and guard focus and render-callback queries
  behind their active state.
- Verification: three optimized full-profile runs mounted 64 charts in
  26.7–26.9 ms median versus 27.8–28.7 ms in two baseline runs. Median resize
  updates improved from 29.4 ms to 26.2–26.6 ms; same-shape updates improved
  from 24.3–24.4 ms to 23.6–24.1 ms. The locked DOM-host bundle grows by 21
  minified bytes and 8 gzip bytes. The composed interactive fixtures changed
  by 21 minified bytes and 51–64 Brotli bytes; their baselines moved by only
  those isolated A/B deltas rather than rebasing previously tolerated growth.
  Focused host tests, all 83 core tests, strict typecheck, and both bundle
  checks pass.

### F-083 — One-shot pointer timing hid sustained cursor work

- Status: resolved
- Severity: medium
- Owner: Tooling
- Observed in: cross-library interactive-scatter stress comparison
- Friction: an inactive-to-active tooltip probe measured startup latency but
  said nothing about a cursor already moving across data. A renderer could
  activate once, then retain stale content or update slowly without failing.
- Decision: expose deterministic fractional data targets and a rendered
  tooltip-state signature from every stress adapter. After activation,
  Playwright sweeps across 20, 100, or 300 targets using trusted pointer
  events and resolves each sample only after the active signature changes.
- Verification: the focused quick matrix changes state at all 20 targets for
  TanStack Charts, Chart.js, ECharts, Recharts, and Observable Plot with zero
  correctness failures. TanStack's active-to-active p95 is 0.5 ms in that run;
  the report keeps this separate from its 5.7 ms inactive activation p95.

### F-084 — Gesture and viewport costs were conflated

- Status: resolved
- Severity: medium
- Owner: Tooling
- Observed in: cross-library zoom and crop stress design
- Friction: a wheel or brush benchmark combines application-owned gesture
  policy, optional D3 controller work, framework state propagation, and the
  renderer's domain update. That makes a cross-library timing difference
  impossible to attribute.
- Decision: add a controlled viewport workload that gives every renderer the
  same 2,999-row extrema-preserving envelope, reuses the row array, and
  alternates only an explicit numeric x domain. Keep trusted wheel, drag,
  cancellation, clamping, and recovery behavior in the conformance suite.
- Verification: the focused quick matrix passes all five libraries with exact
  output-domain and SVG frame-clipping probes with zero correctness failures.
  TanStack's viewport update is 2.5 ms p95 for a 100,000-row source encoded
  into 2,999 vertices, within the frame budget. Preparation remains separately
  measured at zero for the domain-only transition.

### F-085 — Grid style repeated on every rule

- Status: resolved
- Severity: medium
- Owner: API
- Observed in: node-heavy SVG update profiling
- Friction: every grid rule repeated the same inherited `stroke`,
  `stroke-opacity`, and `stroke-width`, increasing serialized SVG, attribute
  parsing, and reconciliation work without carrying datum-specific state.
- Decision: place only those three safely inherited presentation attributes on
  the existing grid group. Keep geometry on each rule and keep any
  non-inherited or compositing-sensitive style child-owned.
- Verification: focused scene and SVG tests prove the group owns the style and
  serialized rules omit all three attributes. Core passes 84 tests. Ordinary
  grids remove 30 attributes and 610 SVG bytes; the 128-bin histogram removes
  399 attributes and 8,113 SVG bytes. Every affected locked bundle shrinks by
  54 minified bytes and 0–5 gzip bytes, and the exact baselines record the
  reduction.

### F-086 — Finding status drifted from the index

- Status: resolved
- Severity: low
- Owner: Tooling
- Observed in: durable API-friction review before skill generation
- Friction: the index called F-008 open after its finding was resolved, while
  five documentation findings used `documentation` instead of one of the
  log's declared statuses. An agent reading only the index or only a finding
  would receive different routing guidance.
- Decision: normalize every finding to `open`, `monitoring`, or `resolved`, and
  test that IDs are unique, sequential, present in both locations, and carry
  identical statuses.
- Verification: the focused documentation test passes both structural checks
  across all 86 findings.

### F-087 — Custom focus strategies erased application types

- Status: resolved
- Severity: medium
- Owner: API
- Observed in: advanced interaction inversion-of-control type audit
- Friction: `ChartFocusStrategy` made each method independently generic, so a
  custom strategy had to accept every possible datum and coordinate type. A
  hoisted strategy could not safely inspect an application datum or use its
  inferred string, number, or Date coordinates without narrowing or an
  assertion.
- Decision: parameterize `ChartFocusStrategy` and `ChartFocusMode` by datum,
  x-value, and y-value. Host and adapter options use the definition as the
  inference source, while the built-in `focusX`, `focusY`, nearest-axis, and
  disabled strategies remain genuinely polymorphic.
- Verification: strict contracts let a custom categorical strategy use datum
  fields and string/number operations directly, reject a numeric-x strategy
  for a string-x chart, and continue accepting built-in focus strategies for
  categorical and heterogeneous definitions. Core focus tests and the
  repository typecheck pass. The public contract adds no dependency or
  observable behavior; the built-in strategy implementation was reshaped to
  preserve its polymorphism.

### F-088 — Update counts hid key and latest-wins correctness

- Status: resolved
- Severity: high
- Owner: Tooling
- Observed in: rolling-window and multi-series stress protocol review
- Friction: a renderer could preserve the expected number of points while
  reassigning series ownership, remounting every surviving key, selecting the
  wrong grouped x value, or allowing a superseded rapid update to overwrite
  the final state. Item counts, raw SVG signatures, and a single tooltip
  activation could not distinguish those failures.
- Decision: add an immutable rolling feed with exact logical datum probes,
  five-percent overlap accounting, monotonic awaited streams, and synchronous
  latest-wins bursts. Gate TanStack's surviving keyed SVG nodes and report
  physical reuse where other SVG renderers expose it. Multi-series output now
  requires ordered identities, stable color ownership, explicit domains, and
  exact focused x and per-series values before and after structural updates.
  Canonical SVG signatures normalize generated resource IDs. Idle stability
  uses rendered-pixel signatures, while an idempotent replay compares exact
  logical/output probes: Chart.js and ECharts can rasterize the same canonical
  data to byte-different antialiased pixels after a fresh draw.
- Verification: deterministic data tests prove exact removed, added, overlap,
  object-identity, domain, and semantic-digest behavior at the protocol
  boundary. All five rolling and multi-series adapter bundles compile with
  stress-only probes, strict typecheck passes, and normal comparison builds
  define the rolling feature off. The exact grouped-value gate caught a
  Chart.js adapter declaring `parsing: false` while the reorder update supplied
  descending x values: Chart.js consequently treated the data as sorted and
  selected x 258 when the authored pointer target was x 129. Leaving parsing
  enabled for that input lets Chart.js detect the unsorted series; the focused
  quick workload now passes exact x and all eight series values for initial,
  reorder, append, and visibility states. Failure output retains both expected
  and observed x, identities, and values. The standard Recharts rolling run
  then exposed a second false-positive shape: its output probe counted both
  each renderer-owned scatter wrapper and a nested custom mark carrying the
  same class, reporting 2,000 items for 1,000 rows and 10,000 for 5,000. The
  probe now counts only top-level Recharts symbol layers, independently of
  authored data attributes; DOM regressions cover both default and nested
  custom shapes. Scatter item gates now require exact equality across every
  adapter. The canonical five-library quick matrix passes all 55 cells,
  including exactly 1,000 rolling items per adapter. The integrated standard
  multi-series and rolling matrix passes all 15 cells at 24×520, 1,000, and
  5,000 rows with exact output and grouped interaction probes. Every
  48-revision latest-wins burst drains to the stable final digest. TanStack
  reuses all 950 and 4,750 surviving keyed nodes, while the observable SVG
  competitors reuse none, and retains no DOM nodes or listeners after the
  lifecycle soak. A focused full run extends the exact gate to 96 revisions
  and 10,000 dots: all 9,500 survivors retain their nodes and the final scene
  is correct, while the 2.56-second synchronous enqueue makes the application
  ownership boundary explicit. The dynamic-chart guide now distinguishes
  correctness from free coalescing and tells latest-only sources to commit at
  the display cadence upstream.

### F-089 — Custom SVG renderers erased scene point types

- Status: resolved
- Severity: medium
- Owner: API
- Observed in: advanced renderer inversion-of-control type audit
- Friction: `ChartSvgRenderer` accepted only a broadly typed `ChartScene`, even
  when the consuming chart definition had exact datum, x-value, and y-value
  types. A custom renderer that inspected scene points therefore lost the
  inference available to focus, tooltip, and render callbacks.
- Decision: parameterize `ChartSvgRenderer` by datum and coordinate values and
  connect host, React, and Octane renderer props to the definition-owned types.
  `NoInfer` keeps the chart definition, rather than an optional callback, as
  the inference source. The existing generic built-in renderer remains
  assignable without consumer annotations.
- Verification: a strict host contract infers row, string-x, and numeric-y
  values inside an inline renderer and rejects a numeric-x renderer for the
  same categorical chart. The full repository typecheck passes; the change is
  declaration-only outside the adapters' already-erased private memo surface.

### F-090 — Source exports hid packed-package failures

- Status: resolved
- Severity: high
- Owner: Tooling
- Observed in: packed core, React, and Octane consumer validation
- Friction: workspace source exports proved neither the files a package would
  publish nor the declarations and runtime conditions a clean consumer would
  resolve. The first real tarball check found that public `d3-shape`
  declarations depended on `@types/d3-shape` even though it was owned only as a
  development dependency. Octane also requires distinct browser and server
  entry artifacts.
- Decision: keep source exports for workspace development and define
  conditional `publishConfig.exports` over built `dist` artifacts. A
  deterministic gate stages the declared package files, builds client and
  server outputs, normalizes sibling workspace dependency ranges, creates real
  tarballs, and installs only those TanStack tarballs into a disposable
  fixture. Public declaration dependencies now travel with the core package.
  Third-party packages are linked from the installed workspace solely to keep
  the gate offline; this does not claim registry installability.
- Verification: `pnpm package:check` resolves every core subpath and both
  adapters from fixture-owned `dist` files, exercises core, React, and Octane
  runtime rendering, and passes strict consumer declarations for required
  dynamic input, exact point coordinates, definition-derived datum and
  coordinate helpers, custom focus, and custom SVG rendering without casts.
  Minimal packed production consumers measure 33.43 kB / 13.32 kB gzip for
  core, 47.95 kB / 18.65 kB for React, and 27.90 kB / 10.78 kB for Octane.

### F-091 — Adapter coordinate generics broke explicit arity

- Status: resolved
- Severity: medium
- Owner: API
- Observed in: React and Octane public-signature compatibility audit
- Friction: adding definition-owned x-value and y-value generics to the
  adapter overloads made every generic parameter required. Existing explicit
  `Chart<Datum>` and `Chart<Datum, Input>` calls stopped compiling even though
  fully inferred calls remained sound.
- Decision: default only the trailing coordinate generics to `ChartValue` in
  the React and Octane overloads, including Octane's manual declaration. The
  definition remains the inference source when consumers omit explicit
  generics.
- Verification: source contracts compile the prior one-parameter static and
  two-parameter dynamic call shapes. The packed strict fixture independently
  infers exact datum, x-value, and y-value types for inline React and Octane
  focus strategies and SVG renderers, while rejecting incompatible numeric-x
  strategies and renderers without explicit component generics. Repository
  typecheck and `pnpm package:check` pass.

### F-092 — Packed documentation linked outside its tarball

- Status: resolved
- Severity: high
- Owner: Documentation/Tooling
- Observed in: packed core, React, and Octane documentation audit
- Friction: relative links in package Markdown worked from the repository
  checkout but could point to benchmarks, acknowledgements, or other files
  omitted from the published tarball. A clean npm consumer received broken
  documentation even though every source link resolved locally.
- Decision: package-owned documentation links relatively only to files shipped
  in the same package. Repository-only evidence and shared source material use
  canonical GitHub URLs. The packed-consumer gate now reads every Markdown file
  reported by `pnpm pack --json`, resolves its inline, image, and reference
  links from that file, and rejects missing files or paths escaping the same
  tarball. Absolute URLs, fragments, query-only links, and `mailto:` links
  remain valid.
- Verification: focused helper tests cover inline, image, reference, encoded,
  nested-parenthesis, fragment, query, absolute URL, code-span, fenced-code,
  missing-file, traversal, root-relative, and malformed destinations.
  `pnpm package:check` validates the staged core, React, and Octane tarballs,
  while `pnpm adapters:check` applies the same packed Markdown-link contract
  to Preact, Vue, Solid, Svelte, Angular, Lit, and Alpine. The friction-log
  structural tests pass.

### F-093 — Filtered stress runs overwrote canonical reports

- Status: resolved
- Severity: high
- Owner: Tooling
- Observed in: focused Recharts and Chart.js multi-series browser gates
- Friction: every stress invocation wrote
  `stress-<profile>.{json,md}`, so a one-library or one-workload diagnostic run
  silently replaced the complete profile matrix and its durable evidence.
- Decision: keep canonical filenames only for unfiltered profiles. Derive
  filtered artifact names from sorted, deduplicated, filesystem-safe library
  and workload IDs, with a bounded digest for long selections. Store the
  resolved filters in result metadata so artifact scope is explicit.
- Verification: four helper tests cover canonical, deterministic, sanitized,
  collision-resistant, and bounded names. A real filtered Chart.js quick run
  emitted
  `stress-quick--libraries-chartjs--workloads-stats-multi-series-line.{json,md}`
  with matching filter metadata and zero correctness failures; pre- and
  post-run hashes of both canonical quick artifacts remained identical.

### F-094 — Custom marks conflated point and scale values

- Status: resolved
- Severity: medium
- Owner: API/Documentation
- Observed in: rect/cell scale-domain and point-value type separation
- Friction: `ChartMark` could correctly distinguish the values materialized
  into positional scales from the values emitted in interaction points, but
  the public `createMark` factory exposed only the point-value generics. An
  advanced custom interval mark needed a manual return annotation or had to
  widen both contracts, losing either callback precision or scale checking.
- Decision: keep the ordinary `createMark` signature unchanged and add the
  `@tanstack/charts/mark/scale-values` subpath with a
  `createMarkWithScaleValues` factory for the exceptional split contract. An
  attempted five-parameter overload on `createMark` changed esbuild's minifier
  assignment and added 1–4 gzip bytes to ordinary consumers despite erasing
  from JavaScript; re-exporting the isolated factory from the root still added
  one gzip byte. Both were rejected. The exceptional factory must remain zero
  bytes when unused.
- Verification: a strict custom-mark contract declares numeric point values
  and categorical/numeric scale values without an assertion, accepts a band x
  scale, rejects a linear x scale, and preserves numeric x in the inferred
  definition callbacks and in `ChartSpecXValue`/`ChartSpecYValue` after
  declaration emit. Exact locked ordinary bundles remain unchanged. The
  isolated entry is 0.13 kB gzip against a 0.25 kB ceiling, and the packed
  package gate resolves the source and declaration subpath for Node, browser,
  and bundler consumers.

### F-095 — Long matrices treated one browser stall as deterministic

- Status: resolved
- Severity: medium
- Owner: Tooling
- Observed in: complete five-library standard stress run
- Friction: 99 of 100 cells completed, but one ECharts Stats-shaped timing
  cell exceeded the 120-second outer limit after a long sequential run. The
  exact same production bundle and profile passed immediately in a fresh
  isolated run with 9.3 ms mount p95, 4.5–5.7 ms update p95, 100 exact grouped
  pointer states, and zero correctness failures. Treating the first stall as a
  renderer regression made the canonical gate nondeterministic.
- Decision: retry only an outer cell timeout or browser-context
  infrastructure failure, exactly once in a fresh browser context. Renderer,
  adapter, page, protocol, and correctness failures are not retryable; a
  one-off blank render or stale pointer state cannot become green on a second
  attempt. Record every attempted error in JSON and Markdown. A repeated
  failure remains hard; clean first attempts are unchanged.
- Verification: the focused ECharts rerun passes the complete standard cell.
  Six unit tests gate clean, recovered, persistent, and non-retryable paths;
  timing and memory recovery render `r`, persistent timing or memory failure
  renders `x`, and both errors from a failed retry remain available to the
  report. The final unfiltered five-library standard run completed all
  100 cells with zero correctness failures and zero retries; the formerly
  stalled ECharts Stats-shaped cell passed on its first attempt.

### F-096 — Export smoke tests drifted from package manifests

- Status: resolved
- Severity: medium
- Owner: Tooling
- Observed in: final public-package surface audit
- Friction: the source export smoke tests claimed to resolve every documented
  capability subpath but duplicated hand-written lists. The core list omitted
  ten current exports, including focus, custom scale-value marks, SVG
  resources, and several mark capabilities; the D3 package list omitted its
  root, focus, and SVG resources exports.
- Decision: derive source export specifiers directly from each package's
  `exports` manifest and dynamically import every declared entry. Keep the
  packed-package gate as the independent proof that the corresponding
  published runtime and declaration exports resolve.
- Verification: both source export tests resolve every manifest entry,
  including the root exports, and `pnpm package:check` validates every staged
  published subpath for Node, browser, and bundler consumers.

### F-097 — Lifecycle page errors passed the memory soak

- Status: resolved
- Severity: high
- Owner: Tooling
- Observed in: final adversarial stress-protocol audit
- Friction: timing cells rejected browser `pageerror` and console errors, but
  memory cells did not listen for either. An error exposed only by repeated
  mount, update, or destroy cycles could therefore return `status: "ok"` and
  pass validation with misleading lifecycle metrics.
- Decision: use one shared page-error collector in timing and memory cells.
  Deduplicate page and console errors, ignore non-error console messages, and
  throw the same non-retryable `Page errors:` failure before either cell can
  succeed.
- Verification: focused collector tests cover non-error exclusion plus
  page/console aggregation and deduplication. The retry, artifact-scope, and
  page-error suites pass all 12 tests; stress-runner syntax and repository
  whitespace checks pass.

### F-098 — Filtered conformance runs overwrote full reports

- Status: resolved
- Severity: high
- Owner: Tooling
- Observed in: final conformance-artifact audit
- Friction: a focused `--case` catalog run always wrote
  `plot-catalog.{json,md}`, silently replacing the complete 79-case report
  consumed by CI and documentation with a partial result.
- Decision: retain the historical canonical filenames only for unfiltered
  runs. Give filtered runs deterministic, sorted, deduplicated,
  filesystem-safe `plot-catalog--cases-<selection>` names with a bounded
  digest for long selections, and record the resolved filter in JSON.
- Verification: four helper tests cover canonical, deterministic, sanitized,
  collision-resistant, and bounded names. A real one-case size run emitted
  `plot-catalog--cases-90-zoomable-time-window.{json,md}` with explicit filter
  metadata; hashes of both canonical 79-case artifacts remained unchanged.

### F-099 — Invalid cells remained eligible for fastest rankings

- Status: resolved
- Severity: high
- Owner: Tooling
- Observed in: final adversarial stress-report audit
- Friction: renderer completion and correctness were separate states, but the
  Markdown report selected rows only by `status: "ok"`. A completed cell with
  a digest, accounting, pointer, memory, or burst failure could still appear in
  metric tables and be named the fastest library.
- Decision: count renderer completion independently, then exclude every cell
  with a matching correctness failure from Markdown metrics and fastest-result
  comparisons. Preserve the complete row and failure evidence in JSON.
- Verification: focused validity tests distinguish completion from
  correctness, exclude an exactly matching failed cell, and guard against
  prefix collisions between cell IDs.

### F-100 — Spatial-index updates skipped focused UI repaint

- Status: resolved
- Severity: medium
- Owner: API
- Observed in: final DOM-host lifecycle audit
- Friction: a no-render host update treated spatial-index replacement and
  focused UI repaint as mutually exclusive branches. Changing the spatial
  index while disabling or reformatting the tooltip rebuilt pointer lookup but
  left the old focused tooltip visible and stale until another interaction.
- Decision: refresh the optional spatial index and repaint existing focus as
  independent work in the no-render update path. This preserves the current
  scene and SVG while applying every changed interaction option immediately.
- Verification: a focused runtime regression mounts an active tooltip, changes
  the spatial index and disables the tooltip in one shallow-equal update, then
  proves the replacement index was created and the existing tooltip was
  hidden. The clean branch shrinks affected consumers by five minified bytes
  and adds 1–2 gzip bytes; that measured correctness cost is recorded in the
  exact universal bundle lock. Core runtime tests, repository typecheck,
  formatting, bundle policy, and the friction-log structural checks pass.

### F-101 — Page errors could age into retryable timeouts

- Status: resolved
- Severity: high
- Owner: Tooling
- Observed in: final adversarial retry-protocol audit
- Friction: per-cell page-error collectors asserted only after a timing or
  memory operation returned. If an uncaught error also left a renderer
  completion promise pending, the 120-second outer timeout won the race and
  became retryable. A clean second attempt could then hide the original
  correctness failure.
- Decision: subscribe to existing and newly created pages at the browser
  context boundary. Race an immediate page/console-error rejection alongside
  the cell operation and timeout so the error remains non-retryable even when
  renderer settlement never completes. Keep the end-of-cell collectors as a
  defensive aggregate.
- Verification: four focused page-error tests cover aggregate deduplication,
  non-error console exclusion, a new page's uncaught error, and an existing
  page's console error. Retry tests continue to reject non-retryable
  correctness failures after one attempt. A real focused Chromium run completes
  the Stats-shaped timing, trusted-pointer, sustained-update, and memory-soak
  cell with zero correctness failures and zero retries.

### F-102 — AI recipes hid direct D3 dependency ownership

- Status: resolved
- Severity: high
- Owner: Documentation/Tooling
- Observed in: final packed AI-documentation audit
- Friction: package docs repeatedly instructed applications to import granular
  `d3-*` modules without saying those modules and their `@types/*` packages
  must be direct dependencies under strict package managers. The log-scatter
  recipe also called `defineChart` and `dot` without importing them, while the
  Stats migration duplicated a stale exact bundle checkpoint.
- Decision: make the core README and `llms.txt` explicit about consumer-owned
  D3 dependencies, give both adapter READMEs exact direct-install examples,
  make the recipe self-contained, and link Stats to the canonical measured
  table rather than copying values. Model the documented D3 imports as direct
  dependencies in the packed-consumer fixture.
- Verification: the packed declaration consumer directly declares and
  resolves `d3-array`, `d3-scale`, `d3-shape`, and their matching type packages
  while compiling imports from all three beside the packed TanStack packages.
  Packed Markdown link validation and the package gate pass.

### F-103 — Mixed valid and unknown filters narrowed benchmark scope

- Status: resolved
- Severity: high
- Owner: Tooling
- Observed in: final benchmark CLI audit
- Friction: stress and conformance filters rejected a selection only when
  nothing matched. A command containing one valid ID and one typo silently ran
  the valid subset, allowing a user or agent to believe the missing library,
  workload, or case had been tested.
- Decision: validate every requested filter value against the complete
  configured ID set before selecting work, building bundles, or launching a
  browser. Report all unknown values and the sorted available set in one
  actionable error.
- Verification: focused tests accept absent and completely known filters while
  rejecting a mixed valid/unknown selection with every typo named. Both
  benchmark runners pass syntax checks and retain their existing empty-scope
  guards. A real mixed `tanstack,typo` stress invocation exits before browser
  launch and lists `typo` plus every available library ID.

### F-104 — Catalog embeds lacked a production-safe contract

- Status: resolved
- Severity: high
- Owner: Tooling/Integration
- Observed in: integrating catalog iframes into the TanStack Charts
  documentation
- Friction: an omitted `height` query value became 120 pixels because
  `Number(null)` is zero; the root document retained a 320-pixel minimum width
  in embed mode; status messages used an unversioned type and wildcard target;
  and a documentation theme controlled by site state could not update an
  already interactive iframe. The intended production origin and base path
  were described but not exercised by the build gate.
- Decision: publish one versioned embed contract in the schema-v3
  `catalog.json`, retain it in schema v4, and fix the production route at
  `https://tanstack.com/charts/catalog/`; parse explicit query defaults and
  bounds; remove root and body width/background constraints in local embed
  mode; derive the exact parent origin from the HTTP(S) referrer; and accept a
  versioned `set-theme` command only from that origin and `window.parent`. A
  missing or opaque referrer disables messaging instead of falling back to
  `*`. TanStack.com owns the production embed route and response headers.
- Verification: focused contract and route tests cover missing, invalid,
  bounded, and production-base inputs plus source/origin/case/version
  rejection. The generated artifact carries the shared contract and canonical
  page/embed paths for every case. A real 280-pixel production-preview iframe
  renders without horizontal overflow or catalog chrome, defaults to 360
  pixels when height is omitted, reports one exact-origin/source versioned
  ready event, accepts the trusted theme command, and ignores a wrong-case
  command. Typecheck and catalog metadata validation pass.
- Production verification: during the `0.0.1` audit, the public schema-v4
  manifest identified release `15dcb156a32db361678f4cffeb116a2bd0fc0e79`;
  its response revision header identified artifact
  `630ed0d13d512288b8e33f3817c80b76e25d6173`. The embed responded with 200 and
  no `X-Frame-Options`; normal catalog pages retained
  `X-Frame-Options: DENY`. A live browser rendered the requested dark theme,
  exact 420-pixel chart height, expanded source, and chart without errors or
  warnings.

### F-105 — Competing documentation roots drifted

- Status: resolved
- Severity: high
- Owner: Documentation/Tooling
- Observed in: authoring the publishable TanStack Charts documentation
- Friction: repository-level plans, package-local guides, adapter READMEs, and
  prospective website pages could each describe the same API independently.
  Existing package guides had already accumulated incomplete imports, stale
  measurements, and contradictory lifecycle claims.
- Decision: make root `docs/` the only authored documentation tree. Generate
  the package-local mirror and both `llms.txt` indexes from it. Keep README
  content introductory and route detailed behavior to one canonical page.
  Validate navigation completeness, frontmatter, local links, public exports,
  D3 ownership, and catalog embeds in CI.
- Verification: the canonical contract covers 79 configured pages and 83
  unique catalog embeds. `docs:sync` reproduces the package mirror byte for
  byte, and `docs:check` rejects stale generated files or a second direct D3
  reference owner.

### F-106 — Build-context theme looked fully resolved

- Status: resolved
- Severity: medium
- Owner: Documentation
- Observed in: dynamic-definition and theme reference authoring
- Friction: `ChartBuildContext.theme` sounds like the final scene theme, but a
  dynamic builder receives `defaultChartTheme`; a `theme` returned by that
  builder is merged later during scene creation.
- Decision: describe the value consistently as the default build-time theme.
  Theme-aware builders that need application overrides receive them through
  typed input; the final resolved theme remains available on `ChartScene`.
- Verification: the concepts, theme guide, chart-definition reference, and
  type reference use the same ownership language, and a source audit traces
  the default token through `createChartRuntime` and the later scene merge.

### F-107 — Authored SVG tab indexes were ignored

- Status: resolved
- Severity: high
- Owner: API
- Observed in: documenting host and adapter accessibility options
- Friction: `ChartHostCommonOptions` exposed `tabIndex`, but the DOM host
  always passed `0` while keyboard behavior was enabled and did not rebuild
  when only `tabIndex` changed. React and Octane could not preserve an authored
  value consistently between server and client.
- Decision: use `options.tabIndex ?? 0` whenever keyboard behavior is enabled,
  retain `-1` as the `keyboard: false` override, include `tabIndex` in render
  invalidation, and expose the same prop through both adapters.
- Verification: core and React regressions cover initial output and updates;
  Octane shares the same server renderer and host option. Focused runtime,
  adapter, type, and accessibility tests pass.

### F-108 — Interaction point color differed from rendered fill

- Status: resolved
- Severity: high
- Owner: API
- Observed in: tooltip and focus reference authoring
- Friction: `barX`, `barY`, `areaX`, and `areaY` could paint an explicit or
  accessor-derived fill while emitting the fallback ordinal color on
  `ChartPoint`. Native focus rings and tooltip swatches therefore disagreed
  with the visible mark.
- Decision: resolve fill once per datum or series and use that exact value for
  both scene paint and the interaction point.
- Verification: focused mark tests use deliberately different ordinal
  fallbacks and cover constant and accessor fills for all four marks.

### F-109 — Grouped focus could duplicate the focused series

- Status: resolved
- Severity: high
- Owner: API
- Observed in: validating the grouped focus reference against source
- Friction: grouped focus chose the first point encountered for each group,
  then prepended the focused point. Restoring a later same-group point could
  therefore return two representatives for one series, contradicting native
  tooltip and callback semantics.
- Decision: seed the per-group map with the focused point before collecting
  representatives from the remaining candidates.
- Verification: a regression restores the second same-group point and asserts
  exactly one member for that group with the focused point first.

### F-110 — Hexagon radius mapping accepted invalid source values

- Status: resolved
- Severity: medium
- Owner: API
- Observed in: auditing the dot and hexagon reference contract
- Friction: `dot` rejected negative raw radii before calling `rScale`, while
  `hexagon` passed every finite value through. A mapper such as `Math.abs`
  could turn invalid negative input into a visible hexagon.
- Decision: share one finite, nonnegative radius predicate across both marks
  and apply it before optional radius mapping and after mapped output.
- Verification: a regression proves that a negative raw radius neither calls
  the mapper nor emits a point while a valid sibling still renders.

### F-111 — Adapter aspect-ratio geometry diverged on first render

- Status: resolved
- Severity: high
- Owner: API
- Observed in: React, Octane, responsive, and SSR documentation
- Friction: with explicit `width` and `aspectRatio`, both adapters derived the
  initial height from `initialWidth` but built the scene at the explicit
  width. Negative and nonfinite ratios also produced invalid outer CSS while
  the runtime used a different fallback.
- Decision: resolve the initial scene width as `width ?? initialWidth`;
  normalize aspect ratio to a positive finite number; and use those values for
  server geometry, host options, and outer styles. Apply the same finite
  fallback in the vanilla DOM host.
- Verification: React SSR, Octane SSR/client, and core-host regressions cover
  explicit width plus ratio and zero, negative, `NaN`, and infinite values.
  The exact bundle lock records the combined tab-index and sizing corrections
  at +90 minified/+25 gzip bytes for the DOM host, +163/+49 bytes for the React
  adapter, and +165/+52 bytes for the complete React line consumer.

### F-112 — Reference rules could not render dashed strokes

- Status: resolved
- Severity: low
- Owner: API
- Observed in: authoring a layered chart-spec example
- Friction: a dashed threshold required by the example could be expressed by
  lines and links but not by `ruleX` or `ruleY`, forcing an unnecessary custom
  mark or unsupported cast for a routine annotation.
- Decision: add `strokeDasharray` to both rule option types and forward it
  through the existing scene style and SVG renderer.
- Verification: the composed-mark test asserts both rule orientations retain
  their dash arrays in the scene and serialized SVG. The representative-marks
  lock records the capability at +34 minified bytes and -1 gzip byte.

### F-113 — Direct runtime factories cannot infer later definitions

- Status: monitoring
- Severity: low
- Owner: API/Documentation
- Observed in: authoring the runtime, SSR, and TypeScript reference pages
- Friction: `createChartRuntime()` is called before `runtime.render()` receives
  a definition, so TypeScript cannot infer the datum, x-value, and y-value types
  from that later call. The low-level direct-runtime examples require all three
  generic arguments even though normal hosts and adapters infer them from
  `definition`.
- Decision: document the three explicit generics at the advanced direct-runtime
  boundary and keep the common host and adapter paths fully inferred. Do not
  add a definition token or second runtime-construction shape until repeated
  direct-runtime use shows that the extra API surface would pay for itself.
- Verification: the runtime and SSR pages use the exact generic order, while
  host, React, Octane, and packed declaration tests continue to prove
  definition-driven inference without casts or adapter generics.

### F-114 — Gradient stop tokens disappeared from standalone exports

- Status: resolved
- Severity: high
- Owner: API
- Observed in: validating the export guide against CSS-variable theme examples
- Friction: standalone SVG export inlined computed presentation properties for
  chart nodes but omitted `stop-color` and `stop-opacity`. A gradient that
  depended on inherited CSS variables could therefore look correct in the DOM
  and lose its colors when downloaded.
- Decision: include both gradient stop properties in the computed-style
  serialization allowlist.
- Verification: the export regression uses computed CSS-variable values on
  gradient stops and asserts that the standalone SVG contains their resolved
  color and opacity.

### F-115 — Documentation checks did not validate code snippets

- Status: resolved
- Severity: high
- Owner: Tooling
- Observed in: final documentation and public-export audit
- Friction: the documentation contract proved that a TanStack package subpath
  existed and that every public export appeared somewhere in the reference,
  but it did not prove that a named import came from the entry that exported it
  or that a typed code fence was syntactically valid. Heading fragments were
  also accepted without proving the destination existed. Plausible, copyable
  snippets could pass with a wrong type import or a bare object-property
  fragment that was not valid TypeScript, while cross-page navigation could
  silently land at the top. Primary README examples could still be
  syntactically valid while passing an option to the wrong API boundary.
- Decision: parse typed code fences in canonical docs and public READMEs,
  reject syntax diagnostics, resolve every TanStack specifier through its
  package manifest, and validate every named value and type import against
  that source entry. Resolve local Markdown fragments against generated
  heading anchors, including duplicate-heading suffixes. Designate primary
  standalone examples in canonical docs and public READMEs for strict
  TypeScript checking; compile the Octane quick start in both client and server
  modes.
- Verification: the contract rejects invalid typed syntax, unknown subpaths,
  unknown symbols, and missing headings; helper tests cover syntax,
  named-import extraction, heading slugs, and example discovery; 17 executable
  examples, all 81 canonical pages, and the public READMEs pass against the
  current package manifests.
- Follow-up (2026-08-08): the first progressive live React quick start added
  `live`, `file`, and `entry` fence metadata. The typed-fence and standalone
  example extractors treated any info string beyond the language as an opt-out,
  which would have silently removed the example from syntax, import, and strict
  type validation. Both extractors now accept fence metadata, and helper tests
  cover a component-first live group with a separate browser entry.
- Follow-up (2026-08-09): a repository-wide runnable-example audit found that
  adjacent catalog embeds often rendered different source than the teaching
  snippet, while multi-file examples had no environment or project boundary.
  Runnable fences now use a `group`, `env`, `file`, and `entry` contract. The
  documentation checker validates CommonMark fence metadata, isolated `/src`
  imports, environment dependency allowlists, one visible entry,
  environment-specific default exports, strict semantic TypeScript, and
  multi-file Octane client/server compilation from actual `.tsrx` paths.
  Thirty-two focused groups now provide the exact source for their future
  previews; catalog renderings fell from 89 to 52 and are retained only when
  the richer catalog case is itself the subject. Eight intentionally
  standalone snippets remain under the existing strict check.

### F-116 — Build context was mistaken for resolved plot geometry

- Status: resolved
- Severity: medium
- Owner: Documentation
- Observed in: responsive, dynamic-data, faceting, and large-data guide review
- Friction: the dynamic chart builder receives the full scene `width` and
  `height`, while the final inner plot rectangle depends on guide and legend
  measurement that happens afterward. Examples that treated the builder size
  as exact plot space could misplace pixel-based collision layouts, bins, or
  overlays at responsive widths.
- Decision: consistently call builder dimensions the outer scene bounds.
  Route exact plot-space work to a custom mark render phase or to an
  application overlay driven by the resolved `scene.chart` rectangle.
- Verification: the responsive, dynamic-data, faceting, large-data, and custom
  extension pages use the same boundary, and responsive examples no longer
  claim that builder dimensions are final inner bounds.

### F-117 — Non-Cartesian examples duplicated coordinate engines

- Status: resolved
- Severity: high
- Owner: API
- Observed in: native pie, donut, gauge, labeled pie, radar, polar
  line/scatter, radial hierarchy, and atlas-backed GeoJSON catalog expansion
- Friction: scene nodes could already carry arbitrary paths, but the public API
  did not own a non-Cartesian coordinate system. The radar case duplicated
  responsive centering, angular projection, polygon grids, spokes, and label
  placement in a 211-line custom mark; the GeoJSON case separately rebuilt
  responsive projection, paths, styling, and identity. Pie, donut, and gauge
  examples were absent rather than forcing consumers through more local marks.
  Expanding the five seed cases into the expected catalog then exposed two
  narrower holes: polar labels and radial segments still required a custom
  mark, while projected Point geometry could not pass a datum radius through
  D3 `geoPath`. The first numeric polar-line comparison also exposed that the
  specialized radial-line group lacked the generic line-role class shared by
  catalog and inspection tooling. Once pie cases were added, eight of them
  repeated a D3 pie generator and nested every raw row under `datum.data`; the
  rounded donut additionally subtracted D3 padding from every end angle and
  disabled arc padding to obtain a direct three-degree gap.
- Decision: add opt-in `@tanstack/charts/polar` and
  `@tanstack/charts/geo` entry points. `polar` copies configured D3 angle and
  radius scales into final responsive bounds and composes D3-backed arcs,
  radial lines, radial areas, dots, text, rules, and guides. `geoShape` accepts
  either a responsive projection callback or an explicit descriptor containing
  a projection `type`, `fit`, and optional pixel `inset`. Descriptors refit on
  every render to the final plot bounds. `fit: "data"` collects source
  geometries, `fit: "sphere"` preserves a complete world frame, and an
  explicit GeoJSON geometry or collection fixes the fit independently of the
  rendered rows. Path, centroid, and point-radius geometry remain delegated to
  D3. The polar entry also exposes eager `pie`, which allocates typed
  nonnegative values into flat source-linked angle intervals. It preserves
  source output order, makes angular ordering explicit, and materializes
  radius-independent `gapAngle` space before `radialArc` geometry. Geo and
  polar marks expose positionless scale phantoms, so definitions
  omit Cartesian axes and guides without repeating `x: null`, `y: null`, or
  `guides: false`. Neither capability is re-exported from the package root.
  Boundary datasets and TopoJSON conversion stay application-owned inputs
  rather than package dependencies. Outside pie labels remain granular mark
  composition rather than becoming a composite mark: `radialText` accepts a
  signed post-scale `radiusOffset` and automatic `anchor: "outside"`, while
  `radialRule` accepts independent signed post-scale endpoint offsets. The
  automatic anchor shares one private angle-based rule with `angleGrid`.
  These pixel channels never affect radius domains or reserve chart margins.
- Verification: focused polar, geo, configured-scale, and type-contract tests
  cover responsive scale copying, source-scale immutability, D3 path equality,
  data/sphere/explicit-geometry fitting, resize refits, inset clamping,
  omitted positionless axes, projected paths, interaction points, Feature
  identity independent of color values, and polygon, line, and mixed-geometry
  semantic paint defaults. Focused pie tests additionally cover source
  lineage, ordering, full and partial sweeps, gaps, overflow-safe fractions,
  D3 path parity, and exact-subpath bundle isolation. Cases 76 and 77 consume
  raw alphabet fields without a D3 pie DTO. Case 77 composes the same flat
  intervals with an ordinary responsive `radialArc` inner radius, confirming
  that donuts do not need a second allocator or composite mark. Case 78 passes
  its semantic agreement and remainder rows through the same transform with
  explicit partial start and end angles. Its focused runtime test proves flat
  lineage, the authored sweep, responsive annular geometry, semantic update
  keys, and the absence of case-owned D3 layout; the survey reduction remains
  application-owned. No gauge-specific mark or shared utility beyond `pie` and
  `radialArc` is warranted. Case 93 passes those flat intervals directly to
  arcs, rules, and text without a D3 DTO, label DTO, dynamic width callback, or
  case-owned anchor calculation. Focused core and case tests cover responsive
  pixel geometry, semantic keys and colors, direct lineage, interaction-point
  coordinates, radius-domain isolation, signed and nonfinite offsets, invalid
  semantic rows, cardinal tolerances, and authored guide overrides. The
  dedicated radial-label source fixture is 17.75 KiB gzip, excludes the pie
  allocator, and packed declarations compile both new option contracts.
  Case 94 uses the same flat intervals for an annular arc and an ordinary
  center `radialText`; its selected-frequency sum remains explicit case-owned
  semantics. Focused tests cover the aggregate, responsive annulus, exact
  center position, flat lineage, and stable independent slice/center keys.
  No center-label composite or general aggregate helper is warranted.
  Case 95 replaces its D3 pie, end-angle trim, and explicit padding suppression
  with `pie({ gapAngle })`; the existing `radialArc` continues to own the
  responsive annulus and corner radius. Focused tests prove direct seam and
  internal gaps, zero double-padding, flat lineage, stable keys, and exact
  rounded paths. No rounded-donut composite or corner-gap helper is warranted.
  Case 96 applies the same allocator independently to prepared family and
  detail rows, then composes two keyed `radialArc` layers. Focused tests prove
  aligned family boundaries, direct prepared-row lineage, responsive annuli,
  exact paths, and stable ring identity. The Flare classifier and sums remain
  case-owned; no grouped-pie or nested-donut helper is warranted.
  Case 98 allocates flat threshold bands over the same authored half-circle
  used by its angle scale, then composes existing radial rules, dot, and text
  for ticks, needle, hub, and readout. Focused tests prove every layer's
  responsive geometry and semantic identity. Radial endpoint offsets are not
  reused because these lengths scale with chart radius, and the readout keeps
  `dy` because its displacement is screen-down rather than angle-relative. No
  gauge, needle, threshold-band, or tick-range primitive is warranted.
  Cases 97 and 100 are transposed bar semantics, not pie allocation. The polar
  entry now exposes `radialBarRadius` for categorical angle bands with
  quantitative radius intervals and `radialBarAngle` for categorical radius
  bands with quantitative angle intervals. `PolarRadiusOptions.range` supplies
  responsive physical endpoints for the copied radius scale. D3 band padding
  owns categorical occupancy; semantic endpoints, raw datum identity, stable
  keys, and geometry-attached interaction survive both orientations. One
  private band resolver and one private sector trace serve both marks. The
  trace replays the same D3 arc geometry used for paint, including rounded
  corners, so focus does not accept the clipped cap corners of a full-rounded
  radial bar. The lazy arc generator prevents radial-bar geometry from entering
  unrelated polar bundles. Radial bars retain the arc inspection class but
  resolve the semantic bar motion role. No bar-ratio option, rose composite,
  radial-rectangle API, or public generic ranged-sector mark is warranted by
  these two cases.
  Standard browser comparisons for cases 76–78 pass
  at 100.0% geometry with clean visual and strict-type gates. For case 76,
  TanStack versus Recharts is 53 versus 56
  authored lines and 25.38 versus 145.71 KiB gzip; median mount is 0.10 versus
  1.20 ms and median update is 0.10 versus 0.60 ms. For case 77, it is 54
  versus 56 lines and 25.41 versus 145.72 KiB; median mount is 0.20 versus 1.20
  ms and median update is 0.10 versus 0.70 ms.
  For case 78, it is 78 versus 79 lines and 25.46 versus 145.80 KiB; median
  mount is 0.10 versus 1.10 ms and median update is 0.10 versus 0.50 ms.
  Case 93 passes at 99.9% geometry with 81 versus 72 authored lines and 34.16
  versus 145.78 KiB gzip; median mount is 0.20 versus 1.40 ms and median update
  is 0.20 versus 1.00 ms. Case 94 passes at 99.9% geometry with 75 versus 74
  authored lines and 33.97 versus 145.84 KiB gzip; median mount is 0.20 versus
  1.20 ms and median update is 0.10 versus 0.60 ms.
  Case 95 passes at 100.0% geometry with 59 versus 61 authored lines and 25.43
  versus 145.73 KiB gzip; median mount is 0.20 versus 1.10 ms and median update
  is 0.10 versus 0.60 ms.
  Case 96 passes at 100.0% geometry with 134 versus 151 authored lines and
  25.57 versus 145.98 KiB gzip; median mount is 0.20 versus 1.50 ms and median
  update is 0.10 versus 0.80 ms.
  Case 98 passes at 100.0% geometry with 139 versus 134 authored lines and
  34.79 versus 146.13 KiB gzip; median mount is 0.20 versus 1.20 ms and median
  update is 0.20 versus 0.60 ms.
  Case 97 passes at 100.0% geometry with 60 versus 71 authored lines and 34.08
  versus 145.79 KiB gzip; median mount is 0.20 versus 1.30 ms and median update
  is 0.10 versus 0.80 ms. Case 100 passes at 99.9% geometry with 65 versus 76
  authored lines and 34.08 versus 145.09 KiB gzip; median mount is 0.20 versus
  1.60 ms and median update is 0.10 versus 1.10 ms. Focused tests additionally
  cover implicit and explicit intervals, fixed domains, responsive ranges,
  source-scale immutability, exact rounded paths, painted containment, semantic
  motion role, raw lineage, stable keys, and removal of both authored D3 arc
  generators and case 100's transform utility. The dual-orientation bundle is
  21.38 KiB gzip under its 21.5 KiB cap; packed runtime verifies four painted
  paths and both public option contracts. The unavoidable shared radius-range
  branch moves the gauge and polar line/scatter fixtures to 20.99 and 22.46
  KiB gzip under narrowly reviewed 21.05 and 22.55 KiB caps.
  Packed declarations, runtime, and isolation pass. The exact pie-only
  consumer is 2.10 kB minified and 1.06 KiB gzip with no D3 runtime; universal,
  core, and React fixtures that do not import pie reject its allocation module.
  Root typecheck passes.

### F-118 — Serialized SVG discarded interaction semantics

- Status: monitoring
- Severity: medium
- Owner: API/Application
- Observed in: adding tooltips to the TanStack Charts landing-page SVGs
- Friction: `renderChartSvg` preserved mark geometry, axis keys, focus
  affordances, and accessible chart text, but not the resolved `ChartPoint`
  scene or tooltip runtime. Keeping the marketing assets as portable server
  SVG therefore required one application adapter to recover points from
  circles, bars, line paths, and axis coordinates. Rounded SVG coordinates
  also placed interpolated dates seconds before midnight, so date tooltips
  needed exact encoded mark keys when available and UTC-day snapping
  otherwise. The activation hero also retained only its serialized SVGs; a
  landing-page source comparison had no checked-in definition that could prove
  which marks and scales generated them. A later kinetic hero exposed the same
  boundary for motion: serialized states retained `data-ts-key` identity but
  had no live reconciler, so a crossfade was the only automatic transition.
- Decision: keep this recovery logic isolated in the landing-page interaction
  component and do not present serialized SVG as a generally hydratable chart
  contract. Keep the activation definition as generator input and import that
  same file as the highlighted landing-page source so the evidence and SVG
  cannot drift. The kinetic definitions share rows, mark IDs, datum keys, and
  one view box; the landing adapter interpolates compatible path data and SVG
  attributes, with a crossfade only for unmatched geometry. Revisit supported
  interaction metadata or hydration only if another static-SVG consumer
  encounters the same boundary.
- Verification: all 14 landing SVG variants and the custom bundle chart expose
  formatted pointer and keyboard tooltips; compact and wide revenue tooltips
  retain exact dates and grouped series values. Regenerating the activation
  asset from the retained definition reproduces both prior SVGs byte for byte,
  and the generator check covers the displayed definition. All six kinetic
  states emit the same eight keyed product points; compatible lines, areas, and
  stems retain mark identity while the browser interpolates their geometry.
  Site typechecking, targeted type-aware lint, unit tests, production build,
  and desktop/mobile browser checks pass.

### F-119 — Catalog hosting crossed repository ownership

- Status: resolved
- Severity: high
- Owner: Tooling/Integration
- Observed in: publishing the executable catalog at
  `https://tanstack.com/charts/catalog/`
- Friction: the catalog source, conformance contract, and production build
  belong to the Charts repository, while the public hostname is served by the
  separate `tanstack.com` repository. Copying source into that repository would
  couple releases and duplicate build ownership. A separate catalog Worker
  preserved ownership but necessarily replaced the site's chrome, routing,
  headers, cache policy, and content delivery behavior.
- Decision: treat the catalog as generated structured content. Charts CI builds
  schema-v4 `catalog.json` plus only the recursively allowlisted implementation
  modules, then replaces the generated `catalog-dist` branch after the static,
  package, bundle, comparison, and stress gates pass. Conformance is independent
  regression monitoring rather than an artifact-integrity gate. TanStack.com's
  existing content pipeline reads that branch, verifies hashes and limits,
  renders native routes and embeds, and serves modules below an artifact-commit
  namespace. Charts source and dependencies remain out of the site repository
  and default site bundle. The previous Worker, staging tree, deployment
  scripts, credentials, and route ownership are removed from the Charts
  workflow.
- Verification: the artifact generator records an exact Charts revision,
  deterministic SHA-256 allowlist, safe repository source paths, recursive
  imports, debug-only comparison roots, and role-aware authored-source
  closures. Focused tests reject unsafe paths, unreferenced assets, public
  comparison modules, and inconsistent source totals, roles, or paths. The
  loading gate checks every TanStack root's static closure for reference cases
  or competitor packages and proves raw source remains lazy and unpublished.
  Main-branch CI uploads the validated artifact and publishes only
  `catalog.json` and `assets/*.js` to `catalog-dist`. The publication workflow
  pins every third-party action to a full commit SHA, as required by the
  repository's Actions policy. TanStack.com PR
  [#1082](https://github.com/TanStack/tanstack.com/pull/1082) deployed the
  schema-v4 consumer before the release artifact, and PR
  [#1083](https://github.com/TanStack/tanstack.com/pull/1083) removed the
  schema-v2 validator and compatibility path after production verification.
  The verified `0.0.1` publication exposed 100 cases, 430 assets, and 25
  datasets at release `15dcb156` with Observable Plot, Recharts, and ECharts
  comparison counts of 68, 21, and 11. Every asset matched its declared byte
  count and SHA-256 hash. The list, legacy redirect, detail, opt-in comparison,
  manifest, and embed routes passed live HTTP and browser checks. Later
  catalog publications intentionally identify the current `main` commit
  rather than remaining pinned to an npm release tag.
- `0.7.0` follow-up: successful `static` and aggregate `ci` jobs still left
  `publish-catalog` skipped because its job-level condition inherited GitHub's
  implicit `success()` after optional upstream partitions skipped. The job now
  uses `always()`, rejects cancelled workflows, and explicitly requires both
  direct prerequisites to have succeeded on a push to `main`. The workflow
  contract locks that condition so a validated main artifact cannot silently
  remain unpublished or publish after cancellation.
- Schema-v5 follow-up: the Charts landing gallery still depended on
  `@tanstack/react-charts-catalog` and kept one generated SVG per case in the
  site repository. The catalog build now server-renders `preview: true` through
  the generated React wrappers that import each canonical `tanstack.ts` case,
  applies a portable light/dark image theme, and publishes one content-addressed
  288 by 192 SVG per case. Each case declares the exact relative path, media
  type, dimensions, bytes, and full SHA-256 digest, so tanstack.com can remain a
  generic immutable-artifact consumer without a filename convention or chart
  package dependency. The artifact validator rejects missing, extra, unsafe,
  oversized, dimensionally invalid, or integrity-mismatched previews. Focused
  manifest and preview tests pass, all 110 canonical preview renders pass, and
  the complete artifact verifies 501 modules at 5.93 MiB plus 110 previews at
  1.47 MiB.
- Source-index follow-up: the generated modules and preview assets remained a
  second rendering and publication system after tanstack.com gained a
  client-only notebook runtime. A checked-in
  `benchmarks/conformance/catalog-index.json` now exposes the complete parsed
  case metadata plus TanStack and reference entry paths from `main`, with no
  compiled modules, source closures, previews, datasets, or assets. The site
  can resolve one Charts revision and load the index and source from that same
  revision while owning its lightweight catalog previews. `pnpm catalog:index`
  regenerates the file; the cached `catalog-index-check` target verifies strict
  metadata, ordering, IDs, entry paths, entry-file existence, and byte-for-byte
  drift before the existing artifact check. Keep `catalog-dist` until the site
  consumers have cut over, then remove its artifact and publication pipeline.
- Source-derived preview follow-up: site-owned approximation SVGs drifted from
  the canonical chart cases even after source loading moved to the checked-in
  index. Charts now generates
  `benchmarks/conformance/previews/<caseId>.svg` by mounting each actual
  TanStack implementation at 288 by 192 pixels with its source data, palette,
  marks, transforms, stacking, and curves. Preview mode omits axes, grids,
  margins, and legends unless the case exists to demonstrate one of those
  features. The checked-in assets let tanstack.com render fast gallery cards
  from the same pinned revision without a second chart implementation,
  generated branch, or renderable npm module. The cached
  `catalog-preview-check` target validates case coverage, dimensions, source
  drift, and asset integrity in both local and distributed CI.

### F-120 — Key-only focus collapsed duplicate observations

- Status: resolved
- Severity: high
- Owner: API
- Observed in: native line tooltip path-hover regression
- Friction: the renderer host stored only the focused point's public `key`.
  When multiple observations in one line shared that key, moving between them
  was ignored, and an otherwise no-render host update repainted the first
  matching observation instead of the point nearest the pointer.
- Decision: retain the focused `ChartPoint` as the current-scene identity.
  Compare its key, mark, and datum index during interaction; on a scene render,
  restore an ambiguous key by datum reference, semantic point values, then
  datum index. Stable unique datum keys remain the preferred authoring path.
- Verification: the DOM-host regression dispatches pointer movement from the
  actual SVG line path to a later duplicate-key point, updates tooltip options
  without rendering, forces a responsive render, and moves back to the first
  point. The callback, focus marker, and tooltip stay on the exact observation
  throughout. All 25 focused runtime tests pass.

### F-121 — SVG callback was not a rendering-pipeline boundary

- Status: resolved
- Severity: high
- Owner: API
- Observed in: adding an optional Canvas renderer without changing the default
  SVG consumer path
- Friction: `ChartSvgRenderer` replaced scene-to-string serialization, but the
  host still owned SVG root discovery, coordinate mapping, focus painting,
  keyed reconciliation, and SVG-shaped `onRender` callbacks. A Canvas consumer
  could compile `ChartScene`, but preserving responsive sizing, runtime reuse,
  pointer and keyboard focus, tooltips, selection, SSR, and framework
  lifecycles required reimplementing the host. Adding Canvas to the existing
  default adapter would also make an optional renderer reachable from
  SVG-only bundles.
- Decision: introduce `ChartRenderer` for deterministic prerendering and
  mounted-surface creation, `ChartSurface` for paint, coordinate, focus, and
  cleanup ownership, and `mountChartRenderer` for shared host behavior. Keep
  `mountChart` and `ChartSvgRenderer` as SVG compatibility APIs. Publish Canvas
  through `@tanstack/charts/canvas` and framework `/canvas` entries, while
  framework `/core` entries accept an application-supplied renderer.
- Verification: core, React, and Octane tests cover deterministic SSR,
  hydration identity, renderer replacement, and shared
  pointer/keyboard/tooltip/selection behavior. Native Chromium verification
  covers device-pixel-ratio backing stores, `Path2D`, CSS color resolution,
  gradients, focus isolation, resizing, and PNG export. Bundle metafiles and
  packed-consumer checks enforce that renderer-neutral entries include neither
  renderer and Canvas entries include no SVG reconciler.

### F-122 — Dense scene aggregation overflowed the call stack

- Status: resolved
- Severity: high
- Owner: API
- Observed in: the one-million-point Canvas stress check
- Friction: scene compilation aggregated channel values and interaction points
  with `push(...values)`. Large valid arrays exceeded the JavaScript engine's
  argument limit before the selected renderer could paint them. Facet and
  polar aggregation used the same unsafe pattern.
- Decision: append dense collections with bounded loops in the shared scene,
  facet, and polar compilers. This keeps the public data contract intact and
  fixes the failure before it reaches any renderer.
- Verification: a 200,000-value scene regression completes without an
  argument-limit error. Native Chromium also compiles and mounts one million
  dots through the Canvas renderer with four surface descendants. That check
  still retains roughly 427 MiB of JavaScript heap and spends most first-paint
  time rasterizing the dense path, so Canvas removes per-mark DOM cost rather
  than making unbounded data free.

### F-123 — Framework adapters repeated runtime ownership

- Status: resolved
- Severity: high
- Owner: API
- Observed in: launching Preact, Vue, Solid, Svelte, Angular, Lit, and Alpine
  adapters beside React and Octane
- Friction: every component needed the same runtime creation, deterministic
  initial geometry, renderer prerender, prerender-to-mount cache handoff,
  update, scene access, and cleanup rules. Reimplementing those rules in each
  framework would repeat the preparation bug from F-011 and allow SSR,
  `aspectRatio`, keyboard, or teardown behavior to drift.
- Decision: publish `createChartAdapter` and `resolveChartAdapterLayout` from
  `@tanstack/charts/adapter`, with the renderer-neutral
  `createChartRendererAdapter` isolated at
  `@tanstack/charts/adapter/renderer`. Framework packages own only their native
  prop, lifecycle, reactivity, and presentation boundary.
- Verification: the controller regression proves dynamic preparation runs
  once across prerender and mount, pre-mount updates are retained, and invalid
  ratios resolve consistently. Preact, Vue, Solid, and Svelte cover server and
  browser paths; Angular, Lit, and Alpine cover update and teardown; Angular
  partial compilation and Svelte package compilation pass. Packed React
  consumers retain their renderer boundary without pulling SVG modules.

### F-124 — Name-only inventories masked undocumented contracts

- Status: resolved
- Severity: high
- Owner: Documentation/Tooling
- Observed in: full public documentation audit
- Friction: every exported name passed the documentation contract even when
  it appeared only in the API overview's import map or an adapter page's
  `Exports:` inventory. Six adapter-controller exports had no behavioral
  reference, and the Preact, Vue, Solid, Svelte, Angular, Lit, and Alpine
  adapters named their public symbols without documenting their complete
  option, lifecycle, presentation, or server contracts.
- Decision: add a controller lifecycle reference and a complete API reference
  for every framework adapter, route capability-specific types to their owner
  pages, and document the renderer, Canvas host and surface, scale resolver,
  color scale, and polar contracts found by the same audit. Exclude import
  maps, routing lists, and name-only export paragraphs from substantive symbol
  coverage.
- Verification: focused coverage tests prove inventories no longer satisfy an
  export while signatures, tables, code, and explanatory prose do. The
  documentation contract passes all 79 canonical pages, 83 catalog embeds, 16
  executable examples, public package entry points, and exported symbols.

### F-125 — Adapter surface classes disappeared across lifecycles

- Status: resolved
- Severity: high
- Owner: API
- Observed in: documenting framework adapter presentation contracts
- Friction: `className` was part of the shared typed host options, but both
  `createChartAdapter().prerender()` and
  `createChartRendererAdapter().prerender()` omitted it. Server output
  therefore disagreed with the mounted surface for every adapter that
  forwarded the option. Vue additionally disabled attribute inheritance
  without declaring `className`, so its client and server paths both dropped
  the value.
- Decision: forward `className` through both shared prerender boundaries and
  declare it as a Vue component prop so initial and mounted surfaces honor the
  published option.
- Verification: the SVG and renderer-neutral adapter regressions cover
  prerendered surface classes; Vue server and browser regressions cover the
  same class before and after mount. Focused tests, repository typechecking,
  and all seven adapter package gates pass.

### F-126 — Executable comparisons had no public documentation

- Status: resolved
- Severity: high
- Owner: Documentation/Tooling
- Observed in: full public documentation audit follow-up
- Friction: the repository exercised five chart libraries across 60
  deterministic bundle fixtures, shared browser and stress protocols, and a
  100-pair conformance corpus, but the public documentation exposed none of
  that evidence or the usual TanStack capability matrix. Readers could not
  distinguish a first-party feature, application composition, verified
  absence, or an untested claim.
- Decision: publish one canonical comparison page for the four alternatives
  in the executable matrix. Extract the capability data from the benchmark
  runner into a shared source, reserve red cells for verified missing
  first-party paths, cite exact official competitor pages, and report only the
  durable tracked bundle baseline rather than machine-sensitive browser
  rankings. Record package versions and the complete chart/tier matrix in that
  baseline so dependency or protocol changes require a refresh.
- Verification: the documentation contract checks every matrix cell against
  the shared benchmark source, every displayed package version against the
  repository manifests, all 60 expected bundle cases and displayed gzip
  ranges against the tracked baseline, and exact competitor-link
  allowlisting. The canonical and package documentation contain 80 pages, and
  the generated indexes route readers to the comparison.

### F-127 — Catalog source hid data transformation dependencies

- Status: resolved
- Severity: high
- Owner: Documentation/Tooling
- Observed in: transform authoring audit of the public catalog and example
  guides
- Friction: the gallery rendered only each `tanstack.ts` entry even though 95
  of 100 entries imported case-local or shared data. Several `data.ts` modules
  contained the defining accumulation, layout, or derived coordinates, making
  the visible source appear simpler than the raw-data-to-chart implementation.
  Transform-heavy dynamic cases also obscured whether transformation or cache
  invalidation belonged to Charts.
- Decision: treat the raw-data boundary as part of the authoring contract.
  Catalog source follows and displays every case-local source dependency and
  transitive shared fixture.
  Raw fixture modules may load, parse, or generate observations; bins, stacks,
  ranks, cumulative endpoints, summaries, and layouts remain visible in
  renderer or transform source until a documented first-party primitive owns
  the complete operation. In that case the roadmap points to the production
  source and tests while the case shows the raw-row definition. The conformance
  report exposes transitive authored lines per implementation and their
  per-case ratio. Data-space transforms use ordinary adjacent functions;
  application or framework reactivity owns memoization. Surface-responsive
  transforms remain in the chart callback.
- Verification: recursive source-loader coverage proves that entry and support
  files open by default, fixture files remain visible in a collapsed group,
  shared fixture dependencies are included transitively, and shared harness
  modules stay excluded from authored totals. The comparison report and
  schema-v4 artifact use the same closure and expose entry, support, fixture,
  and harness metrics and paths. Histogram, moving-average, stacked-area,
  lollipop, and waterfall show their transforms beside `defineChart`.
  Boxplot preparation has since moved behind the first-party `boxX`/`boxY`
  boundary: case 15 now displays the raw-row definition and the native mark
  owns quartiles, whiskers, and outlier partitioning with direct lineage.
  Waterfall data exports signed contributions rather than cumulative endpoints;
  force and Marimekko show their local layout modules; the responsive waffle
  source visibly expands category totals into cells. A second role audit moved
  formatters, selection guards, cursor parsing, viewport math, and interaction
  state helpers for case 33 and cases 80–92 out of fixture-classified
  `data.ts` files and into open-by-default `model.ts` support modules. Focused
  loader and source-view tests prove the transitive models stay visible while
  observation fixtures remain collapsed. A final geographic and polar audit
  moved exact atlas joins, centroid and route construction, wind and calendar
  channel derivation, county projection filtering, and projection-gallery
  configuration into open-by-default case or shared transform modules.
  The full 100-case browser matrix passes with a 1.15× geometric-mean
  authored-source ratio, 97.7% geometry similarity, 16/16 interaction cases,
  zero diagnostics, and zero unsafe assertions.

### F-128 — Chart-owned data reactivity duplicated application state

- Status: resolved
- Severity: high
- Owner: API
- Observed in: transform authoring audit and catalog migration
- Friction: `prepare`, formal chart `input`, and their equality functions added
  a second reactivity contract beside framework computed state or explicit
  vanilla updates. The API added input and prepared-data generics, runtime
  caches, adapter handoff rules, and manual equality whose invalidation could
  diverge from application reactivity.
- Decision: remove `prepare`, `prepareEqual`, `ChartPrepareContext`,
  `prepared`, formal `input`, `inputEqual`, `chartInputsEqual`,
  `shallowInputEqual`, and their generics from the public API and runtime.
  Definitions capture application values. Framework-native memoization owns
  invalidation, definition identity signals application changes, and host size
  changes still rebuild responsive definitions. Place transforms in ordinary
  functions beside `defineChart`; memoize the complete definition when its
  captured values change.
- Catalog evidence: a complete definition audit found 97 parameterless
  responsive builders. Ninety-two now return static definitions and perform
  input-owned setup only when the definition changes. Five size-dependent
  cases now read the actual chart build context instead of captured harness
  dimensions. Together with the five pre-existing responsive layouts, the
  catalog now has 92 static and 10 genuinely responsive definitions.
- Verification: strict typecheck, 1,966 core and framework tests, the
  seven-adapter package gate, and the 81-page documentation contract pass with
  definitions built only from captured application values plus current size
  and theme. Public docs, adapters, and executable examples contain no formal
  chart input or chart-owned equality API. The packed-consumer declaration
  fixture exercises responsive definitions across core, React, and Octane and
  asserts that adapter chart props reject formal `input`. The bundle contract
  records additional reductions of 921 minified/311 gzip bytes for the
  TanStack DOM host and 716 minified/268 gzip bytes for the React adapter. An
  every-adapter example audit removed the final stale Angular and Lit guide
  snippets that still passed `input` separately from their definitions.

### F-129 — Responsive relayout restarted chart animation

- Status: resolved
- Severity: medium
- Owner: API
- Observed in: responsive animation policy review
- Friction: the renderer-neutral host sent the same animation options for
  chart updates and `ResizeObserver` relayouts. Dragging or resizing a
  container repeatedly restarted geometry animation even though the motion
  requirements said resize should commit immediately by default.
- Decision: classify host renders internally. Chart updates remain animated;
  responsive and explicit size changes commit immediately unless
  `animate.resize` is `true`, and incompatible layout changes never animate.
  Strip the host-only resize policy before passing animation options to the
  active renderer.
- Verification: renderer-neutral host tests cover default resize suppression,
  explicit resize opt-in, option stripping, and coalesced frame scheduling.
  SVG runtime and Canvas animation regressions pass through the shared policy.
  The shared SVG host adds 350 minified and 120 gzip bytes; the exact universal
  bundle baseline records that measured cost.

### F-130 — Adapter options duplicated chart behavior

- Status: resolved
- Severity: high
- Owner: API
- Observed in: Observable Plot tooltip parity and the post-reactivity adapter
  API audit
- Friction: focus, tooltip, animation, keyboard policy, focus distance, and
  spatial indexing were supplied beside the definition at every mount. A
  reusable definition therefore did not describe its own behavior, and each
  framework adapter repeated six chart options that were not
  framework-specific.
- Decision: move `focus`, `tooltip`, `animate`, `keyboard`,
  `maxFocusDistance`, and `spatialIndex` to `ChartDefinitionOptions`. Static
  definitions accept them directly; `DynamicChartConfig` combines them with a
  responsive builder; `defineChart(definition, options)` creates an explicitly
  different configured definition. Hosts and framework adapters expose no
  override path. Sizing, accessible surface metadata, callbacks, renderer
  hooks, and native wrapper styling remain host or adapter concerns.
- Verification: definition type contracts preserve inferred datum and
  coordinate types for focus, tooltip, and spatial callbacks while rejecting
  incompatible strategies. The full 2,083-test repository suite, root
  typecheck, packed declaration/runtime consumers, all seven adapter packages,
  documentation contracts, formatting, and bundle policy pass. Catalog case
  35 passes visual and interaction checks in Chromium at both quick-profile
  widths. The cross-library fixtures now configure tooltip, keyboard, focus,
  and animation on each definition through the typed `defineChart` overload;
  a typed host-options boundary prevents behavior from drifting back to
  adapter props. The React Native `/universal` fixture keeps behavior on its
  directly authored one-argument definition; the two-argument form remains
  reserved for decorating an existing definition.

### F-131 — Stable identity repeated inferable key channels

- Status: resolved
- Severity: medium
- Owner: API
- Observed in: review of the dynamic-data stable-key guidance
- Friction: every built-in mark defaulted datum identity to row position even
  when rows carried a unique `id` or the mark already had a unique semantic
  position. Reorderable bars therefore repeated `key: "id"` or
  `key: "category"` solely to prevent avoidable DOM replacement and focus
  drift.
- Decision: built-in marks prefer an explicit key, then a unique primitive
  datum `id`, a unique primitive nested `data.id`, then a mark-owned positional
  candidate, and finally row index. Bars use their categorical channel; lines
  and areas use their independent axis; rects and cells use the complete x/y
  interval tuple. Dots and text try x, then y, then the x/y tuple. Polar lines,
  areas, and rules use angle. Every inferred candidate must be complete and
  unique within its interaction group. Explicit keys retain their authored
  behavior.
- Catalog evidence: 175 explicit mark keys were reviewed; 164 repeated identity
  already inferable by the mark and were removed. Nested D3-pie identity now
  removes the ten remaining `data.id` accessors, and positional point identity
  removes the final categorical dot key. No built-in catalog mark now repeats
  an inferable key channel.
- Verification: focused resolver, Cartesian, polar, geo, and DOM-host tests
  cover explicit-key precedence, top-level and nested primitive `id`,
  single-axis and composite point candidates, group-local uniqueness, index
  fallback, per-mark development warnings, and stable rendered identity. Root
  typecheck passes. Case 85 verifies that revised task intervals retain their
  inferred task-ID point keys without repeating `key: 'id'` in the rect mark.
  Case 86 verifies that retained observations keep their inferred Date keys
  across offscreen append and revision changes without repeating `key: 'date'`
  in either the line or dot layer.

### F-132 — Factory unions disrupt D3's generic inference

- Status: monitoring
- Severity: low
- Owner: API
- Observed in: direct scale-factory type integration
- Friction: placing a typed zero-argument factory signature beside configured
  callable D3 instances in one `scale` property contextually changes the
  generic output inferred by expressions such as `scaleLinear()`. Valid
  configured instances then fail assignment because their inferred range
  includes the factory return type.
- Current decision: preserve the existing channel-type validation for
  configured instances and accept direct factories through a
  runtime-discriminated callable type. Charts distinguishes a factory by the
  absence of D3's `copy` method and validates the created scale contract at
  runtime.
- Follow-up: revisit if TypeScript gains a way to suppress contextual generic
  inference for only one union member, or if evidence justifies a branded
  helper despite its additional authoring syntax.

### F-133 — Clipped ancestors trapped native tooltips

- Status: resolved
- Severity: medium
- Owner: API
- Observed in: nested tooltip exploration and dashboard containers with
  clipped overflow
- Friction: the native tooltip was an absolutely positioned child of the chart
  container. `overflow: hidden`, transformed ancestors, and local stacking
  contexts could clip it or place it below adjacent UI. Escaping those
  boundaries required rebuilding focus, placement, collision, pinning, and
  cleanup in an application-owned overlay.
- Decision: make portal transport an exact opt-in extension imported from
  `@tanstack/charts/tooltip/portal` and installed as the nested `portal` option
  on `{ use: tooltip }`. It opens the tooltip as a manual Popover in the
  browser top layer where supported, keeping its chart DOM ancestry and
  inherited styling. If Popover is unavailable or fails, the tooltip moves
  directly under the `ownerDocument` body with fixed high-stack positioning.
  Both paths map scene anchors to client coordinates, collide against the
  viewport, and reposition on scroll, viewport resize, chart resize, and
  tooltip content resize. Local positioning remains the default.
- Verification: DOM-host regressions cover top-layer and fixed fallback
  parenting, client-coordinate mapping, viewport collision,
  scroll/resize/content repositioning, local-to-portal updates, renderer
  replacement, owner-document targeting, and final cleanup. The React
  composition regression exercises a pinned custom body inside the portaled
  surface and removes it on unmount. Catalog case 35 passes its real-Chromium
  quick profile, including both widths and every interaction step. The primary
  suite passes 3,003 tests, all framework matrices pass, and type, docs,
  packed-consumer, seven-adapter, formatting, and bundle gates pass. The
  portal transport is absent from retained base and tooltip-only graphs. Its
  isolated kernel is 1,580 gzip bytes and its measured increment on the
  representative React tooltip consumer is 806 bytes.

### F-134 — Demo fixtures modeled charts instead of source data

- Status: resolved
- Severity: high
- Owner: Documentation/Tooling
- Observed in: catalog data-transparency audit after the source-closure work
- Friction: none of the 100 catalog cases imported Observable Plot's published
  demo datasets. Seventy-eight cases had local `data.ts` modules, 76 accepted a
  revision, 59 exposed generic chart-shaped fields such as `value`, `label`,
  `x`, or `y`, and seven of eight shared fixtures generated synthetic
  observations. The source viewer disclosed those modules after F-127, but
  disclosure did not make invented Atlas/Beacon/Comet series or hashed
  choropleth values representative source data. Several cases named an
  Observable example while demonstrating different semantics.
- Decision: add a private, renderer-neutral demo-data package generated from
  exact, pinned Observable snapshots. Dataset modules preserve source field
  names, use exact subpath exports, and carry source URL, upstream revision,
  row count, schema, byte size, license note, and SHA-256 metadata. Small
  snapshots are emitted as typed rows. Large CSV snapshots stay compact and
  parse only when their exact subpath is imported. Catalog source discovery
  recognizes package imports and renders provenance without treating raw rows
  as authored chart code. Case-local selection and the transform being
  demonstrated remain visible; fixtures must not perturb measurements or
  rename source columns to chart channels.
- Catalog-fixture evidence: a final role audit removed every case-local
  `data.ts` module. Renderer entries now import exact demo-data subpaths
  directly; revision windows, representative-row choices, sampling, and
  subtree filters live in open-by-default `selection.ts` support. Layout and
  normalization helpers accept the imported source rows instead of reaching
  through a hidden fixture. Cases 85 and 92 retain authored interaction state
  as explicitly named `scenario.ts`, not observation data.
- Framework-example evidence: the React and Octane showcases no longer import
  the synthetic Stats parity fixture. They import pinned industries, penguins,
  cars, and downloads subpaths directly; their time-window selection, D3 stack
  offsets, penguin count aggregation, histogram bins, and ranking selection
  are visible in adjacent example-owned source.
- Bundle policy: demo data is not a production Charts dependency. Conformance
  executes with the selected snapshot but measures renderer bundles with
  `@charts-poc/demo-data/*` externalized. Exact-subpath tests prevent sibling
  datasets from entering a chart chunk; small dataset chunks do not include a
  CSV parser, while the parser cost for a large snapshot is confined to that
  snapshot's subpath.
- Verification: the package contains 27 pinned datasets. All 100 catalog cases
  have been audited: there are no case-local `data.ts` modules or `./data`
  imports, 25 explicit `selection.ts` modules, and only the two authored
  interaction-state exceptions named `scenario.ts`. The React, Octane, and
  sandbox showcases import source-shaped demo rows. Public documentation and
  READMEs instead use small typed inline data, and the documentation contract
  rejects private workspace imports in public code fences. Demo-data sync,
  metadata, schema, hash, exact-subpath, and compact-large-CSV tests pass. The
  catalog source-view and schema-v4 artifact checks pass at 100 cases and 5.45
  MiB. The full 100-case Chromium matrix renders without gaps, all 16
  interaction cases pass, strict sources produce zero diagnostics or unsafe
  assertions, and mean frame-relative geometry similarity is 96.7%. Root unit
  tests, typecheck, docs sync, production builds, packed consumers, bundle
  budgets, and all seven framework adapter package gates pass.

### F-135 — The published release had no repository baseline marker

- Status: resolved
- Severity: high
- Owner: Tooling/Release
- Observed in: generating the post-`0.0.0` release changelog
- Friction: npm contains one published version of every product package, but
  the repository has no `0.0.0` tag or GitHub release and the npm metadata has
  no `gitHead`. An initial history audit therefore treated the repository's
  first commit as the release baseline and incorrectly included 11 commits
  that were already present in the published packages.
- Decision: use commit `58ee1e2` as the verified `0.0.0` source baseline. For
  future releases, record the exact source revision in the package provenance
  and create the matching repository tag before generating the next changelog.
- Verification: npm timestamps place the `@tanstack/charts` and
  `@tanstack/react-charts` publication after `58ee1e2` and before the next
  repository commit. The published core README, React README, and core
  chart-definitions documentation are byte-identical to their `58ee1e2`
  sources. The corrected changelog contains exactly the nine commits in
  `58ee1e2..a91106c`. Annotated tag object `7dca671` peels to release merge
  `15dcb156`; the public GitHub release uses that tag; and release workflow
  `30592985603` verified all ten npm packages' signatures and SLSA claims
  against the exact package PURL, tarball digest, repository, workflow, tag,
  and commit.

### F-136 — Comparison conflated workspace and published source

- Status: resolved
- Severity: high
- Owner: Tooling/Documentation
- Observed in: final release-note and bundle-provenance audit
- Friction: the comparison page and tracked bundle baseline labeled TanStack as
  `@tanstack/charts@0.0.0`, but the benchmark imports current workspace source.
  The published `0.0.0` artifact comes from `58ee1e2`; the measured source comes
  from `a91106c` plus a release-preparation fixture correction.
- Decision: identify TanStack as workspace source and competitors as pinned npm
  packages. Bundle-baseline schema 3 records package manifest versions
  separately from source provenance. Derive the TanStack revision from the last
  commit that changed core source or any transitive TanStack comparison input,
  rather than the release branch head, so documentation-only commits do not
  stale measured evidence.
- Verification: the public comparison names the measured TanStack revision,
  the tracked baseline records the `0.0.1` manifest version separately from
  exact `5c36a38` comparison-input revision, and the deterministic comparison
  check rejects missing, malformed, or mismatched provenance. Its CI checkout
  retains the history required to resolve that revision. The reviewed 60-case
  baseline matches the candidate produced by Ubuntu PR run `30607255311`.

### F-137 — Latest docs installed an incompatible published API

- Status: resolved
- Severity: high
- Owner: Documentation/Release
- Observed in: final public documentation audit before `0.0.1`
- Friction: canonical docs and public README examples used the post-`0.0.0`
  definition, behavior, and scale contracts, while unqualified install commands
  resolved to the earlier public `0.0.0` packages. Most framework adapters were
  not published yet.
- Decision: keep the temporary unreleased-source distinction until `0.0.1`,
  then make the README, installation, overview, quick-start, comparison, and
  marketing copy describe the coordinated core and adapter release.
- Verification: all ten packages resolve from npm at `latest=0.0.1`; every
  adapter depends exactly on `@tanstack/charts@0.0.1`; and registry peers match
  the installation documentation. The release workflow installed every exact
  package, verified packed entry points, declarations, runtime imports,
  signatures, and provenance, and ran all adapter gates. TanStack.com pins
  core and React to `0.0.1`, and its live landing page, overview, quick start,
  installation, and comparison pages render the released copy and package
  names without the former `0.0.0` warning. Keep future public documentation
  deployments coupled to the npm release they describe.
- `0.6.5` follow-up: after a long unreleased main sequence, the README,
  installation, overview, comparison, and marketing copy again described APIs
  newer than the latest public artifact without saying so. They now label
  repository documentation as unreleased `main`, identify `0.6.5` as the
  latest published pre-alpha, and point release consumers to documentation at
  its verified release source revision. React Native guidance uses exact mark
  and scene imports for Metro; the optional `/universal` barrel is documented
  as a portability convenience with a wider module graph rather than the
  default native import.

### F-138 — The publisher pin predated explicit trust permissions

- Status: resolved
- Severity: high
- Owner: Tooling/Release
- Observed in: configuring npm trusted publishing for `0.0.1`
- Friction: the release workflow pinned npm `11.12.1`, whose `npm trust`
  interface predated required per-action permissions. The initial publisher
  request completed two-factor authentication but returned an opaque HTTP 400
  instead of identifying the missing `--allow-publish` permission.
- Decision: configure trust with npm `11.18.0`, give each public package an
  explicit publish permission, and use the repository's standard Changesets
  workflow without an npm token. The publisher checks that Node's bundled npm
  meets the trusted-publishing minimum before requesting OIDC-backed
  publication.
- Verification: `npm trust list` reports the exact `TanStack/charts`
  repository, `release.yml` workflow, and `createPackage` permission for core
  and all nine public framework adapters. Release workflow `30592985603`
  completed OIDC publication for all ten `0.0.1` packages. The current
  publisher builds checked tarballs for an unpublished or unfinished release,
  waits for matching registry integrity and attestations, and the workflow
  contract grants `id-token: write` once without `NPM_TOKEN` or
  `NODE_AUTH_TOKEN`.

### F-139 — Top-level package entries bypassed tarball validation

- Status: resolved
- Severity: high
- Owner: Tooling/Release
- Observed in: inspecting the `0.0.1` Svelte release-candidate tarball
- Friction: pnpm correctly replaced conditional exports with their
  `publishConfig` targets, but retained the independent top-level `svelte`
  field as `./src/index.ts`. The package excludes `src`, so Svelte tooling
  using that field would resolve a file absent from the published tarball.
  Release gates only checked conditional export targets and did not detect the
  broken entry.
- Decision: point the Svelte package field at `./dist/index.js`. The release
  artifact validator now reads the actual tar inventory and requires every
  scalar top-level `main`, `module`, `browser`, `types`, `typings`, `svelte`,
  and `style` entry to identify a packed file.
- Verification: a focused regression reproduces and rejects the missing
  `./src/index.ts` entry, covers every validated field, and accepts entries
  present in the archive. The rebuilt Svelte tarball contains its
  `./dist/index.js` entry. The public `@tanstack/svelte-charts@0.0.1` tarball
  retains that entry, and the package, release-artifact, signature, and
  provenance gates pass.

### F-140 — Behavior config could erase responsive datum inference

- Status: monitoring
- Severity: medium
- Owner: API
- Observed in: migrating TanStack.com's `SkillSparkline` to `0.0.1`
- Friction: placing a responsive builder and a tooltip formatter typed as
  `ChartPoint<SparkRect>` in one `defineChart` call erased the inferred datum
  type and failed overload resolution. The chart could not compile without
  weakening the formatter type or adding a cast.
- Current decision: preserve inference with the public two-step form: create
  the responsive definition first, then call
  `defineChart(responsiveDefinition, behavior)`. This keeps the formatter
  typed without a cast, hidden import, or duplicated datum declaration.
- Verification: TanStack.com PR
  [#1083](https://github.com/TanStack/tanstack.com/pull/1083) uses the two-step
  form. Exact `0.0.1` package typechecking, lint, 135 site tests, and the
  production build pass; the live Intent registry renders 12 TanStack charts
  without browser errors or warnings.
- Follow-up: add a focused type regression for the single-call form and decide
  whether its overload can retain builder datum inference without making
  behavior ownership ambiguous.

### F-141 — Vitest followed pnpm workspace symlinks

- Status: resolved
- Severity: high
- Owner: Tooling
- Observed in: Nx and CI migration after the `0.0.1` release
- Friction: the root Vitest configuration replaced the default exclusion list
  when it excluded framework-owned suites. Vitest therefore followed pnpm
  workspace links through `node_modules` and ran the same physical tests under
  packages and examples. CI reported 464 files and 2,989 tests even though the
  intended root suite contained 106 files and 537 tests. That one invocation
  consumed 206 seconds.
- Decision: extend `configDefaults.exclude` before adding the framework-specific
  exclusions. Keep the seven framework environments as independent Nx targets
  so they run in parallel and cache independently.
- Verification: the corrected direct root suite completes in 4.92 seconds.
  The cold seven-target Nx unit graph completes in 6.90 seconds, and an
  unchanged warm local-cache run completes in 0.54 seconds.

### F-142 — Package verification reinstalled dependencies during release builds

- Status: resolved
- Severity: high
- Owner: Tooling/Release
- Observed in: validating the fresh release-artifact path during the Nx and CI
  migration
- Friction: pnpm's dependency verification treated newly generated adapter
  `dist` files as a stale workspace and started a clean install when the
  builder later called `pnpm exec` or `pnpm pack`. With the packed-consumer and
  framework builders running together, that reinstall removed root package
  links while the packed consumer was bundling. Its installed
  `@tanstack/charts` tarball could no longer resolve `d3-array` or `d3-scale`.
  The cached package gate did not reproduce the release-only failure.
- Decision: disable `verifyDepsBeforeRun` because setup already performs one
  frozen install before every CI job. Run the two top-level release builders
  sequentially and serialize every nested pnpm command through one
  framework-builder queue. Independent in-process adapter builds and post-pack
  checks retain four-worker pools.
- Verification: a frozen install restores the workspace graph; the uncached
  release-artifact command builds and validates all ten tarballs; and the
  artifact-only publisher check accepts the resulting manifest and integrity
  records.

### F-143 — The `ci` script name collided with pnpm's clean install

- Status: resolved
- Severity: high
- Owner: Tooling/Documentation
- Observed in: validating the documented local Nx command
- Friction: pnpm 11 reserves `pnpm ci` for its clean-install command, so the
  root `"ci"` package script was not reachable through the documented
  shorthand. Running the command removed `node_modules` instead of executing
  the Nx validation graph.
- Decision: expose the local graph as `pnpm run validate`. Keep the unambiguous
  command in GitHub Actions as well.
- Verification: `pnpm run validate` resolves the `charts-workspace:ci` Nx
  target locally and in CI, while contributor docs no longer instruct
  maintainers to invoke pnpm's clean-install command. The workspace contains
  25 inferred Nx projects but only the root owns the current aggregate CI
  target, so removing the misleading `nx affected --target=ci` alias avoids
  claiming task pruning that does not yet exist; target-level cache replay
  still skips unchanged work.

### F-144 — Action pin checks accepted invalid commit lengths

- Status: resolved
- Severity: high
- Owner: Tooling
- Observed in: the first pull-request run of the split Nx workflow
- Friction: the action-pin contract accepted hashes between 40 and 64
  characters but GitHub required the repository's SHA-1 action revisions to
  contain exactly 40. A 41-character `actions/cache` revision therefore
  passed local validation and caused every CI partition to fail during shared
  setup before project commands ran. The test also ignored external actions
  nested in the local composite setup action.
- Decision: pin `actions/cache@v5.0.4` to its exact 40-character commit and
  validate both workflows and the shared composite action with an exact-length
  contract.
- Verification: the focused CI and release workflow contracts reject the
  previous 41-character revision and accept every current action pin.

### F-145 — Changesets included private workspaces in version plans

- Status: resolved
- Severity: high
- Owner: Tooling/Release
- Observed in: preparing the first automated patch after the CI migration
- Friction: Changesets defaults to versioning private packages. A core-only
  patch plan therefore included private examples, fixtures, and the sandbox
  alongside the ten public Charts packages, even though the artifact publisher
  intentionally releases only the public fixed group.
- Decision: disable private-package versioning explicitly and keep the ten
  public packages in one exact fixed group.
- Verification: the release workflow contract locks both settings, and
  `changeset status` reports only the ten public packages for the compact-axis
  patch.

### F-146 — Octane hydration used a unit-test timeout

- Status: resolved
- Severity: medium
- Owner: Tooling
- Observed in: parallel Ubuntu static checks
- Friction: the Octane Canvas hydration regression creates a Vite SSR server,
  compiles the server fixture, renders it, hydrates it, and closes the server.
  Under the full parallel CI graph that integration path took 5.4 seconds and
  exceeded Vitest's generic five-second unit-test limit.
- Decision: give only that cold SSR integration test a 15-second timeout.
  Ordinary Octane client tests retain the five-second default.
- Verification: the focused Octane client suite covers all seven client tests;
  pull-request static checks remain the parallel Linux gate.

### F-147 — Release automation duplicated validated work

- Status: resolved
- Severity: high
- Owner: Tooling/Release
- Observed in: the `0.0.2` release and comparison with Query, Router, Virtual,
  Form, Store, Pacer, and the TanStack repository template
- Friction: the built-in workflow token intentionally does not start
  pull-request Actions for the generated Changesets PR. The previous workaround
  explicitly dispatched 22 checks that took 2 minutes 46 seconds, even though
  Charts has no required status-check or review rule. Merging that mechanical
  PR then ran the complete main workflow for another 4 minutes 12 seconds
  before a tag dispatch started four more release jobs.
- Decision: use the standard TanStack push-to-main Changesets job. Pending
  changesets create or update the mergeable version PR immediately. With no
  pending changesets, the same job preflights npm, builds the checked package
  tarballs, publishes through OIDC, and finalizes the aggregate tag and release.
  Main browser and catalog CI remains independent.
- Verification: the repository ruleset protects main only from deletion and
  non-fast-forward updates. PR `#13` merged without a review or required check.
  Workflow contracts reject the removed `version_pr` dispatch path and require
  one branch-scoped Changesets release job with registry-aware finalization.

### F-148 — Publisher failure returned before its workers settled

- Status: resolved
- Severity: high
- Owner: Tooling/Release
- Observed in: release-safety review of parallel package work
- Friction: the adapter publisher, framework package gate, and comparison
  builder used `Promise.all` over long-lived workers. One rejected operation
  could end its caller while other workers were still running; publication
  could hide later failures, and package cleanup could remove a temporary
  directory beneath active builds.
- Decision: drain a bounded worker pool, continue independent queued
  publications, collect failures in source order, and throw one
  `AggregateError` only after every worker has settled.
- Verification: all three paths use the shared worker pool. Its regression
  forces an early failure, confirms all four operations start, all successful
  operations finish, active work is zero when the error surfaces, and
  concurrency never exceeds two.

### F-149 — Release checks could stall or accept an unbound tag

- Status: resolved
- Severity: high
- Owner: Tooling/Release
- Observed in: release-safety review of idempotent tag dispatch
- Friction: an existing remote release tag bypassed the revision comparison
  when `RELEASE_REVISION` was absent, and direct npm, GitHub, and attestation
  requests had no request deadline below the job-level timeout.
- Decision: require an exact 40-character expected revision whenever a tag
  already exists, require equality before dispatch, and give every direct
  release fetch a 30-second deadline.
- Verification: focused tests reject missing, empty, and mismatched revisions,
  accept the exact match, and the release workflow contract counts a bounded
  signal on every direct release request.

### F-150 — Nx worktree caches followed the common Git directory

- Status: monitoring
- Severity: low
- Owner: Tooling
- Observed in: validating Nx from a sandboxed Git worktree
- Friction: Nx resolved its relative cache and workspace-data directories
  through the worktree's common Git checkout. The sandbox could execute every
  target but could not write task metadata outside the active worktree.
- Current decision: keep the portable repository defaults. In restricted
  worktrees, set `NX_CACHE_DIRECTORY` and `NX_WORKSPACE_DATA_DIRECTORY` to
  absolute paths inside that worktree.
- Verification: the full 17-target validation graph passes with both
  directories scoped to the active worktree. Ordinary clones and GitHub
  Actions retain `.nx/cache` and `.nx/workspace-data`.

### F-151 — Artifact actions targeted deprecated Node 20

- Status: resolved
- Severity: low
- Owner: Tooling
- Observed in: the final split-CI pull-request matrix
- Friction: GitHub forced the pinned v4 artifact actions onto Node 24 and
  emitted a deprecation annotation in every artifact-producing shard.
- Decision: pin the official Node 24 releases of `upload-artifact` v6 and
  `download-artifact` v7 by exact commit.
- Verification: workflow contracts require immutable action revisions; the
  final GitHub matrix exercises every upload path before merge.

### F-152 — Version-only releases invalidated workspace bundle evidence

- Status: resolved
- Severity: high
- Owner: Tooling/Release
- Observed in: the first automated Changesets version pull request
- Friction: the comparison baseline required the TanStack workspace package
  version to match its last measured release. Changesets advanced the package
  to 0.0.2 without changing measured source, so both the bundle gate and docs
  contract rejected an otherwise unchanged artifact.
- Decision: keep exact installed-version checks for external registry
  packages. For the TanStack workspace, use the existing exact Git revision of
  every measured input as the authoritative provenance boundary; a version-only
  release no longer requires rewriting bundle measurements.
- Verification: focused contracts accept a workspace release changing from
  0.0.1 to 0.0.2, still reject external package-version drift, and retain the
  exact workspace source-revision check.
- `0.9.0` release evidence: the generated version pull request changed only
  package versions and release-facing docs, but the catalog preview source hash
  included raw package manifests and therefore rejected the release branch.
- `0.9.0` release decision: normalize package-manifest preview inputs by omitting
  only their own `version`. Continue hashing exports, dependencies, conditions,
  source files, and every stored preview checksum.
- `0.9.0` release verification: the focused preview contract proves version-only
  manifests hash identically while an export change does not. The generated
  `0.9.0` preview manifest and the full release validation pass.

### F-153 — Changesets left release-facing version claims behind

- Status: resolved
- Severity: high
- Owner: Tooling/Release
- Observed in: auditing the generated 0.0.2 version pull request
- Friction: Changesets advanced manifests, package changelogs, and the lockfile
  but left the root README, canonical docs, comparison evidence links, and
  marketing material on 0.0.1. Merging the generated pull request would have
  published a newer package line beside stale install and status claims.
- Decision: derive the previous release from the generated root changelog,
  advance an explicit allowlist of release-facing sources, then run the
  repository's canonical docs sync before formatting the version pull request.
  Historical changelog and friction evidence remain immutable.
- Verification: focused tests cover version-heading discovery, complete
  replacement, idempotency, and missing-version rejection. Generated package
  docs remain outputs of `pnpm docs:sync`, never hand-edited sources.
- `0.7.0` follow-up: visible version strings advanced, but the README,
  installation guide, and four comparison-protocol links still targeted the
  `0.6.5` source commit. The synchronizer now counts immutable
  `tree/v<version>` and `blob/v<version>` links as release references, validates
  their exact count, and advances them with the package version. The focused
  regression counts only the matching version tag.
- `0.15.0` follow-up: all twelve shipped Intent skills still targeted 0.9.0.
  Intent defines `metadata.library_version` as the source library version the
  skill targets and reports drift against the currently published version. The
  release synchronizer now includes every shipped `SKILL.md` with one exact
  version reference. A focused regression discovers the shipped skill
  directories and rejects any skill missing from the allowlist, then the normal
  reference test checks that every tracked skill matches the current package
  version.

### F-154 — Root barrels crossed the browser host boundary

- Status: resolved
- Severity: high
- Owner: API/Tooling
- Observed in: isolating the React Native host proof from the core package
- Friction: shared chart definitions and scene compilation are
  platform-neutral, but the root value barrel made bundlers traverse DOM hosts,
  adapters, reconciliation, and SVG surfaces. Its type graph also declared
  `Element`, `HTMLElement`, and `SVGSVGElement`, so a non-DOM consumer could
  not select the universal contracts as one supported entry.
- Decision: preserve the existing browser-oriented root API and add
  `@tanstack/charts/universal` for common authoring/runtime values plus
  `@tanstack/charts/types` for universal contracts. The name describes the
  supported cross-runtime surface while the browser-first root remains the
  normal web entry. `/portable` was an early pre-1.0 name and is intentionally
  not restored; `/universal` is the sole cross-runtime barrel. DOM surface,
  renderer, host, and render-context types now live behind an internal module
  while retaining their existing root re-exports. Definition inputs retain
  DOM-free extension token contracts while the generic tooltip and portal token
  interfaces are exported for host-adapter authors. Typed DOM tooltip and
  portal lifecycles remain in the DOM module. Do not conditionally change the
  root until a native host can test one coherent platform contract.
- Verification: root typechecking and focused core tests pass. The packed
  package gate resolves `/universal` and `/types` from `dist` and compiles their
  declarations, including tooltip definition inputs and direct generic-token
  imports, with Web Worker rather than DOM globals. Type regressions reject
  swapping tooltip and portal tokens.
  The packed bundle proof excludes the root, adapters, Canvas, DOM host/text,
  browser export, reconciliation, renderer, and SVG surface modules. That full
  universal barrel measures 84.30 kB minified and 26.55 kB gzip; granular
  subpaths remain the bundle-sensitive option.

### F-155 — Optional tooltip code burdened every chart consumer

- Status: resolved
- Severity: high
- Owner: API
- Observed in: reducing the representative React line consumer from 25.11 KiB
  to 13.89 KiB gzip and restacking the React Native host proof
- Friction: the renderer statically owned native tooltip DOM, formatting,
  placement, pinning, portal transport, and observers. React's base entries
  also statically owned `react-dom` portal composition and the default rich
  body. A chart with no tooltip paid for all of it, and tree shaking could not
  cross the host's built-in branches.
- Decision: keep focus and pin policy in the host, but move tooltip rendering
  behind the `ChartTooltipExtension` lifecycle and exact
  `@tanstack/charts/tooltip` token. Move viewport transport behind the nested
  portal extension. Move React rich-body composition to drop-in Chart,
  CanvasChart, and RendererChart exports from
  `@tanstack/react-charts/tooltip`. Base entries export only erased extension
  types and never import those runtime modules. Apply the same boundary to the
  native host: its branded renderer token and implementation live at
  `@tanstack/react-native-charts/tooltip`, while the base package imports only
  the erased native extension contract. A string host brand accepts duplicate
  package copies and custom native renderers without accepting the DOM token.
- Verification: the representative compact React line is 14,227 gzip bytes.
  Native tooltip adds 3,381 bytes; portal adds 806 more. Retained-output graph
  checks prove base renderer and React entries contain none of the tooltip,
  portal, or React rich-body modules. The React Native base host is 10,468 gzip
  bytes and adding its tooltip subpath costs 1,990 bytes; retained-input checks
  prove both the base host and line consumer omit `Tooltip.tsx`, all native
  entries omit web tooltip and portal code, and the base host retains no D3
  runtime. Core, Lit,
  React, native, export, declaration, packed-package, and lifecycle tests cover
  creation, update, disable, host ownership, transport switching, custom
  bodies, and cleanup.

### F-156 — Releases stranded manual Unreleased migration notes

- Status: monitoring
- Severity: high
- Owner: Tooling/Release
- Observed in: rebasing the tooltip and compact-scale release onto the
  Changesets-based `0.0.2` release flow, then landing the universal-entry rename
  after the `0.1.0` version pull request had merged and published
- Friction: the root changelog held the complete human- and agent-readable
  migration under `## Unreleased`, while Changesets generated package sections
  and prepended the new version without consuming that section. The resulting
  release would leave the migration under an obsolete heading instead of the
  version users were upgrading to. A later feature branch exposed the inverse
  race: its pending universal-entry note merged into the already-published
  `0.1.0` section after the version pull request had consumed `## Unreleased`,
  even though its remaining changeset correctly targeted `0.2.0`.
- Decision: when synchronizing a new root release, move the body of
  `## Unreleased` into the generated version section and remove the pending
  heading. Package-specific changesets retain the core, React, and compact-scale
  migration instructions in their published package changelogs. A feature pull
  request that crosses a published version boundary must re-establish
  `## Unreleased`, keep the published section immutable, and describe migration
  from the package version that actually reached npm.
- Verification: the focused changelog synchronization regression moves pending
  breaking-change notes under the generated version, removes `## Unreleased`,
  preserves earlier releases, and includes the migration in extracted GitHub
  release notes. The universal follow-up restores its note under
  `## Unreleased`, leaves the published `0.1.0` section accurate, and reports a
  single minor `@tanstack/charts` release from `0.1.0` to `0.2.0`; the docs,
  bundle, changelog-consumption, and release-artifact gates pass.

### F-157 — Conformance monitoring blocked unrelated changes

- Status: resolved
- Severity: high
- Owner: Tooling
- Observed in: the first pull-request and main runs after release automation
  was simplified
- Friction: every pull request ran all 100 paired cases in the quick profile,
  then every main commit reran all 100 in the standard profile. Release-only PR
  `#17` therefore consumed 15.9 conformance runner-minutes before merge and
  21.6 after merge despite changing no chart source. The eight shards also
  repeated the complete TypeScript program and 27 type-protection probes. npm
  publication did not wait on either run, so the cost added no release gate.
- Decision: move conformance into a read-only monitoring workflow. Run one
  deterministic standard shard nightly, all eight standard shards weekly, all
  eight on manual request by default, and all eight for a pull request carrying
  the `full-conformance` label. Manual dispatch may select one exact shard for
  reproduction. Normal pull-request, main, catalog, and release paths do not
  wait on conformance.
- Verification: workflow contracts require deterministic eight-day rotation,
  complete weekly and labeled-PR matrices, exact manual shard selection,
  read-only permissions, immutable action pins, and standard-profile browser
  execution. The main CI contract rejects any conformance dependency while
  retaining every exact-revision catalog publication guard.

### F-158 — Focus presentation was fixed to one renderer marker

- Status: resolved
- Severity: high
- Owner: API
- Observed in: implementing the background-highlight feedback in issue #9
- Friction: the host could paint only one hardcoded point marker. A focused
  category band, rule, active bar, or custom effect required renderer-specific
  DOM mutation or a second interaction loop.
- Decision: `whenFocused` filters an ordinary mark from the centralized
  `ChartFocusState`. Matching supports primary, group, key, x, y, and series.
  Mark order owns under/over placement; filtered marks infer scales but do not
  add hit targets. Custom surfaces receive primary, group, source, and pinned
  state.
- Verification: SVG tests filter band geometry by semantic x, Canvas tests
  preserve the cached base layer while painting underlays and overlays, and
  renderer tests verify pointer/keyboard source and pinned state.

### F-159 — Axis scale and presentation controls were interleaved

- Status: resolved
- Severity: high
- Owner: API
- Observed in: grid-without-tick-stubs feedback in issue #9
- Friction: flat scale, axis, tick, title, and grid options coupled visibility.
  Hiding the guide also removed grid lines; hiding stubs retained their
  geometry in layout.
- Decision: keep `scale`, `nice`, `reverse`, and `grid` at the scale layer and
  nest baseline, ticks, tick labels, and title under `axis`. `axis: false`
  retains the scale, and `axis.ticks.size: 0` omits stub nodes and their space.
- Verification: scene-layout tests cover independent grid and axis visibility,
  zero-size stub omission, formatter placement, title offsets, and mutually
  exclusive candidate policies. The combined issue #9 foundation adds 1,340
  gzip bytes to the locked line scene and 2,883 gzip bytes to the
  representative-mark entry; the reviewed universal baseline and isolated
  ceilings record that cost.

### F-160 — Responsive tick labels had no collision policy

- Status: resolved
- Severity: high
- Owner: API
- Observed in: responsive-axis-label feedback in issue #9
- Friction: authors could choose a tick count or rotation, but neither
  guaranteed readable labels as length changed. There was no way to hard-keep
  important interior labels.
- Decision: generate semantic candidates from exactly one of count, pixel
  spacing, or explicit values; then rotate and collision-thin labels. Thinning
  defaults on, categorical x softly prioritizes ends, and `keep` hard-retains
  exact labels without adding grid lines or stubs.
- Verification: tests cover width-dependent candidate counts, rotated thinning,
  the `thin: false` matrix, soft ends, hard interior retention, and kept
  label-only values through iterative automatic margins. Shared facet axes
  remeasure after their final cell width changes the thinning result; the
  320-pixel Anscombe case keeps its right edge label contained. That convergence
  adds 0.25 kB gzip to the isolated facet bundle (18.65 kB total), covered by
  its reviewed 18.8 kB ceiling without changing any exact universal baseline.

### F-161 — Tooltip anchors could not fix coordinates independently

- Status: resolved
- Severity: medium
- Owner: API
- Observed in: fixed-tooltip-placement feedback in issue #9
- Friction: point, pointer, and group-center presets moved both coordinates.
  Fixing a grouped tooltip to the plot top while following a value on x
  required duplicated plot-bound calculations in a callback.
- Decision: accept `{ x, y }` anchors with point, pointer, value, group-center,
  and plot-edge choices per coordinate. Callback context exposes complete
  focus, pointer, plot, surface, and resolved-scale state.
- Verification: renderer tests cover mixed plot-center/plot-top anchoring,
  keyboard pointer fallback, and the complete typed callback context.

### F-162 — Focus styling required duplicate marks

- Status: resolved
- Severity: high
- Owner: API
- Observed in: issue #9 pointer and grouped-tooltip examples and the pinned
  nested-chart tooltip
- Friction: enlarging or recoloring an existing focused dot required a second
  `whenFocused(dot(...))` with duplicated data, position channels, key policy,
  and paint. That replacement geometry could not interpolate from the base
  mark and made callback-dependent presentation repeat channel logic. Pointer
  pinning later changed tooltip state without repainting an already focused
  point, while dismissal could leave a no-transition pinned style painted
  after semantic focus cleared.
- Decision: supported marks accept ordered inline `states`. A state selects
  centralized focus by primary, group, key, x, y, series, unmatched, source,
  pinned state, or a callback. Style callbacks receive one object containing
  datum, index, data, point, focus, pointer, and a focus matcher. State styles
  change presentation only; `whenFocused` remains the composition for new
  transient geometry. Same-point forced updates repaint the complete focus
  state, and SVG and Canvas remember whether stateful paint must be restored
  when focus becomes null.
- Verification: SVG tests cover callback context, ordered active/unmatched
  overrides, paint and radius transitions, and restoration. Canvas tests cover
  equivalent repaint and restoration. Public type tests preserve the source
  datum throughout the single-object callback, and catalog cases 34 and 35
  exercise primary and grouped state styles. The complexity audit replaced a
  quadratic node/point scan with a per-mark prefix index. Static line-scene
  plumbing adds 71 gzip bytes; the complete SVG DOM host adds 994 gzip bytes,
  recorded in the reviewed universal bundle baseline. Case 84 uses one keyed
  dot mark with `{ focus: 'primary', pinned: true }`; pointer pin/unpin,
  same-point pointer tracking, SVG/Canvas null-focus restoration, Escape,
  close-button dismissal, and revision preservation are regression-covered.

### F-163 — Cross-row transforms lacked a public ownership boundary

- Status: resolved
- Severity: high
- Owner: API
- Observed in: replacing manual histogram, grouped-reducer, rolling-average,
  extrema, stack, and repeated wide-to-long preparation in the issue #9
  authoring pass
- Friction: canonical docs assigned every transform to application code while a
  private legacy package exposed a different options-rewriting transform model.
  Authors had no public typed path for common reductions, no consistent source
  lineage, and no clear distinction between reusable stack rows and mark-local
  stack/group layout. The first public pass then exposed opaque `key` tuples,
  nested `datum.datum` paths, input-order-only windows, and implicit reducer
  defaults. Real heatmap, cumulative histogram, ECDF, bump, Bollinger, and
  temporal aggregation cases still required one-off D3 glue.
- Decision: expose eager data-first fold, grouping, numeric and temporal
  binning, two-dimensional binning, window, cumulative, rank, normalize,
  select, and stack-row helpers. `fold` emits source-row-major output in
  authored field order, preserves values without filtering, and adds direct
  lineage under configurable key/value names. Group fields are named.
  One-to-one transforms extend flat input rows. Windowed operations accept
  explicit ordering. Every output names its reducer. Common reductions use
  compact string names; descriptive, dispersion, endpoint, change, ratio, and
  quantile reducers are separately tree-shakeable functions. Ordinary
  functions are the custom composition escape hatch; there is no
  `transformData` protocol or hidden reactive graph. `stack()` and `group()`
  remain mark layouts.
- Streaming-window boundary evidence: case 86 calls one ordinary inclusive
  row filter inside its exported definition builder. The bounded rows must
  drive y-domain inference, keyboard candidates, and tooltip data; passing
  complete history with `clip: true` would only clip paint. Locked/latest/all
  meaning and retention remain application policy, so neither the rolling
  `window()` reducer nor a generic domain-filter transform belongs here.
- Verification: focused unit and type tests cover callback inference, named
  compound groups, aligned grouped and two-dimensional bins, calendar-aligned
  empty periods, ordered rolling and cumulative lineage, ranks, quantiles,
  normalization, selection, and shared stack semantics. Conformance consumers
  use flat rows directly. Each transform family has a packed granular entry and
  independent bundle measurement; ordinary mark entries remain protected by
  exact baselines. The private legacy transform export and its 402 lines of
  duplicate implementation/tests remain removed.
- Fold follow-up verification: runtime and type tests cover authored field
  order, heterogeneous key/value correlation, collisions, missing values,
  direct lineage, generators, empty inputs, and option errors. Cases 27, 30,
  75, and 99 now keep `fold` → `normalize` → `select` composition beside their
  TanStack definitions and retain case-owned metric direction, selection, and
  label semantics without D3 extent preparation. Focused standard conformance
  keeps geometry at 96.0%, 98.9%, 100.0%, and 100.0%, with clean visual and
  strict type gates; authored TanStack source falls from 102/94/142/181 lines
  to 97/84/124/139. The exact fold bundle is 0.42 KiB gzip under its 0.50 KiB
  ceiling, the granular transform suite is 6.32 KiB under 6.40 KiB, and the
  packed exact consumer is 0.41 KiB with exports, declarations, runtime, and
  isolation verified.
- Bollinger follow-up verification: case 22 computes one full trailing
  `window` with named mean and sample-deviation outputs, then derives lower and
  upper `areaY` channels beside the mean `lineY`. The window owns ordering and
  twenty-row source lineage; the twenty-day scope, two-deviation multiplier,
  and endpoint arithmetic remain explicit financial meaning. No `bollingerY`
  mark, mean-plus-spread transform, cloned interval DTO, or case helper is
  warranted. Focused tests cover both revisions and D3 statistic parity.
  Browser conformance passes with clean types and 97.5% diagnostic geometry at
  38.21 KiB gzip versus Plot's 93.69 KiB. Plot's strict missing-value policy is
  distinct from `window` reducers ignoring non-finite values; every AAPL row is
  finite, so a future arbitrary-missing-data case should state its filtering
  policy rather than silently expand this API.
- Anchored-stack follow-up verification: case 26 groups raw survey responses
  through public `groupBy`, then passes those counts to an ordinary `barX`
  definition with an explicit response order and neutral-series fraction. The
  shared stack kernel uses ordered nonnegative prefix extents before translating
  the selected anchor point to zero; this preserves missing neutral cells that
  D3's signed diverging offset would collapse to `[0, 0]`. Horizontal and
  vertical marks plus both stack-row transforms share the same geometry and
  direct input identity. Focused tests cover exact endpoints, sparse anchors,
  fraction boundaries, invalid values and offsets, transposition, lineage, and
  removal of the case cursor/endpoint helper. No Likert-specific mark or
  signed-count transform is warranted. Browser conformance passes with clean
  types and 94.2% diagnostic geometry at 35.41 KiB gzip versus Plot's 86.83
  KiB. The reviewed exact stack fixture is 2.61 KiB gzip.
- Waterfall follow-up: case 29 uses the existing ordered two-row `window` with
  the `difference` reducer to expose year-over-year analytical intent, then
  passes those signed changes through the eager `waterfall` transform. The
  transform owns cumulative start/end intervals, increase/decrease
  classification, optional zero-based group totals, stable ordering, and
  direct step and aggregate lineage. Synthetic totals contain group and
  derived fields rather than cloning an arbitrary last datum. Invalid values
  are omitted, zero is retained, numeric overflow throws, and total-group names
  cannot collide with derived or lineage fields. No waterfall mark, generic
  synthetic-row protocol, or second cumulative reducer is warranted. Browser
  conformance passes with clean types and 96.7% diagnostic geometry at 36.10
  KiB gzip versus Plot's 85.44 KiB. The exact transform is 1.02 KiB gzip and
  the granular transform suite is 7.16 KiB.
- Population-pyramid follow-up: case 71 groups raw penguin observations by
  species and sex through public `groupBy`, then gives one ordinary `barX` a
  signed quantitative accessor and the existing diverging `stack` layout.
  Grouping owns aggregation and source lineage; the stack kernel owns interval
  geometry; which sex points left remains a visible one-line semantic choice.
  No pyramid mark, signed-count transform, or case DTO is warranted. Focused
  tests cover exact counts, all 333/327 selected observations, direct lineage,
  symmetric domain policy, zero-baseline geometry at three widths, and stable
  identities across resize and revisions. Browser conformance passes with
  clean types and 99.1% diagnostic geometry at 33.99 KiB gzip versus Recharts'
  151.05 KiB.
- Catalog-closure follow-up: the all-case audit found that several definitions
  still bypassed these delivered transforms despite being marked verified.
  Case 02 and Case 55 now select their newest dated group rows with public
  `select`; Case 55 also replaces its local first-value indexer with grouped
  `normalize`. `bar-grouped` uses compound `groupBy`, `bar-stacked` uses
  `fold`, Case 56 uses a two-row `window` directly in native arrows, and Case
  60 keeps its lag window inline beside the marks. Focused tests cover
  reordered inputs, group counts, fold and window lineage, semantic identity,
  and source closure without local D3 grouping or DTO helpers. Fresh quick
  browser conformance passes visual and strict-type gates for Cases 02,
  `bar-grouped`, `bar-stacked`, 50, 54–56, and 60 at 97.4%, 96.8%, 98.4%,
  97.9%, 96.3%, 97.6%, 98.9%, and 97.9% diagnostic geometry respectively.

### F-164 — Sankey widths required a custom scene renderer

- Status: resolved
- Severity: medium
- Owner: API
- Observed in: converting pull request `#16` from case-owned Sankey scenes to
  native TanStack Charts marks
- Friction: `link` accepted only fixed stroke width and opacity and always used
  round caps. Proportional `d3-sankey` links therefore forced both examples to
  duplicate complete custom scene construction for paths, nodes, labels, and
  interaction points instead of composing the existing marks.
- Interim decision: make link stroke width and opacity visual channels and
  expose its SVG line cap. Keep `d3-sankey` as a direct application dependency;
  run its responsive layout in the dynamic chart builder, then render the
  positioned output with native `link`, `rect`, and `text` marks.
- Follow-up evidence: native marks removed the custom renderer but both Sankey
  cases still clone D3-mutated inputs, resolve endpoints, assert bounds, and
  materialize layout and label DTOs before the definition. The complete
  definition-coverage audit classifies this as reusable adapter work.
- Implemented decision: retain native `link`, `rect`, and `text` presentation
  and add the exact optional `@tanstack/charts/network/sankey` entry. The
  `sankeyDiagram` mark owns responsive D3 layout, input cloning, graph
  validation, endpoint resolution, proportional widths, stable identity,
  immutable node/link values, lineage, and final-pixel child-mark composition.
  Consumers that do not import the subpath do not retain `d3-sankey`.
- Alignment follow-up: `align` keeps the four concise string shorthands and
  also accepts a D3-compatible node aligner. The callback sees the private D3
  node whose `data` retains the immutable source row, resolved key, and source
  index. Its integer layer result is validated before layout. This preserves
  arbitrary D3 column policy without exporting Sankey's mutable output as an
  intermediate chart DTO.
- Shared decomposition: force and Sankey layouts now share private graph
  accessor, key, duplicate, and endpoint validation. Sankey's ordinary child
  marks use a renderer-neutral resolved-child composition helper, and its
  parent/child motion merge shares the same private contract as polar
  composites. Composite child motion is snapshotted on each initialized mark;
  the former closure-global state let a later initialization overwrite motion
  for an earlier scene. Sankey and polar reuse regressions now protect that
  lifecycle. D3 settlement, column allocation, link thickness, and immutable
  Sankey materialization remain one mark invariant rather than becoming public
  halfway utilities.
- Retained boundary: both cases now pass semantic node and link rows directly
  to `sankeyDiagram`. The basic case retains only responsive dimensions and
  theme styling. The income-statement case retains authored order, compact
  wording, label side, value strings, backdrops, title, and profit/cost paint
  inside the ordinary `marks` callback.
- Verification: focused core tests cover two responsive sizes, exact D3
  parity, frozen-input isolation, graph errors, stable parallel-link identity,
  immutable lineage, child mark composition, and absence of Cartesian scales.
  Browser conformance passes both migrated cases at 320px and 640px with no
  diagnostics, clean types, clean visual review, and 98.3% mean geometry:
  99.9% for Basic Sankey and 96.8% for Sankey Flow. The exact source is 6.94
  KiB gzip versus 1.83 KiB for the D3 Sankey kernel, a 5.11 KiB increment under
  its 5.25 KiB cap. The packed production consumer is 14.33 KiB. Source and
  published exports, declarations, runtime, framework consumers, and
  production isolation pass; every non-Sankey bundle fixture rejects both the
  adapter and `d3-sankey`.
- Callable verification passes a native D3 aligner directly, covers custom
  valid and invalid layers, preserves source identity, exports complete public
  types, and executes from the packed exact subpath.

### F-165 — Incidental D3 utilities leaked into core paths

- Status: resolved
- Severity: high
- Owner: API/Tooling
- Observed in: auditing whether ordinary chart paths retain incidental D3
- Friction: nearest-point lookup and legend thresholds used small `d3-array`
  utilities, while compact linear scales imported D3 tick math. Those imports
  leaked D3 into common paths despite being easy to own locally. Numeric-bin,
  stack, polar, geo, and curve modules are deliberately D3-backed and expose
  strict D3 semantics rather than credible interchangeable APIs.
- Decision: implement nearest-point, quantile, and compact tick math locally.
  Keep `d3-array` inside numeric-bin transforms, `d3-shape` inside stack,
  polar, and curve features, and `d3-geo` inside geo features as normal
  isolated implementation dependencies. Public algorithm choices may still
  accept D3-compatible callables when that preserves useful composition. Keep
  `d3-hexbin` behind the exact `@tanstack/charts/spatial/hexbin` subpath. Keep
  the tree-shakable D3 curve bridges available from the root, universal, and
  exact barrels. Compact scales declare no production D3 dependency.
- Verification: core, geo, polar, curve, compact-scale, and type-contract tests
  pass. The independently structured tick helpers match `d3-array` across
  fixed edge cases and 2,000 deterministic generated domains. Bundle
  retained-input gates reject D3 geometry from ordinary root consumers and
  every `d3-*` module plus `internmap` from compact consumers, while selected
  transform, polar, geo, and curve features retain their owned D3
  implementation. The packed-consumer gate resolves and executes the exact
  spatial hexbin export while proving its D3 implementation is absent from the
  ordinary core consumer.

### F-166 — Grouped tooltip order diverged from mark position

- Status: resolved
- Severity: medium
- Owner: API
- Observed in: reviewing the default grouped-tooltip row order
- Friction: the default followed the color domain, so a tooltip could list
  series in an order unrelated to the marks under the pointer.
- Decision: default to visual order. X-grouped rows follow y position from top
  to bottom; y-grouped rows follow x position from left to right. Preserve
  `color-domain`, `focus`, and custom comparators as explicit policies.
- Verification: runtime tests cover both axes with input and color-domain order
  opposed to the rendered mark order.

### F-167 — D3 declarations require a browser image global

- Status: monitoring
- Severity: medium
- Owner: Tooling
- Observed in: strict DOM-free React Native consumer typecheck
- Friction: after Charts' DOM types were removed from the selected declaration
  graph, `skipLibCheck: false` with native libraries still failed in
  `@types/d3-array`. Its `blurImage` signature references the browser global
  `ImageData`, even though the chart consumer does not import or call that API.
- Current decision: keep the strict configuration as a sentinel. Do not add a
  fake `ImageData` declaration, enable DOM libraries, or weaken the package's
  runtime boundary to conceal an upstream declaration issue. The normal
  React Native configuration passes.
- Verification: the native type gate accepts only the two known
  `@types/d3-array` diagnostics or a clean result after the upstream
  declaration is fixed. It rejects every other diagnostic.

### F-168 — Native interaction copied DOM-renderer policy

- Status: resolved
- Severity: high
- Owner: API
- Observed in: restacking the React Native focus, selection, and tooltip proof
  after tooltip rendering moved behind an extension token
- Friction: focus preset resolution, stable-point restoration, navigation
  order, tooltip content construction, anchor resolution, and placement math
  are pure behavior but remain private across the DOM renderer and tooltip
  implementation. The native proof reproduced them to exercise realistic
  interaction. The
  extension split also made configured tooltip options require a host-owned
  token; importing the web token would pull DOM implementation into Metro.
  Restacking onto 0.3.0 also required the duplicate native resolver to learn
  the new per-axis anchors and focus-aware custom-anchor context before its
  strict type gate passed again. The scene compiler now also emits authored or
  default focus layers and inline mark-state metadata. Rendering those groups
  directly made inactive focus marks permanently visible in the native scene.
  The duplicate tooltip path also sorted display rows before choosing its
  primary point, so a non-first focused series changed formatter and anchor
  context. Scene restoration compared only semantic point identity, leaving
  overlays, tooltips, and external callbacks attached to old point objects
  after responsive geometry changed. Callback prop identity could also
  retrigger restoration and incorrectly change the focus source.
  An equivalent definition authored inline could rebuild the same scene after
  a parent callback update; restoration then treated the new point objects as
  another focus change, called the parent again, and could sustain an update
  loop.
  Restacking onto the visual grouped-tooltip ordering change then exposed the
  same drift again: the DOM host defaulted to visual order while the native
  copy still used color-domain order.
- Decision: share environment-neutral focus, restoration, scene-state,
  tooltip ordering, content, anchor, and placement policy across hosts. Brand
  tooltip tokens by host and carry that host through definition types. A chart
  spec remains portable until a platform tooltip is attached; DOM and React
  Native boundaries then reject the other platform's exact token.
- Verification: root TypeScript rejects both exact cross-host directions.
  Deliberately widened values retain explicit runtime guards. Focused core and
  native tests cover shared formatting, anchors, placement, restoration,
  authored focus layers, inline mark states, and visual ordering.

### F-169 — CSS theme defaults reach the native scene compiler

- Status: resolved
- Severity: high
- Owner: API
- Observed in: React Native paint resolution
- Friction: the shared default theme contains `currentColor`, system CSS names,
  and CSS custom properties. The native proof can resolve final paint strings
  and their fallbacks, but a dynamic chart builder still receives the web
  default theme before the host sees the scene.
- Decision: `createChartRuntime({ defaultTheme })` establishes platform
  defaults once. The runtime passes the same resolved value to responsive
  builders and applies it between the library defaults and the authored theme
  during final scene compilation. React Native derives its foreground, muted,
  and grid defaults from the host color.
- Verification: the runtime regression proves one platform theme reaches both
  build and merge phases, static and responsive runtimes compile with the same
  precedence, React Native has no unresolved `currentColor` paint, and root
  TypeScript passes.

### F-170 — Text measurement omits native typography

- Status: resolved
- Severity: high
- Owner: API
- Observed in: React Native SVG labels and automatic guide layout
- Friction: `ChartTextMeasureOptions` carries size and weight but not font
  family, style, stretch, letter spacing, direction, locale, or font-scale
  policy. The native painter accepts a `fontFamily`, while the shared layout
  cannot ask a native measurer for the same font.
- Decision: keep scene compilation synchronous. `ChartTextMeasureOptions`
  carries family, style, stretch, letter spacing, direction, locale, and font
  scale in addition to label-local size, weight, anchor, and baseline. Hosts
  own asynchronous font readiness and compile another scene when metrics
  change. React Native exposes matching typography props and applies font scale
  to measurement and SVG label paint.
- Verification: core tests cover complete resolved measure options, DOM tests
  cover inherited typography, React Native tests cover the full callback
  contract, and root TypeScript passes.

### F-171 — Packed declarations assume one platform global set

- Status: resolved
- Severity: medium
- Owner: Tooling
- Observed in: making the React Native package publishable
- Friction: the existing packed fixture compiles web packages under DOM
  libraries. Loading React Native declarations in that same TypeScript program
  introduces incompatible duplicate globals. Removing DOM libraries makes the
  web contracts invalid and also exposes F-167.
- Decision: build and pack the native adapter in the release artifact matrix,
  but keep its declarations and consumers outside the DOM fixture's TypeScript
  program. The package publishes compiled ESM and declarations with `types`,
  `react-native`, and `import` conditions. A native-specific gate deploys clean
  bare React Native and Expo dependency trees, installs the packed core and
  adapter tarballs, and runs each platform's normal Metro configuration.
- Verification: the staged package emits both root and optional-tooltip
  declarations, contains no source or tests, and retains no `workspace:`
  ranges. Node resolution selects the import build normally and the native
  shims under `--conditions=react-native`. Bare React Native 0.86.2 with
  `react-native-svg` 15.15.5 and Expo 57 with Expo's 15.15.4 build both
  typecheck and produce iOS and Android bundles. All four source maps resolve
  the adapter and `/universal` from installed `dist`, include the native
  conditional entries, exclude workspace source and guarded browser modules,
  and retain only F-167's two known strict dependency diagnostics. Separately,
  the workspace Expo 57 fixture boots in Expo Go on an iOS simulator and
  renders its chart under Hermes; the packed artifact has not been run on that
  simulator.

### F-172 — Metro skipped the fixture-owned Babel runtime

- Status: resolved
- Severity: medium
- Owner: Tooling
- Observed in: rebuilding the React Native POC after removing redundant root
  dependencies
- Friction: the example correctly declared `@babel/runtime`, but Metro resolved
  React Native from pnpm's physical store path and searched that path's
  ancestors instead of the example's `node_modules`. Production bundling
  failed on `@babel/runtime/helpers/interopRequireDefault` unless the dependency
  was duplicated at the workspace root.
- Decision: configure Metro's `resolver.nodeModulesPaths` with the example and
  workspace module roots. Keep Babel ownership in the example rather than
  masking the monorepo resolution boundary with a root dependency.
- Verification: all ten blank, RNSVG, core, granular full-chart, and universal
  full-chart production bundles complete for iOS and Android. The universal
  variants require `/universal`, and source-map checks exclude every guarded
  browser implementation module.

### F-173 — Metro retained the complete universal barrel

- Status: monitoring
- Severity: medium
- Owner: API/Tooling
- Observed in: measuring the documented React Native minimum usage through
  `@tanstack/charts/universal`
- Friction: Metro 0.84 retained every runtime module re-exported by the broad
  barrel, even though the fixture imported only `defineChart` and `lineY`. The
  result included unused marks, data-transform families, and the
  environment-neutral static SVG string serializer. Against the same granular
  full-chart fixture, `/universal` added 119.06 KiB minified and 28.91 KiB gzip
  on both iOS and Android, plus 102 modules per platform. The esbuild boundary
  policy also classified that environment-neutral serializer as browser-only,
  contradicting the Metro contract whenever a native fixture retained it.
- Current decision: keep `/universal` as the ergonomic cross-runtime authoring
  entry and make the full-chart Metro proof exercise it. Keep the native host's
  own imports granular, publish granular entries as the bundle-sensitive path,
  and do not describe the broad barrel as cost-equivalent under Metro. Keep the
  static serializer in the SVG capability group, but remove it from the
  browser-only rejection group.
- Verification: the iOS and Android full-chart bundles require
  `packages/charts-core/src/universal.ts`, measure 103.00 and 103.05 KiB gzip over
  blank respectively, and exclude DOM hosts, browser adapters, Canvas,
  reconciliation, SVG resources/surface, web tooltip code, and `react-dom`.
  A native-plus-universal boundary fixture retains both the native host and the
  static serializer at 11.37 KiB gzip and passes the browser-module rejection.

### F-174 — OIDC release cannot claim a new npm package name

- Status: monitoring
- Severity: high
- Owner: Tooling
- Observed in: adding `@tanstack/react-native-charts` to the fixed release set
- Friction: the package name was not yet present in the npm registry when the
  adapter was added, while the aggregate release used npm trusted publishing.
  npm configures that trust from an existing package's settings, so the normal
  tokenless workflow could not be authorized before its registry entry existed.
- Resolution: keep the package in release artifacts and the fixed changeset.
  The protected bootstrap workflow proved the exact-main artifact and
  sole-missing-package contract, but npm required interactive 2FA for the
  available session token. We bootstrapped `0.4.0` locally from a separately
  rebuilt and validated artifact without provenance, then configured
  `release.yml` as the trusted publisher before merging the aggregate version
  PR.
- Verification: `@tanstack/react-native-charts@0.4.0` is public with registry
  integrity
  `sha512-TucVraXke74k5zo1qDr7XIrycOIO4JewrAwsU49BvH03nH7Rg4AnrRxuGazrPT72rcVBcjD9lYvdhCK2vMk4dQ==`.
  `npm trust list` names `TanStack/charts` and `release.yml`. Release run
  `30732992167` first published all 12 fixed-set packages at `0.5.0`. Follow-up
  trusted release run `30733331380` published `0.5.1`; independent registry
  reads confirmed `latest=0.5.1`, integrity, and attestations for every package.
  The temporary npm login was revoked and no bootstrap environment secret
  remains.
- `0.7.0` follow-up: `@tanstack/react-charts-catalog` was added to the fixed
  set without its own npm trusted-publisher mapping. Release run `31217442235`
  published the other 12 packages with provenance, then failed with
  `ENEEDAUTH` on the catalog. The guarded bootstrap workflow proved it was the
  sole missing fixed-set artifact before using the protected recovery token.
  Keep this finding open until npm names `TanStack/charts` and `release.yml` as
  the catalog package's trusted publisher and a tokenless coordinated release
  verifies it.

### F-175 — Native SVG resource normalization collapsed authored IDs

- Status: resolved
- Severity: medium
- Owner: Application
- Observed in: pre-publication review of custom native scene gradients
- Friction: the native SVG host removed every character outside an allowlist
  from authored gradient IDs. Distinct public IDs such as `a.b`, `a:b`, and
  `ab` therefore addressed the same native SVG resource.
- Decision: preserve letters, digits, and hyphens, and encode every other code
  point with an unambiguous SVG-safe escape. The escape marker itself is
  encoded, so an authored string cannot collide with an encoded character.
- Verification: the native scene regression renders the formerly colliding
  IDs plus empty and delimiter-containing IDs, and checks matching definition
  IDs and paint references.

### F-176 — Large marks were focused by distant anchor points

- Status: monitoring
- Severity: high
- Owner: API
- Observed in: stacked-bar tooltip report and interaction-geometry lab
- Friction: vertical bars emit their value endpoint as the interaction anchor,
  and the default resolver measured `maxFocusDistance` only from that anchor.
  A pointer inside a tall bar could therefore select an adjacent endpoint less
  than 48 pixels away. Raising the threshold retained the wrong two-dimensional
  ranking, while chart-wide nearest-x made off-bar selection too permissive.
  Pure x fallback also tied every segment in one stack and selected the bottom
  segment when the pointer was above the stack.
- Current decision: use a two-stage scene contract rather than infer a strategy
  from chart composition or copy geometry onto `ChartPoint`. A resolved `rect`,
  `dot`, `area`, `polyline`, or `rule` attaches its semantic point or points and
  natural `x`, `y`, `xy`, or `geometry` fallback. The default resolver collects
  those targets from the final scene in paint order, accumulating facet and
  group translations and clips. Exact containment wins across all marks before
  fallback ranking; axis fallback uses visible primitive bounds first and full
  geometry distance to break ties. Inline mark states return their destination
  scene to the host, which intentionally uses that scene during animation.
  Points not attached to a primitive retain legacy point-distance behavior.
  Explicit focus strategies and custom spatial indexes continue to own their
  complete search semantics; the spatial-index factory now receives the final
  scene as a backward-compatible second argument so bounds, quadtrees, or
  Delaunay can remain optional acceleration layers without copying geometry
  onto points. Facet layout also scopes the final primitive and focus-layer
  keys. Default `primary`/`group` presentation matches canonical focused points
  instead of treating equal x/y/series tuples in another panel as the same
  point; `whenFocused(..., { match: "x" })` or `match: "y"` remains the
  explicit synchronized-cursor contract.
- Verification: focused tests cover containment priority, x/y/xy/geometry
  fallback, rounded/reversed rectangles, circles, polygons, rules and lines,
  built-in bar affinity, paint-order overlap, stack-edge selection, nested
  translation, partial and complete clipping, destination-state scene
  selection, spatial-index ownership, legacy tie order, duplicate-valued facet
  identity, explicit synchronized x/y facet bands, and axis-correct animated
  bar insets. The sandbox adds default-primary, x-synchronized, and
  y-synchronized facet focus modes with contextual source, plus a live
  destination-animation contract before twenty-four chart-family, grouped-bar,
  clipping, polar, facet, and large-geometry comparisons. The lab now includes
  dense scatter, pre-binned hexagon, nested-bubble paint-order, and richer
  Sankey/network probes; its twenty-eight proof families split evenly between
  labelled SVG and Canvas cards, and the destination-animation contract renders
  in both so attribute interpolation and buffer crossfading share the same
  picking semantics. Four composed cases verify that built-in bars, areas,
  lines, rectangles, and dots contribute their natural affinity per primitive
  without a chart-wide setting, including topmost containment when unlike marks
  overlap. Facet coverage includes plain, grouped, stacked, and bubble marks.
  Three mixed-mark cases now include an additional native `group-x` or
  `group-y` tooltip card. This exposed that grouped tooltips are not an
  independent presentation option: each grouped preset replaces the default
  scene-containment resolver with nearest-axis selection as well as returning
  the focus group. The lab keeps those cards separate and labelled rather than
  claiming that geometry-first primary selection and axis grouping currently
  compose.
  The full unit matrix passes 745 tests across 131 files;
  typecheck, documentation,
  formatting, packed-consumer, seven-adapter, sandbox production-build, and
  live browser checks also pass.

  On Node 24 arm64 on an Apple M4 Pro, the cached scene resolver improves the
  unoptimized POC's median query time from 113.5 to 14.2 microseconds for 10k
  ordinary points, 62.5 to 16.4 for contained rectangles, 210.6 to 118.0 for
  stacked fallback, 64.5 to 16.2 for circles, and 126.2 to 71.8 for 2k
  polygons. On an exact-target point fixture, production, scene geometry,
  Observable Plot 0.6.17, D3 quadtree, cold D3 Delaunay, and coherent Delaunay
  take 13.7, 13.7, 41.4, 2.6, 8.7, and 3.0 microseconds. Quadtree and Delaunay
  construction take 1.92 and 2.53 milliseconds for 10k points. A
  source-equivalent Vega cached-bounds pass takes 10.0 microseconds versus 15.2
  for the generic rectangle resolver, but deliberately excludes Vega's
  subsequent Canvas path test.

  The isolated scene resolver is 5,010 minified / 2,005 gzip bytes versus 157 /
  153 for the anchor-only kernel: a 1,852-byte gzip feature cost under an
  explicit 2 KiB ceiling. Against the pre-feature product lock, the complete
  DOM host adds 1,840 gzip bytes, the React line consumer adds 1,859, and the
  native host adds 1,824. These shared-host costs and the related aggregate
  fixture ceilings were reviewed and accepted because painted-geometry
  interaction is the default contract across DOM, Canvas, and native charts;
  the exact locked baselines now record that decision while the isolated 2 kB
  ceiling continues to constrain the resolver itself. A final size audit removed
  redundant built-in `MarkScene.points` arrays and explicit default `xy`
  affinity fields while retaining the optional point list for custom-mark
  compatibility. Against the immediate pre-audit build, that saves 119
  minified / 58 gzip / 67 Brotli bytes in the representative-marks entry and 24
  / 10 / 39 bytes in the D3-line scene. The interactive host is unchanged
  because it does not bundle those mark encoders. Packing cached interaction
  targets into tuples was rejected after the same 10k stacked-fallback fixture
  regressed from about 118 to 294 microseconds per query; the larger but
  optimizer-friendly object shape remains.
  [Observable Plot](https://observablehq.com/plot/interactions/pointer)
  documents point-only dead spots and dominant-axis modes;
  [D3 quadtree](https://d3js.org/d3-quadtree#quadtree_find) and
  [D3 Delaunay](https://d3js.org/d3-delaunay/delaunay#delaunay_find) establish
  indexed point lookup and its build/rebuild tradeoff; Vega's
  [reverse visitor](https://github.com/vega/vega/blob/main/packages/vega-scenegraph/src/util/visit.js)
  and [Canvas picker](https://github.com/vega/vega/blob/main/packages/vega-scenegraph/src/util/canvas/pick.js)
  establish topmost traversal, cached-bounds rejection, and exact path tests.

- Follow-up: exact picking against optional authored SVG path strings and an
  interpolated mid-transition scene remain separate refinements. Verify full
  SVG/Canvas parity before resolving this entry.

### F-177 — Bubble overlap inherited incidental source order

- Status: resolved
- Severity: medium
- Owner: Application
- Observed in: Palmer penguin bubble-scatter conformance pair
- Friction: translucent bubbles deliberately use paint order to resolve
  overlapping containment, but the conformance rows retained incidental source
  order. A smaller observation could therefore be painted behind and become
  difficult to target even though it remained visually perceptible.
- Decision: share one typed row selector between the Plot and TanStack cases,
  filter complete channel values with a type predicate, and paint larger body
  masses first so smaller bubbles remain visible and targetable on top. Keep
  the library's generic paint-order policy unchanged because authored scene
  order can be semantically meaningful.
- Verification: the model regression covers the initial 320-row fixture and
  asserts monotonically descending body mass for the paired renderers' shared
  row selector.

### F-178 — Custom-template examples exposed DOM mutation plumbing

- Status: resolved
- Severity: high
- Owner: Documentation/Tooling
- Observed in: catalog review of the catalog application, axis-pointer
  tooltip, interactive legend, linked data table, focus/context window, pinned
  nested-chart tooltip, resource timeline, streaming controls, synchronized and
  free cursors, range brush, time zoom, playback, editable range, motion, and
  calendar examples
- Friction: the public TanStack examples assembled application-owned legends,
  tables, tooltip rows, buttons, and nested chart containers with long
  `createElement`, mutation, and listener blocks. The chart grammar remained
  visible, but the surrounding composition was unfamiliar copy-paste material
  for the primary React audience and obscured the adapter's intended ownership
  boundary. The catalog application itself still used `innerHTML`, string
  templates, selector rebinding, and manual listener cleanup, and later
  interaction and motion examples repeated the same application-shell pattern.
- Decision: assume React for the catalog application and all application-owned
  example composition, using `@tanstack/charts/react`. Keep direct DOM access
  only at actual browser integration boundaries such as metadata, measurement,
  renderer mounting, and conformance inspection. Chart-only lifecycle fixtures
  and third-party reference adapters may stay imperative when they do not
  author application UI. A small conformance-only React mount adapter translates
  the benchmark's mount, update, driver, and destroy contract without entering
  authored-source totals. Catalog source discovery, artifact validation, and
  raw-source publication follow `.tsx` support modules and classify the React
  bridge as harness code.
- Verification: root TypeScript reports zero diagnostics; the focused React
  example, source-loader, source-file, source-view, and catalog-index suites
  pass; and the production catalog build publishes all 111 cases with valid
  recursive source closures. Chromium quick-profile checks pass visual and
  semantic interaction scenarios for all 14 examples migrated in the follow-up
  at 320px and 640px across both data revisions. The browser run also verifies
  preserved horizontal scroll, semantic synchronized focus, free-cursor input
  precision, brush and zoom controls, playback, editable dates, motion, and the
  calendar shell.

### F-179 — Animation clocks drift at fixed frame indices

- Status: monitoring
- Severity: medium
- Owner: Tooling
- Observed in: Bklit-derived initial-motion conformance POC
- Friction: the reference and candidate schedule independent animation-frame
  callbacks. A Playwright fake clock advances both deterministically, but their
  first callback can still occupy adjacent browser-frame boundaries. Strict
  same-index comparison reported 1.279 px maximum bar drift and 3.212 px line
  reveal drift while both implementations used the same duration and easing
  and ended at identical geometry.
- Decision: retain frame samples and completion state, use narrow transient
  tolerances for independent clocks, and require exact final geometry. A
  production conformance suite should also compare timing landmarks or align
  first movement before scoring continuity; screenshots alone cannot separate
  clock phase from interpolation quality. Derive the capture envelope from
  delay plus duration, not the base duration, so staggered tails are recorded.
  For interrupted updates, measure continuity at the target-change boundary;
  a global one-frame delta confuses an intentionally steep easing curve with a
  reconciliation snap.
- Verification: the first gated run correctly failed because a fixed 91-frame
  capture ended before the last staggered bar. The timing-envelope-driven WebM
  run completes both timelines and passes the explicit 2 px bar and 4 px
  line-reveal bounds with exact final geometry. The update spike initially
  rejected a legitimate 96.307 px high-velocity frame; its actual interruption
  boundary moved 7.7 px between sampled frames and passes the corrected 20 px
  velocity gate. A synchronous before/after probe now measures the actual
  reconciliation discontinuity at 0 px. After renderer isolation, the initial
  reference comparison reports 0.138 px maximum bar drift and 0.057 px maximum
  line-reveal drift, with both timelines finished.

### F-180 — Chart host hid animated presentation geometry

- Status: resolved
- Severity: medium
- Owner: Tooling/API
- Observed in: interrupted-update motion conformance fixture and interactive
  motion catalog cases
- Friction: `mountChart().getScene()` correctly returns semantic target state,
  and its `onRender` callback intentionally hides the renderer surface. A
  conformance probe therefore could not ask which points were currently
  painted while a transition was in flight. It had to use the lower-level
  renderer host and SVG renderer entries to access presentation points.
- Decision: keep presentation geometry renderer-owned and optional. The
  isolated motion renderer owns animation policy, SSR adoption, cancellation,
  and painted points; the DOM host only asks the active surface for those
  points during pointer resolution. The public semantic scene remains pure.
  Keep the low-level renderer-host fixture for this spike; do not add a second
  scene to the ordinary chart API without a production consumer.
- Verification: 235 recorded frames span keyed reorder, insertion, removal,
  line morphing, and a second update during the first transition. All pointer
  probes select the datum at its painted position, synchronous interruption
  continuity is exact, and the final motion state and probe cleanup pass. The
  optional host lookup costs 84 minified bytes / 41 gzip bytes in the direct
  DOM host measurement. Catalog cases expose replayable entrance controls and
  interrupted keyed updates at 320px and 640px without console errors or
  control/chart overlap; both settle to eight bars and one line.
- Follow-up evidence: after renderer surfaces exposed typed presentation
  points, the low-level `createSvgChartRenderer(renderChartSvg)` factory became
  invariant in datum and coordinate types. Adapter tests that relied on
  inference through an erased renderer boundary no longer typechecked.
- Follow-up decision: keep the renderer boundary invariant so presentation
  geometry cannot be paired with an incompatible scene. Low-level adapter
  tests and custom-renderer authors specify the renderer's datum, x, and y
  generics explicitly; no assertion or untyped overload was added.
- Follow-up verification: the two adapter renderer fixtures compile with
  explicit `<Datum, number, number>` arguments, the full workspace typecheck
  passes, and the focused core and React Native run passes 902 tests.

### F-181 — Tween tracks could not preserve interruption velocity

- Status: resolved
- Severity: medium
- Owner: API
- Observed in: physical spring spike on the interrupted keyed-update catalog
  case
- Friction: the motion renderer preserves painted position when a target
  changes, but every track is expressed as one normalized progress function.
  Cancellation therefore has no per-property velocity to seed into the next
  target. An easing-shaped spring can overshoot and settle naturally, but it
  visibly restarts at zero velocity after an interruption. SVG paths make the
  missing ownership concrete: one path attribute can contain many independently
  moving numeric values.
- Decision: keep two transition types: duration-and-easing tweens or physical
  springs. The spring API exposes stiffness, damping, mass, rest thresholds,
  and value-plus-velocity sampling; it has no duration or easing adapter. The
  optional motion renderer owns persistent numeric channels for each keyed DOM
  attribute token and presentation coordinate. Retargeting seeds every channel
  from its painted value and velocity. Automatic staggering applies to
  entrances; update delays must be authored explicitly so interruption does not
  pause momentum. Model this value ownership after Motion without depending on
  its DOM/value runtime.
- Verification: focused tests cover underdamped overshoot, critical and
  overdamped motion, nonphysical input, scalar retargeting, and renderer-level
  momentum continuity. In the interruption test, a bar keeps moving in its
  incoming direction for the first post-retarget frame even though its new
  target is behind it; DOM and presentation geometry remain aligned. The
  browser-backed WebM records zero synchronous interruption displacement, one
  observed target-reversal momentum carry, no interaction misses, exact final
  geometry, eight final bars, and no remaining motion probes. The isolated
  solver is 1.42 kB minified / 0.70 kB gzip. The complete tween-and-spring SVG
  renderer is 30.63 kB minified / 10.55 kB gzip. A local Motion 12.42.2 study
  measured its `spring`
  generator at 1.74 kB gzip, `springValue` at 9.01 kB gzip, and `animate` plus
  `motionValue` at 22.85 kB gzip; its direct retarget preserved value exactly
  and velocity within 2.85e-14.

### F-182 — Per-series transition overrides did not inherit defaults

- Status: resolved
- Severity: medium
- Owner: API
- Observed in: basic two-series spring line catalog case
- Friction: giving the comparison series a different mass or stiffness resets
  every omitted spring property to the library defaults instead of inheriting
  the chart transition. The example must spread the complete base transition
  into its per-series return value. The `timing` callback name is also narrower
  than its actual ownership now that it selects transition types and physics.
- Decision: merge same-type partial overrides through a renderer-neutral
  definition cascade: motion implementation defaults, chart definition, mark
  definition, axis definition, and specific guide definition. Timing and
  transition selection live only in definitions.
- Verification: the comparison series in catalog case 114 returns only
  `{ transition: { type: 'spring', mass: 1.2 } }` and inherits the chart's
  stiffness and damping. Its case test covers exact datum identity and stable
  keys across stages, native path retargeting with momentum continuity, the
  partial override, and the absence of custom rendering. The standard browser
  matrix passes visual and strict type gates at 97.2% final-frame geometry.
  Focused core motion tests cover the chart, mark, axis, tick, tick-label, and
  axis-label cascade.

### F-183 — Motion policy was centralized in renderer setup

- Status: resolved
- Severity: medium
- Owner: API/Tooling
- Observed in: definition-owned motion catalog spike across cases 112–115
- Friction: renderer construction had to know semantic mark IDs, datum flags,
  axis roles, and stagger policy. That made a renderer implementation part of
  the chart definition in practice and encouraged one large callback detached
  from the mark or guide it controlled.
- Decision: allow inert motion policy on the chart definition, individual
  marks, axes, ticks, tick labels, and axis labels. The optional motion module
  resolves those declarations at runtime; core owns no clock, tween, spring,
  DOM animation, or renderer-specific target code. A symbol-keyed source seam
  carries the original definition into the optional implementation without
  exposing motion metadata on the public `ChartScene` shape or building a
  public registry.
- Verification: case 115 combines a chart default, mixed spring/tween mark and
  guide overrides, per-datum staggering, and interrupted updates while its
  renderer is created once with no semantic timing callback. Its focused case
  tests cover exact datum identity, stable keys, the complete definition
  cascade, spring interruption continuity, and the source boundary. Cases
  112–114 now keep their policy in definitions too. The standard case 115
  browser matrix passes visual and strict type gates at 95.3% final-frame
  geometry with no invalid paths, stale probes, or console errors. Every built-in mark,
  including nested polar marks and composite facet/polar parents, accepts the
  same definition-local policy. Keyed interaction points now follow animated
  geometry for non-line marks as well as bars and path series. A focused test
  proves an updating dot's DOM and presentation coordinates remain aligned.
  The source seam adds only internal references to the definition and
  initialized mark IDs; it does not change enumerable or serialized scene
  output. It costs 94 minified bytes / 42–54 gzip bytes in isolated scene
  consumers. The complete default DOM host delta is 254 minified / 128 gzip
  bytes, including presentation-point lookup. Snapshotting factory motion on
  each initialized mark adds 63 minified bytes and 16–18 gzip bytes to ordinary
  single-mark consumers; the reviewed locked baselines and the narrow custom
  mark, vector, and polar budgets include that lifecycle cost.

### F-184 — Cross-type marks lacked a shared morph topology

- Status: monitoring
- Severity: medium
- Owner: API
- Observed in: bar-to-rose-to-donut-to-bubble geometry-morph catalog spike
- Friction: stable datum and mark keys are not sufficient for cross-type
  morphing. Ordinary bars render as rectangles, bubbles as circles, and polar
  or area marks as paths whose command counts can differ. The SVG motion
  reconciler correctly treats different element types or incompatible path
  skeletons as enter/exit replacements, so composing existing chart factories
  cannot produce a geometric morph.
- Decision: prove the smallest common contract before adding public API. Case
  116 uses a custom renderer-neutral mark with six stable datum keys and
  normalizes every bar, rose sector, donut sector, and bubble to a 48-point
  closed polygon. The existing spring runtime then animates the same 96 numeric
  channels per datum and preserves those channel velocities when retargeted.
  The definition owns ID, source key, paint, spring defaults, stagger, and the
  one per-datum mass exception. The custom mark owns only responsive sampling
  and interaction anchors, and emits `SceneArea.points` so normal SVG, Canvas,
  and native serialization owns the path. Do not make SVG path-string
  normalization the cross-renderer contract. Keep a normalized morph adapter
  in monitoring until a second real case repeats this topology work.
- Verification: browser checks observe six changing paths and six active
  motion tracks during bar-to-rose and interrupted rose-to-bubble transitions,
  with stable chart height, no invalid coordinates, six distinct final shapes,
  no stale probes, and no console errors. All shapes stay inside the chart at
  320px. Focused tests cover exact types, raw row identity, stable keys, all
  four 48-point topologies, a shared renderer skeleton, definition-local
  policy, and path-token momentum after an interrupted retarget. The standard
  visual matrix passes strict types and visual review at 87.4% final-frame
  geometry. The example exposes the cost directly: 576 animated coordinate
  channels and roughly 12.5 kB of SVG markup at 640px.

### F-185 — Control reflow turned a morph into a resize

- Status: resolved
- Severity: low
- Owner: Application
- Observed in: interrupted geometry-morph catalog controls
- Friction: the temporary “rose to bubbles” status was wider than the settled
  label, wrapped the control row, and changed the measured chart height before
  the second target. The renderer correctly skipped motion because resize
  animation is disabled, making the geometry appear to jump.
- Decision: reserve a fixed, single-line status width in the example so control
  copy cannot alter chart geometry during a transition.
- Verification: the interrupted browser check reports an unchanged chart
  height, a running motion state, six changed paths, six active probes, and no
  invalid coordinates 60 ms after the second target begins.

### F-186 — Focus states bypassed the optional physics runtime

- Status: resolved
- Severity: high
- Owner: API
- Observed in: primary, grouped, and unmatched focus-motion catalog spike
- Friction: mark states accepted a separate duration-and-easing transition
  shape and the SVG host painted focus through the legacy tween reconciler.
  Definition-local focus styles therefore could not use the physical spring
  runtime, preserve per-attribute velocity across rapid pointer retargets, or
  share the same transition vocabulary as entrance and update motion.
- Decision: make state transitions use the renderer-neutral
  `ChartMotionTransition` contract. The optional motion surface applies the
  definition transition to every changed focus attribute and retains numeric
  channel velocity. Static SVG and Canvas keep their existing lightweight
  tween path; a spring state snaps there rather than importing a solver.
- Verification: the focused renderer test springs primary, grouped, and
  unmatched marks, interrupts the active focus target, observes exact
  synchronous continuity and continued incoming momentum before reversal, and
  restores the default state. The live catalog case reproduces the three focus
  levels during rapid pointer and keyboard retargeting without invalid SVG.

### F-187 — Crosshair motion required an application-owned frame loop

- Status: resolved
- Severity: medium
- Owner: API
- Observed in: focus and crosshair motion catalog case 117
- Friction: the physical scalar sampler is reusable, but a spring-following
  crosshair still required an application-owned SVG overlay, x/y values,
  velocities, targets, frame scheduling, resize repaint, visibility, and
  teardown. Adding axis labels also required application-owned label content,
  contrast, sizing, placement, and alignment with the animated presentation
  coordinates. Mounting that overlay before the chart caused the SVG surface
  renderer to adopt it as the chart root; the application had to mount the
  owned chart surface first and append the overlay afterward.
- Decision: the renderer-neutral boundary is a stable-key focus-guide
  scene primitive, not an application SVG or a general motion-value graph. Add
  `focusGuideX` / `focusGuideY` with rules, marker, labels, formatters, and
  ordinary definition motion. Composed shared focus inside one host then covers
  linked cursors without adding another animation clock to core; controlled
  focus remains separate only for independently hosted charts.
- Verification: case 117 now uses the exact focus-guide entry and contains no
  second SVG, frame loop, spring sampler, resize repaint, or `onRender`
  callback. Candidate subtrees carry explicit point-slot ownership instead of
  colon-prefix inference; `a`/`a:point`, the guide's own `:point` suffix, and
  duplicate primitive rows have regressions. Mark-state transitions are scoped
  to their owning mark, so the guide keeps its distinct spring and interrupted
  velocity. SVG, Canvas, React Native, facets, labels, raw identity, initial
  focus, retarget, clear, and visible live-status ownership pass 109 combined
  focused tests. The standard browser matrix passes both revisions, light and
  dark themes, 320/640/960px viewports, keyboard/pointer behavior, clean types,
  and 98.0% geometry similarity. The exact fixture is 18.07 KiB gzip, a 1.09
  KiB increment over ordinary dots under its 2 KiB cap; the packed consumer is
  18.05 KiB and retains no motion, spring, tooltip, portal, or D3 geometry
  input.
- Static axis-pointer follow-up: case 80 now composes `focusGuideX` with
  grouped x focus, the native grouped tooltip, and `colorLegend`. It contains
  no React state mirror, second SVG, `onRender` coordinate bridge, handwritten
  legend, or tooltip-position function. This is the same focus-guide primitive
  as case 117 and the same grouped-focus/tooltip seam as case 35; adding an
  `axisPointer` wrapper would only hide those existing parts. Focused tests
  cover source identity, hidden guide candidates, stable retarget structure,
  full-height rule geometry at 320/640/960px, native tooltip rows and swatches,
  and clear behavior. The standard browser matrix passes both revisions,
  light and dark themes, pointer leave, touch cancellation, edge containment,
  visual and strict type gates at 98.9% diagnostic geometry. TanStack uses 397
  authored lines and 39.33 KiB gzip versus ECharts' 446 lines and 173.77 KiB.
- Linked-view follow-up: case 87 composes two child focus guides inside one
  `viewGrid`. Grouped x focus retargets both rules and markers at the same Date,
  while native pinning owns pointer-leave, keyboard activation, Escape, and
  update restoration. The case contains no second SVG, frame loop, copied
  scale, or cross-host focus controller. This is a second focus-guide consumer
  with a distinct independent-y, shared-x composition contract. The quick
  paired browser matrix passes both renderers, revisions, sizes, themes,
  behavior, visual, and strict type gates at 100.0% diagnostic geometry.
- Data-less crosshair follow-up: add a `crosshair` mark that emits
  renderer-neutral focus-guide descriptors instead of scale values, hit
  targets, or base-scene nodes. `resolveFocusPresentation` maps local focus or
  projected cursor state into keyed underlay/overlay rules, optional labels,
  and an optional marker. `focusGuideOnly`, mark-order placement, full surface
  and plot bounds, and guide-carried resolvers keep crosshair semantics outside
  generic renderers while SVG, Canvas, motion, and React Native share the same
  transport. The exact subpath exports `resolveCrosshairGuide` for custom guide
  marks that want the built-in rule, band, label, and marker behavior.
- Crosshair verification: scene tests cover stable x/y rules, overrides,
  labels, markers, clipping, surface clamping, facets, and cursor presentation
  without datum focus. Mark-order and facet regressions preserve under/over
  placement. SVG, Canvas, motion, and React Native preserve guide identity and
  spring velocity; focused export includes guides only with
  `includeFocus: true`, and Canvas focus repaint leaves the base canvas
  byte-identical. The isolated crosshair entry is 8.69 kB minified and 2.92 kB
  gzip with no cursor, renderer, tooltip, or D3 runtime. Shared scene/static-SVG
  support adds 188–258 minified and 68–103 gzip bytes across the four locked
  non-host products; DOM-host guide transport adds 9,020–9,032 minified and
  2,698–2,810 gzip bytes. The optional motion renderer remains 45.93 kB
  minified and 15.48 kB gzip. Reviewed baselines record the 2,655–2,827 gzip
  byte increase across the affected controlled consumers, while all 48
  external-library comparison rows remain unchanged and
  `pnpm benchmark:check` passes.

### F-188 — Paired interaction assertions assumed equal timing

- Status: monitoring
- Severity: medium
- Owner: Tooling
- Observed in: focus and crosshair motion conformance scenario
- Friction: one interaction scenario applies the same assertions to the
  reference and target. Observable Plot's native crosshair snaps immediately,
  while the TanStack crosshair and focus styles remain physically in flight.
  Requiring `running` at a shared step therefore fails the honest reference;
  omitting it leaves the paired scenario unable to score temporal behavior.
- Decision: use the paired scenario for focus identity, grouped cardinality,
  finite crosshair state, final settlement, screenshots, and cross-library
  geometry. Keep velocity continuity and intermediate spring behavior in the
  renderer unit test and direct browser probe. Investigate renderer-specific
  temporal assertions or recorded motion landmarks before promoting this to a
  general animation quality score.
- Verification: the quick profile now passes the semantic scenario across
  Observable Plot and TanStack at 320px and 640px, both revisions, with clean
  types. The independent interruption test still proves exact synchronous
  continuity and incoming momentum before reversal.

### F-189 — The motion spike exposed duplicate configuration surfaces

- Status: resolved
- Severity: high
- Owner: API
- Observed in: release hardening of motion cases 112–117 and packed-consumer
  declarations
- Friction: the spike exported `polishedMotion`,
  `createPolishedSvgChartRenderer`, a low-level driver/context seam, legacy
  renderer `duration` and `easing` aliases, feature toggles, stagger controls,
  and a centralized timing callback. Most duplicated definition-local policy,
  exposed SVG implementation details, or created multiple ways to select the
  same renderer.
- Decision: ship one optional `motion()` renderer with tween and spring support
  and four renderer-wide policies: initial motion, fallback transition,
  reduced-motion handling, and resize motion. Keep semantic timing in chart,
  mark, datum, axis, label, and focus definitions. Keep the SVG driver and
  reconciler integration internal. Retain the scalar physics sampler as the
  separate `@tanstack/charts/spring` capability. Retain the lightweight
  `animate` path for the default SVG renderer, but enforce one animation owner
  per host: `motion()` ignores legacy animation options and reads declarative
  motion policy from the chart definition. A definition-level `motion`
  declaration configures that renderer; it does not select it.
- Verification: all catalog, POC, packed-consumer, and unit-test callers use
  `motion()`. The public `/motion` entry exports one value plus its option and
  renderer-neutral definition types; legacy aliases and low-level driver types
  no longer appear in the package contract. Documentation covers the one-path
  setup, override cascade, renderer compatibility, accessibility behavior, and
  migration from duration-only focus transitions. The motion renderer
  integration test mounts a definition containing both legacy `animate` and a
  conflicting definition-level motion duration, then verifies that the
  host-level motion renderer owns the transition timing.

### F-190 — Static conformance sampled active motion

- Status: resolved
- Severity: high
- Owner: Tooling
- Observed in: release conformance for motion cases 112–116
- Friction: the visual gate inspected immediately after mount and update, so
  entering bars had zero-size boxes and active spring geometry was compared to
  a settled reference. Valid motion examples failed paint and geometry checks
  even though their final frames were correct.
- Decision: let static visual inspection await each implementation's optional
  `driver.settle` hook before inspecting initial and revised frames. Keep
  intermediate timing, velocity, and interruption assertions in independent
  interaction scenarios and renderer tests.
- Follow-up evidence: cases 112–116 each copied the same renderer-state query,
  animation-frame loop, completion check, and timeout; case 117 copied the
  state query. This was conformance-driver plumbing, not missing chart grammar.
- Follow-up decision: keep one benchmark-only `readChartMotionState` helper for
  cases 112–117 and one `settleChartMotion` helper for cases 112–116. Do not add
  settling, replay, or DOM-state inspection to the renderer-neutral chart
  definition. Replay controls and renderer remounts remain application shell.
- Verification: the quick 112–117 browser matrix passes all six visual cases,
  the focus/crosshair scenario, both revisions, and 320/640px viewports. Mean
  final-frame geometry similarity is 94.2%, with clean strict types. Case 112's
  focused tests additionally cover shared state reads, completion, timeout,
  raw datum identity, and chart/mark/datum motion ownership. Target-specific
  replay timing remains in renderer tests because paired catalog scenarios
  cannot impose animation state on the static Observable Plot reference.

### F-191 — Axis tick styling and edge alignment required shell work

- Status: resolved
- Severity: low
- Owner: API
- Observed in: matching the token activity calendar to a supplied visual
  reference
- Friction: the reference required larger, quieter month labels than the
  default axis typography. Axis presentation exposes tick values, formatting,
  spacing, thinning, size, and padding, but not label font size or opacity. The
  example therefore needed a shell-scoped `.ts-chart__axes text` rule to reach
  the requested presentation. It also needed the first label to align with the
  painted calendar's leading edge, while every unrotated band tick label
  currently uses a middle anchor with no per-tick anchor or offset. The shell
  measures the first cell after each render and adjusts only that generated
  label; the final label stays at its month position so the preceding gap does
  not widen. The cell mark also defaults to a 0.75-pixel inset, so omitting the
  authored inset still recessed the first and final columns from a flush scale
  range.
- Decision: post-render mutation of a generated guide is not an
  application boundary. Add tick-label typography plus per-value or per-index
  anchor and offset accessors to the axis definition. Keep the explicit zero
  cell inset and band padding for flush calendar geometry; width-derived host
  sizing remains shell work.
- Verification: tick labels now accept constant or per-candidate `fontSize`,
  `fontWeight`, `opacity`, `anchor`, `dx`, and `dy`. Accessors run before
  thinning with semantic value, stable candidate index, resolved position, and
  bandwidth; `undefined` preserves defaults. Resolved typography participates
  in measurement, automatic margins, facet compatibility, SVG/Canvas/native
  output, and motion. Case 118 is a static typed definition per conformance
  input; its shell contains no axis CSS, guide query, or generated-DOM
  mutation. The standard matrix passes 364 cells, both revisions, light and
  dark themes, 320/640/960px viewports, pointer behavior, clean types, and 98.8%
  geometry similarity. The focused fixture is 16.67 KiB gzip, only 0.09 KiB
  over the ordinary line/SVG path and under its 0.75 KiB cap; the packed
  consumer is 16.60 KiB with no optional input retained.

### F-192 — SVG letterboxing shifted pointer hit testing

- Status: resolved
- Severity: high
- Owner: API
- Observed in: daily token usage calendar tooltip verification
- Friction: the SVG surface converted browser pointer coordinates with the
  element's complete bounding rectangle. When the responsive viewport and
  scene had different aspect ratios, SVG's default `xMidYMid meet` transform
  added letterboxing that the conversion ignored. A 640-by-480 scene in the
  604-by-480 gallery viewport therefore resolved calendar cells roughly one
  weekday row below the pointer near the top of the chart.
- Decision: convert client coordinates through the inverse SVG screen matrix.
  This delegates view-box, aspect-ratio, CSS transform, and viewport placement
  semantics to the browser instead of duplicating them with bounding-rectangle
  arithmetic. Preserve out-of-scene coordinates for overflowing marks and
  retain the previous bounds conversion only for incomplete DOM
  implementations such as jsdom, which do not expose `getScreenCTM`.
- Verification: unit regressions reproduce the gallery dimensions and its
  13.5-pixel vertical letterbox, verify the exact scene coordinate, and cover
  the incomplete-DOM fallback. Browser conformance forces a mismatched SVG
  viewport and proves the hovered cell retains its expected tooltip. The SVG
  surface, renderer, and workspace tests pass; the reviewed shared-path cost is
  recorded in the updated universal bundle baseline.

### F-193 — Fixed catalog height hid compact responsive examples

- Status: resolved
- Severity: low
- Owner: Tooling/Application
- Observed in: calendar heatmap responsive sizing
- Friction: the calendar could derive a compact height from its available width
  and preserve square day cells, but the catalog renderer retained a generic
  480-pixel minimum height. The resulting blank panel made the example appear
  fixed-height even after its SVG had correctly shrunk.
- Decision: keep the global catalog sizing contract unchanged for charts that
  need the full benchmark height. The calendar shell temporarily sets its host
  minimum height to the width-derived chart height and restores the previous
  value when destroyed. Width remains fully fluid; no example-specific maximum
  is imposed.
- Verification: shell tests cover fluid 320- and 960-pixel widths plus teardown.
  Browser measurements confirm square day cells at each width, with no
  horizontal overflow or fixed maximum-width behavior.

### F-194 — Behavior runs omitted the interactive input

- Status: resolved
- Severity: medium
- Owner: Tooling
- Observed in: automating the SVG letterbox pointer regression
- Friction: `ConformanceInput` exposed an `interactive` flag and catalog embeds
  supplied it, but the browser behavior runner did not. Examples therefore had
  to force interactive behavior at definition setup and could not scope a
  viewport mismatch to semantic interaction checks without affecting static
  visual measurements.
- Decision: mark behavior-run inputs as interactive and expose a separate
  `behavior` flag for interaction-only layout. Remove the token calendar's
  duplicated always-interactive shell option.
- Verification: the pointer-tooltip scenario creates a 120-pixel SVG viewport
  mismatch only during the token calendar's behavior runs, targets the painted
  Aug 3 cell, and asserts the exact focused date and tooltip. The fixed runtime
  passes at 320 and 640 pixels across both revisions; reverting the runtime fix
  makes the same scenario report Aug 5 or Aug 6. Static visual measurements and
  public catalog mounts retain their original dimensions.

### F-195 — Release version matching collided with dependency versions

- Status: resolved
- Severity: high
- Owner: Tooling
- Observed in: releasing 0.6.1 after the SVG pointer fix
- Friction: the release synchronizer counted versions with raw substring
  matching. Observable Plot's documented `0.6.17` version therefore counted as
  an existing `0.6.1` release reference and stopped the Changesets workflow
  before it could create the version pull request.
- Decision: count and replace complete version tokens while still accepting the
  repository's `v0.6.1` tag references. Ignore longer semantic versions and
  prerelease suffixes that merely share a prefix.
- Verification: the release-version unit regression advances TanStack Charts
  from 0.6.0 to 0.6.1 while leaving Observable Plot 0.6.17 unchanged. The
  release workflow can create the 0.6.1 version pull request from the same
  changeset.

### F-196 — Focus decorations suppressed the primary indicator

- Status: resolved
- Severity: high
- Owner: API
- Observed in: issue #33 focused-band composition
- Friction: adding any `whenFocused` mark removed the built-in primary-point
  ring from the complete chart. A category highlight or crosshair therefore
  also removed the indicator that identified the point owned by the tooltip
  and keyboard focus.
- Decision: compose the built-in ring with authored focus layers by default.
  Add definition `focusRing: false` for charts whose authored geometry
  deliberately replaces the primary indicator.
- Verification: scene and SVG regressions retain both a focused category band
  and one primary ring, Canvas paints authored underlays and the default
  overlay together, facets retain synchronized authored bands plus one shared
  ring, and an explicit opt-out omits the ring. Removing the implicit
  focus-layer scan reduces the ten locked universal bundles by 109–110
  minified bytes and 22–48 gzip bytes; the reviewed exact baseline records the
  decrease.

### F-197 — Workspace validation omitted comparison provenance

- Status: resolved
- Severity: low
- Owner: Tooling
- Observed in: issue #33 release validation
- Friction: `pnpm run validate` passed the locked universal bundle policy but
  did not run the separate comparison baseline gate. Because the focus fix
  changed a core comparison input, pull-request CI correctly rejected the
  stale workspace revision even though local validation was green.
- Decision: refresh the comparison evidence whenever a change advances one of
  its tracked TanStack inputs, and run `pnpm benchmark:check` alongside the
  workspace validation before release.
- Verification: the workspace `ci` target now depends directly on
  `benchmark-check`, which runs the source-provenance and size comparison in
  the same validation graph as type, package, bundle, adapter, and catalog
  gates. Baseline changes remain explicit and require attribution before the
  tracked file or canonical comparison page is refreshed.
- Release follow-up evidence: the correction pull request's Nx agent received
  a synthetic merge checkout and resolved that checkout as the latest
  comparison input revision, even though none of the tracked inputs had
  changed since `cd7768378f40de237607dc1fc6640e1dc8490571`. The same command
  resolved the recorded revision correctly in the coordinator's full clone.
- Release follow-up decision: run the cacheable comparison provenance target
  on the full-history coordinator before starting continuous Nx assignment.
  The distributed aggregate then replays that exact result instead of deriving
  repository provenance inside an agent workspace.
- Release follow-up verification: the workflow contract fixes the coordinator
  ordering and disables continuous assignment for that step. The coordinator
  `benchmark-check` passes against the unchanged `cd7768378` evidence.
- `0.8.0` release evidence: squash-merging the fully validated API
  harmonization PR rewrote measured source commit `5a1c893` as `35832f7`
  without changing any measured bytes. Both the main push and version-PR
  comparison gates rejected the exact-SHA baseline.
- `0.8.0` release decision: keep the source revision as human-readable
  attribution, but make the deterministic SHA-256 digest of every tracked
  comparison input the authoritative equality boundary. Rewritten history can
  retain evidence when its measured content is identical; any byte change
  still requires a new baseline.
- `0.8.0` release verification: focused provenance tests cover history rewrite,
  content drift, malformed metadata, and workspace version-only changes. The
  schema-4 baseline records both commit attribution and the input digest, and
  the full validation graph passes after the squash merge.

### F-198 — Union-valued axes rejected configured D3 scales

- Status: resolved
- Severity: medium
- Owner: API
- Observed in: issue #34 configured D3 scale instance repro
- Friction: an axis inferred as `string | Date` required one configured scale
  to accept both members. A documented `scaleTime().domain(...)` instance was
  therefore rejected even though it correctly served the temporal branch.
- Decision: distribute `ChartScaleInput` over axis-value unions so each
  configured scale retains its exact input contract. Keep runtime validation
  unchanged and narrow the copied scale only after that validation succeeds.
- Verification: the public type regression accepts a configured D3 time scale
  for a `string | Date` axis, rejects an unrelated numeric scale, and the full
  workspace typecheck plus configured-scale runtime tests pass.

### F-199 — Support metadata hid outside-definition authoring

- Status: monitoring
- Severity: medium
- Owner: Documentation/Tooling
- Observed in: complete custom-authoring audit of the public catalog
- Friction: `support: native | composed` and free-form feature strings could
  not answer which examples implement essential visualization work outside the
  chart definition. Case 116 is `native` despite defining a raw custom mark;
  case 57 is only `composed` despite manually reserving two domain regions for
  D3-binned marginal rectangles. Moving visual layout into a transform module
  can also make a short definition look declarative while hiding the authoring
  cost. Source length, support files, and D3 imports mix real plotting work with
  data selection and conformance drivers.
- Current decision: keep one immutable reviewed before-state audit that assigns
  all 109 cases to a strict custom-authoring set, a preparation-review tier, a
  shell-only tier, or a definition-native baseline, plus a current disposition
  audit, overview, and machine-readable roadmap for all 109 cases. The roadmap
  owns current migration sources and verification status. Use static source
  signals only to generate candidates. If this becomes public catalog metadata,
  record the work kind, execution stage, owner, coordinate space, source
  symbols, and target disposition explicitly beside the generated
  authored-source closure.
- Verification: `CUSTOM-AUTHORING-AUDIT.md` accounts for 47 strict custom
  cases, 13 preparation-review cases, 7 shell-only cases, and 42
  definition-native cases. Direct source review confirms four `createMark`
  implementations, 31 manual geometry/layout cases, and 12 visible
  overlay/controller cases in the strict set. The current audit, overview, and
  roadmap each assign all 109 live catalog directories exactly once: 58 use
  the current definition API, 34 use first-party primitives, 14 use optional
  first-party adapters, two retain application boundaries, and one warrants an
  inline custom mark. The resulting 106 visualizations use normal definitions.
  The durable `definition-coverage-roadmap.json` also tracks the capability
  DAG, source ownership records, bundle fixtures, and case-local evidence. Its
  `resolved-layout` stage and repository-relative implementation paths keep
  migrated work visible instead of relabeling it as case-owned preparation;
  the focused validator protects live-catalog equality, totals, paths,
  dependencies, and boundary status.

### F-200 — Generic mark composition widened channel types

- Status: resolved
- Severity: medium
- Owner: API
- Observed in: composing resolved-layout `hexbin` from `hexagon`, then native
  box summaries from ordinary link, bar, tick, and dot marks
- Friction: `HexagonOptions<NoInfer<TDatum>>` rejected a generic derived datum
  even though the source iterable already fixed that datum type. Separately,
  `ChannelOutput` checked object keys before accessor functions, so a generic
  numeric accessor could widen its interaction value back to `ChartValue`.
  The first implementation would have required assertions inside the
  first-party mark and the same assertions in third-party composite marks.
- Decision: let `hexagon` infer its datum from the source and then validate its
  options against that type. Resolve accessor output before field output in
  `ChannelOutput`; functions cannot be semantic field names, and this ordering
  preserves their exact return type under generic composition. Promote the
  repeated ordinary-child kernel as public `compositeMark`: it namespaces
  child channels, nodes, points, and motion while preserving the union of each
  child's datum and positional types. Child IDs must be unique, declaration
  order remains paint order, and a child with its own resolved layout is
  rejected instead of introducing nested layout scheduling.
- Verification: `spatial-hexbin` composes `hexagon` with no assertion or
  suppression, its public reducer outputs retain numeric point types, and box
  marks reuse the same composition kernel while exposing exact derived summary
  and outlier types. Focused composite tests cover channel and scene
  namespacing, child point ownership, parent/child motion merging, duplicate
  IDs, and resolved-layout rejection. The full workspace TypeScript program
  passes, and the focused conformance type probes reject all eight invalid
  TanStack programs.

### F-201 — Visible Voronoi cells required custom D3 paths

- Status: resolved
- Severity: medium
- Owner: API/Documentation
- Observed in: Voronoi nearest-tooltip catalog case
- Friction: the case owned a raw `createMark`, projected every observation
  through resolved scales, constructed and clipped a D3 Voronoi diagram, and
  converted each cell to an SVG path. The chart definition hid that work behind
  `voronoiCells`, while the path-only scene output coupled the recipe to one
  renderer shape. Making those cells interactive would also have duplicated
  the dot layer's keyboard and nearest-point candidates.
- Decision: expose the optional exact-subpath `voronoi` mark. It accepts source
  x/y, stable key, explicit topology group, color, and presentation channels;
  projects complete pairs through the final configured scales in its ordinary
  render callback; and emits clipped, renderer-neutral `SceneArea.points`.
  Stable-key ordering and exact coordinate deduplication make coincident,
  subpixel, and cocircular inputs deterministic without merging distinct
  projected sites. Geometry is centered on the site cloud and scaled by an
  exact power of two to preserve representable coordinates while avoiding
  near-coincident and far-offscreen cancellation. D3 output is checked for
  complete ownership, convexity, offscreen neighbor half-planes, and total
  area. Invalid numerical output is rebuilt from half-planes using adjacency
  derived from triangle and hull edges; an all-site pass and plot-centered
  recovery handle damaged topology and extreme offscreen coordinates. Final
  polygons are clamped and normalized again, and the mark fails explicitly if
  a distinct cell boundary is not representable in authored chart coordinates.
  The cells are decorative and emit no chart points or interaction records, so a
  normal dot layer remains the sole owner of native nearest focus, keyboard
  navigation, and tooltip data. Color does not partition topology; only
  explicit `z` creates independent full-bounds tessellations.
- Verification: case 65 passes source cars directly to `voronoi` and `dot` with
  no case-owned mark, D3 import, resolved-scale loop, path construction, or
  scene-node type. Focused tests cover final responsive bounds, complete-pair
  domains, categorical and temporal axes without inversion, explicit grouping,
  stable reordered ties, raw-row presentation accessors, dot-owned nearest
  focus, facets, seeded partitions, and empty, singleton, two-point,
  coincident, collinear, and invalid inputs. Its 320/640/960 light/dark
  conformance matrix passes both revisions with clean strict types, all
  interaction scenarios, and 98.4% diagnostic geometry similarity. Authored
  case source falls from 207 to 149 lines. The exact SVG fixture adds 8.93 KiB
  gzip over ordinary dots within its 9 KiB ceiling, the packed-consumer gate
  resolves the published subpath, and retained-input checks keep the optional
  Delaunay kernel out of root, universal, ordinary-mark, representative, host,
  and adapter bundles.

### F-202 — Density contours hid responsive geometry behind a custom mark

- Status: resolved
- Severity: medium
- Owner: API/Documentation
- Observed in: point density contours catalog case
- Friction: the chart definition appeared short only because a local
  `createMark` owned resolved-scale projection, estimator sizing, threshold
  conversion, `d3-geo` path construction, copied centroid scales, inversion,
  scene nodes, and synthetic tooltip rows. A contour level can contain several
  disconnected polygons and holes, so its aggregate centroid can fall outside
  every painted region. The tooltip therefore presented a coordinate that was
  neither a source observation nor a valid contour location.
- Decision: expose `densityContour` from the optional
  `@tanstack/charts/spatial/density` subpath. It accepts source x/y, optional
  estimator group and weight channels, pixel bandwidth and cell size, native
  density thresholds, and derived presentation channels. It estimates after
  final positional projection, shares numeric levels across explicit groups,
  retains group-level source lineage, and emits no focus points. Add structured
  multipolygons to `SceneArea`: one area can now contain disconnected polygons
  and holes without SVG syntax, while SVG, Canvas, React Native, gradients,
  clipping, bounds, and nearest containment share the same geometry. A pure
  contour-coordinate mapper is the smaller reusable unit now shared with the
  scalar-grid contour mark. Generated-versus-explicit contour identity and
  threshold validation are also shared independently of threshold generation.
  Canonical ChartKey grouping is shared with Delaunay and Voronoi; the KDE
  remains density-specific.
- Verification: case 39 passes its six D3-native thresholds directly to the
  native mark and contains no custom mark, D3 import, copied scale, path
  serializer, centroid, or tooltip formatter. Focused tests cover resolved
  nonlinear projection, nonzero margins, complete-pair and weight filtering,
  grouping, shared numeric levels, lineage, resize behavior, stable keys, and
  zero synthetic points. Renderer tests cover disconnected polygons and holes
  in SVG, Canvas without `Path2D`, React Native SVG, bounds, and nearest
  containment. Internal tests cover canonical spatial grouping, duplicate
  explicit levels, and generated-level identity across changing values. The
  scalar-grid mark now reuses the same threshold validation, level identity,
  and structured polygon mapper without inheriting the density estimator or
  resolved-layout lifecycle. The exact spatial bundle adds 2.84 KiB gzip over
  ordinary dots within its 3 KiB ceiling, and retained-input gates keep
  `d3-contour` out of root, universal, ordinary-mark, representative, host, and
  adapter bundles.
  The renderer-neutral polygon contract adds 105 B gzip to static SVG, about
  220 B to the DOM host, and about 80 B to the geometry resolver; those shared
  costs are reviewed in the bundle baseline.

### F-203 — D3 contour v4 runtime APIs were absent from its declarations

- Status: resolved
- Severity: low
- Owner: Tooling
- Observed in: native density contour implementation
- Friction: `d3-contour@4` exposes `density.contours(data)` so one computed grid
  can report its maximum and materialize several shared thresholds. The current
  `@types/d3-contour` package describes the older callable estimator but omits
  that v4 method, forcing an assertion despite the installed runtime contract.
- Decision: keep one private narrow extension for `contours`, its callable
  threshold function, and read-only `max`. Do not widen public chart types or
  duplicate the grid calculation to accommodate stale external declarations.
- Verification: the exact runtime dependency and declaration dependency are
  owned by the optional package entry, strict workspace typechecking passes,
  and density tests exercise both explicit levels and the missing numeric-count
  path.

### F-204 — Scalar-grid contours hid topology behind a custom mark

- Status: resolved
- Severity: medium
- Owner: API/Documentation
- Observed in: filled wind-speed contour catalog case
- Friction: the case converted source observations to a magnitude-only array,
  generated marching-squares geometry before the definition, then used a raw
  `createMark` to project that geometry through `d3-geo` and emit SVG path data.
  The short definition hid source lineage, grid orientation, contour identity,
  and renderer ownership across a transform helper and custom render loop.
- Decision: expose `contour` from the optional
  `@tanstack/charts/spatial/contour` subpath. It accepts the raw row-major grid,
  dimensions, scalar value channel, numeric or explicit thresholds, smoothing,
  and derived presentation channels. Marching-squares topology is data-space
  work and does not depend on chart size, so the mark computes it eagerly and
  uses ordinary rendering only to map structured rings into final plot bounds.
  Missing values retain their grid positions, finite source lineage survives on
  each level, Cartesian row zero remains at the bottom, and the mark emits no
  synthetic focus point. Reuse the density mark's contour mapper, threshold
  validation, and explicit-versus-generated identity; do not share its KDE,
  grouping, resolved-layout lifecycle, or threshold-generation semantics.
- Verification: case 38 now passes raw wind rows, an inline magnitude accessor,
  dimensions, and levels to the native mark. Its case source contains no custom
  mark, D3 import, GeoJSON projection, path serializer, or scene-node type;
  the remaining helper only selects a rectangular source window. Focused tests
  cover dimension and source-length validation, missing grid positions, numeric
  identity, field lineage, bottom-up orientation, explicit duplicate levels,
  generated-level key stability, smoothing, final-bounds projection, structured
  disconnected polygons and holes, and zero synthetic points. The exact SVG
  fixture is 10.62 KiB gzip, 2.78 KiB over the 7.84 KiB frame-and-static-SVG
  baseline and within its 3 KiB ceiling. Source and packed-consumer gates pass
  for the optional subpath, while retained-input checks keep `d3-contour` and
  scalar-contour code out of ordinary bundles. Strict workspace TypeScript also
  passes with the raw-row accessor shared by the TanStack and Plot definitions.

### F-205 — Force layouts hid static settlement behind case utilities

- Status: resolved
- Severity: medium
- Owner: API/Documentation
- Observed in: Les Misérables force-directed network catalog case
- Friction: the definition rendered native links, dots, and labels but depended
  on a case utility to clone graph rows, configure and tick a stopped D3
  simulation, resolve mutated link endpoints, and derive padded domains. The
  coordinates looked like ordinary prepared data at the definition boundary,
  hiding reusable static-layout mechanics and source lineage. Moving the whole
  simulation into a mark would instead couple data-space settlement to chart
  size and obscure that normal marks already express the result.
- Decision: expose `forceLayout` from the exact optional
  `@tanstack/charts/network/force` entry. It accepts stable node and endpoint
  channels plus an ordered list containing at most one each of `link`,
  `manyBody`, `center`, `collide`, `x`, and `y`. The eager transform runs a
  fixed number of synchronous ticks over private clones, preserves raw endpoint
  keys, attaches node and link lineage, resolves native link coordinates, and
  returns padded quantitative domains. It has no resolved-layout dependency:
  the force topology is data-space work, and ordinary scales map the settled
  rows after chart layout. Named `custom` descriptors may return any
  D3-compatible force from a factory receiving the private node/link clones,
  immutable resolved endpoint keys, and a node-key accessor. Factories may
  configure those records but cannot add, remove, or reorder them. Keep
  asynchronous ticking, dragging, reheating, and controlled live positions in
  an application-owned D3 controller rather than expanding this static
  transform into a second runtime.
- Verification: focused transform tests cover raw-row field and accessor
  channels, all six force descriptors, authored order, private-clone
  immutability, exact node and link lineage, endpoint identity, padded and empty
  domains, numeric-versus-string keys, invalid options, duplicate force types,
  and missing endpoints. Case 40 matches its case-owned D3 reference for both
  revisions, preserves native mark identities, and imports neither `d3-force`
  nor the reference layout from the TanStack definition. The exact entry is
  6.97 KiB gzip versus 5.56 KiB for the raw D3 force kernel, a 1.41 KiB wrapper
  increment within its 2.5 KiB ceiling. Source and packed retained-input gates
  keep `network-force` and `d3-force` out of root, universal, ordinary-mark,
  renderer, and adapter consumers. Strict workspace TypeScript passes. The
  complete responsive, theme, and revision browser matrix renders 13 nodes, 15
  links, and 13 labels with clean diagnostics, visual parity, and 100% geometry
  similarity.
- Custom-force follow-up: focused tests pass `forceRadial` directly, exercise
  factory context and authored order, reject duplicate or empty names, foreign
  node lookup, invalid return values, and collection mutation, and preserve
  deterministic synchronous settlement and source immutability. Packed exact-
  subpath declarations and runtime cover the D3-compatible factory types.
  Working-clone types omit D3-owned node and link fields before adding the D3
  datum contracts, and runtime coverage verifies that conflicting raw-row
  fields do not leak into private simulation state while raw output fields stay
  intact.

### F-206 — Tidy trees hid hierarchy construction in definition builders

- Status: resolved
- Severity: medium
- Owner: API/Documentation
- Observed in: Flare tidy hierarchy tree catalog case
- Friction: the definition directly imported D3 hierarchy, converted semantic
  paths, stratified the selected rows, ran the tidy-tree layout, reversed and
  transposed coordinates, and materialized separate node and link DTOs. Those
  arrays discarded source lineage and hid stable hierarchy identity behind a
  definition builder even though the final visualization used ordinary link,
  dot, and text marks. A tree mark would duplicate those existing marks, while
  resolved layout would incorrectly couple arbitrary semantic tree units to
  final pixels.
- Decision: expose the eager `treeLayout` transform from the exact optional
  `@tanstack/charts/hierarchy/tree` entry. It accepts either full path rows with
  a one-character delimiter or explicit `id` and `parentId` channels, plus
  `left`, `right`, `top`, or `bottom` orientation, semantic breadth/depth node
  size, sorting, and separation. It returns stable native-mark node and link
  rows with resolved endpoints, hierarchy metadata, and honest lineage;
  path-imputed ancestors have null data and empty lineage. Normal positional
  scales own responsive projection, so the transform has no
  `resolved-mark-layout` dependency. A private flat-hierarchy layer now owns
  path normalization, explicit-parent construction, validation, imputed
  ancestors, source indexes, and authored order without exposing D3 hierarchy
  nodes. Treemap and sunburst can reuse that construction while retaining their
  own layout-specific coordinate and presentation policy. Do not extract a
  generic link materializer yet: tree links are synthesized from target-node
  lineage, while force links preserve authored link rows.
- Verification: focused transform tests cover path and explicit-parent input,
  raw accessor context, primitive rows, all four orientations, semantic node
  size, immutable sort/separation contexts, authored order, escaped delimiters,
  imputed ancestors, exact node and target-link lineage, deterministic output,
  nonmutation, and invalid hierarchies and options. Case 36 matches its existing
  D3/Plot layout across both revisions, renders native nodes, links, and labels,
  preserves stable IDs and raw rows, and imports neither `d3-hierarchy` nor a
  case-owned layout utility. The focused tree, export, case, and roadmap suites
  pass 33 tests. The exact entry is 4.00 KiB gzip versus 2.44 KiB for the raw D3
  stratify-plus-tree kernel, a 1.56 KiB wrapper increment within its 2.5 KiB
  ceiling; source retained-input policy passes. The packed exact-subpath
  consumer resolves and is 4.05 KiB gzip, while root, universal, ordinary-mark,
  renderer, and adapter consumers retain neither the tree transform nor
  `d3-hierarchy`. The focused responsive, theme, and revision browser matrix
  passes visual review with 99.9% geometry similarity and a clean authored
  source diff.

### F-207 — D3 arc contexts overstate the required Canvas surface

- Status: resolved
- Severity: low
- Owner: Tooling/API
- Observed in: native rounded radial-bar interaction geometry
- Friction: `d3-shape` can replay an arc into any path-like sink that implements
  `moveTo`, `lineTo`, `arc`, and `closePath`, but its declaration requires a
  complete `CanvasRenderingContext2D`. The renderer-neutral scene needed that
  replay to derive a sampled rounded interaction boundary from the paint path.
  An unrounded sector approximation falsely accepted about 9.5% of a representative full-rounded
  cap's interaction polygon, while depending on DOM `Path2D` or parsing SVG
  path text would break server and non-DOM renderers.
- Decision: keep one private minimal arc-trace context and one narrow assertion
  at the external declaration boundary. Sample every emitted circular segment
  into scene points, restore the D3 generator's prior context in `finally`, and
  expose neither the assertion nor a Canvas dependency publicly. This is the
  shared sector-boundary kernel for radial bars and hierarchy sectors.
- Verification: focused tests reject the former clipped-corner false hit,
  retain painted interior hits, and cover reversed angular sweeps, complete
  annuli, reversed radius ranges and endpoints, and hole exclusion. Polar,
  nearest-point, strict TypeScript, browser conformance, and bundle-isolation
  gates pass.

### F-208 — Sunburst definitions exposed hierarchy partition and arc DTOs

- Status: resolved
- Severity: high
- Owner: API/Documentation
- Observed in: Flare analytics sunburst catalog case
- Friction: the definition stratified flat paths, aggregated values, ran D3
  partition, materialized angle/depth/color DTOs, and authored a responsive D3
  arc generator. The apparent radial-arc composition therefore hid hierarchy
  construction, branch inheritance, responsive ring allocation, and source
  lineage across the definition and a case utility.
- Decision: implement an exact optional
  `@tanstack/charts/hierarchy/sunburst` PolarMark. Reuse the private flat
  hierarchy construction and aggregation contracts plus the same private
  renderer-neutral sector kernel as radial bars. Keep selection, palette,
  orientation, hole size, ring gap, and tooltip language case-owned. Do not
  expose a public partition DTO transform or generic four-endpoint sector mark
  until another audited case proves those broader contracts.
- Verification: case 101 now consumes raw Flare rows with `path`, `value`, and
  `color: "branchId"`; its only radial callback preserves the reference's
  visible-depth allocation. Shared tests cover path and explicit-parent input,
  opaque IDs, imputed ancestors, direct lineage, aggregate values, sorting,
  responsive and reversed radii, fixed gaps, partial and reversed sweeps,
  paint-derived geometry focus, stable keys, and exclusion of invisible
  branches from color inference. The exact source is 7.00 KiB gzip versus 1.97
  KiB for D3 stratify plus partition, a 5.03 KiB increment within its 5.1 KiB
  ceiling. Packed runtime, declarations, exports, and ordinary-consumer
  isolation pass. Browser conformance reports 100.0% geometry and clean visual
  and type gates; the TanStack case uses 58 lines and 28.24 KiB gzip versus
  Recharts' 91 lines and 132.17 KiB, with 0.30 ms versus 0.70 ms median mount
  and equal 0.20 ms median update.

### F-209 — Facets typed child points as grouping rows

- Status: resolved
- Severity: high
- Owner: API
- Observed in: standard projection gallery migration
- Friction: `facet` grouped projection configuration rows but each child chart
  rendered sphere and land geometry. Runtime points correctly retained those
  GeoJSON objects, while the public mark, definition, and motion types claimed
  every point datum was a projection configuration row. The callback also
  exposed each real group as a possibly empty array, requiring an assertion for
  an invariant the facet already owns.
- Decision: parameterize `FacetOptions`, `facet`, and `facetChart` by the child
  chart specification and derive their output and motion datum from
  `ChartSpecDatum<TChildSpec>`. Keep grouping rows as a separate internal type
  and expose them to the child callback as a nonempty tuple. Carry the child
  datum through cell compilation, point offsetting, and outer-axis rendering
  without changing scene behavior.
- Verification: a heterogeneous `Group -> Child` regression proves nonempty
  group inference, exact child datum and motion types, raw object identity, and
  offset scene points. The focused facet, geo, projection-gallery, and
  definition-shape suites pass 27 tests, full TypeScript passes, and the facet
  reference documents the child datum contract.

### F-210 — Definition-shape audit ignored complete definition factories

- Status: resolved
- Severity: low
- Owner: Tooling
- Observed in: standard projection gallery migration
- Friction: replacing `defineChart({...})` with the existing `facetChart(...)`
  factory made the catalog definition-shape total fall by one even though both
  calls return complete static definitions. The AST audit recognized only the
  spelling `defineChart`, so it confused an alternate public factory with a
  missing definition.
- Decision: classify `facetChart` calls as static definitions in the same
  source audit. Continue treating dynamic `defineChart(context => ...)` calls
  separately because only they consume responsive build context.
- Verification: the catalog audit accounts for all 111 definitions as 105
  static and six responsive entries, with no parameterless responsive
  builders. Responsive Sankey layout now belongs inside its mark, and the
  calendar's outer input factory already owns current dimensions, so neither
  case retains a redundant chart builder.

### F-211 — Responsive builders defer nested axis callback inference

- Status: monitoring
- Severity: low
- Owner: API
- Observed in: token calendar tick-label accessor migration
- Friction: a `defineChart(({ width }) => ({ ... }))` callback uses its build
  parameter while TypeScript is also inferring marks from the callback return.
  That context-sensitive generic cycle prevents nested axis callbacks in the
  returned object from receiving their inferred semantic value type. A narrow
  overload fixed parameterless builders but failed the representative
  size-dependent band-cell definition and shifted existing invalid-program
  diagnostics, so it was not retained.
- Decision: the calendar's outer conformance factory already receives the
  current width and height on mount and update, so it now returns a static
  definition and keeps complete per-tick inference. Do not add a partial
  overload. A genuinely responsive builder can explicitly type its build
  parameter or nested `ChartAxisTickLabelContext`; revisit a dedicated builder
  form only after another real case needs both inference directions.
- Verification: case 118 compiles without callback annotations or assertions,
  recreates its static definition for each responsive input, and passes the
  full 320/640/960px browser matrix. Full workspace TypeScript passes.

### F-212 — Transposed composites lacked a horizontal line mark

- Status: resolved
- Severity: medium
- Owner: API
- Observed in: auditing horizontal regression and difference composites
- Friction: `areaX` could express transposed interval geometry, but the only
  line mark treated x as the longitudinal channel and y as the numeric value.
  A horizontal regression or difference boundary therefore needed swapped
  DTO fields, an incorrectly typed `lineY`, or a custom mark even though its
  path, grouping, gaps, paint, identity, interaction, and motion were ordinary
  line semantics.
- Decision: expose `lineX` and `LineXOptions` beside `lineY`. Its numeric x
  value and `ChartValue` y channel transpose defaults, strict inference,
  independent-axis key fallback, scale domains, invalid-row gaps, and focus
  affinity. Both orientations share one internal line pipeline; the small
  runtime orientation seam is preferable to duplicating grouping, path,
  interaction, and motion behavior.
- Verification: focused strict-type, domain, temporal, categorical, source
  identity, generator, grouping, gap, SVG, and Canvas tests pass across both
  orientations. Bundle review attributes roughly 193 minified and 71–78 gzip
  bytes in existing line consumers to the shared orientation seam; lineX-only
  channel extraction tree-shakes from lineY consumers. Regression and
  difference composites are the two audited consumers.

### F-213 — Regression fits were hidden in case-owned endpoint preparation

- Status: resolved
- Severity: medium
- Owner: API/Documentation
- Observed in: linear regression catalog case
- Friction: the definition appeared to layer dots and a two-point line, but
  the case first computed means, covariance, variance, slope, intercept, and
  independent extents. That indirection hid the model, provided no grouped or
  confidence-band path, discarded aggregate source lineage, and would have to
  be transposed again for a horizontal regression.
- Decision: add eager `linearRegressionRowsY` and `linearRegressionRowsX`
  transforms for the centered least-squares fit, optional grouping, observed
  semantic-domain sampling, aggregate lineage, and optional Student-t fitted-
  mean confidence bounds. `linearRegressionY` and `linearRegressionX` reuse
  those rows, then render the confidence band and fitted line through ordinary
  area and line children. Only the line owns interaction. `ci` defaults to
  `0.95`, `0` suppresses the band, and `samples` defaults to 64 semantic
  vertices rather than renderer pixels.
- Shared boundary: the two orientations reuse `lineX`/`lineY`, `areaX`/`areaY`,
  composite namespacing and motion, first-seen grouping, and aggregate lineage.
  The centered fit, residual error, Student-t quantile, and confidence interval
  remain one regression kernel. Difference crossings share none of that math.
- Verification: focused tests cover numeric and temporal fits, groups,
  degenerate inputs, centered stability, Student-t intervals, sample domains,
  transposition, gaps, aggregate lineage, raw identity, interaction ownership,
  and motion. Case 31 passes 320 raw rows directly to the mark and contains no
  covariance, variance, mean, endpoint, or line preparation. Browser
  conformance passes visual and strict-type gates at 96.5% diagnostic geometry,
  63 authored lines, and 37.49 KiB gzip versus Plot's 46 lines and 88.95 KiB.
  The isolated regression fixture is 22.47 KiB gzip, a 5.82 KiB increment under
  its 6 KiB cap. Exact package and universal declarations, packed runtime,
  documentation, full TypeScript, and bundle-isolation gates pass.
- Preparation follow-up: direct transforms accept field or context accessors,
  preserve precise independent and group types, omit presentation-only mark
  keys, do not mutate input, and match both convenience-mark orientations
  exactly. Tests cover invalid groups, degeneracy, temporal output, lineage,
  and root, universal, and exact-subpath exports.

### F-214 — Marginal views required reserved-domain manual plotting

- Status: resolved
- Severity: high
- Owner: API/Documentation
- Observed in: scatterplot with marginal histograms catalog case
- Friction: the apparent scatter-and-histogram definition first ran two
  case-owned D3 bins, normalized counts, mapped them into hard-coded slices of
  the scatterplot's semantic x/y domains, added separator rules, and hid ticks
  in the reserved ranges. The data-space constants coupled layout to the
  current domains and made three independent scale roles look like one simple
  chart. Existing facets can embed complete child chart scenes, but repetition
  is not the semantic relationship here, and the private embedder did not
  namespace child `markId` values.
- Decision: add exact-subpath `viewGrid` composition for named fixed/flexible
  row and column tracks. Each cell receives a normal static chart definition.
  `share` asserts equal resolved scale domains and mappings while aligning plot
  endpoints after guide margins resolve; `align` aligns endpoints without
  requiring equal domains. Extract facet's full-chart scene adoption into one
  renderer-neutral helper that offsets and namespaces points and mark IDs,
  remaps interaction/focus/state references, removes nested default focus
  layers, and leaves guide keys local. This is separate from resolved mark
  layout: Hexbin and Difference derive geometry inside one parent scale pair,
  while view composition compiles independent child scales and scenes. Child
  host behavior remains outer-definition-owned. Authored child selection,
  behaviors, scene backgrounds, compiled controls, unsupported resources, and
  guide motion fail explicitly instead of disappearing during scene adoption.
- Verification: focused view, scene-adoption, facet, composite, export, and
  Case 57 suites pass 59 tests. Case 57 now feeds the same raw rows
  through public `binX` and `binY`, ordinary `dot` and `rect` marks, and three
  child definitions; its tests cover both revisions, exact raw and aggregate
  lineage, seven plus eight bins, 320/640/960px plot-range alignment, and
  authored-source closure. Exact packed-package, documentation, TypeScript,
  and bundle-isolation gates pass. The current coordinated-view fixture
  exercises the shared `composeViews` kernel and is 22.50 KiB gzip, 5.13 KiB
  over ordinary dots plus static SVG and below its reviewed 5.25 KiB cap. A
  focused parity test proves `viewGrid` resolves the same scene as equivalent
  `composeViews`, `grid`, and `shareX` input. Browser conformance passes the
  visual and type gates at 95.3% diagnostic geometry; TanStack uses 165
  authored lines and 38.58 KiB gzip versus Plot's 129 lines and 84.80 KiB.
- Linked-view follow-up: case 87 proves that `viewGrid` also owns interaction
  coordination when the reference library links multiple grids in one chart
  instance. The two child scenes share Date semantics and aligned x ranges,
  retain independent y domains, and expose one outer focus and pin lifecycle.
  View layout and crosshair painting no longer require application state or DOM
  overlays; only the live cross-view value summary remains UI.

### F-215 — Ridgeline profiles lost categories to numeric surrogates

- Status: resolved
- Severity: medium
- Owner: API/Documentation
- Observed in: ridgeline density comparison catalog case
- Friction: the definition appeared to contain ordinary rules, areas, and
  lines, but `ridgeDensity` first selected seasons, created 24 D3 bins per
  season, normalized each group, replaced semantic seasons with numeric
  baselines `0`, `1`, and `2`, added a fixed `0.78` data-space offset, and
  required a hand-authored numeric y domain, rounded tick lookup, and left
  margin. The helper mixed analytical preparation with scale-resolved profile
  geometry and discarded both raw and aggregate lineage.
- Decision: keep grouped `binX` and `normalize({ basis: "max" })` explicit in
  the definition, and add `ridgelineY` plus its transposed `ridgelineX` for
  geometry only. A ridge consumes a numeric or temporal profile position, a
  numeric or string category, and a normalized `[0, 1]` height. It derives the
  category step from the complete resolved point or band domain and expresses
  `overlap` in step units. The mark emits one area and optional outline per
  category but only one semantic interaction point per sample. It preserves
  source datums, stable keys, gaps, curves, safe shared opacity states, and
  keyed motion. Rules, category labels, scale direction, color, binning, and
  normalization remain normal definition concerns.
- Shared boundary: `minimumMappedSpacing`, `resolvedCategoryStep`, and category
  scale validation are the first-principles reusable seam. Band marks use
  mapped spacing for inferred bandwidth; ridgelines, violins, and
  category-relative ticks use the complete resolved domain plus the bounded
  singleton fallback. The public ridge mark does not depend on composite or
  resolved-child layout, and it does not hide density estimation. The existing
  D3 curve bridge remains the correct path-generation primitive.
- Verification: focused scale, geometry, type, state, motion, renderer, export,
  Plot-helper, and Case 62 suites pass 49 tests. Case tests cover both revisions,
  72 bins, per-season maxima, nested normalize-to-bin-to-episode identity,
  semantic season ticks, 320/640/960px offsets, curve paths, stable resize keys,
  and authored-source closure. Exact packed runtime, declarations, production
  isolation, and seven framework adapters pass; documentation passes for 99
  pages and 90 catalog embeds. The isolated fixture is 17.35 KiB gzip, a
  715-byte increment over the line plus static-SVG baseline and below its
  0.75 KiB cap. Browser conformance passes visual and strict-type gates at
  94.1% diagnostic geometry; TanStack uses 103 authored lines and 36.23 KiB
  gzip versus Plot's 117 lines and 92.77 KiB.

### F-216 — Violin envelopes encoded categories as numeric endpoints

- Status: resolved
- Severity: medium
- Owner: API/Documentation
- Observed in: violin distribution comparison catalog case
- Friction: `violinDensity` combined authored body-mass boundaries, grouped D3
  bins, per-species max normalization, numeric category centers, and mirrored
  `x1`/`x2` endpoints in one helper. `violinMedians` separately repeated the
  numeric centers and fabricated median endpoints. The definition therefore
  appeared to be an ordinary area, link, and dot while the actual distribution
  policy and category layout lived elsewhere. A numeric x domain and rounded
  tick lookup reconstructed the discarded species labels, and neither helper
  retained aggregate or raw-observation lineage.
- Decision: keep grouped `binY`, `normalize({ basis: "max" })`, and `groupBy`
  with the public `median` reducer explicit in the definition. Add `violinY`
  and its transposed `violinX` for mirrored geometry only. The mark consumes a
  numeric or temporal profile position, a numeric or string category, and a
  normalized `[0, 1]` width. Its `span` is the full peak width in category-step
  units. It emits one closed area per contiguous category segment and one
  centered semantic interaction point per prepared sample. Density estimation,
  boundaries, normalization, summaries, axes, and category order remain normal
  definition concerns.
- Shared boundary: `minimumMappedSpacing`, `resolvedCategoryStep`, and category
  scale validation are the reusable first-principles seam shared by band,
  ridgeline, violin, and category-relative ticks. `tickX` and `tickY` now accept
  a mutually exclusive `span` in orthogonal category-step units, so the median
  bar remains an ordinary summary mark without synthetic endpoints. Ridge and
  violin segment loops intentionally remain separate: a ridge closes one
  displaced profile to a baseline and moves its interaction geometry, while a
  violin joins two mirrored boundaries around centered interaction points. A
  mode-driven shared kernel would reintroduce the indirection this audit is
  removing.
- Verification: focused spacing, tick, violin, transform, type, state, motion,
  renderer, export, Plot-helper, and Case 63 suites cover both orientations,
  D3 area topology, point and band scales, empty domain slots, singleton
  fitting, invalid-row gaps, stable identity, 48 bins in both revisions, exact
  max counts and medians, nested normalize-to-bin-to-observation identity,
  semantic species ticks, and symmetric 320/640/960px geometry. Case source no
  longer imports either custom helper or authors numeric category endpoints.
  Exact packed runtime, declarations, production isolation, React Native, and
  seven framework adapter gates pass; documentation passes for 100 pages and
  90 catalog embeds. The isolated violin fixture is 17.37 KiB gzip, a roughly
  0.72 KiB increment below its 0.75 KiB cap, and retains no ridge, areaX,
  composite, public transform, resolved-child, or D3 geometry runtime. The packed
  violin fixture is 18.08 KiB gzip. Browser conformance passes visual and
  strict-type gates at 97.9% diagnostic geometry; TanStack uses 122 authored
  lines and 37.79 KiB gzip versus Plot's 155 lines and 93.46 KiB. The global
  bundle gate still reports only an unrelated composite-mark cap and four
  pre-existing one-byte locked-baseline drifts.

### F-217 — Mosaic cells hid two normalization denominators

- Status: resolved
- Severity: medium
- Owner: API/Documentation
- Observed in: Marimekko survey-composition catalog case
- Friction: `mosaicLayout` grouped raw survey rows, counted category pairs,
  normalized question totals across x, normalized response counts within each
  question across y, advanced two cumulative cursors, and fabricated a second
  label DTO. The definition therefore appeared to contain only rectangles and
  text while the analytical count policy, both denominators, category order,
  endpoints, and labels lived elsewhere. Prepared cells retained no path to
  either their aggregate row or the 500 source observations.
- Decision: keep `groupBy` with an explicit count or sum reducer in the
  definition, then expose eager `mosaicY` and `mosaicX` transforms for unique
  aggregate category pairs. `mosaicY` allocates x marginals globally and y
  values conditionally within x; `mosaicX` transposes that policy. Each output
  preserves source fields, semantic `xValue` and `yValue`, both normalized
  centers and endpoints, the cell value, its outer total, the grand total, and
  direct lineage. Explicit orders control geometry without synthesizing rows;
  duplicate pairs fail with guidance to aggregate first. Ordinary `select`,
  `rect`, and `text` own labels and rendering, so no mosaic mark or custom
  scene boundary is needed.
- Shared boundary: extract one private overflow-safe proportional-interval
  allocator and use it once for mosaic marginals, once per conditional group,
  and for polar pie slices. This is the reusable first-principles seam: ordered
  nonnegative weights become aligned fractions and endpoints. Waffle remains
  separate because it rounds cumulative unit boundaries, fragments categories
  across cells, and packs those fragments in resolved pixels. Reusing its
  kernel or the D3-backed general stack engine would add policies this eager
  transform does not have.
- Verification: focused interval, pie, mosaic, export, reference-helper, and
  Case 64 suites pass 72 tests, and the full TypeScript program passes. The
  case emits 25 stable ordinary rectangles plus five labels, preserves exact
  question widths of 101/500, 95/500, 103/500, 100/500, and 101/500, and
  retains all 500 raw observations through `mosaicY` to grouped counts. Its
  source imports no local layout or D3 array utility. Exact package runtime,
  declarations, production isolation, React Native, and seven framework
  adapters pass; documentation passes for 100 pages, 90 catalog embeds, and 18
  executable examples. The isolated transform is 1.95 KiB gzip below its 2.1
  KiB cap with no D3, mark, renderer, or unrelated transform runtime. Sharing
  the allocator moves the polar-pie increment from 1.00 to 1.05 KiB within its
  reviewed 1.1 KiB cap; the global bundle gate otherwise retains only the
  unrelated composite cap and five one- or two-byte locked-baseline drifts.
  Browser conformance passes visual and strict-type gates at 96.7% diagnostic
  geometry; TanStack uses 103 authored lines and 34.35 KiB gzip versus Plot's
  146 lines and 83.62 KiB.

### F-218 — Decorative scene fragments lost point ownership

- Status: resolved
- Severity: high
- Owner: API
- Observed in: controlled keyed selection, focused composite marks, Waffle,
  line dots, streaming line-plus-dot layers, radial lines, arrows, and Box
  decorations
- Friction: post-domain filtering and focus reconstruction inferred semantic
  ownership from string prefixes in generated scene keys. A point key such as
  `a` could therefore claim `a:child`, while a user key such as `a:dot` or
  `a:shaft` could collide with the generated dot or arrow fragment for `a`.
  Composite children that intentionally removed interaction metadata also
  discarded the only remaining link from whiskers, medians, labels, and other
  decorative geometry to their source point.
- Decision: keep exact point identity separate from structural descendant
  ownership. Generated string keys now use length-delimited identity, while
  ordering uses a separate semantic comparator. A shared scene-point lookup
  resolves exact keys, namespaced descendants, focus candidates, mark roots,
  and an explicit renderer-neutral `pointOwner` carried by singular decorative
  fragments. Selection filtering, focus reconstruction, mark state, scene
  adoption, and composite namespacing all use that one ownership contract.
  `pointOwner` is not an interaction point and cannot create duplicate focus or
  activation targets. The exact `@tanstack/charts/mark/decorative` subpath now
  applies the same removal boundary to a complete ordinary or resolved-layout
  mark. It preserves scale channels, post-domain ordering, layout-label
  measurement, motion, and visual geometry while exposing `never` point types.
- Boundary: this is shared scene identity infrastructure, not a Waffle,
  selection, or composite-mark utility. Multi-point geometry such as regression
  bands and difference fills cannot honestly use singular `pointOwner`; add a
  point-set ownership form only when a real filtered or focused case requires
  it. Duplicate authored top-level mark IDs remain invalid and should be
  rejected at definition validation rather than repaired during reconciliation.
- Verification: the full charts-core suite passes 650 tests and the root
  TypeScript program passes. Focused regressions cover colon-containing text
  and Waffle keys, line point/dot collisions, arrow shaft collisions, nested
  retargeted focus candidates, radial-line descendant focus, nested state
  metadata, and selected Box whisker and median ownership. The decorative-mark
  suite additionally covers one interaction owner for line-plus-dot layers,
  idempotent point-free rules, resolved Waffle layout and post-domain order,
  preserved automatic label margins, exact scale/point types, and explicit
  rejection of focus/state behavior. The isolated decorative line adds 0.38
  KiB gzip over the ordinary static line within its 0.5 KiB cap and tree-shakes
  the decorator and scene-filter modules. The collision-safe ownership kernel
  is now shared by ordinary focus, retargeting, and mark-state resolution, so
  host fixtures retain that compact kernel without retaining optional
  decorator, composite, view, spatial, or network families. Packed exact-
  subpath runtime, declaration, production-isolation, and React Native gates
  pass.
- Linked-view follow-up: both Case 87 line layers now use the decorator, so 16
  dots are the only outer-scene interaction points. View identity remains on
  the dots for grouped x focus, while the decorative lines still contribute
  Date/value domains and visible geometry. This is the first composed-view
  consumer and requires no new ownership utility.
- Annotation follow-up: Case 58 now wraps both extrema text layers with the
  same decorator, leaving the minimum and maximum dots as the only annotation
  interaction points while preserving label geometry and automatic margins.
  Its focused test rejects label-owned points; quick browser conformance passes
  visual and strict-type gates at 98.5% diagnostic geometry similarity.
- Bundle-audit follow-up: focus filtering and stable-key assignment reuse one
  ownership lookup and one structural-key index. This removes 563 minified and
  113–143 gzip bytes from every comparison case while preserving exact key,
  descendant, point-owner, interaction, mark-root, and retarget semantics. The
  remaining ordinary-line growth versus the older comparison baseline is
  attributable to shared scene, renderer, focus, state, and behavior contracts;
  metafile review found no optional layout or algorithm leakage.

### F-219 — Responsive bar caps required guessed plot widths

- Status: resolved
- Severity: medium
- Owner: API/Documentation
- Observed in: layered weather composed-chart catalog case
- Friction: the definition subtracted its expected left and right margins from
  the outer width, reconstructed the configured band scale's bandwidth, and
  converted a desired 20px bar cap into a dynamic inset. That calculation ran
  before final axis layout and repeated geometry already owned by `barY`.
- Decision: add orientation-neutral `maxThickness` to `barY` and `barX`. The
  mark applies the finite nonnegative cap to painted categorical thickness
  after resolving the final band, optional subgroup band, and authored inset,
  then centers the result. Narrow responsive bands retain their natural size.
  One private thickness resolver serves both orientations; it does not become
  a public layout utility because no non-bar consumer requires this policy.
- Verification: focused core tests cover exact centered 20px vertical and
  horizontal caps from final resolved scales, grouped bars after authored
  inset, finite and nonfinite limits, and inline-state inset overrides that
  cannot widen a capped bar. The Case 70 runtime test covers six wide capped
  bars, natural narrow responsive bars, and source closure without a responsive
  definition builder or guessed inner width. Quick browser conformance passes
  visual and strict-type gates at 99.5% diagnostic geometry similarity. An
  isolated bundle reversal attributes 240 minified and 97 gzip bytes in the
  representative-marks fixture to the bar cap, plus 75–80 gzip bytes in DOM
  and React host fixtures for the inline-state invariant; ordinary line and
  compact-scene fixtures retain no bar-cap code.

### F-220 — Framed labels estimate glyph bounds by character count

- Status: monitoring
- Severity: medium
- Owner: API
- Observed in: editable-range label fit and Sankey-flow label backdrops
- Friction: Case 92 estimates whether an event label fits with
  `label.length * 6 + 10`; the richer Sankey case estimates backdrop width from
  the longer label/value string, font size, and a `0.58` glyph factor. Charts
  already owns renderer-aware text measurement for axes, automatic text
  margins, focus-guide labels, and treemap fit, but ordinary definitions cannot
  compose those measured bounds into a padded background or visibility rule.
- Current decision: keep both presentation policies explicit. Do not expose a
  raw text-measurement utility or add a Sankey-specific label DSL. The narrow
  reusable candidate is a resolved text-frame/label composite that owns text
  measurement, padding, background geometry, and optional fit visibility while
  retaining normal text channels and renderer lifecycle. Two catalog uses are
  enough to record the seam, not enough to commit its public shape.
- Verification: both cases retain their estimates beside the authored label
  presentation, and the Sankey layout itself remains fully owned by the
  existing optional primitive. A future extraction must replace both formulas
  and prove DOM, Canvas, and native measurement behavior before this finding
  can resolve.

### F-221 — Roadmap evidence existence allowed false verification

- Status: resolved
- Severity: medium
- Owner: Tooling
- Observed in: definition-coverage rereview of Cases 02, 55, and 56
- Friction: the roadmap validator accepted any evidence path that existed. It
  did not require verified entries to cite their own case, or compare roadmap
  IDs with the live catalog. Cases 55 and 56 therefore passed with copied Case
  61 evidence, while Case 02's existing source path did not prove its claimed
  public-transform migration; all three still contained the case-owned helpers
  their verified summaries said had been removed. The former 42-case control
  group also existed only as a count rather than explicit review records.
- Decision: require the audit, overview, roadmap, and live catalog directory
  sets to be identical and unique. Every verified or accepted case must cite at
  least one path under its own directory, and every case-local work source must
  be reachable from that case's actual TanStack authored closure. Keep all 109
  cases explicit so a control-group total cannot hide missing ownership
  reviews. Compare the audit disposition and overview disposition/capability
  columns with the machine-readable record. Correct the three definitions and
  attach their own focused evidence instead of weakening their verified
  summaries.
- Verification: the roadmap gate passes four tests while proving 109 unique
  IDs in each document, exact equality with the 109 live directories,
  case-local evidence for every verified or accepted entry, authored-closure
  reachability for local ownership sources, documentation-column parity,
  capability-DAG validity, stable disposition totals, and the three accepted
  boundaries.
  Cases 02, 55, and 56 now cite their own sources; Cases 55 and 56 also cite
  their own focused tests. Their focused matrix passes eight tests across three
  files, and the roadmap matrix passes four tests in one file.

### F-222 — View composition coupled placement to grid semantics

- Status: resolved
- Severity: medium
- Owner: API/Documentation
- Observed in: Cartesian chart with an overlaid donut summary and the
  composition-primitive review after the marginal-histogram migration
- Friction: `viewGrid` correctly replaced reserved-domain plotting for adjacent
  views, but its row/column cells also made one non-overlapping arrangement the
  composition abstraction. Placing a complete polar summary in the corner of
  a Cartesian chart would require reserving a track that shrank the main view,
  manually adopting a second scene, or adding a special inset-chart factory.
  Each path coupled child chart lifecycle to one placement policy.
- Decision: make exact-subpath `composeViews` the primitive over named complete
  chart definitions and keep placement in opaque deterministic utilities.
  `fill`, `grid`, `layer`, and frame-relative `inset` compose layouts; later
  layers paint above earlier ones, and every named child is placed exactly
  once. Keep scale relationships orthogonal through `shareX`, `shareY`,
  `alignX`, and `alignY`. `viewGrid` remains concise compatibility syntax that
  lowers into the same composition and scene-adoption kernel rather than a
  second engine. Arbitrary layout callbacks are intentionally outside the
  contract so responsive placement, clipping, paint order, and validation stay
  owned by Charts.
- Verification: focused layout tests cover retained view IDs, grid plus inset
  resolution, all nine anchors, proportional shrinking, fixed/flexible tracks,
  invalid layouts, duplicate placement, unresolved references, and cycles. The
  mixed-coordinate scene test covers a Cartesian chart plus polar donut,
  responsive clipping, stable namespaced identity, datum and scale-value
  unions, one outer focus layer, reverse paint order, and transparent-hole
  pass-through. Scale tests cover shared versus aligned mappings and reject
  links across incompatible frames. A scene-parity test proves `viewGrid`
  lowers into the same kernel. The package export test proves all composition
  and layout helpers exist only on `@tanstack/charts/view`; the root TypeScript
  program validates unknown, missing, and linked view IDs. Canonical docs pass
  for 100 pages and are synchronized into the package. The grid-only bundle
  tree-shakes the inset, layer, and anchor implementations; the coordinated
  fixture is 22.50 KiB gzip, a 5.13 KiB increment over ordinary dots plus
  static SVG and below its reviewed 5.25 KiB cap. All 1,529 unit tests pass,
  along with packed exports, declarations, runtime consumers, and seven
  framework adapter package gates.
- Ownership follow-up: child `cursor` and `pointer` settings were not adopted
  by composed scenes and could therefore disappear silently. `composeViews`
  and `viewGrid` now reject both beside the already rejected child host
  controls; one outer definition owns pointer and cursor lifecycle. Direct
  renderer tests exercise the same Cartesian-plus-donut composition through
  static SVG, Canvas, motion SVG, and React Native, including transforms,
  clips, paint kinds, namespaces, presentation points, updates, and settling.

### F-223 — Remote catalog modules could not participate in SSR

- Status: resolved
- Severity: high
- Owner: Tooling/App
- Observed in: replacing the delayed TanStack.com `/charts` landing-page
  mounts with server-rendered charts
- Friction: the remote catalog artifact exposed only an imperative `mount`
  contract. The application could render only an empty host in its initial
  HTML, then wait for the browser to fetch and execute that artifact before any
  chart appeared. React could not import that remote mount as a component
  during server rendering even though the React adapter itself supports
  complete SVG SSR.
- Decision: preserve the remote imperative artifact for the conformance app
  and publish the complete 109-case catalog separately as
  `@tanstack/react-charts-catalog`. Each published case has a default React
  component at `/cases/<id>`. The imperative and React paths share the same
  case implementation, label, and interaction policy. Package builds bundle
  private fixtures and datasets while externalizing React, React DOM, the
  Charts packages, and exact declared D3 dependencies. The root entry contains
  metadata and public prop types only, so importing the catalog index does not
  load chart cases.
- Verification: strict workspace TypeScript and the focused React SSR suite
  pass. The packed-consumer gate imports every published subpath, renders all
  110 case components through `react-dom/server`, verifies complete SVG view
  boxes, catalog order, declarations, and package targets, rejects source files
  and private workspace dependencies, and passes the existing web and React
  Native package consumers.
- Schema-v5 follow-up: the package remains the supported React SSR catalog, but
  tanstack.com no longer needs it to own the landing gallery. Charts CI now uses
  those generated wrappers at build time to publish manifest-declared static
  previews beside the remote mount modules. The site consumes only the generic
  immutable artifact; see F-119 for the publication and integrity contract.

### F-224 — Packed consumers masked a runtime D3 dependency

- Status: resolved
- Severity: high
- Owner: Tooling
- Observed in: installing the packed React catalog into TanStack.com without
  the Charts development workspace
- Friction: `@tanstack/charts/bar` imports `d3-scale` at runtime, but the core
  package listed it only as a development dependency. The packed-consumer
  fixture also installed `d3-scale` directly for its own examples, so its
  successful bar imports hid the incomplete package manifest. A standalone
  catalog install failed unless the application happened to supply the missing
  module.
- Decision: make `d3-scale` a runtime dependency of `@tanstack/charts` while
  keeping its TypeScript package development-only. Add a separate packed
  catalog consumer whose only direct runtime dependencies are the catalog,
  React, and React DOM. Its internal Charts packages resolve from the staged
  tarballs, and it receives no direct D3 dependency.
- Verification: the standalone fixture installs offline from the packed
  packages and server-renders the grouped-bar catalog component through the
  `@tanstack/charts/bar` path. The complete packed web, declaration, bare React
  Native, and Expo consumer gate passes with that fixture enabled.
- Release follow-up evidence: disabling automatic peer installation did not
  make the correction pull request hermetic on a distributed Nx agent.
  `@types/d3-force` is a regular `@tanstack/charts` dependency, and pnpm's
  offline resolver still needed registry metadata to match its declared
  `^3.0.10` range even though the agent had the exact linked package and an
  override. The coordinator's frozen workspace install had populated that
  metadata; the agent's package mirror had not.
- Release follow-up decision: preserve the package's semver range and the
  offline consumer fixtures. Run `package-check` on the setup-populated
  coordinator before starting Nx agents. A dedicated `ci-distributed` target
  has exactly the normal `ci` dependencies except `package-check`, making the
  execution boundary explicit instead of depending on a cache handoff. Local
  `ci` and `validate` retain the complete gate. Distributed checks no longer
  reserve a large agent for this coordinator-only target.
- Release follow-up cache evidence: the coordinator package gate passed in
  correction run `31221086294`, but the complete distributed graph still
  scheduled `package-check` as a cache miss and reproduced the missing-metadata
  failure. A successful cache write is therefore not a sufficient ownership
  boundary for this environment-sensitive gate.
- Release follow-up verification: the CI workflow contract requires
  `package-check` to run with continuous assignment disabled before Nx agents
  start, requires `ci-distributed` to contain the exact `ci` dependency list
  minus `package-check`, and keeps the distribution contract on medium agents.
  The packed web, declarations, runtime, standalone catalog, bare React Native,
  Expo, and seven-adapter gates pass locally with both fixture installs offline.

### F-225 — Noninteractive SSR emitted hidden focus geometry

- Status: resolved
- Severity: high
- Owner: API/Tooling
- Observed in: server-rendering the TanStack.com `/charts` landing page
- Friction: setting `keyboard: false` and `tooltip: false` disabled interaction
  handlers but still generated a hidden default focus circle for every scene
  point. Dense charts therefore shipped hundreds of invisible SVG elements in
  the initial HTML. Treating `keyboard: false` as equivalent to no focus would
  be incorrect because pointer-only charts can still use focus resolution.
- Decision: add `focus: false` as an explicit chart-definition mode. It omits
  only the generated default focus layer, forces native chart surfaces out of
  the tab order, skips focus resolution and spatial-index construction, and
  clears restored focus. Explicitly authored focus marks remain part of the
  scene. Conformance catalog components set this mode only when
  `interactive` is false.
- Verification: scene tests retain semantic points while omitting the generated
  focus layer. DOM, adapter, renderer-neutral, React SSR/hydration, and React
  Native tests cover the disabled focus contract. The catalog test and packed
  consumer gate server-render all 110 catalog components.

### F-226 — Worker runtimes rejected bundled CSV parsing

- Status: resolved
- Severity: high
- Owner: Tooling
- Observed in: previewing the server-rendered catalog on Cloudflare Workers
- Friction: large bundled CSV snapshots used `d3-dsv` parsing at module load.
  Its object-row parser creates a mapper with `new Function`, which Workers
  rejects even though the chart renderer itself is server-safe.
- Decision: generate compact CSV modules with a small CSP-safe row parser and
  static field mappings. Keep `d3-dsv` only in the build-time synchronizer and
  preserve its auto-typing license notice in the catalog package.
- Verification: demo-data tests cover quoted fields and typed values, assert
  that large bundles contain neither `d3-dsv`, `new Function`, nor `eval`, and
  enforce the asset ceiling. Packed server-runtime checks execute with Node's
  `--disallow-code-generation-from-strings` flag.

### F-227 — Catalog bundles omitted data license notices

- Status: resolved
- Severity: high
- Owner: Tooling
- Observed in: publication review of `@tanstack/react-charts-catalog`
- Friction: the catalog bundled private case modules and complete Observable
  dataset snapshots, but its tarball shipped only the TanStack license. It also
  bundled D3 implementations despite those packages already being dependencies.
- Decision: externalize every case-local D3 import and declare its exact runtime
  package version. Ship source, revision, attribution, and complete ISC notices
  for the bundled sample datasets, Plot snapshots, world and U.S. atlases,
  TopoJSON client, and derived D3 DSV auto-typing.
- Verification: package validation requires `THIRD_PARTY_NOTICES.md`. A packed
  standalone consumer declares only the catalog, React, and React DOM while
  resolving all D3 imports transitively from the catalog manifest.

### F-228 — Catalog definitions captured the initial server width

- Status: resolved
- Severity: medium
- Owner: Application
- Observed in: resizing server-rendered catalog components with omitted widths
- Friction: descriptor wrappers created definitions from `initialWidth`, while
  custom React views fixed their input width to the same server value.
  ResizeObserver could change the SVG viewport without rebuilding captured
  breakpoints or custom-view layout.
- Decision: rebuild descriptor definitions from the chart runtime's current
  build-context width and height. Custom views retain `initialWidth` for SSR,
  then measure their wrapper with ResizeObserver after hydration.
- Verification: omitted-width regressions resize a static comparative-radar
  descriptor and an interactive custom view from 640 to 360 pixels and compare
  their updated geometry and layout with fixed-width output.

### F-229 — Catalog publishing raced its React dependency

- Status: resolved
- Severity: high
- Owner: Tooling/Release
- Observed in: adding the catalog to the coordinated Changesets release
- Friction: the publisher released core first, then all adapters concurrently.
  The catalog depends on the same-version React adapter, so npm could expose a
  catalog version before its dependency existed or leave it dangling if the
  React publication failed.
- Decision: publish core, then React, before starting concurrent publication of
  the catalog and remaining adapters.
- Verification: the release workflow contract asserts the core-to-React order
  and that both complete before the concurrent publication phase.

### F-230 — CI repeated unaffected work across every partition

- Status: monitoring
- Severity: high
- Owner: Tooling
- Observed in: profiling local and GitHub validation on 2026-08-04
- Friction: a documentation-only pull request still ran the complete static,
  bundle, comparison, and stress workflow. It consumed 4 minutes 38 seconds of
  wall time and 18.2 runner-minutes; the eight browser jobs alone consumed 12
  runner-minutes. Root Nx inputs treated package documentation and the `CI`
  environment as source, while every job restored the same local Nx cache even
  when it never invoked Nx. Repeated setup consumed 339 runner-seconds on that
  run, and the manually shared local cache showed no critical-path reuse for an
  identical revision.
- Decision: classify pull-request paths before starting browser partitions and
  keep one stable aggregate `CI` result that accepts only intentionally skipped
  jobs. Documentation-only static runs execute format, documentation, focused
  Markdown invariant tests, and diff checks. Narrow source inputs exclude
  generated/public documentation, remove runner identity from deterministic
  hashes, cache the pnpm store, key Playwright from its exact browser metadata
  and architecture, and stop sharing `.nx/cache` across machines. Full static
  validation now uses the public TanStack Charts Nx Cloud workspace and assigns
  the package critical path to one large agent while two medium agents consume
  the remaining cacheable graph. Documentation-only validation stays local and
  does not start agents.
- Verification: classifier and workflow contracts cover package READMEs,
  media, nested Markdown, mixed source changes, lockfiles, workflow changes,
  conditional aggregate results, pinned setup actions, Nx Cloud identity,
  cacheability, agent assignment, and the exact Playwright container canary.
  The focused documentation graph and complete 18-task local graph pass; a
  fresh task cache completes in 63.17 seconds and the identical warm graph in
  0.97 seconds. The next pull request and scheduled run must confirm distributed
  critical-path and runner-minute savings before this entry closes.
- Follow-up: record the first production timings and run the opt-in Playwright
  container A/B.

### F-231 — Packed consumers serialized independent verification

- Status: resolved
- Severity: high
- Owner: Tooling/Release
- Observed in: reducing the local package validation critical path
- Friction: five independent package builds and nineteen production bundles ran
  serially. The bare React Native and Expo consumers also shared Metro's default
  temporary cache; Expo's `--clear` made concurrent verification unsafe even
  though their installed projects and bundle outputs were otherwise separate.
- Decision: retain serial `pnpm pack` and install phases required by F-142, but
  use bounded, draining worker pools for in-process package builds, web bundles,
  and post-install consumer verification. Give each native consumer a local
  `.metro-cache`, preserve deterministic result order, and keep packed and
  framework adapter gates in one top-level process so their pnpm phases cannot
  overlap.
- Verification: the complete packed-consumer gate passes with unchanged bundle
  boundaries and sizes in 30.38 seconds, down from the 35.30-second baseline.
  The worker-pool and packed-markdown regressions pass, both native consumers
  create their isolated caches, and every nested pnpm operation remains serial.

### F-232 — Benchmark shards repeated setup and skewed work

- Status: monitoring
- Severity: high
- Owner: Tooling
- Observed in: profiling scheduled comparison, stress, and conformance runs
- Friction: every conformance shard constructed 28 TypeScript programs and
  prepared bundles serially. Modulo case assignment left one conformance shard
  at 222 seconds while another took 80 seconds. Standard stress groups took
  428, 401, 258, and 137 seconds, and a separate bundle-baseline job rebuilt the
  same comparison cases that four browser shards built immediately afterward.
- Decision: compile all conformance baselines and negative probes in one
  TypeScript program, prepare independent bundles with four-worker draining
  pools, and assign conformance cases by deterministic estimated cost. Preserve
  the semantic quick stress groups, but assign standard/full workloads using
  explicit weights derived from the observed scheduled run. Each comparison
  shard now checks the filtered baseline and complete configured key set from
  its existing bundles; the full duplicate job runs only when a maintainer
  explicitly requests a candidate.
- Verification: benchmark regressions pass and serial browser measurement is
  unchanged. Predicted worst conformance weight falls from 4,484 to 2,898
  (35%), and predicted standard stress load becomes 315, 298, 275, and 336
  seconds instead of a 428-second maximum. Focused size conformance completes
  in 7.98 seconds, a one-of-eight size shard in 13.21 seconds, and a filtered
  stress shard completes with zero failures.
- Follow-up: replace predicted weights with measured per-case and per-workload
  cloud durations after the next complete scheduled runs.

### F-233 — Dismissal could click through a composed tooltip

- Status: resolved
- Severity: medium
- Owner: API
- Observed in: the expanding pinned energy-tooltip catalog example
- Friction: a framework close button called `dismiss()` during its target-phase
  click handler. The adapter then unmounted that button before the event
  reached the chart container, so a live descendant check no longer recognized
  the event as tooltip-owned. When the portaled tooltip overlapped the chart,
  the same click immediately pinned the point underneath it.
- Decision: identify tooltip-owned clicks from the event's immutable composed
  path, filtering that path to DOM nodes, instead of relying only on parentage
  after target handlers have run.
- Verification: a renderer regression unmounts its close button synchronously
  during dismissal and proves the chart stays unfocused. The paired energy
  case closes correctly at 320 and 640 pixels across both data revisions.

### F-234 — Recharts point replacement canceled activation events

- Status: monitoring
- Severity: low
- Owner: Application
- Observed in: the Recharts reference for the expanding energy tooltip
- Friction: showing the transient tooltip rerendered Recharts' custom point
  elements between pointer movement and mouse activation. Browser click
  synthesis could then lose the original point target even though the pointer
  remained at the same semantic datum. The same replacement could disconnect a
  focused point before a subsequent keyboard event.
- Current decision: make the behavior scenario explicit about its hover-then-
  click sequence. The reference resolves activation during document capture,
  scopes it to the chart bounds, ignores the tooltip subtree, and falls back to
  the nearest current point geometry within the point hit radius. Keyboard
  focus stays on a stable listbox root while `aria-activedescendant` identifies
  the current month option.
- Verification: the paired behavior matrix passes hover, pointer pin, keyboard
  pin, Escape, and close scenarios at 320 and 640 pixels across both revisions
  without unsafe type assertions or renderer internals.

### F-235 — Structured tooltip rows could not interleave custom detail

- Status: monitoring
- Severity: low
- Owner: API
- Observed in: matching the expanding pinned energy tooltip to its source clip
- Friction: `ChartTooltipContent` can describe only a title and flat rows. The
  source layout expands a consumption breakdown directly below the Consumption
  row, then places a generation breakdown below the Generation row, followed by
  a full-width coverage sentence. The framework renderer therefore had to own
  and repeat the two summary rows instead of composing `defaultBody` with the
  inserted detail.
- Current decision: keep the structured callback stable at two summary rows and
  let the custom body renderer own non-tabular ordering. Do not expand the
  generic content schema from one application layout.
- Verification: the paired case reports two summary rows in both transient and
  pinned states, then adds four nested consumption segments, six detail rows,
  and the persistent coverage footer only through the custom renderer.

### F-236 — Paint parity normalized patterns but not gradients

- Status: resolved
- Severity: low
- Owner: Tooling
- Observed in: the solid-and-hatched generation bars in the expanding energy
  tooltip comparison
- Friction: the visual gate resolved an SVG pattern to its backing rectangle
  color but left an equivalent linear-gradient paint as a raw resource URL.
  The Recharts pattern and Charts gradient therefore failed paint parity even
  though both used the same exported-energy color.
- Decision: resolve a referenced gradient to its first stop color when no
  pattern rectangle or path exists, preserving the existing solid-color
  comparison contract.
- Verification: the paired energy case compares the pattern and gradient fills
  as the same exported-energy paint while retaining their rendered hatch
  treatments.

### F-237 — Focused rules had no matchable presentation points

- Status: resolved
- Severity: medium
- Owner: API
- Observed in: the active-month guide in the expanding energy tooltip example
- Friction: `whenFocused(ruleX(...), { match: "x" })` typechecked and matched
  the documented focused-rule recipe, but every rule stayed hidden because
  rules intentionally emit no interaction points. Replacing the rule with a
  link would have introduced the wrong semantic mark solely to obtain a focus
  candidate.
- Decision: let a mark scene expose presentation-only `focusAnchors`. Each
  `ChartFocusAnchor` carries the rendered-node key and only the semantic axes
  the mark owns. Focus layers consume those anchors without adding them to the
  chart's global interaction points. `ruleX` and `ruleY` therefore remain
  interaction-free without inventing a zero value for their missing axis.
- Verification: focused-rule regressions reveal exactly one full-span rule for
  matching x and y values, keep rule anchors separate from `scene.points`,
  preserve categorical series matching, and prove that an absent axis does not
  match zero. The paired energy case retains its native focused `ruleX` guide.

### F-238 — Callback parameter shapes were inconsistent

- Status: resolved
- Severity: medium
- Owner: API/Tooling
- Observed in: review of the expanding pinned-tooltip API
- Friction: `content(points, context)` exposed pinned and formatting state,
  while sibling `format(point)` and `formatGroup(points)` did not. A full
  public-surface audit also found authored callbacks with three or four
  positional parameters and two-argument callbacks whose second parameter was
  another unlabelled value. Consumers had to remember a different parameter
  convention for channels, facets, focus strategies, legends, spatial indexes,
  and tooltips.
- Decision: public callbacks accept at most two arguments. Primary data or
  purpose comes first and additional state comes second in a named context or
  options object; callbacks without a distinct primary payload receive one
  object. Migrate channels to `(datum, { index, data })`, facet builders to
  `(data, { key })`, focus resolution and grouping to `(points, context)`,
  legend measurement to `(itemCount, context)`, spatial factories to
  `(points, { scene })`, and all tooltip presentation callbacks to the shared
  `ChartTooltipContentContext`. Controlled-signal changes now use
  `(value, { reason })`; keyed-selection keys and focus-guide labels receive
  `{ point }`; interactive-legend item labels receive `{ visible }`. Keep
  standard comparators, paired geometry, exact upstream protocols such as D3
  threshold generators, and consumer-called service methods as classified
  exceptions.
- Verification: the public callback inventory follows exported types,
  functions, and values into nested package-owned types. It classifies all 778
  reachable callable surfaces, including Alpine's external directive protocol,
  Vue's nested tooltip slot, live-chart interaction and presentation service
  handles, cursor controllers and host sessions, focus-guide resolvers, the
  presentation-points listener callback, and viewport mapping. It
  rejects unclassified surfaces, callback arity above two, or a non-object
  second callback argument. Dot-layout and force factories use one context
  object; D3-compatible treemap, Sankey, and returned force protocols remain
  classified upstream exceptions; the force factory's `nodeKey` lookup is a
  consumer-called service handle. Escaped TypeScript unique-symbol member names are
  canonicalized without rewriting authored string members. Failed parameter
  type resolution preserves the parameter as a fail-closed non-object bag
  instead of aborting or undercounting the inventory. Focused core, React
  Native, React, Octane, channel, facet, focus, legend, tooltip, and contract
  tests cover the migrated shapes, including configured tooltip item labels in
  React Native callback context, controlled-signal reasons, keyed-selection
  points, focus-guide label points, and interactive-legend visibility. The
  merged packed consumer exercises those context types and uses the same
  `(datum, { index, data })` contract for radial text and bar channels; the
  migration guide records every breaking before-and-after signature. Full type,
  documentation, package, format,
  bundle, and comparison gates pass. Against `0.6.5`, the reviewed
  universal bundle baseline increases by at most 476 minified and 137 gzip
  bytes. The Stats parity and D3 quadtree ceilings each move by 0.2 KiB; the
  React compact-line and Delaunay integration ceilings each move by 0.1 KiB.
  The focused expanding tooltip conformance case retains 99.6% geometry
  similarity and passes visual, behavior, and type gates at both sizes and
  themes.
- Follow-up decision: transform accessors follow the same primary-payload
  convention as channels: `(datum, { index, data })`. The transform executor
  supplies one stable context shape and all first-party examples use it.
- Follow-up verification: transform regressions cover datum, index, and complete
  data; the public callback inventory and root TypeScript pass.

### F-239 — Example keys collapsed distinct source rows

- Status: resolved
- Severity: medium
- Owner: Application
- Observed in: the full conformance matrix for the linear-regression,
  framed-scatter, and many-point-scatter examples
- Friction: all three examples keyed car rows with only `name` and `year`. The
  cars dataset contains same-name, same-year rows with different measurements,
  so keyed scene reconciliation retained fewer dots than requested: 318 of 320
  in the first two examples and as few as 297 of 300 in the third.
- Decision: include each example's plotted channel measurements in its key so
  distinct source observations remain distinct while keys stay stable across
  revisions.
- Verification: the first two examples now retain 320 unique keys and the
  many-point example retains 300 unique keys for their initial and revised
  windows. Focused standard conformance passes each example's full 320/640/960
  light/dark visual matrix.

### F-240 — Rolling paths morphed samples instead of shifting them

- Status: resolved
- Severity: high
- Owner: API
- Observed in: Liveline-inspired streaming React examples
- Friction: a fixed-length rolling line retained keyed samples, but SVG path
  interpolation matched commands by array position. Each old y-value therefore
  bent toward the following sample instead of the trace translating left.
  Stable datum keys already preserved interaction points but could not change
  the single path element's interpolation strategy.
- Decision: add one first-principles rolling object contract,
  `motion.path: { update: 'rolling', x: 'shift', y, fallback }`, with fixed or
  affine-reprojected y geometry and an explicit snap-or-morph fallback. Validate
  the retained key window, balanced batch, stable semantic values, uniform x
  displacement, stable primitive kind and plot bounds, required clipping,
  structured path geometry, clip-edge coverage, and the absence of transient x
  or y viewport translation before installing the target path and animating one
  matrix to identity. Invalid rolling updates snap by default instead of
  silently becoming a different interpolation.
- Follow-up evidence: while a rolling path translated correctly, its SVG focus
  circles snapped to destination coordinates and an active tooltip received no
  updates as presentation points advanced. The surface could expose current
  presentation geometry but had no notification contract for the shared host.
- Follow-up decision: animate keyed focus-layer geometry with its owning data
  points and add optional `ChartSurface.subscribePresentationPoints()`. The
  shared host now re-resolves a stationary pointer or restores pinned and
  keyboard focus against each published presentation frame, keeping tooltip
  anchors and focus markers aligned without chart-specific wiring.
- Follow-up evidence: entering and exiting point dots still used independent
  fades, snap fallback retained removed presentation points until its nominal
  duration, and applying an inline focus state cancelled the active data
  transform.
- Follow-up decision: associate both previous and target semantic points with
  each rolling plan. Retained and entering dots, default focus circles,
  exiting dots, and presentation points now share the path transform and
  timing; snap removes stale geometry and points in the same commit. Focus
  layers remain live during data motion, while inline mark-state geometry and
  style retain the latest request across back-to-back updates and reconcile
  when data motion becomes idle instead of taking over its transform.
- Verification: pure planner tests cover valid batches and every rejected
  invariant, including nonzero x or y viewport translation. Integration tests
  hold target line and area path data constant while x translation and affine y
  reprojection animate through one matrix, verify matching presentation points,
  compose an interrupted A-to-B-to-C update from the currently painted
  transform, keep retained, entering, and exiting point and focus decorations
  aligned, keep an authored focus band on the same trajectory, retain a
  deferred inline focus state across back-to-back rolls, and verify snap removes
  old DOM and presentation points without scheduling a frame. The live
  dynamic-y example uses the rolling object contract, clipped overscan, a stable
  semantic area baseline, and fixed plot margins. The complete motion SVG
  renderer measures 14.17 KiB gzip under its reviewed 14.4 KiB ceiling.

### F-241 — Motion ignored authored SVG clips

- Status: resolved
- Severity: high
- Owner: API
- Observed in: Liveline-inspired streaming React examples
- Friction: the definitions correctly set `clip: true`, but `motion()` used the
  resource-free SVG serializer. Translated line and area geometry therefore
  painted through the y-axis labels and beyond the plot instead of being
  clipped to `scene.chart`. There was no public way to combine the motion
  renderer with the resource-aware serializer.
- Decision: make resource-aware SVG serialization the default and use it from
  `motion()` for both prerendering and updates. SVG hosts now consume clips and
  gradients already declared in the renderer-neutral scene.
- Verification: the streaming motion regression asserts that the marks group
  references a generated clip path whose rectangle exactly matches the
  resolved chart x, y, width, and height. The running React examples expose
  three distinct scoped clip paths and keep linear shifted marks inside each
  plot while guides remain outside. The static SVG line consumer measures
  17.75 KiB gzip; the reviewed universal baseline records its 1,743-byte gzip
  increase from making scene resources part of the default renderer.

### F-242 — Paged history required overlaid chart hosts

- Status: resolved
- Severity: high
- Owner: API
- Observed in: iOS-style paged history React example
- Friction: stationary guides over a continuously swiped line required two
  overlaid chart hosts, duplicated scale definitions, manual width measurement,
  CSS clipping, and pixel offsets. Focus geometry belonged to one host while
  the visible coordinates belonged to the other.
- Decision: add a continuous axis `viewport` with a committed semantic domain
  and transient scene-pixel translation. Resolve guides against the viewport
  domain and place viewport content in clipped layers per mark and per owned
  axis. Infer ownership from materialized channels and let custom marks override
  each axis as `content` or `fixed`, keeping guides and unrelated annotations
  stationary. Remap scene, node-interaction, focus-layer, and mark-state point
  references to presented coordinates. Expose the full content domain and
  presented mapper on the resolved scale. Preserve complete scene points for
  rendering and diagnostics while `viewportInteractionPoints` and the optional
  `findNearestPoint` candidate list limit focus and keyboard navigation to
  clipped content anchors inside the plot while retaining points from
  fixed-ownership marks outside it.
- Verification: type tests constrain `ChartContinuousDomain` to homogeneous
  numeric or Date endpoints. Configured-scale tests require continuous,
  invertible, unclamped scales with independently configurable domain and range,
  reject categorical, quantize, getter-only, and clamped configured scales,
  reject an authored viewport on an opaque custom resolver, accept a custom
  resolver that returns its own complete viewport, and cover positive,
  reversed, and negative same-sign logarithmic domains. Scene,
  SVG, focus, and renderer tests assert screen-direction translation,
  per-mark/per-axis clips, fixed guides and annotations, explicit custom-mark
  ownership, presented point references, candidate filtering, and tooltip/focus
  continuity. The paged example renders its complete history as one line and
  area in one chart host while the application owns only drag policy and page
  settling. The locked D3-scale line scene measures 16.18 KiB gzip, a reviewed
  1,233-byte increase for the default viewport-capable scene contract.

### F-243 — Long-press focus duplicated host pointer geometry

- Status: resolved
- Severity: medium
- Owner: API
- Observed in: iOS-style paged history React example
- Friction: delaying focus until a touch hold required the application to read
  SVG bounds, convert client coordinates, search scene points, position a
  cursor, and render a second tooltip. The chart already owned all of that
  logic, but its pointer handling was all-or-nothing and not callable.
- Decision: expose one stable `ChartInteractionController` on the host and
  render context. `clientToScene()` exposes renderer-correct drag geometry,
  `resolvePointer()` applies the current presentation and configured focus
  strategy, and `setControlledFocus()` paints or clears the same focus marks
  and tooltip as native input. Definition `pointer: false` disables automatic
  pointer move, leave, and click without disabling keyboard focus, and
  controlled focus has separate ownership from pointer and keyboard focus.
  Share SVG client-to-scene conversion between normal and motion surfaces.
  Keep that surface capability optional for existing custom renderers; the
  controller returns `null` when it is absent. Passing a pointer resolution to
  `setControlledFocus()` infers pointer source unless explicitly overridden,
  while a raw point defaults to programmatic source.
- Follow-up evidence: the host rebuilt a configured spatial index from the
  transition-start presentation points immediately after a data update. Motion
  correctly bypassed that index while presentation points were active, but
  re-enabled the stale index when the transition settled.
- Follow-up decision: build spatial indexes from the destination scene's
  visible points. Presentation points remain authoritative during motion and
  the destination index becomes authoritative only after they settle.
- Verification: renderer tests cover resolution, focus groups, clearing,
  pinning, pointer opt-out, ownership boundaries, presentation updates, and
  controller identity, including inferred pointer source across a scene update
  and destination spatial-index resolution after presentation geometry clears.
  Every DOM framework adapter forwards the controller in `onRender`, and the
  paged example delegates its long-press cursor and tooltip to the definition
  without application SVG math. The locked DOM host measures 18.39 KiB gzip;
  its reviewed 2,583-byte increase includes the default viewport and controlled
  interaction contracts.

### F-244 — Focus cursor width depended on private band inference

- Status: resolved
- Severity: low
- Owner: API
- Observed in: iOS-style paged history React example
- Friction: a one-pixel definition-owned cursor could use a focused `bandX`,
  but its width was always inferred from sample spacing. Producing a precise
  cursor with `inset` required the application to duplicate the mark's private
  `0.8` bandwidth factor. At the time, `ruleX` could paint the right geometry
  but emitted no focus-match points.
- Decision: add explicit scene-pixel `width` to `bandX` and `height` to
  `bandY`. Explicit dimensions replace scale or inferred bandwidth before
  applying `inset`; existing definitions retain inferred sizing.
- Verification: mark tests assert fixed one- and two-pixel continuous bands,
  and the paged history definition expresses its cursor as `width: 1` without
  responsive sample-spacing math.
- Follow-up: F-237 later added presentation-only `focusAnchors` to rules, so a
  focused `ruleX` can now express a one-pixel cursor too. Explicit band
  dimensions remain useful when authored band geometry needs an exact scene-
  pixel width or height.

### F-245 — Focus-filtered bands could not act as cursor geometry

- Status: resolved
- Severity: high
- Owner: API
- Observed in: stacked-bar band-and-rule cursor conformance case 119
- Friction: `whenFocused(bandX(...), { match: "x" })` could reveal the band
  authored for a focused category, but it could not move one stable band with
  focus. The first case-119 implementation therefore needed a synthetic row
  for every category and a complete set of hidden band rectangles. That was
  correct for a data-bound visibility filter but the wrong ownership model for
  cursor geometry, which should not require duplicated data or participate in
  the ordinary mark tree.
- Decision: add `band` to each `crosshair` axis. `band: true` or a
  `CrosshairBandOptions` object replaces that axis rule with a renderer-native
  rectangle centered on the focused semantic value. Its full size comes from
  the resolved categorical scale bandwidth, so grouped marks use the parent
  category rather than a subgroup's point coordinate. `inset` applies to both
  edges and may be negative for an outset. The band spans and clips to the plot
  in the other direction, accepts radius/fill/stroke/opacity paint, remains
  outside hit testing, and emits no geometry when bandwidth is zero. Mark order
  continues to own underlay or overlay placement, so a band and an
  opposite-axis rule can use separate crosshair marks when their placements
  differ.
- Verification: the categorical cursor-band unit regression proves exact
  inset geometry, a 2-pixel outset from bars whose inset differs by 2, paint
  options, parent-scale centering for x- and y-grouped bars, and no band on a
  continuous scale. Case 119's
  `band-and-rule-follow-stack` scenario checks the full three-point x group,
  exact 4-pixel left/right outset, focused period and stack-endpoint labels,
  dotted y rule, responsive revisions, and pointer-leave cleanup. The core
  stacked-label regression also proves that a difference interval formats its
  plotted endpoint rather than the raw segment delta. Cursor and crosshair
  regressions project semantic values through `ResolvedScale.viewport.map` with
  nonzero x and y translations, keeping controlled guides aligned with
  presented viewport content.

### F-246 — Scene updates cleared active motion guide placement

- Status: resolved
- Severity: high
- Owner: API
- Observed in: animating the case-119 band and rule through a data revision
- Friction: the motion renderer detached persistent focus-guide layers during
  a scene update, then cleared every recorded visible placement before the
  host restored focus. The same keyed band and rule therefore became hidden or
  snapped to the next geometry instead of continuing from their visible
  positions.
- Decision: retain each visible under/over placement while the next scene still
  provides a guide at that placement. Restore the detached keyed layer with its
  current visibility, then let restored focus animate its geometry. Remove the
  placement and layer when the next scene no longer provides the guide so the
  retention rule cannot leave stale cursor paint behind.
- Verification: focused motion regressions keep the same categorical band and
  dotted-rule elements while they animate between points, preserve an active
  guide through a keyed scene update and animate from its prior coordinate,
  and remove the retained layer when the next scene drops its crosshair.
  Retained presentation points carry the destination datum and semantic values
  with their prior x/y geometry, so focus callbacks and cursor labels report
  the updated row throughout the transition.

### F-247 — Custom conformance mounts were not React catalog descriptors

- Status: resolved
- Severity: medium
- Owner: Tooling/Application
- Observed in: publishing stacked-bar cursor conformance case 119
- Friction: the custom motion mount was a valid conformance implementation,
  but the React catalog synchronizer did not publish it. A separate static
  descriptor made case 119 visible, yet its generated wrapper used the base
  React chart and silently ignored the mark's motion options. The docs-linked
  demo therefore differed from the implementation under conformance.
- Decision: route case 119 through the existing custom React view path. Share
  one revision-aware definition and `motion()` renderer factory between that
  view and the bespoke conformance mount; keep the conformance driver only for
  target resolution, state inspection, and deterministic settling. Preview
  rendering remains fluid and noninteractive while the full catalog view
  honors its interactive input.
- Verification: the synchronizer reports 110 matching cases. The catalog
  regression moves focus between two bar periods and proves that both the
  under-band and over-rule guide layers enter their running motion state. The
  focused 25-test catalog suite, workspace typecheck, sync check, and diff check
  pass.
- Follow-up evidence: merging the definition-owned interaction migrations for
  cases 80, 87, 88, 89, and 90 removed their obsolete React views, but the
  catalog synchronizer still generated imports to those missing files. Their
  manual conformance mounts were intentionally retained for driver state and
  geometry, yet those functions did not expose the definition metadata needed
  by the base React catalog host. The synchronizer also rejected otherwise
  valid `tanstackMount` exports with explicit type annotations.
- Follow-up decision: publish each migrated case through a colocated
  `tanstackCase` descriptor while retaining its manual conformance mount. Remove
  those five IDs from the custom-view registry, keep case 119 there for its
  renderer-owned motion, and allow an optional type annotation when recognizing
  `tanstackMount` exports.
- Follow-up verification: the five custom view files remain absent, their
  generated wrappers import `catalogCase` from the native definitions, and
  `react-catalog:sync --check` reports all 110 cases in sync.

### F-248 — Release finalization targeted the workflow head

- Status: monitoring
- Severity: high
- Owner: Tooling/Release
- Observed in: pre-release audit after publishing `0.6.5` without its repository
  tag or GitHub release
- Friction: later pending changesets made the release-status step treat an
  already-published coordinated version as unfinished. If finalization did run,
  the workflow created the missing tag at the current workflow commit, which
  could include unreleased main work rather than the revision that produced the
  npm provenance.
- Decision: distinguish packages still missing from npm from later pending
  changesets. When every coordinated package version is published, derive its
  source revision from the matching Changesets release merge in full history,
  expose that revision in release status, and create the tag at that exact
  commit. Ordinary pushes with later changesets remain inert. An explicit
  `recover_published_release` workflow dispatch skips the Changesets action and
  lets a previously interrupted finalization recover independently.
- Verification: release-status tests cover incomplete publication, ordinary
  pending releases, all-published recovery, historical revision discovery, and
  invalid history. The live audit resolves `v0.6.5` to
  `4f5653e552ddf1d268b49da7046199f11b2be44c`, not current main, and a local
  annotated tag points there. Release-version synchronization owns only the
  mutable latest-release declaration in the comparison page; immutable
  release-source evidence stays pinned to its measured commit. The remote tag
  and GitHub release remain absent; publishing them triggers external release
  automation and requires a separate explicit release action.
- Release follow-up evidence: the historical-revision unit test read this
  repository's real `0.6.5` merge. It passed in a full clone but failed inside
  the correction pull request's Nx agent workspace, which did not retain that
  historical commit.
- Release follow-up decision: make the unit test construct its own temporary
  Git repository with a `0.6.4` base, a `changeset-release/main` version commit,
  and a no-fast-forward `0.6.5` merge. Production release status still reads
  the full checkout supplied by the release workflow.
- Release follow-up verification: the hermetic release-status suite passes all
  ten cases and asserts the exact synthetic merge revision without depending
  on repository history.

### F-249 — Interrupted motion retained stale presentation state

- Status: resolved
- Severity: high
- Owner: API
- Observed in: repeated keyed exits and composite path updates during the
  pre-release runtime audit
- Friction: interrupting an exit could leave its old DOM node, presentation
  identity, and runtime track behind. A later live node with the same identity
  could then inherit stale state. Composite parent/child motion merging also
  preserved ordinary timing fields while dropping `timing.path`, changing an
  authored rolling-path policy at the composition boundary.
- Decision: cancelled exits remove the exact stale DOM element, prune its
  presentation identity and runtime state, preserve a live replacement, and
  publish the cleaned presentation snapshot. Composite motion merging carries
  the complete path timing policy with the other inherited fields.
- Verification: focused regressions cover live replacements, cleanup and
  republished points, composite path inheritance, and twenty updates spaced ten
  milliseconds apart. The full focused motion matrix passes across ordinary
  and composed geometry.

### F-250 — Host accessibility diverged across render paths

- Status: resolved
- Severity: high
- Owner: API
- Observed in: static prerender, adapter renderer, mounted DOM, React Native,
  and keyboard-disabled zoom comparison
- Friction: each host independently decided whether its SVG belonged in the
  tab order. A free cursor could be focusable after mount but not in prerendered
  output, while adapter and mounted paths could disagree. React Native sticky
  activation invoked the same toggle path twice. Keyboard-disabled zoom still
  advertised application keyboard semantics it did not implement.
- Decision: centralize host tab-index resolution and use it from prerender,
  adapter, renderer, and mounted-host paths. Free cursors have the same initial
  focusability as their hydrated host. Native activation toggles sticky state
  once. A keyboard-disabled zoom exposes neither application role, shortcuts,
  nor instructions and is removed from sequential keyboard focus.
- Verification: adapter, renderer, cursor, zoom, and React Native regressions
  cover prerender/mount parity, authored tab-index precedence, free cursors,
  one activation callback, disabled-keyboard semantics, and teardown. Focused
  accessibility and composition suites pass with root TypeScript.

### F-251 — The architecture made D3 implementation sound mandatory

- Status: resolved
- Severity: medium
- Owner: Documentation
- Observed in: harmonizing the custom-authoring audit with compact transforms,
  resolved layouts, and optional D3 callables
- Friction: governing and marketing copy treated direct D3 implementation as
  the goal rather than interoperability. That contradicted smaller row-based
  utilities already justified by lineage, immutability, bundle isolation, or a
  clearer application contract, and made those useful primitives sound like
  architectural exceptions.
- Decision: govern on D3 compatibility and composition. Direct granular D3
  inputs and compact TanStack primitives are peers. Local utilities must state
  their supported semantics, determinism, lineage, and edge cases and must not
  claim exact D3 behavior. Where D3 already expresses an author-controlled
  algorithm choice, accept its callable shape without forcing authors through a
  string-only abstraction. Keep optional algorithms and convenience barrels
  independently tree-shakeable.
- Verification: the product charter, README, marketing, acknowledgements,
  scale guide, bundle guide, overview, and framework docs use the compatibility
  boundary. `createDotLayout`, eager Box and regression rows, callable treemap
  tilers and Sankey aligners, and named D3 force factories exercise both local
  and direct-D3 sides of the same grammar. Focused type/runtime tests and packed
  exact-subpath consumers pass without adding these algorithms to ordinary
  imports.

### F-252 — Catalog sidebar links duplicated case metadata

- Status: resolved
- Severity: medium
- Owner: Documentation/Tooling
- Observed in: aligning the Examples docs sidebar with the published chart
  catalog
- Friction: the docs navigation could list catalog detail routes, but the docs
  contract treated every navigation target as a local Markdown page. Manually
  copying more than one hundred case titles and routes into `docs/config.json`
  would also drift whenever catalog metadata changed.
- Decision: generate the collapsed individual-chart navigation group from each
  case's ordered `case.json` metadata during `docs:sync`. Keep chart-selection
  guides in their own group, exclude site-level navigation targets from the
  local-page inventory, and reject stale generated navigation in `docs:check`.
- Verification: the navigation generator validates unique case IDs and orders,
  emits one canonical catalog detail link per case, and reports the checked-in
  configuration as synchronized. The documentation helper regression proves
  site-level and external links do not become nonexistent Markdown paths.

### F-253 — Compact scales accepted structurally invalid domains and ranges

- Status: resolved
- Severity: high
- Owner: API
- Observed in: the public API harmonization audit
- Friction: linear domains and band ranges accepted arrays with missing or
  extra positions, then failed later through invalid mapping. Ordinal scales
  could also return `undefined` for an empty range while their callable type
  promised a range value.
- Decision: positional compact scales require exactly two finite values. The
  ordinal callable returns `TRange | undefined`, and configured color scales
  convert an absent output to the documented `currentColor` fallback.
- Verification: 45 focused scale regressions cover short, long, nonfinite,
  empty-range, unknown, and configured-color cases; root TypeScript passes.

### F-254 — View composition exposed a broader type than its runtime contract

- Status: resolved
- Severity: high
- Owner: API
- Observed in: composing responsive panels and host-owned extensions
- Friction: `composeViews` accepted any chart definition in TypeScript, then
  rejected tooltips, controls, host interaction, gradients, backgrounds, and
  guide motion only while compiling. It also rejected responsive children even
  though the layout had already allocated an exact frame.
- Decision: expose composable static, responsive, and union definition types.
  Reject embedded host ownership in exact authored types, retain runtime guards
  for widened JavaScript/TypeScript values, and resolve responsive children
  against their allocated frames with the outer platform theme.
- Verification: focused type and runtime regressions cover exact rejection,
  forged invalid values, frame-local responsive builders, scale links, and
  scene embedding.

### F-255 — Public reference inventories could drift from package exports

- Status: resolved
- Severity: medium
- Owner: Documentation/Tooling
- Observed in: adding the environment-neutral tooltip host model
- Friction: the documentation contract detected missing package exports but not
  stale import-map rows. Renames could therefore leave a documented subpath
  that no package published.
- Decision: verify the canonical import map in both directions against package
  export maps and classify entries as ordinary authoring, optional capability,
  or host/renderer extension surfaces.
- Verification: the docs contract rejects both missing and stale import-map
  entries and covers the tooltip model subpath and every newly exported symbol.

### F-256 — Shared host policy retained browser-only modules

- Status: resolved
- Severity: high
- Owner: API/Tooling
- Observed in: packed React Native declarations, Metro bundles, and retained-
  input bundle boundaries after extracting shared tooltip and mark-state policy
- Friction: the renderer-neutral tooltip model re-exported placement from a
  module that also read `HTMLElement` and `Document`. The shared mark-state
  resolver lived beside reduced-motion DOM inspection. React Native therefore
  inherited browser declarations and implementation inputs through APIs that
  were intended to be portable.
- Decision: isolate pure tooltip placement and mark-state resolution from DOM
  positioning and transition inspection. Publish explicit React Native export
  conditions for the shared cursor-host and tooltip-model subpaths, and classify
  the portable tooltip modules in retained-input policy.
- Verification: root TypeScript and focused tooltip/host tests pass. Packed
  declarations compile without DOM libraries, bare React Native and Expo Metro
  bundles resolve the new subpaths, and the package and bundle boundary gates
  pass.

### F-257 — The release package graph leaked into application setup

- Status: resolved
- Severity: medium
- Owner: API/Documentation/Tooling
- Observed in: migrating runnable documentation, examples, benchmarks, and
  packed consumers to one install surface
- Friction: applications had to install separate TanStack packages for the
  grammar, compact scales, and one framework adapter even though tree shaking
  depended on exact ESM entries rather than npm package count. Public package
  exports cannot target files in another package, framework peers cannot be
  scoped to individual subpaths, and Svelte, Angular, Octane, and React Native
  require distinct compiled output or export conditions. Angular's compiled
  tree also embeds its legacy package identity and workspace dependency.
- Decision: publish compact scales and every adapter from exact
  `@tanstack/charts/*` subpaths while retaining the existing packages for
  compatibility. Keep all framework peers optional on the unified manifest.
  Build each implementation with its native toolchain, copy its compiled tree
  into a namespaced core artifact, remove nested package manifests, and preserve
  the original condition order and `sideEffects: false` boundaries.
- Verification: active docs, examples, conformance cases, and bundle entries
  use only `@tanstack/charts` plus framework peers. The docs contract derives
  import validity from the unified export map. The packed gate installs only
  `@tanstack/charts`, resolves and bundles every new scale and adapter entry,
  rejects legacy runtime imports, nested package manifests, and cross-adapter
  retention, and passes bare React Native and Expo Metro. The full 1,756-test
  unit matrix, root TypeScript, package artifact, documentation, and bundle-size
  gates pass.
- Release evidence: release run `31340548562` built every `0.9.0` artifact but
  the new core-only consumer performed a second unlocked resolution. Its
  `@types/d3-geo` range selected `3.1.1` while the frozen workspace install had
  populated `3.1.0`, so the offline gate failed before npm publishing.
- Release decision: preserve public dependency ranges and the offline boundary.
  Derive fixture overrides from every packed core dependency, link them to the
  setup-populated core workspace, and give the fixture an isolated empty pnpm
  store so a missing override cannot pass from a developer cache.
- Release verification: the focused contract covers ranged and unscoped
  dependencies. All 12 `0.9.0` release artifacts pass with the unified fixture
  installing from its isolated store.

### F-258 — Tooltip chrome required specificity overrides

- Status: resolved
- Severity: medium
- Owner: API/Documentation
- Observed in: reproducing shadcn and Bklit dashboard cards in catalog cases
  120, 121, and 123
- Friction: the DOM tooltip applied its background, border, radius, shadow, and
  font as fixed inline declarations. A chart could attach a `className`, but a
  branded card had to use `!important` for ordinary surface theming even when
  all positioning and interaction behavior remained first party.
- Decision: retain inline layout and safe defaults while resolving tooltip
  chrome through inherited `--ts-chart-tooltip-*` CSS variables. Keep
  `className` for content-specific structure rather than as a specificity
  escape hatch.
- Verification: the runtime tooltip regression asserts variable-backed inline
  defaults; the active bar and donut cards set scoped variables without a
  stylesheet or `!important`; the styling guide documents the supported
  surface tokens. Focused unit tests, root TypeScript, and light/dark browser
  audits pass.

### F-259 — Chart resources cannot declare patterns

- Status: open
- Severity: medium
- Owner: API
- Observed in: the theme-treatment audit for catalog cases 120–124 and the
  Bklit-derived card references
- Friction: `ChartSpec.gradients` keeps CSS-variable linear gradients inside
  the renderer-neutral definition. The same resource model cannot declare a
  hatch, dot, or line pattern. An author must omit that treatment or leave the
  native definition and renderer resource boundary.
- Current decision: case 124 uses the same declared linear gradient across its
  palette treatments. Do not inject an application-owned SVG pattern as a
  catalog workaround. Keep a native pattern resource open until one contract
  covers SVG, Canvas, export, CSS-variable paint, and `idPrefix` scoping.

### F-260 — Static guides cannot express stroke treatment

- Status: open
- Severity: medium
- Owner: API
- Observed in: the themed area and active bar dashboard cases 120 and 121
- Friction: `grid` is a boolean, and the static axis line is a boolean. The
  theme can set one guide paint, but an author cannot set grid or axis stroke
  width, dash, or opacity. F-112 added dashes to rule marks, and F-191 added
  tick-label styling. Neither entry covers static axis and grid strokes.
- Current decision: keep the catalog cases on native solid grids with
  `theme.grid`. Use rule marks for styled annotations and `crosshair` for
  styled focus guides. Do not synthesize repeated grid rules in an application
  shell. Keep a guide-style object open for renderer, facet, export, and motion
  evaluation.

### F-261 — Cartesian bars cannot round only exposed corners

- Status: open
- Severity: medium
- Owner: API
- Observed in: the active bar dashboard case 121
- Friction: `barX` and `barY` accept one numeric `radius`, which becomes one SVG
  rectangle radius for all four corners. The reference treatment needs rounded
  value-end corners and square baseline corners. The current option cannot
  express that distinction or preserve it across negative and stacked bars.
- Current decision: keep case 121 on the native uniform radius. Do not replace
  bars with application paths. Keep endpoint or per-corner radii open until the
  contract accounts for orientation, sign, stack seams, focus geometry,
  motion, Canvas, and native output.

### F-262 — Mark inference accepted an unsupported style option

- Status: resolved
- Severity: medium
- Owner: API
- Observed in: hiding the unfocused dots in the themed area case 120
- Friction: `dot(rows, { opacity: 0 })` typechecked because the literal-
  preserving generic options overload accepts extra keys, but `DotOptions`
  does not own base `opacity` and the renderer silently ignored it. State
  styles do accept `opacity`, so the boundary was especially easy to misread.
- Decision: keep the distinct base style contracts and give public mark
  factories fixed-key contextual option signatures. Per-property const
  generics retain direct channel and named-scale inference, while fresh object
  literals receive normal TypeScript excess-property checks. Generic
  `Options` and `Options | undefined` forwarding wrappers remain assignable.
  Predeclared structural supersets remain accepted, which matches standard
  TypeScript behavior. The helpers are type-only and add no runtime code or
  bundle weight.
- Verification: `cartesian-scale-types.test.ts` infers named scale IDs across
  every Cartesian built-in factory and a polar mark, keeps reserved scale IDs
  for explicit `undefined`, and compiles whole-options and optional forwarding
  wrappers. Negative type checks reject fresh dot `opacity` and unknown keys
  on Cartesian, composite, and polar factories. The focused strict TypeScript
  compile and the full workspace `pnpm typecheck` pass.

### F-263 — Chromium transport and context churn interrupted catalog previews

- Status: resolved
- Severity: medium
- Owner: Tooling
- Observed in: release validation of all 115 light and dark catalog previews
- Friction: two clean generator starts failed at unrelated cases 29 and 84
  after each chart had rendered. On macOS, Chromium logged
  `ERR_NETWORK_IO_SUSPENDED` and `ERR_SOCKET_NOT_CONNECTED` for local Vite
  resource requests. Restarting the complete 230-navigation matrix only moved
  the infrastructure failure later in the run. A later clean run reached the
  SVG inspection step before Playwright reported that its execution context
  had been destroyed, despite the preview page having no post-load navigation.
- Decision: retry only those two Chromium transport errors and Playwright's
  exact execution-context-destroyed signature, once, after replacing the
  browser context. Keep every chart, protocol, and other console error
  non-retryable. Preserve both failures when the fresh attempt does not recover,
  so a deterministic reload still fails on its second attempt.
- Verification: the focused 13-test preview suite covers both exact transport
  codes, the exact context-destroyed signature, recovery, non-retryable chart
  failures, and retained repeated-failure evidence. A full browser-backed run
  generated all 115 previews in both themes without changing any SVG asset;
  only the source hash changed.

### F-264 — Drillable sunbursts required rebuilding hierarchy rows

- Status: resolved
- Severity: high
- Owner: API/Documentation
- Observed in: drillable Flare sunburst catalog case 126
- Friction: focusing a branch while limiting visible rings required the
  application to filter and re-parent flat rows, re-aggregate boundary values,
  and preserve canonical IDs manually. That duplicated hierarchy work already
  owned by the mark and made animated continuity depend on case preparation.
- Decision: add `rootId` and `visibleDepth` to the optional `sunburst` mark.
  The mark copies the selected hierarchy node as its structural layout root,
  retains the complete hierarchy for aggregation and internal-node metadata,
  and keeps canonical node keys across root changes. Application state still
  owns selection, breadcrumbs, and drill-up controls.
- Verification: focused mark tests cover relative depth, hidden descendant
  aggregation, stable keys, validation, and ring allocation. Case 126 passes
  the full flat Flare source directly, limits the displayed window in the mark,
  and verifies that one retained leaf path interpolates from the outer ring to
  the inner ring during a root update.

### F-265 — Sunburst motion lost hierarchy across enter and exit

- Status: resolved
- Severity: high
- Owner: API
- Observed in: drill-down and drill-up transitions in the Flare sunburst case
- Friction: stable keys animated nodes visible under both roots, but newly
  revealed descendants had no identity in common with their disappearing
  parent. Generic enter and exit opacity made a hierarchy change look
  intermittent even though the retained-node paths were moving.
- Decision: sunburst sectors carry an internal ancestry relationship into the
  motion scene. An entering descendant begins at the live geometry of its
  nearest disappearing ancestor, and an exiting descendant collapses into the
  live geometry of its nearest appearing ancestor. Unrelated nodes keep the
  normal enter and exit behavior, and reduced-motion updates still snap.
- Verification: case 126 asserts the initial, intermediate, and final path for
  retained descendants, drill-down entries, and drill-up exits. The live
  catalog case confirms the entering `cluster` sector begins in the departing
  `analytics` sector and separates over the authored tween.

### F-266 — Path-token motion distorted polar sectors

- Status: resolved
- Severity: high
- Owner: API/Tooling
- Observed in: retained, entering, and exiting arcs in the drillable Flare
  sunburst case
- Friction: generic SVG path interpolation paired numeric tokens from two `d`
  strings. Intermediate endpoints therefore left their common circles, making
  sectors skew around the chart even though both endpoint layouts were valid
  concentric arcs.
- Decision: optional marks may attach an opaque numeric geometry vector and a
  stable projector to a scene path. Sunburst supplies start angle, end angle,
  inner radius, and outer radius; motion interpolates those four values and the
  sunburst-owned projector regenerates a valid sector each frame. The shared
  contract contains no polar or D3 import, so ordinary motion consumers retain
  none of the hierarchy implementation.
- Verification: focused temporal tests measure every intermediate outer and
  inner endpoint against its declared radius for retained, entering, and
  exiting sectors. Interrupted transitions retain their live numeric state,
  reduced motion snaps, and retained-input bundle gates require only the small
  scene-motion contract while forbidding sunburst, hierarchy, polar-sector,
  d3-shape, and d3-path inputs from the isolated motion bundle.

### F-267 — Stress timeouts entered a class temporal dead zone

- Status: resolved
- Severity: high
- Owner: Tooling
- Observed in: release pull request stress partition 1
- Friction: the stress runner began its top-level browser workload before
  evaluating a later `CellTimeoutError` class declaration. When one cell
  reached the intended 120-second outer limit, the timeout callback threw a
  `ReferenceError` instead of returning the retryable timeout result, aborting
  the complete partition before its fresh-context retry.
- Decision: define the timeout error in an imported benchmark module. Module
  dependencies finish evaluation before the stress runner starts top-level
  work, so the timeout path cannot observe an uninitialized class.
- Verification: the focused timeout regression constructs the imported error
  with the expected prototype, name, and duration message. The retry suite,
  stress-runner syntax check, full repository validation, and rerun GitHub
  stress partition pass.

### F-268 — Animated arc flags became invalid fractional path values

- Status: resolved
- Severity: high
- Owner: API
- Observed in: GitHub issue #71 and the SVG reconciliation regression
- Friction: the default motion renderer interpolated every number in a path's
  `d` attribute. SVG arc flags are discrete `0` or `1` values, so a flag change
  produced invalid fractional flags and could hide an arc during its tween.
- Decision: identify the large-arc and sweep positions in every `A`/`a`
  command, snap those values to the target flag, and continue interpolating the
  remaining path geometry.
- Verification: the focused reconciliation test changes both flags while
  interpolating arc radii and endpoints, and asserts valid flags at the
  midpoint and exact target geometry at completion. A second regression covers
  the SVG grammar's adjacent `00` and `01` flag pairs. Bundle review attributes
  250 minified and 133–145 gzip bytes across the four locked DOM consumers to the
  shared correctness fix; the exact baselines and six complete-consumer
  ceilings record that reviewed cost.

### F-269 — Angular mounted its browser host during server rendering

- Status: resolved
- Severity: high
- Owner: API
- Observed in: GitHub issue #56 and Angular server-rendering regression
- Friction: `ngAfterViewInit` runs during Angular SSR, so the adapter mounted
  the DOM host against the server element and called browser-only measurement
  or mutation methods.
- Decision: keep synchronous SVG prerendering in the shared adapter and defer
  only browser-host mounting through Angular's `afterNextRender`, which does
  not run on the server.
- Verification: the official Angular `renderApplication` pipeline emits the
  complete labeled SVG without mounting the DOM host, while the existing
  browser test still covers mount, update, and destroy.

### F-270 — Catalog migration left generated release evidence stale

- Status: resolved
- Severity: high
- Owner: Tooling
- Observed in: release validation after the React catalog migration in #84
- Friction: the migration moved four application shells into React views and
  renamed the token-calendar shell to TSX without updating roadmap ownership
  or the audit link. It also changed catalog source inputs without refreshing
  preview provenance. Current `main` therefore failed both the unit and
  catalog-preview release gates.
- Decision: point roadmap ownership at the active `view.tsx` and `shell.tsx`
  files, repair the audit link, and regenerate catalog preview provenance.
- Verification: the focused roadmap test and catalog preview check pass. The
  only rendered asset change normalizes synchronized-cursor point keys from
  timestamp labels to the migrated ISO date labels; geometry is unchanged.

### F-271 — Radial focus collapsed angular cross-sections to centroids

- Status: resolved
- Severity: high
- Owner: API
- Observed in: radial tooltip interaction review
- Friction: polar lines, areas, and dots exposed only Cartesian centroid
  anchors to the default nearest-point resolver. Moving around one semantic
  angle could select a different radius or adjacent angle, and grouped radial
  tooltips had no equivalent of `group-x`. `radialArc` also emitted a centroid
  without attaching its already available painted boundary, so pie and donut
  focus could disagree with the visible slice.
- Decision: export `focusGroupAngle` from the exact polar subpath. It selects
  the nearest bounded radial ray, uses radius distance as the primary-point
  tie-breaker, groups one point per series at the same semantic angle, and
  orders keyboard tasks angularly. Keep the strategy out of ordinary and
  universal barrels. Attach the existing D3-replayed interaction boundary to
  every `radialArc`, including authored generators.
- Verification: focused polar tests resolve two series from a one-pixel
  angular ray while both anchors are farther away, preserve the closest radius
  as primary, and reduce keyboard navigation to one task per semantic angle.
  Arc tests hit the painted annulus at zero fallback distance, reject its hole,
  and reuse the exact point attached to the scene geometry. Polar, radial-bar,
  sunburst, callable-surface, documentation, and root TypeScript checks pass.
  The measured polar arc is 15.06 KiB gzip, gauge 24.08, radial labels 20.66,
  radial bars 24.17, and polar line/scatter 25.28; their isolated ceilings now
  record those reviewed interaction costs while the locked representative-mark
  bundle remains unchanged at 25.59 KiB gzip.

### F-272 — Pointer probes armed between transient inactive frames

- Status: resolved
- Severity: high
- Owner: Tooling
- Observed in: radial-focus release PR stress partition 3
- Friction: the Chart.js grouped-pointer cell moved outside the chart and
  accepted its first inactive frame as settled. Its activation timer then
  observed the tooltip active again and failed before measuring the target.
  The exact cell passed locally, confirming a scheduling race rather than a
  radial-focus regression, but the correctness failure was intentionally not
  retryable.
- Decision: require two consecutive inactive animation frames before arming
  pointer activation timing. Keep renderer and correctness failures
  non-retryable; this stabilizes the measured precondition instead of hiding a
  failed sample with another attempt.
- Verification: the exact Chart.js grouped-pointer cell and the complete quick
  partition 3 pass with trusted activation, exact grouped series values, and
  zero recovered retries.

### F-273 — Catalog cases could not declare an application viewport height

- Status: resolved
- Severity: low
- Owner: Tooling
- Observed in: reproducing shadcn/ui's dashboard as a renderer-comparison case
- Friction: the catalog fixed every case at 480 pixels tall, which clipped a
  full application shell and made its Recharts and TanStack renderers impossible
  to inspect as one shared viewport.
- Decision: allow validated case metadata to declare an optional height and use
  it for catalog cards, mounts, updates, and embeds while retaining 480 pixels
  as the default.
- Verification: metadata tests accept the dashboard's 860-pixel height, the
  conformance example build passes, and Chromium renders both comparison panels
  at 960 by 860 pixels without root overflow.

### F-274 — Upstream example clones had no drift boundary

- Status: resolved
- Severity: medium
- Owner: Tooling
- Observed in: spiking a maintained TanStack clone of the shadcn chart catalog
- Friction: an example's source URL recorded where it came from, but did not
  identify the exact upstream revision or detect changed, added, and removed
  examples. Visual clones could silently diverge from shadcn's 70-file catalog.
- Decision: pin the upstream commit, registry blob, and each example's Git blob
  SHA in one manifest. Keep normal validation offline and add an explicit remote
  drift command that compares the manifest with shadcn's current Git tree.
- Verification: the inventory test requires all 70 files, exact family counts,
  unique local mappings, and reports synthetic source changes, additions, and
  removals. The offline command verifies all five spike mappings.

### F-275 — Preview transparency validation rejected semantic IDs

- Status: resolved
- Severity: low
- Owner: Tooling
- Observed in: generating the shadcn radial-text catalog preview
- Friction: the preview validator searched the complete SVG string for
  `background:`. A valid semantic key such as `radial-background:object`
  therefore failed the transparent-background gate.
- Decision: detect an actual CSS `background` declaration after a rule or
  declaration boundary, without reserving ordinary chart IDs.
- Verification: the preview regression accepts the semantic background key and
  continues to reject an authored CSS background declaration.

### F-276 — Definition-shape coverage assumed a combined renderer module

- Status: resolved
- Severity: low
- Owner: Tooling
- Observed in: isolating TanStack and Recharts bundle graphs for the shadcn
  catalog spike
- Friction: the definition-shape gate scanned `tanstack.ts`, `view.tsx`, and
  `chart.ts`, but ignored a renderer-specific `tanstack-view.tsx`. Splitting the
  two implementations for honest bundle measurement made five valid static
  definitions disappear from coverage.
- Decision: include renderer-specific TanStack view modules in the definition
  scanner while retaining the existing entry and shared-view conventions.
- Verification: the shape gate finds all 122 definitions again: 117 static and
  five responsive.

### F-277 — Preview errors omitted the failing catalog case

- Status: resolved
- Severity: low
- Owner: Tooling
- Observed in: generating static previews for the 70-case shadcn collection
- Friction: the renderer's clipped-label diagnostic described the labels and
  bounds but omitted the case ID and theme. A full-catalog run therefore could
  not identify which new example needed a margin correction.
- Decision: wrap presentation-validation failures with the current case ID and
  theme while retaining the original error as the cause.
- Verification: the next full preview run reports any failed case directly.

### F-278 — Renderer conformance could validate two matching approximations

- Status: resolved
- Severity: high
- Owner: Tooling
- Observed in: expanding the shadcn chart collection from five measured cases
  to all 70 upstream examples
- Friction: geometry and paint checks compared TanStack Charts with a local
  Recharts implementation built from the same simplified family spec. Both
  renderers could agree while their card, data, layout, and variant behavior
  visibly differed from the official shadcn output. The later whole-card gate
  still allowed a wrong chart type to pass because white card pixels dominated
  the score.
- Decision: capture every official shadcn card at a fixed 640-pixel viewport
  and compare the complete TanStack card screenshot against that committed
  baseline. Require at least 90% pixel similarity and 70% similarity over the
  union of non-white pixels in a fixed chart region for every case; retain
  failed local and diff images for review.
- Verification: the full gate passes all 70 whole-card and chart-region checks.
  Whole-card similarity averages above 97%, and every chart-region score is
  above 75%. The earlier wrong radial-stacked implementation would fail at
  20.9%. The pinned inventory check also requires one baseline image per
  catalog entry and an ordered 70-case reference manifest.

### F-279 — Radial grids could not render authored fills

- Status: resolved
- Severity: medium
- Owner: API
- Observed in: reproducing shadcn's filled polygon and circle radar grids
- Friction: `RadialGridOptions` exposed only stroke styling and the renderer
  hard-coded every ring to `fill: none`. Shadcn's filled-grid variants therefore
  required a separate approximation instead of expressing their source grid.
- Decision: expose `fill` and `fillOpacity` on `RadialGridOptions` and forward
  both values to every generated ring.
- Verification: the polar scene test asserts an authored radial-grid fill and
  opacity, and the two filled shadcn radar variants pass the chart-foreground
  visual gate above 97%.

### F-280 — Chart motion did not reach HTML tooltips

- Status: resolved
- Severity: medium
- Owner: API
- Observed in: applying the shadcn spring preset to the complete chart catalog
- Friction: chart and mark motion animated renderer geometry, but the HTML
  tooltip was owned by a separate extension and appeared, moved, and vanished
  immediately. The first tooltip motion pass also restarted every move from the
  prior target instead of the spring's live position and velocity, so crossing
  points quickly produced visible jumps. Applying one motion policy therefore
  produced a visibly split interaction.
- Decision: let the optional `motion()` renderer attach an internal tooltip
  motion controller to the host. The tooltip inherits that renderer's fallback
  or a static chart-level transition, while `tooltip.motion` can override or
  disable it. Keep translation independent from presence motion, and retarget
  springs from their current sampled position and velocity. The public tooltip
  extension contract stays renderer-neutral.
- Verification: the renderer test asserts that a chart spring produces sampled
  tooltip keyframes, keeps the tooltip mounted until its exit completes, and
  preserves both visual position and travel direction across a mid-flight
  retarget. The tooltip-only bundle retains neither `motion.ts` nor `spring.ts`
  and measures 4.37 KiB gzip.

### F-281 — Bars could not express an authored outline

- Status: resolved
- Severity: medium
- Owner: API
- Observed in: reproducing shadcn's active-bar example
- Friction: `barX` and `barY` exposed fill paint but not base stroke paint. The
  selected Firefox bar therefore could not reproduce the upstream dashed
  outline without replacing the mark or abusing focus-state styling.
- Decision: expose visual `stroke` and `strokeDasharray` channels plus
  `strokeOpacity` and `strokeWidth` on both bar orientations.
- Verification: the bar scene test resolves per-datum outlines for horizontal
  and vertical bars, and the active-bar screenshot passes at 98% whole-card and
  97% chart-region similarity.

### F-282 — Collection actions followed the viewport instead of the card

- Status: resolved
- Severity: medium
- Owner: Application
- Observed in: browsing the two-column ShadCN collection
- Friction: every collection preview reserved the case's fixed conformance
  viewport height, while the rendered ShadCN card was often much shorter. The
  Code, Preview, and Original actions followed the reserved viewport rather
  than the visible card, leaving roughly 280 pixels of empty space and making
  the actions appear to belong to the next row.
- Decision: retain the full height as the chart's rendering input, then size
  the collection preview shell to the rendered card. Observe the card so the
  shell follows responsive height changes without coupling the gallery to
  per-case dimensions.
- Verification: the live Radar collection now measures each preview shell to
  its visible card and places the action row 14 pixels below it at both columns;
  resizing continues to refit through the card observer.

### F-283 — Interactive chart shells rendered inert controls

- Status: resolved
- Severity: high
- Owner: Application
- Observed in: the generated ShadCN area, bar, line, and pie interactive cases
- Friction: the catalog reproduced the controls visually with static `div`
  elements, but they had no input semantics or state. The pie month picker,
  area range picker, and desktop/mobile metric panels could not change their
  charts even though each case was explicitly named interactive.
- Decision: keep interaction state in the shared React example shell and
  rebuild the selected chart definition from that state. Use native select and
  button semantics, preserve the official labels and active treatment, and
  keep the four behaviors centralized rather than adding state code to every
  generated case.
- Verification: DOM regressions change the area range, both metric-series
  charts, and the active pie month and assert the plotted geometry or paint
  changes. Browser checks confirm the 7-day area path and ticks, mobile bar and
  line geometry and colors, and May pie slice, swatch, and center value.

### F-284 — Stagger timing required repeated callback arithmetic

- Status: resolved
- Severity: medium
- Owner: API
- Observed in: evaluating optional entrance staggering for stacked radial and
  pie compositions
- Friction: every definition had to repeat phase filters, role filters, index
  selection, and delay arithmetic. Combining that callback with an existing
  transition or rolling-path definition required another handwritten merge.
  An initial `composeMotion()` helper recovered composition but made ordinary
  timing objects unnecessarily indirect.
- Decision: allow `ChartMotionTiming.delay` to resolve from motion context and
  make `stagger()` return that single partial timing field. It composes through
  native object spread, whose order also defines conflict precedence. Export it
  from `/motion` for convenience and `/motion/definition` as an isolated
  policy-only entry.
- Verification: unit tests cover datum and series staggering, phase and role
  filters, offsets, invalid inputs, native spread, and field precedence. The
  isolated entry is 0.26 KiB gzip and retains neither the SVG motion renderer
  nor spring physics.

### F-285 — Absolute catalog links lost their docs navigation tab

- Status: resolved
- Severity: low
- Owner: Documentation
- Observed in: adding the ShadCN collection to the Charts docs navigation
- Friction: tanstack.com's fallback tab inference recognizes docs example
  paths, but an absolute `/charts/catalog/collections/shadcn` link contains no
  `examples` segment. The valid link was therefore assigned to Guides and
  disappeared while browsing the catalog's Examples tab.
- Decision: declare `tab: "examples"` on the collection link instead of relying
  on path inference for a non-docs route.
- Verification: the local tanstack.com collection route renders the
  `shadcn/ui Charts` sidebar item as active under Examples.

### F-286 — Browser imports treated raw JSON as a source module

- Status: resolved
- Severity: high
- Owner: Tooling
- Observed in: opening the published ShadCN area-interactive catalog example
- Friction: the example imported an extensionless JSON fixture through the
  catalog's revision-pinned esm.sh source prefix. esm.sh returned 404 because
  raw JSON was not a resolvable JavaScript entry, leaving the sandbox root
  empty while its status remained Running. The same fixture affected the area,
  bar, and line interactive examples.
- Decision: expose the fixture as a TypeScript module and validate every
  catalog demo-data import against a browser-loadable JavaScript or TypeScript
  source module. JSON and declaration-only files no longer satisfy the public
  example contract.
- Verification: the catalog contract validates all example imports, and the
  revision-pinned esm.sh URL for the fixture returns a JavaScript module that
  renders the production sandbox.

### F-287 — Motion renderers required definition type extraction

- Status: resolved
- Severity: medium
- Owner: API
- Observed in: making every catalog example show its authored chart before its
  React shell
- Friction: `motion()` fixed its datum and axis generics when the renderer was
  created, before `RendererChart` received the definition that already knew
  those types. Seventy generated examples therefore extracted three conditional
  types from the definition only to pass them back to `motion<...>()`.
- Decision: let the optional motion factory return a definition-agnostic
  renderer whose generic methods acquire chart types from the host. Preserve
  the explicit generic overload for low-level callers.
- Verification: the React type contract passes `motion()` directly beside a
  typed definition, all 188 catalog entries typecheck, and no public example
  contains a `motion<...>()` instantiation.

### F-288 — Generated examples exposed shared implementation scaffolding

- Status: resolved
- Severity: high
- Owner: Tooling
- Observed in: auditing the source shown for every catalog example
- Friction: generated ShadCN entries copied a complete shared stylesheet,
  repeated definition type aliases and null component branches, and wrapped
  the actual definition in another `defineChart()` call. Eighty-five older
  catalog entries also exposed a generated `definition()` →
  `createExampleChart()` chain. Seventy-nine public factories retained a
  generic `ExampleOptions` bag containing dimensions, preview flags, and other
  fields the authored definition never read. Merging tooltip behavior into the chart object
  during cleanup made callback datum inference fall back to `unknown`.
  Decorative guides also polluted the inferred interactive datum union even
  though they cannot own focus or tooltip points. The newly exercised
  `defineChart(responsiveFactory, behaviors)` path also exposed a runtime bug:
  the constructor spread the factory like an object and silently dropped it.
- Decision: make each case-local `example.tsx` and stylesheet authoritative,
  delete the 2,152-line shared ShadCN implementation and its source-extraction
  script, and limit generation to metadata and conformance adapters. Collapse
  every delegating definition factory into the public example factory, and
  keep `defineChart(chart, behaviors)` as one call with two inference phases.
  Raw static and responsive overloads infer the chart before behaviors, while
  `decorative()` contributes scale types but no interactive datum type.
  Preserve a responsive factory as the definition's `chart` callback when
  separate behaviors are supplied.
  Omit unused component branches, empty spreads, unused option fields, and
  unused CSS. Name the remaining definition-driving input `ChartOptions`. Keep
  conformance adapters and Recharts references outside the public import
  closure; interaction tests import the real examples directly.
- Verification: generation produces 70 entries whose public factory contains
  the authored definition, the catalog contract rejects nested or locally
  delegated definitions and validates 188 self-contained entries with a
  largest TypeScript closure of four files. The cleanup is idempotent after a
  fresh 70-case ShadCN metadata generation. A catalog-wide cleanup reduces all
  79 legacy option bags to the properties their definitions actually read and
  rejects the old `ExampleOptions` surface. The complete workspace typecheck, 1,877
  unit tests, packed-package checks, 188 generated preview checks, and 70/70
  ShadCN visual comparisons pass.

### F-289 — Catalog workbenches exposed runtime bootstrap files

- Status: resolved
- Severity: medium
- Owner: Tooling
- Observed in: opening Charts examples on tanstack.com
- Friction: `/__catalog.tsx` and `/index.html` are generated execution plumbing,
  but the workbench displayed both beside authored source. They were also
  retained as visible files after sharing an example.
- Decision: mark generated bootstrap paths as hidden example metadata. Keep
  them in the executable workspace while filtering them from initial-file
  selection, tabs, the file explorer, and shared-project views.
- Verification: tanstack.com catalog and shared-project contract tests preserve
  the hidden paths while confirming both bootstrap files remain runnable.

### F-290 — Public examples imported a private workspace package

- Status: resolved
- Severity: medium
- Owner: Tooling
- Observed in: opening all 188 catalog examples in the public workbench
- Friction: 163 entries displayed `@charts-poc/demo-data`, exposing an internal
  package name and requiring the host to understand a private convention.
- Decision: expose revision-pinned fixture subpaths through the stable
  `@tanstack/charts-data` catalog alias and reject private package imports from
  every public source closure.
- Verification: the catalog contract resolves every fixture subpath as a
  browser module and reports no `@charts-poc/` import in any public example.

### F-291 — Renderer capability injection depended on module identity

- Status: resolved
- Severity: high
- Owner: API/Tooling
- Observed in: hovering the published ShadCN multiple-bar catalog example
- Friction: tooltip motion was attached to the motion renderer through a
  module-local symbol. The catalog loaded `/motion` and `/react/tooltip` from
  separate esm.sh build namespaces, so each copy created a different symbol.
  The chart geometry animated, but the host could not discover or inject the
  renderer's tooltip motion controller.
- Decision: make renderer capabilities an explicit, versioned structural
  contract. The chart host creates the controller from
  `renderer.capabilities.tooltipMotion` and injects it into the tooltip
  extension context. Neither discovery nor consumption depends on shared
  module identity.
- Verification: the renderer regression supplies a structurally compatible
  tooltip-motion capability, then asserts controller creation, paint, hide,
  and destruction through the normal tooltip lifecycle. The existing spring
  inheritance and tooltip override tests continue to pass.

### F-292 — Fixed preview paints ignored the selected site theme

- Status: resolved
- Severity: medium
- Owner: Tooling
- Observed in: switching tanstack.com's generated catalog previews between
  light and dark mode
- Friction: the portable SVG media query followed the site's resolved
  `color-scheme`, but 86 of 188 previews contained only fixed authored paint.
  Their transparent chart pixels therefore remained identical while the card
  background changed, which made the previews look light-only.
- Decision: pair semantic catalog paints with their dark tokens in the preview
  generator. Preserve other authored hues while raising low-contrast paint to
  the 3:1 graphical threshold on the dark catalog surface; give already-valid
  fixed paint a small dark-foreground tint. Keep both palettes in one SVG so
  the site still serves one cacheable, revision-pinned asset per case.
- Verification: generator unit tests cover semantic pairs, low-contrast paint,
  fixed CSS-variable fallbacks, and theme-independent presentation checks.
  Preview integrity validates all 188 assets. A Chromium canvas audit compares
  transparent light and dark rasters and confirms that all 188 differ.
- Follow-up evidence: the deployed ShadCN collection changed its series palette,
  but retained labels and pie separators still referenced `--foreground`,
  `--muted-foreground`, `--background`, and `--muted`. Those variables are
  inherited in the live inline chart but were undefined inside the standalone
  preview document, so SVG fallback paint rendered the labels black in both
  themes.
- Follow-up decision: bind those ShadCN semantic tokens to the existing portable
  light/dark palette. Treat `--muted` as a surface and `--muted-foreground` as
  text instead of overloading one token for both roles.
- Follow-up verification: the generator contract covers all four tokens in both
  palettes, and regenerated ShadCN donut, radial, radar, and authored-label
  previews render readable dark text and theme-matched separators.

### F-293 - Root scale slots blocked named axes

- Status: resolved
- Severity: high
- Owner: API
- Observed in: auditing the claimed TanStack Charts gaps against ECharts,
  Observable Plot, and the existing React chart implementation
- Friction: one root `x` slot and one root `y` slot could not describe multiple
  unit-specific axes or bind different marks to independent scales. Polar marks
  repeated the same limitation with one `angle` and one `radius` slot. Adding a
  registry alone was not enough because composite marks could hide positional
  identity, named callbacks could not see the resolved polar registry, and a
  misspelled binding otherwise failed later with an undefined scale.
- Decision: make `scales` the canonical Cartesian and polar registry, reserve
  `x`, `y`, `angle`, and `radius` as readable defaults, and let marks bind to
  named entries. Each named scale declares its positional channel and guide
  side. Axes support all four sides and stack when they share one side. The
  pre-Alpha release kept the old root options temporarily and warned with exact
  migration instructions. The Alpha API removes those options, their runtime
  adapters, and their deprecated aliases. Preserve positional identity through
  composite channel namespacing and expose the public resolved polar registry
  to length callbacks.
- Verification: named scale, axis, grid, focus, facet, motion, composite, box,
  regression, polar, and type-contract regressions pass. Every TanStack Charts
  definition in examples, benchmarks, adapters, tests, and docs uses the
  canonical registry. Alpha residue checks find no root scale compatibility
  types, runtime fallback, warning, or deprecated public alias.

### F-294 - Automatic mark renderers imposed shared host plumbing

- Status: resolved
- Severity: high
- Owner: API
- Observed in: adding Canvas rendering for dense marks while retaining SVG
  guides, labels, focus, and accessibility
- Friction: renderer choice belonged to the whole chart, and every DOM adapter
  assumed one surface. A dense mark could not opt into Canvas without moving
  axes and labels too, while nested compositions, SSR adoption, focus updates,
  pointer geometry, and image export all depended on the original single-root
  contract.
- Decision: add a small universal renderer token to mark options and keep the
  DOM compositor contract in the DOM layer. The compositor preserves authored
  source order across nested SVG and Canvas layers, retains a default surface
  for existing adapter callbacks, rebuilds complete interaction geometry after
  focus presentation, and supports SSR, responsive updates, accessibility, and
  mixed image export without importing Canvas into SVG-only bundles.
- Verification: Canvas unit coverage includes nested ordering, remounting,
  focus-guide layers, and a second geometry-only pointer resolution after a
  mixed focus paint. The browser Canvas gate, packed declarations and runtime,
  React Native Metro gates, and framework package checks pass. Bundle boundary
  checks keep SVG-only entries free of Canvas and measure the opt-in mixed
  representative and React consumers at 35.68 KiB and 41.63 KiB gzip.

### F-295 - Line marks forced round endpoints

- Status: resolved
- Severity: medium
- Owner: API
- Observed in: migrating Rewardo's composed statistics chart from Recharts
- Friction: `lineY` and `lineX` exposed stroke width, opacity, dash pattern,
  and curve options, but hard-coded round caps and joins. Reproducing the
  previous Recharts line, which inherited SVG's butt cap, required replacing
  or patching rendered output.
- Decision: expose `lineCap` and `lineJoin` on the shared line options using
  the values from `SceneStyle`. Preserve round as the default for both options.
- Verification: public type tests bind both line APIs to the scene renderer's
  supported values. Scene, SVG, Canvas, motion, export, and React Native tests
  preserve configured values. The Rewardo chart can use `lineCap: 'butt'` on
  its existing pink `lineY` mark.

### F-296 - Axis titles could not carry authored typography or paint

- Status: resolved
- Severity: medium
- Owner: API
- Observed in: migrating Rewardo dashboard charts to TanStack Charts on the
  `experimental-tanstack-charts` branch and issue #93
- Friction: tick labels accepted font size, weight, and opacity, but
  `axis.label` accepted only text, offset, and motion. Rewardo's 14-pixel chart
  typography and foreground treatment therefore required a generated-node CSS
  override that Canvas and React Native could not honor.
- Decision: extend the existing axis-label object with `fontSize`,
  `fontWeight`, `fill`, and `opacity`. Keep the string form and every omitted
  object field on the existing defaults. Resolve the options into the shared
  scene label so automatic guide measurement and every renderer use one
  contract.
- Verification: scene layout covers configured typography, paint, default
  compatibility, automatic margins, and shared facet titles. SVG, Canvas,
  React Native, and motion tests exercise the same public definition. The
  composed weather catalog case uses independently styled titles on three y
  axes without renderer callbacks or CSS selectors. The reviewed shared-path
  delta is 169 minified bytes and 29 gzip bytes for the locked line plus static
  SVG consumer. A dedicated styled-title fixture adds 0.06 KiB gzip and no
  retained modules over that consumer.

### F-297 - Focus ring paint required generated SVG selectors

- Status: resolved
- Severity: medium
- Owner: API
- Observed in: Rewardo's TanStack Charts migration and issue #94
- Friction: the built-in primary-point ring exposed only a boolean definition
  option. Rewardo had to target `.ts-chart__focus-layer--default circle` to
  reduce the fixed 5-pixel radius, tying application styling to generated SVG
  structure and leaving Canvas and React Native without the same control.
- Decision: extend `focusRing` to accept a reusable `ChartFocusRingOptions`
  object with radius, stroke width, fill, and stroke. Preserve `true`, `false`,
  and every existing default. An omitted stroke keeps each point's resolved
  series color.
- Verification: scene, SVG, Canvas, and React Native tests cover configured
  geometry and paint, series-color fallback, keyboard focus, and hidden
  accessibility presentation. The catalog's pointer-tooltip case uses the
  object form, and the reference docs record the complete contract. Locked
  universal consumers add 65-79 minified bytes and 25-36 gzip bytes; the
  reviewed bundle baselines and budgets pass.
