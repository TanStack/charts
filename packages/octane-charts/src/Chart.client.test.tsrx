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
const broadFocusDefinition = defineChart(definition, {
	maxFocusDistance: 1_000,
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
				definition={broadFocusDefinition}
				width={480}
				height={260}
				ariaLabel="Revenue"
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
				.querySelector('[data-ts-focus-layer]')
				?.getAttribute('visibility'),
		).toBe('visible');

		await act(() => root.unmount());
	});

	it('composes an Octane tooltip body in the core-owned surface', async () => {
		const tooltipDefinition = defineChart(definition, {
			maxFocusDistance: 1_000,
			tooltip: {
				portal: true,
				content: () => ({
					title: 'January',
					rows: [{ label: 'Revenue', value: '$8', color: '#2563eb' }],
				}),
			},
		});
		const target = document.createElement('div');
		const root = createRoot(target);

		await act(() => root.render(
			<Chart
				definition={tooltipDefinition}
				width={480}
				height={260}
				ariaLabel="Revenue"
				renderTooltipBody={({ points, defaultBody, pinned, dismiss }) => (
					<div data-rich-tooltip="">
						{defaultBody}
						<span data-tooltip-point="">{points[0]?.datum.id}</span>
						<span data-tooltip-pinned="">{String(pinned)}</span>
						<Chart
							definition={definition}
							width={120}
							height={80}
							ariaLabel="Nested trend"
						/>
						<button type="button" onClick={dismiss}>Close</button>
					</div>
				)}
			/>,
		));

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

		const portal = document.querySelector('[data-ts-chart-tooltip-portal]');
		const body = portal?.querySelector('.ts-chart-tooltip__body');
		const nestedSvg = body?.querySelector('svg[aria-label="Nested trend"]');
		expect(portal).not.toBeNull();
		expect(body?.querySelector('[data-rich-tooltip]')).not.toBeNull();
		expect(body?.querySelector('.ts-chart-tooltip__title')?.textContent).toBe(
			'January',
		);
		expect(body?.querySelector('.ts-chart-tooltip__row')?.textContent).toBe(
			'Revenue$8',
		);
		expect(
			body?.querySelector('[data-tooltip-point]')?.textContent,
		).toBe('jan');
		expect(
			body?.querySelector('[data-tooltip-pinned]')?.textContent,
		).toBe('false');
		expect(nestedSvg).not.toBeNull();
		expect(body?.hasAttribute('inert')).toBe(true);
		expect(portal?.getAttribute('role')).toBe('status');

		await act(() => {
			svg.dispatchEvent(new MouseEvent('click', {
				bubbles: true,
				clientX: 52,
				clientY: 200,
			}));
		});

		expect(
			body?.querySelector('[data-tooltip-pinned]')?.textContent,
		).toBe('true');
		expect(body?.hasAttribute('inert')).toBe(false);
		expect(portal?.getAttribute('role')).toBe('dialog');
		expect(body?.querySelector('svg[aria-label="Nested trend"]')).toBe(
			nestedSvg,
		);

		await act(() => {
			body
				?.querySelector('button')
				?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
		});

		expect((portal as HTMLElement | null)?.hidden).toBe(true);
		expect(body?.querySelector('[data-rich-tooltip]')).toBeNull();

		await act(() => root.unmount());
		expect(document.querySelector('[data-ts-chart-tooltip-portal]')).toBeNull();
	});
});
