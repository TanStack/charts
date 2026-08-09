import { renderToString } from 'octane/server';
import { describe, expect, it } from 'vitest';
import { areaY, defineChart, lineY } from '@tanstack/charts';
import { renderChartSvgWithResources } from '@tanstack/charts/svg/resources';
import { Chart } from '@tanstack/charts/octane';
import { scaleLinear } from 'd3-scale';

const data = [
	{ id: 'jan', month: 1, value: 8 },
	{ id: 'feb', month: 2, value: 12 },
];
const definition = defineChart({
	marks: [
		lineY(data, {
			id: 'revenue',
			x: 'month',
			y: 'value',
			key: 'id',
		}),
	],
	x: { scale: scaleLinear().domain([1, 2]) },
	y: { scale: scaleLinear().domain([8, 12]) },
});

describe('Octane Chart adapter', () => {
	it('server-renders the complete shared SVG renderer output', () => {
		function ServerChart() {
			return <Chart
				definition={definition}
				width={480}
				height={260}
				ariaLabel="Revenue"
				ariaDescription="Monthly revenue"
			/>;
		}

		const { html } = renderToString(ServerChart);
		expect(html).toContain('class="ts-chart-host"');
		expect(html).toContain('class="ts-chart"');
		expect(html).toContain('aria-label="Revenue"');
		expect(html).toContain('<desc>Monthly revenue</desc>');
		expect(html).toContain('<path');
	});

	it('derives proportional initial geometry from an explicit width', () => {
		function ServerChart() {
			return <Chart
				definition={definition}
				width={900}
				initialWidth={480}
				aspectRatio={3}
				ariaLabel="Revenue"
			/>;
		}

		const { html } = renderToString(ServerChart);
		expect(html).toContain('viewBox="0 0 900 300"');
		expect(html).toContain('width:900px');
		expect(html).toContain('aspect-ratio:3');
	});

	it.each([0, -2, Number.NaN, Number.POSITIVE_INFINITY])(
		'falls back consistently for an invalid aspect ratio (%s)',
		aspectRatio => {
			function ServerChart() {
				return <Chart
					definition={definition}
					width={480}
					aspectRatio={aspectRatio}
					ariaLabel="Revenue"
				/>;
			}

			const { html } = renderToString(ServerChart);
			expect(html).toContain('viewBox="0 0 480 320"');
			expect(html).toContain('height:320px');
			expect(html).not.toContain('aspect-ratio');
		},
	);

	it('server-renders scoped SVG resource IDs', () => {
		const gradientDefinition = defineChart({
			marks: [areaY([1, 3, 2], { fill: 'url(#fill)' })],
			x: { scale: scaleLinear().domain([0, 2]) },
			y: { scale: scaleLinear().domain([0, 3]) },
			gradients: [{
				id: 'fill',
				stops: [
					{ offset: 0, color: 'red' },
					{ offset: 1, color: 'blue' },
				],
			}],
		});
		function ServerChart() {
			return <Chart
				definition={gradientDefinition}
				renderSvg={renderChartSvgWithResources}
				width={480}
				height={260}
				ariaLabel="Gradient"
			/>;
		}

		const { html } = renderToString(ServerChart);
		expect(html).toMatch(/id="ts-chart-[^"]+-fill"/);
		expect(html).toMatch(/fill="url\(#ts-chart-[^"]+-fill\)"/);
	});
});
