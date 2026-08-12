# Extension Protocol Matrix

| Need                                          | Boundary                              | Must declare/own                                                     | Verify                                                   |
| --------------------------------------------- | ------------------------------------- | -------------------------------------------------------------------- | -------------------------------------------------------- |
| Reusable bundle of ordinary marks             | `compositeMark`                       | parent ID; unique child IDs; child paint/point order                 | namespaced keys, motion, no nested resolved layouts      |
| New geometry in existing scene model          | `createMark`                          | channels, stable ID, keyed nodes, optional points                    | domains, finite geometry, every renderer                 |
| Point value differs from scale values         | `createMarkWithScaleValues`           | separate point and scale generic contracts                           | guides/domains versus focus payload                      |
| Geometry revealed by focus but not targetable | `focusAnchors`                        | semantic match values and keyed target node                          | no extra keyboard/pointer point                          |
| Cursor-driven data-less presentation          | focus-guide mark                      | projection and resolve callback                                      | under/over placement and viewport translation            |
| Packing/collision/topology uses final pixels  | `resolveLayout`                       | initial positional channels; pure resolved layout                    | repeat evaluation, resize topology, margins              |
| Labels affect automatic margins               | `layoutLabels`                        | deterministic positioned label nodes                                 | repeated measurement and final render agreement          |
| Custom callable mapping                       | configured scale                      | domain behavior, copy, mapping, optional invert/ticks                | responsive range assignment and guide compatibility      |
| Context-aware mapping/legend                  | `ChartScale` / color/legend extension | responsive context and scene output                                  | domain/range semantics, layout reservation               |
| Alternative nearest-point lookup              | spatial index factory                 | return original points within requested distance                     | scene replacement and dense workloads                    |
| Different focus strategy                      | focus strategy                        | resolve/group/keyboard order                                         | pointer-keyboard equivalence                             |
| Reusable semantic gesture                     | chart control                         | controlled signal, fallback nodes, host control lifecycle            | unique IDs, capture/cancel/teardown/static fallback      |
| Different mounted surface                     | `ChartRenderer` / `ChartSurface`      | prerender, adopt/mount, paint, coordinate conversion, focus, cleanup | SSR shell, update, presentation points, destroy          |
| Different SVG serialization                   | SVG renderer                          | complete accessible scene/resources                                  | escaped text, gradients, clipping, IDs                   |
| Application-specific rich UI                  | host/application overlay              | semantic state and lifecycle                                         | positioning from scene/point, focus containment, cleanup |

## Custom Mark Invariants

- Initial channels declare every positional domain value.
- Resolved positional channels cannot retroactively re-domain x/y.
- Scene nodes and interaction points have deterministic keys.
- Geometry is finite and local to translated groups.
- Interaction points preserve original datum and semantic x/y values.
- Decorative geometry emits no points.
- `resolveLayout` and `layoutLabels` are synchronous, pure, and repeatable.
- Rendering uses supplied resolved scales and bounds, not parallel range math.
- No private imports, DOM access, suppressed type errors, or renderer assumptions.

## Renderer Invariants

- Deterministic server shell or markup.
- Compatible client adoption.
- Scene and focus paint are separable.
- `clientToScene` exists when pointer controls require coordinate conversion.
- Presentation-point subscriptions exist when animation moves hit targets.
- Renderer replacement and destroy release every resource.
- Host retains sizing, runtime, keyboard, tooltip, selection, and focus-strategy ownership.

Source: `docs/guides/custom-marks-and-renderers.md`; `docs/reference/custom-extensions.md`
