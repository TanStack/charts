import { act, createRoot, useState } from 'octane';
import { describe, expect, it, vi } from 'vitest';
import { defineChart, lineY } from '@tanstack/charts';
import type { ChartPoint } from '@tanstack/charts';
import { Chart } from '@tanstack/octane-charts';
import { scaleLinear } from 'd3-scale';

interface Datum {
	id: string;
	month: number;
	value: number;
}

const data: Datum[] = [
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

describe('Octane Chart adapter client', () => {
	it('renders a dynamic chart on mount', async () => {
		const dynamicDefinition = defineChart(
			() => ({
				marks: [
					lineY(data, {
						x: 'month',
						y: 'value',
						key: 'id',
					}),
				],
				x: { scale: scaleLinear().domain([1, 2]) },
				y: { scale: scaleLinear().domain([8, 12]) },
			}),
		);
		const target = document.createElement('div');
		const root = createRoot(target);

		await act(() => root.render(
			<Chart
				definition={dynamicDefinition}
				width={480}
				height={260}
				ariaLabel="Revenue"
			/>,
		));

		expect(target.querySelector('svg')).not.toBeNull();
		await act(() => root.unmount());
	});

	it('bridges pointer focus to the original datum', async () => {
		const target = document.createElement('div');
		const onFocusChange = vi.fn<(point: ChartPoint<Datum> | null) => void>();

		function ClientChart() {
			const [, setFocused] = useState<ChartPoint<Datum> | null>(null);
			return <Chart
				definition={definition}
				width={480}
				height={260}
				ariaLabel="Revenue"
				maxFocusDistance={1_000}
				onFocusChange={point => {
					onFocusChange(point);
					setFocused(point);
				}}
			/>;
		}

		const root = createRoot(target);
		await act(() => root.render(ClientChart));

		const svg = target.querySelector('svg');
		if (!svg) throw new Error('Expected an SVG chart');
		vi.spyOn(svg, 'getBoundingClientRect').mockReturnValue({
			x: 0,
			y: 0,
			top: 0,
			right: 480,
			bottom: 260,
			left: 0,
			width: 480,
			height: 260,
			toJSON: () => ({}),
		});

		await act(() => {
			svg.dispatchEvent(new MouseEvent('pointermove', {
				bubbles: true,
				clientX: 52,
				clientY: 200,
			}));
		});

		expect(onFocusChange).toHaveBeenCalled();
		expect(onFocusChange.mock.calls.at(-1)?.[0]?.datum).toBe(data[0]);
		expect(
			target
				.querySelector('[data-ts-chart-focus]')
				?.getAttribute('visibility'),
		).toBe('visible');

		await act(() => root.unmount());
	});
});
