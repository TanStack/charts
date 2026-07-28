import { useMemo } from 'octane';
import { createPlotRenderer } from '@plot-poc/observable';
import { Chart } from './Chart.tsrx';
import type { PlotProps } from './types';

export function Plot<TInput, TValue = unknown, TPrepared = TInput>(
	props: PlotProps<TInput, TValue, TPrepared>,
) {
	const renderer = useMemo(
		() => createPlotRenderer(props.definition),
		[props.definition],
	);

	return <Chart
		data={props.input}
		renderer={renderer}
		sizing={props.sizing}
		theme={props.theme}
		initialSize={props.initialSize}
		ariaLabel={props.ariaLabel}
		ariaDescription={props.ariaDescription}
		class={props.class}
		style={props.style}
		tabIndex={props.tabIndex}
		onError={props.onError}
		onRender={props.onRender}
		onValueChange={props.onValueChange}
	/>;
}
