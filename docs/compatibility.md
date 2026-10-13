---
title: Stable Compatibility
description: The compatibility contract intended for TanStack Charts 1.0 and later.
---

This contract takes effect with TanStack Charts 1.0. Published 0.x releases
continue to follow the [Alpha policy](./stability.md).

## Versions and deprecations

The public Charts packages share one coordinated version. Patch releases fix
defects. Minor releases add compatible capabilities. Removing a supported API,
renaming an option, narrowing supported input, changing a documented default,
or dropping a supported framework or runtime requires a major release.

A deprecated API remains supported throughout its current major version.
Deprecations include a documented replacement and migration instructions.
Production bundles do not need to retain migration warnings to provide this
guarantee. A correctness fix may change an output that contradicted the
documented behavior; its release notes explain the correction.

## Public API

The package export map and documented authoring and extension contracts define
the supported surface. This includes custom marks, scales, interaction indexes,
renderers, and the scene types those extensions are documented to consume or
produce. Consumers can emit portable declarations for inferred chart definitions
and marks from installed packages.

Source paths, private modules, undocumented DOM selectors, incidental scene
nesting, generated keys, and exact serialized formatting are implementation
details. Documented key identity, paint order, datum ownership, interaction,
mount/update/destroy behavior, and SSR adoption are compatibility contracts.

New optional capabilities must preserve existing import boundaries. A consumer
that does not import a capability must not gain its dependencies. Per-entry
bundle gates and published measurements make this verifiable. Performance
regressions are treated as defects and are investigated with equivalent builds
and representative workloads.

## Frameworks, runtimes, and renderers

Supported peer ranges and runtime requirements are listed in
[Installation](./installation.md). A peer range does not promise identical
features across renderers. The SVG, Canvas, and custom renderer contracts and
their differences are documented in
[Rendering and Export](./reference/rendering-and-export.md).

Server-side scene compilation and SVG serialization do not require browser
globals. DOM mounting requires the documented browser APIs. Optional motion,
Canvas paths, image export, and framework hydration each retain their stated
requirements. Unsupported capabilities must fail clearly rather than silently
change their meaning.

Accessibility includes chart names and descriptions, documented keyboard
interaction, focus restoration, and reduced-motion behavior. Applications own
their surrounding controls, meaningful descriptions, and alternative data
presentations. See [Accessibility](./guides/accessibility.md).

## Experimental capabilities

An experimental capability is identified in its reference documentation before
release, with the supported scope and limitations. Its label is not permission
to change unrelated stable APIs. Breaking changes to the experimental surface
must include release notes and migration instructions.

React Native remains experimental until native-device validation proves the
documented interaction, accessibility, and rendering behavior. Its current
Metro, Expo, declaration, and component checks are described in
[Installation](./installation.md#react-native-and-expo).

Unreleased proposals, draft PRs, and feature requests do not form part of this
contract. A capability becomes supported when its implementation, public types,
documentation, and release verification agree.
