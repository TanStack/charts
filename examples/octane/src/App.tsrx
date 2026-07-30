import { useState } from 'octane';
import {
	bodyMassDistributionRenderer,
	downloadData,
	downloadsRenderer,
	penguinData,
} from '@plot-poc/fixtures';
import type { DownloadsRow } from '@plot-poc/fixtures';
import { Chart } from '@plot-poc/octane-host';
import type { ChartRenderMetrics } from '@plot-poc/host-core';

export function App() {
	const [theme, setTheme] = useState<'light' | 'dark'>('light');
	const [selected, setSelected] = useState<DownloadsRow | undefined>(undefined);
	const [trendRender, setTrendRender] = useState<ChartRenderMetrics | undefined>(undefined);
	const selectedLabel = selected
		? `${selected.date.toLocaleDateString()}: ${selected.downloads.toLocaleString()}`
		: 'Point at the line to inspect a day.';
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
						<h2>@observablehq/cars downloads</h2>
						<p class="chart-card__meta">{selectedLabel}</p>
					</div>
					<span class="chart-card__badge">{renderLabel}</span>
				</div>
				<Chart
					data={downloadData}
					renderer={downloadsRenderer}
					sizing={{ height: 330 }}
					initialSize={{ width: 760, height: 330 }}
					ariaLabel="Daily @observablehq/cars downloads"
					onValueChange={setSelected}
					onRender={setTrendRender}
				/>
			</section>

			<section class="chart-card">
				<div class="chart-card__header">
					<div>
						<h2>Penguin body mass</h2>
						<p class="chart-card__meta">
							Facets reflow vertically when their container becomes narrow.
						</p>
					</div>
					<span class="chart-card__badge">Plot transform + facets</span>
				</div>
				<Chart
					data={penguinData}
					renderer={bodyMassDistributionRenderer}
					sizing={{ height: 360 }}
					initialSize={{ width: 760, height: 360 }}
					ariaLabel="Penguin body-mass distributions by species"
				/>
			</section>
		</div>
	</main>;
}
