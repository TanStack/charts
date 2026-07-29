# Acknowledgements

## Grammar of Graphics

TanStack Charts builds on the grammar-of-graphics tradition established by
[Leland Wilkinson](https://doi.org/10.1007/0-387-28695-0) and developed through
projects such as [ggplot2](https://ggplot2.tidyverse.org/) and
[Vega-Lite](https://vega.github.io/vega-lite/). Their work made composable
visualization grammars practical across statistical computing, declarative
specifications, and the web.

## Observable Plot

TanStack Charts would not exist in its current form without
[Observable Plot](https://observablehq.com/plot/). Plot demonstrated how a
small grammar of composable marks and channels can turn arbitrary data into
clear, layered visualizations without a fixed catalog of chart types. That
model is the closest API inspiration for TanStack Charts.

TanStack Charts is an independent implementation, not a Plot fork or
compatibility layer. It applies those ideas to typed application
infrastructure with explicit D3 primitives, responsive scene compilation,
framework adapters, SVG SSR and hydration, keyed updates, accessibility,
animation, export, and capability-level bundle boundaries.

With gratitude to [Mike Bostock](https://github.com/mbostock), the Observable
team, and Plot's contributors for advancing the practice of visualization on
the web.

## AI-assisted implementation

TanStack Charts was implemented almost entirely with AI coding agents under
Tanner Linsley's direct supervision. Tanner personally defined the product,
architecture, API design, constraints, tradeoffs, and acceptance criteria, and
reviewed the work that entered the repository.

## D3

[D3](https://d3js.org/) is the authoritative algorithm layer. TanStack Charts
uses its published packages for scales, arrays, shapes, and other focused
capabilities instead of reimplementing that work.

## Reference implementations

The conformance and comparison suites exercise published versions of
Observable Plot, Recharts, Apache ECharts, Chart.js, and D3 as development
references.

TanStack Charts is licensed under [MIT](./LICENSE).
