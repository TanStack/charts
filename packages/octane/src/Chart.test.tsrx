import { describe, expect, it, vi } from 'vitest';
import { renderToString } from 'octane/server';
import { Chart } from '@plot-poc/octane-host';
import { Plot } from '@plot-poc/octane-host/observable';
import { definePlot } from '@plot-poc/observable';
import type { ChartRenderer } from '@plot-poc/host-core';

describe('Octane Chart', () => {
	it('server-renders the same stable, labeled host contract as React', () => {
		const renderer: ChartRenderer<never[]> = vi.fn(() => {
			throw new Error('The client renderer must not run during SSR.');
		});

		function ServerChart() {
			return <Chart
				data={[]}
				renderer={renderer}
				sizing={{ height: 280 }}
				initialSize={{ width: 640, height: 280 }}
				ariaLabel="Server chart"
			/>;
		}

		const { html } = renderToString(ServerChart);
		expect(html).toContain('class="ts-plot"');
		expect(html).toContain('aria-label="Server chart"');
		expect(html).toContain('min-height:280px');
		expect(renderer).not.toHaveBeenCalled();
	});

	it('server-renders a dynamic Plot host without preparing client output', () => {
		const prepare = vi.fn((input: { value: number }) => input.value);
		const definition = definePlot<{ value: number }, unknown, number>({
			prepare,
			plot: () => ({ marks: [] }),
		});

		function ServerPlot() {
			return <Plot
				definition={definition}
				input={{ value: 1 }}
				sizing={{ height: 280 }}
				initialSize={{ width: 640, height: 280 }}
				ariaLabel="Server dynamic plot"
			/>;
		}

		const { html } = renderToString(ServerPlot);
		expect(html).toContain('class="ts-plot"');
		expect(html).toContain('aria-label="Server dynamic plot"');
		expect(prepare).not.toHaveBeenCalled();
	});
});
