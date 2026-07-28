import { useState } from 'octane';
import {
	downloadData,
	downloadsRenderer,
	latencyData,
	latencyDistributionRenderer,
} from '@plot-poc/fixtures';
import type { DownloadPoint } from '@plot-poc/fixtures';
import { Chart } from '@plot-poc/octane-host';
import type { ChartRenderMetrics } from '@plot-poc/host-core';

export function App() {
	const [theme, setTheme] = useState<'light' | 'dark'>('light');
	const [selected, setSelected] = useState<DownloadPoint | undefined>(undefined);
	const [trendRender, setTrendRender] = useState<ChartRenderMetrics | undefined>(undefined);
	const selectedLabel = selected
		? `${selected.package}: ${selected.downloads.toLocaleString()}`
		: 'Point at a series to inspect its value.';
	const renderLabel = trendRender
		? `${trendRender.duration.toFixed(1)}ms render`
		: 'Measuring';

	const toggleTheme = () => {
		const nextTheme = theme === 'light' ? 'dark' : 'light';
		document.documentElement.dataset.theme = nextTheme;
		setTheme(nextTheme);
	};

	return <main class="demo">
		<header class="demo__header">
			<div>
				<p class="demo__eyebrow">Octane proof</p>
				<h1>Observable Plot, application ready.</h1>
				<p class="demo__lede">
					One shared definition model with container sizing, inherited themes,
					and application-facing interaction state.
				</p>
			</div>
			<button class="theme-toggle" type="button" onClick={toggleTheme}>
				Use {theme === 'light' ? 'dark' : 'light'} mode
			</button>
		</header>

		<div class="demo__grid">
			<section class="chart-card">
				<div class="chart-card__header">
					<div>
						<h2>Package momentum</h2>
						<p class="chart-card__meta">{selectedLabel}</p>
					</div>
					<span class="chart-card__badge">{renderLabel}</span>
				</div>
				<Chart
					data={downloadData}
					renderer={downloadsRenderer}
					sizing={{ height: 330 }}
					initialSize={{ width: 760, height: 330 }}
					ariaLabel="TanStack package download trends"
					onValueChange={setSelected}
					onRender={setTrendRender}
				/>
			</section>

			<section class="chart-card">
				<div class="chart-card__header">
					<div>
						<h2>Latency shape by plan</h2>
						<p class="chart-card__meta">
							Facets reflow vertically when their container becomes narrow.
						</p>
					</div>
					<span class="chart-card__badge">Plot transform + facets</span>
				</div>
				<Chart
					data={latencyData}
					renderer={latencyDistributionRenderer}
					sizing={{ height: 360 }}
					initialSize={{ width: 760, height: 360 }}
					ariaLabel="Request latency distributions by plan"
				/>
			</section>
		</div>
	</main>;
}

