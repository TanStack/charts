import { useLayoutEffect, useMemo, useRef } from 'octane';
import {
	chartSizingStyle,
	createChartController,
} from '@plot-poc/host-core';
import type {
	ChartController,
	ChartControllerOptions,
} from '@plot-poc/host-core';
import type { ChartProps } from './types';

export function Chart<TData, TValue = unknown>(props: ChartProps<TData, TValue>) {
	const containerRef = useRef<HTMLDivElement | null>(null);
	const controllerRef = useRef<ChartController<TData, TValue> | null>(null);
	const lastAppliedOptions = useRef<ChartControllerOptions<TData, TValue> | null>(null);
	const controllerOptions = useMemo<ChartControllerOptions<TData, TValue>>(() => ({
		data: props.data,
		renderer: props.renderer,
		sizing: props.sizing,
		theme: props.theme ?? 'auto',
		initialSize: props.initialSize,
		onError: props.onError,
		onRender: props.onRender,
		onValueChange: props.onValueChange,
	}), [
		props.data,
		props.renderer,
		props.sizing,
		props.theme,
		props.initialSize,
		props.onError,
		props.onRender,
		props.onValueChange,
	]);

	useLayoutEffect(() => {
		const container = containerRef.current;
		if (!container) return;

		const controller = createChartController(container, controllerOptions);
		controllerRef.current = controller;
		lastAppliedOptions.current = controllerOptions;

		return () => {
			controller.destroy();
			controllerRef.current = null;
			lastAppliedOptions.current = null;
		};
	}, []);

	useLayoutEffect(() => {
		if (!controllerRef.current || lastAppliedOptions.current === controllerOptions) return;
		controllerRef.current.update(controllerOptions);
		lastAppliedOptions.current = controllerOptions;
	}, [controllerOptions]);

	return <div
		ref={containerRef}
		class={props.class ? `ts-plot ${props.class}` : 'ts-plot'}
		style={{
			...chartSizingStyle(props.sizing),
			...props.style,
		}}
		role="group"
		aria-label={props.ariaLabel}
		aria-description={props.ariaDescription}
		tabIndex={props.tabIndex}
	/>;
}
