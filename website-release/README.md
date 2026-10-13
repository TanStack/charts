# Charts 1.0 website staging

The website changes are retained in `tanstack-charts-1.0.patch`. They are not
applied to the website checkout or deployed. `git apply --check` succeeds
against `/Users/tannerlinsley/GitHub/tanstack.com`, whose unrelated uncommitted
work remains untouched.

The staged source is `/private/tmp/charts-website-1-ready.NSlnCx`, archived
from the website's committed HEAD with its own frozen dependency installation.
The patch removes the Charts alpha badge, selects v1, links the compatibility
contract and migration guide, preserves the experimental React Native label,
corrects the compact-scale React line claim to 32.1 decimal gzip kB, and adds
a draft announcement and deployment handoff.

The existing competitor graphic remains an explicitly labeled August 2026
snapshot. Its historical 29 kB number is not represented as a 1.0 measurement.
The current 32.1 kB claim rounds the verified 32.091 kB production ESM entry,
with React external, not an application's total bundle.

Both full website test batches passed typechecking, lint, and 503 tests,
with two skipped. Content generation and formatting also passed. The final
full test batch includes the final copy and draft announcement; its log is
retained in `/private/tmp/charts-website-launch-final-tests.log`.

Chromium validates the actual page at desktop and mobile sizes, with HTTP 200,
v1 metadata, both release links, corrected size copy, no horizontal overflow,
and no page errors. A rendered copy audit moved the new compatibility text
inside the existing section padding, without adding a new section or heading.
Viewport screenshots are `/private/tmp/charts-website-launch-desktop.png` and
`/private/tmp/charts-website-launch-mobile.png`.

Before website deployment, verify published 1.0 packages and provenance, update
the site's locked Charts dependency from 0.16.1 to 1.0, regenerate landing SVGs
with the existing generator, and validate the live demos and docs links against
the published artifacts. Set the announcement's actual publication date before
removing `draft: true`. Decide the historical v0 docs Git ref before offering v0
in the selector. Neither npm publication nor website deployment is authorized
by this staging work.
