# API Reference

For specifics on the exact types of these components/functions/values, please check the implementation. Adding autogenerated documentation is tracked by [#26](https://github.com/palantir/react-layered-chart/issues/26).

## Table of Contents

* [Core](#core)
  * [`Stack`](#stack)
  * [`ChartProvider`](#chartprovider)
  * [`MouseCapture`](#mousecapture)
* [Layers](#layers)
  * [Data Layers](#data-layers)
  * [`PollingResizingCanvasLayer`](#pollingresizingcanvaslayer)
  * [`InteractionCaptureLayer`](#interactioncapturelayer)
  * [`ConnectedResizeSentinelLayer`](#connectedresizesentinellayer)
* [Axes](#axes)
  * [`XAxis`](#xaxis)
  * [`YAxis`](#yaxis)
* [State Management](#state-management)
  * [`ChartProviderState`](#chartproviderstate)
  * [Selectors](#selectors)
  * [Action Creators](#action-creators)
* [Utilities](#utilities)
  * [Decorators](#decorators)
    * [`NonReactRender`](#nonreactrender)
    * [`PixelRatioContext`](#pixelratiocontext)
    * [`PixelRatioContextProvider`](#pixelratiocontextprovider)
  * [Functions](#functions)
    * [`chainLoaders(...loaders)`](#chainloadersloaders)
    * [`createSelectDataForHover(xValueIterator)`](#createselectdataforhoverxvalueiterator)
    * [`wrapWithAnimatedYDomain(ComponentClass)`](#wrapwithanimatedydomaincomponentclass)
    * [`getIndexBoundsForPointData(data, interval, xValuePath)`](#getindexboundsforpointdatadata-interval-xvaluepath)
    * [`getIndexBoundsForSpanData(data, interval, minXValuePath, maxXValuePath)`](#getindexboundsforspandatadata-interval-minxvaluepath-maxxvaluepath)
    * [`computeTicks(scale, ticks?, tickFormat?)`](#computeticksscale-ticks-tickformat)
    * [`enforceIntervalBounds(interval, bounds)`](#enforceintervalboundsinterval-bounds)
    * [`enforceIntervalExtent(interval, minExtent, maxExtent)`](#enforceintervalextentinterval-minextent-maxextent)
    * [`intervalExtent(interval)`](#intervalextentinterval)
    * [`extendInterval(interval, factor)`](#extendintervalinterval-factor)
    * [`roundInterval(interval)`](#roundintervalinterval)
    * [`niceInterval(interval)`](#niceintervalinterval)
    * [`mergeIntervals(intervals, defaultInterval)`](#mergeintervalsintervals-defaultinterval)
    * [`intervalContains(maybeLargerInterval, maybeSmallerInterval)`](#intervalcontainsmaybelargerinterval-maybesmallerinterval)
    * [`panInterval(interval, delta)`](#panintervalinterval-delta)
    * [`zoomInterval(interval, factor, anchorBias?)`](#zoomintervalinterval-factor-anchorbias)
  * [Constants](#constants)
  * [Testing](#testing)
    * [`CanvasContextSpy`](#canvascontextspy)

## Core

### `Stack`

`Stack`s are the basic unit of layout. Any direct children will be automatically styled and sized to overlay on one another, stacking in the Z direction and matching in vertical/horizontal dimensions. `Stack`s may be freely nested.

#### Props

- `className?`: space-separated DOM class names to be merged with the default class names.
- `pixelRatio?`: the desired pixel density of this chart. See [`window.devicePixelRatio`](https://developer.mozilla.org/en-US/docs/Web/API/Window/devicePixelRatio). Performance may suffer with higher values. This value is not transparently applied and must be explicitly respected by any contained `Layer`s (the built-in ones all do).

<hr/>

### `ChartProvider`

`ChartProvider` is the parent of all state-managed layers in react-layered-chart. It creates almost no DOM of its own, but is instead a wrapper around react-redux's [`Provider`](https://github.com/reactjs/react-redux/blob/master/docs/api.md#provider-store) that mediates between its own props and state that is automatically loaded/computed.

#### Required Props

- `seriesIds`: a list of all the series that are present in this chart. IDs are arbitrary and must be unique within a single `ChartProvider`. Series IDs not present here will be silently ignored.
- `loadData`: a _stateless_ function to load the appropriate data for all series. Called whenever `ChartProvider` needs new data. This is where you should do caching or other loading optimizations. Avoid using an inline definition, as that creates a new function object, and data must be reloaded whenever `loadData` changes. See also `loadDataContext` and `loadDataDebounceTimeout`.

#### Optional Props

- `className?`: space-separated DOM class names to be merged with the default class names.
- `pixelRatio?`: the desired pixel density of this chart. See [`window.devicePixelRatio`](https://developer.mozilla.org/en-US/docs/Web/API/Window/devicePixelRatio). Performance may suffer with higher values. This value is not transparently applied and must be explicitly respected by any contained `Layer`s (the built-in ones all do). If specified here, you do not need to specify this value on any contained `Stack`s.
- `chartId?`: an arbitrary, globally-unique ID for the state of this chart that maintains a reference across mount/unmount cycles.
- `defaultState?`: UI state to seed the internal store with. This value is only respected once, at initialization time.
- `onLoadStateChange?`: called with the load states of all series whenever any one of them changes.
- `onError?`: called with the error state of all series whenever any one of them changes.
- `includeResizeSentinel?`: if `false`, prevents the automatic addition of a `ConnectedResizeSentinelLayer`. Use this option if you have layouts or styles that cause the included sentinel layer to incorrectly report the physical chart size. Be sure to replace it with your own `ConnectedResizeSentinelLayer`, otherwise your chart won't render with the correct dimensions!
- `loadDataContext?`: an arbitrary value passed as-is to `loadData`. All data is reloaded any time this value changes shallowly. You should use this prop to pass along necessary metadata to `loadData` rather than using `Function#bind` or other mechanisms which create new `Function` instances.
- `loadDataDebounceTimeout?`: debounce interval in milliseconds for calling `loadData` (default `1000`). Use lower numbers if your requests are cheap/fast and higher numbers if they aren't.
- `debugStoreHooks?`: an object of `{ middlewares?: Function[], enhancers?: Function[] }` to attach debug tools to the underlying Redux store. **Note:** action types are represented as numbers; use `getActionTypeName` to translate it to a string if necessary.

#### Controlled Props

These props come in read-write pairs and implement the ["controlled component" pattern](https://facebook.github.io/react/docs/forms.html#controlled-components). The "value" props unconditionally trump any values set by default/`loadData`/action creators. The "on change" props are called any time `loadData` or an action creator attempts a change. You can provide any subset of these parameters; providing a "value" prop doesn't imply you need an "on change" prop, nor vice versa.

- `xDomain?`
- `onXDomainChange?()`
- `yDomains?`
- `onYDomainsChange?()`
- `selection?`
- `onSelectionChange?()`
- `hover?`
- `onHoverChange?()`

### `MouseCapture`

`MouseCapture` is a component that wraps another and interprets mouse gestures at a slightly higher level. All the gesture callbacks return a pair of `xPct` and `yPct` parameters (among others), which is the position of the event as a percentage of the `MouseCapture`'s width/height, relative to the top-left corner.

**Note**: `xPct` and `yPct` are generally values on `[0, 1]`, though they could be outside these bounds if you have unconventional styles like widths greater than 100% or negative margins.

**Note**: none of the events interpreted by this component will have `stopPropagation` or `preventDefault` called on them automatically; your handlers should call these if appropriate.

#### Props

- `className?`: space-separated DOM class names to be merged with the default class names.
- `zoomSpeed?`: a `number` or function `React.WheelEvent => number` to compute the speed of the zoom gesture. Defaults to `0.05`.
- `onZoom?(factor, xPct, yPct, event)`: the user wants to zoom with the mouse wheel.
- `onDragStart?(xPct, yPct, event)`: the user has initiated a drag action. Note that only the left mouse button is respected.
- `onDrag?(xPct, yPct, event)`: the user is continuing a drag action. Note that only the left mouse button is respected.
- `onDragEnd?(xPct, yPct, event)`: the user finished a drag action. Note that only the left mouse button is respected.
- `onClick?(xPct, yPct, event)`: the user clicked on this element. A "click" in this context is interpreted as a mouse-up-mouse-down pair where the mouse moved very little or nothing between the events.
- `onHover?(xPct?, yPct?, event)`: the user moved the mouse over this element. `xPct` and `yPct` will be `undefined` if the mouse has left the element.

## Layers

To see some layers in action, check out the example page.

### Data Layers

These components render different types of visualizations for data. They all follow the same basic pattern of accepting props for:

- the data they are to render; usually, an array named `data`
- `xDomain`, which describes what horizontal domain they're currently covering so they can render the appropriate subset of data
- usually `yDomain`, which describes what vertical domain they're currently covering so they can render the data in the appropriate visual location

And some combination of `color`, `font`, `yScale` or other display-related props.

The layers in this category are:

- `BarLayer`
- `BucketedLineLayer`
- `HoverLineLayer`
- `PointLayer`
- `LineLayer`
- `SpanLayer`

Additionally, these layers have "connected" variants that replace the `xDomain`, `yDomain` and `data` (or analogous) props with a `seriesId` prop that specifies which data they should read. These layers must be inside a `ChartProvider` to work correctly:

- `ConnectedBarLayer`
- `ConnectedBucketedLineLayer`
- `ConnectedHoverLineLayer`
- `ConnectedPointLayer`
- `ConnectedLineLayer`
- `ConnectedSpanLayer`
- `ConnectedSelectionBrushLayer`

<hr/>


### `PollingResizingCanvasLayer`

A component that wraps and exposes a `<canvas>` that (via polling) matches the size of its containing `Stack`. This class does no rendering of its own, but provides a well-behaved blank canvas for a parent component to draw on. All built-in data-rendering layers are based on this component in combination with the `NonReactRender` decorator.

#### Props

- `onSizeChange()`: a function called with no arguments when the size changes, usually, some kind of render method.
- `pixelRatio?`: the pixel ratio this `<canvas>` should render at. See [`Stack`](#stack) for more on this value.

#### Instance Methods

- `getCanvasElement()`: returns the `<canvas>` element for this layer.
- `getDimensions()`: returns the true `{ width, height }` of this layer.
- `resetCanvas()`: clears and resizes the underlying `<canvas>` in preparation for a rendering frame. Returns `{ width, height, context }`.

<hr/>

### `InteractionCaptureLayer`

This layer displays nothing, but captures all mouse events and translates them into callbacks or (in the case of the "connected" variant) fires actions.

**Note**: this layer will call `stopPropagation` or `preventDefault` (or both) as appropriate _only_ on native events that have relevant handlers. All other events will be allowed to propagate as normal.

#### Props

- `xDomain`: specifies the X domain this layer currently covers so it can translate mouse positions to logical values.
- `shouldZoom?(event)`: a callback that accepts a `MouseEvent` and returns a boolean specifying if this event should be used for zooming.
- `shouldPan?(event)`: a callback that accepts a `MouseEvent` and returns a boolean specifying if this event constitutes the beginning of a pan gesture.
- `shouldBrush?(event)`: a callback that accepts a `MouseEvent` and returns a boolean specifying if this event constitutes the beginning of a brush (selection) gesture.
- `onZoom?(factor, anchorBias)`: fired when the user performs a legal zoom gesture. See `zoomInterval` for an explanation of the parameters.
- `onPan?(logicalUnits)`: fired when the user moves their mouse during a legal pan gesture.
- `onBrush?(logicalUnitInterval?)`: fired when the user moves their mouse during a legal brush gesture. Called with `undefined` if the selection is cleared.
- `onHover?(logicalPosition)`: fired when the user hovers over the chart.
- `zoomSpeed?`: a constant factor to adjust the sensitivity of the zooming gesture for different scroll velocities.

#### `ConnectedInteractionCaptureLayer` Props

This variant of the layer replaces the callbacks with simple `true`/`false` settings to enable different types of gestures. The interpreted results are automatically fired as actions on containing `ChartProvider`.

- `enablePan?`: whether or not to fire events for pan gestures. Default `false`.
- `enableZoom?`: whether or not to fire events for zoom gestures. Default `false`.
- `enableHover?`: whether or not to fire events for hover gestures. Default `false`.
- `enableBrush?`: whether or not to fire events for brush gestures. Default `false`.
- `shouldZoom?()`: same as above.
- `shouldPan?()`: same as above.
- `shouldBrush?()`: same as above.
- `zoomSpeed?`: same as above.

<hr/>

### `ConnectedResizeSentinelLayer`

This layer accepts no props. It polls itself to determine its size, and fires and action on the containing `ChartProvider` whenever it changes. This value is used to determine what density to load data at. An instance of this layer is auto-injected into every `ChartProvider`; you shouldn't need to make your own unless styling or layout rules make the default placement of the layer compute incorrect values, which is rare. If you do define your own, note that you only need one instance.

## Axes

### `XAxis`

This component renders a domain horizontally. In order to use multiple X axes at once without them stacking, or to overlay one or more X axes on the main chart area, wrap it in a `div` and adjust the position CSS rules.

#### Props

- `xDomain`: the `Interval` to render for this axis.
- `scale?`: a [d3-scale](https://github.com/d3/d3-scale) constructor function. Only continuous scales are supported. Defaults to `scaleTime`.
- `ticks?`: passed through to [`computeTicks`](#computeticksscale-ticks-tickformat).
- `tickFormat?`: passed through to [`computeTicks`](#computeticksscale-ticks-tickformat).
- `color?`: a string specifying the color to use for ticks and labels.

There is a `ConnectedXAxis` that accepts the same props, except without `xDomain`.

<hr/>

### `YAxis`

This component renders a domain vertically. In order to use multiple Y axes at once without them stacking, or to overlay one or more Y axes on the main chart area, wrap it in a `div` and adjust the position CSS rules.

#### Props

- `yDomain`: the `Interval` to render for this axis.
- `scale?`: a [d3-scale](https://github.com/d3/d3-scale) constructor function. Only continuous scales are supported. Defaults to `scaleLinear`.
- `ticks?`: passed through to [`computeTicks`](#computeticksscale-ticks-tickformat).
- `tickFormat?`: passed through to [`computeTicks`](#computeticksscale-ticks-tickformat).
- `color?`: a string specifying the color to use for ticks and labels.

There is a `ConnectedYAxis` that accepts the same props, except with `seriesId` in place of `yDomain`.

## State Management

### `ChartProviderState`

An opaque type that represents all of the internal chart state. You should not read from this type directly, but instead use the provided selectors and action creators to read and write to it, respectively.

<hr/>

### Selectors

These [selectors](https://github.com/reactjs/reselect) take the entire `ChartProviderState` and return one facet of the state. Several of them are counterparts to the "controlled props" on `ChartProvider`.

- `selectXDomain(state)`
- `selectYDomains(state)`
- `selectHover(state)`
- `selectSelection(state)`
- `selectData(state)`
- `selectIsLoading(state)`
- `selectErrors(state)`
- `selectChartPixelWidth(state)`

You can use these in a [`connect`](https://github.com/reactjs/react-redux/blob/master/docs/api.md#connectmapstatetoprops-mapdispatchtoprops-mergeprops-options)ed component like so (assuming the component will be used inside a `ChartProvider`):

```tsx
import { connect } from 'react-redux';
import { selectXDomain, ChartProviderState } from 'react-layered-chart';

class ExampleComponent extends React.Component<...> {
  render() {
    return <div>{this.props.xDomain}</div>;
  }
}

function mapStateToProps(state: ChartProviderState) {
  return {
    xDomain: selectXDomain(state)
  };
}

export default connect(mapStateToProps)(ExampleComponent);
```

<hr/>

### Action Creators

These action creators are analogous to some of the "controlled props" on `ChartProvider`. They are intended to be used with [`connect`](https://github.com/reactjs/react-redux/blob/master/docs/api.md#connectmapstatetoprops-mapdispatchtoprops-mergeprops-options) and, optionally, [`bindActionCreators`](http://redux.js.org/docs/api/bindActionCreators.html). Values set with action creators are preferred over defaults or values returned from `loadData`, but `ChartProvider`'s controlled props are preferred over all.

- `setXDomain(domain)`
- `setYDomains(domains)`
- `setHover(hover)`
- `setSelection(selection)`

You can use these in a [`connect`](https://github.com/reactjs/react-redux/blob/master/docs/api.md#connectmapstatetoprops-mapdispatchtoprops-mergeprops-options)ed component like so (assuming the component will be used inside a `ChartProvider`):

```tsx
import { Dispatch, bindActionCreators } from 'redux';
import { connect } from 'react-redux';
import { setXDomain } from 'react-layered-chart';

class ExampleComponent extends React.Component<...> {
  render() {
    return <div onClick={() => this.props.setXDomain(...)}/>;
  }
}

function mapDispatchToProps(dispatch: Dispatch) {
  return bindActionCreators({ setXDomain }, dispatch);
}

export default connect(null, mapDispatchToProps)(ExampleComponent);
```

## Utilities

### Decorators

#### `NonReactRender`

A class decorator that defers rendering work until the next [animation frame](https://developer.mozilla.org/en-US/docs/Web/API/window/requestAnimationFrame). Useful primarily for expensive rendering that cannot be represented in the virtual DOM, such as when rendering to a `<canvas>`. You must define a method named `nonReactRender` that does the actual work of rendering.

You can access a mixin version at `NonReactRenderMixin`.

```tsx
import { NonReactRender } from 'react-layered-chart';

@NonReactRender
class ExampleComponent extends React.Component<...> {
  render() {
    return <canvas ref='canvas'/>;
  }

  nonReactRender() {
    const canvas = this.refs['canvas'];
    // Do the actual rendering work.
  }
}
```

<hr/>

#### `PixelRatioContext`

A class decorator to allow a class to receive a context value called `pixelRatio` that specifies the pixel density for this chart. See [`Stack`](#stack) for more on this value. This context value only exists when the class is inside a `Stack` or `ChartProvider`.

You can access a mixin version at `PixelRatioContextMixin`.

```tsx
import { PixelRatioContext, PixelRatioContextType } from 'react-layered-chart';

@PixelRatioContext
class ExampleComponent extends React.Component<...> {
  // For Typescript usage, you have to specify the type of the context field like so.
  context: PixelRatioContextType;

  render() {
    return <div>{this.context.pixelRatio}</div>;
  }
}
```

<hr/>

#### `PixelRatioContextProvider`

A class decorator to allow a class to provide a context value called `pixelRatio` that specified the pixel density for this chart. See [`Stack`](#stack) for more on this value. Because `Stack` and `ChartProvider` already have this behavior, you do not generally need to use this decorator. The initial value to provide on the context is read out of a prop named `pixelRatio`. If you nest multiple classes with this decorator, children will receive the value from their most immediate ancestor that specifies a `pixelRatio` prop.

You can access a mixin version at `PixelRatioContextProviderMixin`.

```tsx
import { PixelRatioContextProvider } from 'react-layered-chart';

interface Props {
  pixelRatio?: number;
}

@PixelRatioContextProvider
class ExampleParentComponent extends React.Component<Props, ...> { ... }
```

### Functions

#### `chainLoaders(...loaders)`

Chain multiple `DataLoader`s into one, serially. Each loader receives identical arguments, except that the list of requested series IDs will only include those IDs that have not already been handled by an earlier loader. Each loader should include map entries only for those series it understands and leave others absent, `undefined` or `null`. Any series IDs left over after all loaders have been run will be automatically mapped to a rejected promise.

**Note that this function is variadic.**

```ts
import { chainLoaders } from 'react-layered-chart';

function loadFirstSeriesOnly(seriesIds, ...) {
  const firstSeriesId = seriesIds[0];
  return {
    [firstSeriesId]: Promise.resolve([])
  };
}

chainLoaders(loadFirstSeriesOnly, loadFirstSeriesOnly)([ 'a', 'b', 'c' ], ...);
// -> { a: <resolved promise>, b: <resolved promise>, c: <rejected promise> }
```

<hr/>

#### `createSelectDataForHover(xValueIterator)`

Create a [selector](https://github.com/reactjs/reselect) that will select the currently-hovered data point according to the scheme specified by `xValueIterator`. `xValueIterator` is a function that takes `(seriesId, datum)` and returns whatever numerical value should be used to order this particular datum in the X dimension. The created selector, when invoked with a `ChartProviderState`, then returns the data point for each series immediately preceding the current hover location according to this scheme.

```tsx
import { createSelectDataForHover } from 'react-layered-chart';

function xValueIterator(seriesId, datum) {
  // Optionally inspect some external data source using `seriesId` to see how to interpret `datum`.
  return datum.someXValue;
}

const selectDataForHover = createSelectDataForHover(xValueIterator);

selectDataForHover(chartProviderState);
// -> { 'my-series-id': someDatum }
```

<hr/>

#### `wrapWithAnimatedYDomain(ComponentClass)`

Wrap the given `Component` in a new class that automatically animates the `yDomain` prop whenever it changes. Only works with `yDomain`. Animations are implemented with [react-motion](https://github.com/chenglou/react-motion).

```tsx
import { wrapWithAnimatedYDomain } from 'react-layered-chart';

interface Props {
  yDomain: Interval;
}

class ExampleComponent extends React.Component<Props, ...> {
  render() {
    return <div>{this.props.yDomain}</div>;
  }
}

export default wrapWithAnimatedYDomain(ExampleComponent);

```

<hr/>

#### `getIndexBoundsForPointData(data, interval, xValueAccessor)`

Efficiently computes which span of indices in `data` intersect `interval`. Each item in `data` should have a single representative X value. `xValueAccessor` may be a dot-separated string specifying the path to the value or a function from datum to value. `data` **must be sorted**, ascending, by the same metric that `xValueAccessor` uses.

**Note**: because this function is generally intended as a helper to make rendering more efficient, it includes items just beyond the ends of the interval as well so halfway-visible data will still be rendered.

```tsx
const data = [
  {
    value: 10,
    metadata: { timestamp: 15 }
  },
  ...
]

getIndexBoundsForPointData(
  data,
  { min: 0, max: 1000 },
  'metadata.timestamp'
);
// -> { firstIndex: 0, lastIndex: ... }

getIndexBoundsForPointData(
  data,
  { min: 0, max: 1000 },
  datum => datum.metadata.timestamp + 10
);
// -> { firstIndex: 0, lastIndex: ... }
```

<hr/>

#### `getIndexBoundsForSpanData(data, interval, minXValueAccessor, maxXValueAccessor)`

Efficiently computes which span of indices in `data` intersect `interval`. Each item in `data` should have distinct minimum and maximum X values. `minXValueAccessor` and `maxXValueAccessor` may be dot-separated strings specifying the path to the value or functions from datum to value. `data` **must be sorted**, ascending, by the same metric that `minXValueAccessor` uses.

**Note**: because this function is generally intended as a helper to make rendering more efficient, it includes items just beyond the ends of the interval as well so halfway-visible data will still be rendered.

```tsx
const data = [
  {
    value: 10,
    timeInterval: { from: 0, to: 47 }
  },
  ...
]

getIndexBoundsForSpanData(
  data,
  { min: 0, max: 1000 },
  'timeInterval.from',
  'timeInterval.to'
);
// -> { firstIndex: 0, lastIndex: ... }

getIndexBoundsForSpanData(
  data,
  { min: 0, max: 1000 },
  datum => datum.timeInterval.from - 10,
  datum => datum.timeInterval.to + 10
);
// -> { firstIndex: 0, lastIndex: ... }
```

<hr/>

#### `computeTicks(scale, ticks?, tickFormat?)`

Compute the appropriate tick values and tick formatter for the given [d3-scale](https://github.com/d3/d3-scale) instance and configuration parameters. Returns `{ ticks: number[], format: (number) => string }`.

`ticks` may take the following types:

- `number` or absent: it will be passed to [d3-scale's `ticks`](https://github.com/d3/d3-scale#continuous_ticks) to pick approximately that many ticks
- `function`: it will be given the domain of the provided scale as `{ min, max }` and should return an array of numbers (returned as-is) or a number (passed to [d3-scale's `ticks`](https://github.com/d3/d3-scale#continuous_ticks))
- `array`: assumed to be an array of numbers and will be used as-is

`tickFormat` may take the following types:

- `string` or absent: it will be passed to [d3-scale's `tickFormat`](https://github.com/d3/d3-scale#continuous_tickFormat) to generate a formatter
- `function`: assumed to be a function from number to string and will be passed back as-is

```tsx
import * as d3Scale from 'd3-scale';

const scale = d3Scale.scaleLinear()
  .domain([ 0, 100 ])
  .range([ 20, 40 ]);

computeTicks(scale);
// -> { ticks: [ 0, 20, 40, 60, 80, 100 ], format: Function }

computeTicks(scale, [ 1, 10, 100 ]);
// -> { ticks: [ 1, 10, 100 ], format: Function }

computeTicks(scale, 2, '.5');
// -> { ticks: [ 0, 50, 100 ], format: Function }
```

<hr/>

#### `enforceIntervalBounds(interval, bounds?)`

Adjust `interval` to fit within `bounds` if possible, without changing the length of `interval`. If `interval` is longer than `bounds`, the extent is maintained and `interval` is adjusted to have the same center as `bounds`. If `bounds` is `null` or `undefined`, the input interval will be returned unchanged.

```tsx
enforceIntervalBounds({ min: -10, max: 10 }, { min: 0, max: 100 });
// -> { min: 0, max: 20 }

enforceIntervalBounds({ min: 0, max: 120 }, { min: 0, max: 100 });
// -> { min: -10, max: 110 }

enforceIntervalBounds({ min: 0, max: 100 }, null);
// -> { min: 0, max: 100 }
```

<hr/>

#### `enforceIntervalExtent(interval, minExtent?, maxExtent?)`

Adjust `interval` so its extent (length) is between `minExtent` and `maxExtent`. If adjusted, the new interval will be centered on the same point as the input interval. If either extent is `null` or `undefined`, it will be ignored.

```tsx
enforceIntervalExtent({ min: 0, max: 100 }, 20, 80);
// -> { min: 10, max: 90 }

enforceIntervalExtent({ min: 0, max: 100 }, 120, 200);
// -> { min: -10, max: 110 }

enforceIntervalExtent({ min: 0, max: 100 }, null, null);
// -> { min: 0, max: 100 }
```

<hr/>

#### `intervalExtent(interval)`

Compute the extent (length) of the given interval. Does not check if your interval is specified backwards, and may return a negative value.

```tsx
intervalExtent({ min: 0, max: 10 });
// -> 10

intervalExtent({ min: 10, max: 0 });
// -> -10
```

<hr/>

#### `extendInterval(interval, factor)`

Extends `interval` on each end by `length of interval * factor`.

```tsx
extendInterval({ min: 0, max: 100 }, 0.1);
// -> { min: -10, max: 110 }
```

<hr/>

#### `roundInterval(interval)`

Rounds each endpoint of `interval` to the nearest integer.

```tsx
roundInterval({ min: 0.4, max: 1.7 });
// -> { min: 0, max: 2 }
```

<hr/>

#### `niceInterval(interval)`

Uses [d3-scale's `nice`](https://github.com/d3/d3-scale#continuous_nice) to round the endpoints of `interval` to nicer values.

```tsx
niceInterval({ min: 34, max: 1454 });
// -> { min: 0, max: 1600 }
```

<hr/>

#### `mergeIntervals(intervals, defaultInterval?)`

Returns a interval that covers all the provided intervals. Returns `defaultInterval` if no intervals are given and `undefined` if `defaultInterval` is not given either.

```tsx
mergeIntervals([ { min: 0, max: 50 }, { min: -10, max: 35 } ]);
// -> { min: -10, max: 50 }

mergeIntervals([], { min: 0, max: 1 });
// -> { min: 0, max: 1 }

mergeIntervals([]);
// -> null
```

<hr/>

#### `intervalContains(maybeLargerInterval, maybeSmallerInterval)`

Returns `true` if `maybeLargerInterval` contains `maybeSmallerInterval`, `false` otherwise.

```tsx
intervalContains({ min: 0, max: 100 }, { min: 0, max: 50 })
// -> true

intervalContains({ min: 0, max: 100 }, { min: -50, max: 10 })
// -> false
```

<hr/>

#### `panInterval(interval, delta)`

Shift both endpoints of the interval over by the specified amount.

```tsx
panInterval({ min: 0, max: 100 }, 10);
// -> { min: 10, max: 110 }
```

<hr/>

#### `zoomInterval(interval, factor, anchorBias?)`

Zoom the given interval in/out by the specified factor. `factor > 1` zooms in, `factor < 1` zooms out. If provided, `anchorBias` should be a value on `[0, 1]` that specifies where the focus of the zoom is, where 0 means to hold the minimum value constant (therefore moving only the maximum value to perform the requested zoom) and 1 vice-versa.

```tsx
zoomInterval({ min: 0, max: 100 }, 2);
// -> { min: 25, max: 75 }

zoomInterval({ min: 0, max: 100 }, 2, 0);
// -> { min: 0, max: 50 }
```

<hr/>

### Constants

- `DEFAULT_X_DOMAIN`
- `DEFAULT_Y_DOMAIN`

### Testing

#### `CanvasContextSpy`

A minimal mock class that mimics the `CanvasRenderingContext2D` interface. An instance of this class will capture all property sets and method calls and allow you to make assertions about it. Using this class helps avoid needing a DOM or a non-browser Canvas implementation and is often sufficient for testing (as Canvas rendering is simply a series of imperative property sets and method calls).

Note that this class does _not_ support reading properties or returning values from method calls. It only intercepts sets/calls and stores the values/arguments that were provided.

Because Canvas-based rendering is entirely outside the cycle of the React rendering flow, you may want to export a stateless function to render the Canvas in addition to your component so you can import it for testing.

`CanvasContextSpy` has the following fields and methods in addition to the `CanvasRenderingContext2D` ones:

- `calls`: an array of `{ method, arguments }` objects in the order the methods were called
- `properties`: an array of `{ property, value }` objects in the order the properties were set
- `operations`: a mixed array of `{ method, arguments }` and `{ property, value }` objects in the order the methods were called/properties were set
- `callsOmit(...methodNames)`: like `calls`, but excludes the specified method names
- `callsOnly(...methodNames)`: like `calls`, but includes only the specified method names

Given a class that uses Canvas to render:

```tsx
import { NonReactRender } from 'react-layered-chart';

interface Props { ... }

@NonReactRender
export default class ExampleComponent extends React.Component<Props, ...> {
  render() {
    return <canvas ref='canvas'/>;
  }

  nonReactRender() {
    _renderCanvas(this.props, this.refs.canvas.getContext('2d');
  }
}

// Exported only for testing purposes.
export function _renderCanvas(props: Props, context: CanvasRenderingContext2D) {
  // Render the things.
}
```

You can write tests that look like this (assuming you have some test/assertion frameworks already set up):

```tsx
import { CanvasContextSpy } from 'react-layered-chart';
import { _renderCanvas } from './ExampleComponent';

describe('ExampleComponent', () => {
  // Because CanvasRenderingContext2D is available at compile time (but not runtime)
  // on Node, the type definition is a bit weird and you have to use `typeof` here.
  let spy: typeof CanvasContextSpy;

  beforeEach(() => {
    spy = new CanvasContextSpy();
  });

  it('should do anything at all', () => {
    _renderCanvas({ ... }, spy);

    spy.operations.length.should.be.above(0);
  });
});
```
