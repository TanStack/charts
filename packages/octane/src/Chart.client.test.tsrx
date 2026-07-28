import { act, createRoot, useState } from 'octane';
import { describe, expect, it, vi } from 'vitest';
import { Chart } from '@plot-poc/octane-host';
import { Plot } from '@plot-poc/octane-host/observable';
import { definePlot } from '@plot-poc/observable';
import type { ChartRenderer } from '@plot-poc/host-core';

describe('Octane Chart client', () => {
	it('mounts through the shared controller and cleans up', async () => {
		const target = document.createElement('div');
		const destroy = vi.fn();
		const renderer: ChartRenderer<string[]> = vi.fn(() => ({
			element: document.createElement('svg'),
			destroy,
		}));

		function ClientChart() {
			return <Chart
				data={['one']}
				renderer={renderer}
				sizing={{ height: 240 }}
				initialSize={{ width: 480, height: 240 }}
				ariaLabel="Client chart"
			/>;
		}

		const root = createRoot(target);
		await act(() => root.render(ClientChart));

		expect(target.querySelectorAll('.ts-plot')).toHaveLength(1);
		expect(target.querySelectorAll('svg')).toHaveLength(1);
		expect(renderer).toHaveBeenCalled();

		await act(() => root.unmount());
		expect(destroy).toHaveBeenCalled();
		expect(target.childElementCount).toBe(0);
	});

	it('updates dynamic Plot input without replacing its stateful surface', async () => {
		const target = document.createElement('div');
		const prepare = vi.fn((input: { value: number }) => input.value);
		const definition = definePlot<{ value: number }, unknown, number>({
			prepare,
			plot: ({ prepared }) => ({
				ariaLabel: `Value ${prepared}`,
				marks: [],
			}),
		});

		let setValue: ((value: number) => void) | undefined;
		function ClientPlot() {
			const [value, updateValue] = useState(1);
			setValue = updateValue;
			return <Plot
				definition={definition}
				input={{ value }}
				sizing={{ height: 240 }}
				initialSize={{ width: 480, height: 240 }}
				ariaLabel="Client dynamic plot"
			/>;
		}

		const root = createRoot(target);
		await act(() => root.render(ClientPlot));
		const surface = target.querySelector('.ts-plot__surface');
		expect(surface).not.toBeNull();
		expect(prepare).toHaveBeenCalledOnce();

		await act(() => setValue?.(2));
		await new Promise((resolve) => setTimeout(resolve, 24));
		expect(prepare).toHaveBeenCalledTimes(2);
		expect(target.querySelector('.ts-plot__surface')).toBe(surface);

		await act(() => root.unmount());
	});
});
