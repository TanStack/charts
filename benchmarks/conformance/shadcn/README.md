# shadcn chart mirror

`catalog.json` pins the canonical 70-example shadcn chart catalog by commit and
Git blob SHA. A `localCaseId` means that upstream example has a TanStack Charts
comparison case in `../cases`.

```sh
pnpm shadcn:catalog:check
pnpm shadcn:catalog:upstream
```

The first command is offline and validates the complete inventory plus all 70
local mappings. The second compares the pinned blobs with shadcn's current
`main` tree and reports changed, added, and removed paths.

Run `pnpm shadcn:catalog:generate` after adding an upstream manifest entry. It
assigns a stable case ID and writes the metadata plus thin TanStack and Recharts
entry modules. Existing generated IDs remain stable.

The catalog uses seven shared family implementations, shared pinned data, and a
shared shadcn card shell. Thin `recharts.ts` and `tanstack.ts` entry points keep
each example addressable and the measured bundle graphs isolated. The five
original spike cases remain standalone parity fixtures.

Run any reviewed family slice through the quick parity profile with:

```sh
pnpm conformance:quick -- --case=128-shadcn-bar-multiple,129-shadcn-pie-donut-text,130-shadcn-radar-multiple,131-shadcn-radial-text,132-shadcn-tooltip-advanced
```
