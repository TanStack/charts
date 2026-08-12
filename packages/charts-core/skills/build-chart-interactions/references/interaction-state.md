# Interaction Ownership and State

## Primitive Matrix

| User task                          | Primitive                                       | Semantic state                          | Presentation                | Non-pointer requirement                  |
| ---------------------------------- | ----------------------------------------------- | --------------------------------------- | --------------------------- | ---------------------------------------- |
| Inspect nearest datum              | focus strategy                                  | chart focus point/group                 | focus ring, tooltip         | native point navigation                  |
| Compare series at one x/y          | `group-x` / `group-y` focus                     | focused group                           | grouped tooltip/crosshair   | same grouping by keyboard                |
| Compare radial series at one angle | `focusGroupAngle` from `@tanstack/charts/polar` | focused angular group                   | grouped tooltip             | one stop per semantic angle              |
| Mirror focused value               | `whenFocused`, focus guide, crosshair           | existing focus                          | authored or data-less guide | does not add a stop                      |
| Synchronize charts                 | `createChartCursor` + `cursorHost`              | shared semantic x/y and optional origin | local crosshair per chart   | programmatic/keyboard source retained    |
| Track arbitrary plot position      | free cursor / `continuousCursor`                | numeric/temporal position               | crosshair and labels        | pair with labeled inputs or status       |
| Select a datum                     | `keyedSelection`                                | stable datum key                        | `whenSelected` overlay      | Enter/Space and clear path               |
| Toggle series                      | `interactiveColorLegend`                        | visible color-domain values             | pressed legend controls     | native buttons                           |
| Choose one scale value             | `handleX`                                       | one semantic value                      | handle/control fallback     | labeled input or keyboard control        |
| Choose a range                     | `brushX`                                        | semantic domain                         | brush control/fallback      | application range controls when required |
| Navigate a window                  | `zoomX`                                         | semantic viewport domain                | pan/zoom host behavior      | buttons/inputs for critical navigation   |
| Show compact details               | built-in `tooltip`                              | current/pinned focus                    | native text surface         | focus and Escape/pin behavior            |
| Show rich details                  | adapter tooltip body                            | current/pinned focus                    | framework UI                | focus containment and action labels      |

## Controlled-State Contract

1. The behavior proposes the next complete semantic value.
2. The application accepts, rejects, clamps, persists, or broadcasts it.
3. The application rebuilds the definition with the accepted snapshot.
4. Stable controller, mark, and datum identities preserve focus through the update.

Do not treat a controlled signal as a subscription store. Do not let a DOM gesture own canonical scale domains.

## Focus Decision

| Question                                        | Choice                                          |
| ----------------------------------------------- | ----------------------------------------------- |
| One nearest painted point                       | default focus                                   |
| Prioritize one axis without grouping            | `nearest-x` / `nearest-y`                       |
| Compare every series at one x/y                 | `group-x` / `group-y`                           |
| Compare radial series at one angle              | `focusGroupAngle` from `@tanstack/charts/polar` |
| Snap through sparse points across empty plot    | explicitly infinite `maxFocusDistance`          |
| Empty space should clear inspection             | finite default distance                         |
| Paint one native guide at current focus         | `crosshair`                                     |
| Reveal authored geometry matching focused value | `whenFocused`                                   |
| Need a rule plus point identity                 | focus-guide mark, not a bare rule               |

## Verification Scenarios

- Pointer enter, move, leave, click/tap pin, and Escape/cancel.
- Keyboard forward/backward traversal, Enter/Space activation, and clear.
- Duplicate x values, duplicate keys, facets, and hidden series.
- Data reorder, removal of focused datum, and controlled-state rejection.
- Clipped/translated ancestors and portal cleanup.
- Resize or animation while focus is active.
- Multiple linked charts with missing local values.
- Static rendering and renderer-native fallback.

Source: `docs/guides/tooltips-and-focus.md`; `docs/guides/interactions-and-selections.md`; `docs/reference/focus-and-interaction.md`
