---
title: Alpha Stability
description: Understand what TanStack Charts Alpha versions promise, what may change, and how releases communicate breaking changes.
---

TanStack Charts is in Alpha. Packages use regular `0.x` versions on the normal
`latest` npm tag, without an `-alpha` suffix or separate release channel.

Alpha is ready for evaluation and early application integration. It is not a
stable API promise. Pin an exact version in production applications and test an
upgrade before changing that pin.

## Version contract

All public TanStack Charts packages move together as one fixed release group.

- Patch releases fix defects and do not intentionally remove or rename public
  APIs. A fix may correct rendering or interaction that was observably wrong.
- Minor releases may add features and may contain breaking API changes while
  the package major remains `0`.
- The project will publish a stable-release compatibility policy before `1.0`.

## Public surface

The public surface is the package export map and the APIs documented on this
site. Source files, internal modules, unexported types, generated scene details,
and undocumented behavior may change without a migration path.

Framework adapters share the same chart definition and release version. Their
runtime support and peer ranges are listed in
[Installation](./installation.md#framework-compatibility).

## Breaking changes

A breaking Alpha release must include a changeset, changelog entry, and concrete
migration instructions. We will use a development warning ahead of removal when
that warning is practical and useful, but Alpha does not promise a minimum
deprecation window.

Production bundles do not retain development migration warnings. Removed APIs
fail through TypeScript or an actionable runtime error instead of silently
falling back to an older interpretation.

## Report a regression

[Open a GitHub issue](https://github.com/TanStack/charts/issues/new/choose) with
the exact package version, framework, browser or native runtime, a minimal
reproduction, and the expected and actual result. A regression in a patch
release is treated as a defect against this policy.
