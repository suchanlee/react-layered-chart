# react-layered-chart

A high-performance canvas-based time series visualization in Typescript + React.

TODO: Example picture.

## Installation

```
npm install --save react-layered-chart
```

Be sure to include the styles from `react-layered-chart/react-layered-chart.css`. This file is also specified on the `style` key in `package.json` for any toolchains that support it.

### `process.env.NODE_ENV`

In development mode, react-layered-chart logs internal state changes rather verbosely for debugging purposes. Specify the value `"production"` for `process.env.NODE_ENV` in your build to turn this off.

## Making Basic, Static Charts

> See the [section on developing](#developing) to set up a page you can play around with yoruself. Check the [caveats](#caveats) and [common issues](#issues) if you run into problems.

The core functionality of react-layered-chart is a set of "layer" components inside a `Stack` component. The simplest possible chart looks something like this:

```tsx
const MY_DATA = [ ... ];

<Stack>
  <PointLayer
    data={MY_DATA}
    xDomain={{ min: 0, max: 100 }}
    yDomain={{ min: 0, max: 100 }}
  />
</Stack>
```

Where the `data` prop is an array of objects appropriate for the particular layer (see the [implementations of the included layers](https://github.com/palantir/react-layered-chart/tree/connected-components/src/core/layers) for details).

The `xDomain` and `yDomain` props, which are common to many layers, describe which subset of the data should be rendered. Many layers also include a `yScale` for customizing the scale on the Y domain (e.g. for displaying logarithmic plots).

Including multiple layers will cause them to be stacked in the Z direction, so you can overlay multiple charts. For instance, if you want a line chart that also emphasizes each data point with a dot, you could do something like the following:

```tsx
<Stack>
  <PointLayer data={DATA} .../>
  <SimpleLineLayer data={DATA} .../>
</Stack>
```

Charts made in this manner are static. See the [interactive section](#interactive) for how to make interactive charts.

## <a name="#interactive"></a>Interactive Charts

> See the [section on developing](#developing) to set up a page you can play around with yoruself. Check the [caveats](#caveats) and [common issues](#issues) if you run into problems.

react-layered-chart also includes a bunch of somewhat opinionated, stateful components that help you make interactive charts and load new data as necessary. These components require that each of the series you're rendering can be uniquely identified with a string, referred to as the "series ID".

The `ChartProvider` component is a wrapper around a [react-redux `Provider`](https://github.com/reactjs/react-redux) that also exposes a [controlled-input-like](https://facebook.github.io/react/docs/forms.html#controlled-components) interface. A simple chart that includes user interaction might look like this:

```tsx
// This stateless function receives a bunch of parameters to load data. It's called
// any time the X domain changes or the data otherwise becomes potentially stale.
function myDataLoader(...) {
   return ...;
}

<ChartProvider
  seriesIds={[ 'my-series-id' ]}
  dataLoader={myDataLoader}
  defaultState={{ xDomain: { min: 0, max: 100 } }}
>
  <Stack>
    <ConnectedSimpleLineLayer seriesId='my-series-id'/>
    <ConnectedInteractionLayer enablePan={true} enableZoom={true}/>
  </Stack>
</ChartProvider>
```

In this example, the X and Y domains are controlled by internal state and need not be explicitly passed. The `ConnectedInteractionCaptureLayer` captures mouse events and dispatches actions internally to make the chart respond to user input.

## Adding Custom Behavior

react-layered-chart provides two methods of customizing behavior:

- Hooking into the internal [Redux](https://github.com/reactjs/redux) store using react-redux's [`connect`](https://github.com/reactjs/react-redux/blob/master/docs/api.md#connectmapstatetoprops-mapdispatchtoprops-mergeprops-options) plus the [selectors](https://github.com/reactjs/reselect) and action creators provided by react-layered-chart.
- Providing props to the `ChartProvider` in the manner of [controlled components](https://facebook.github.io/react/docs/forms.html#controlled-components).

Your custom component doesn't even have to be a type of chart -- for example, if you want to add a textual legend that updates on hover, you could do this by adding a component within a `ChartProvider`.

### Custom View Example

This example implements a full-width button that both displays the current X domain and will reset the X domain to a specific value when clicked.

```tsx
import { bindActionCreators } from 'redux';
import { connect } from 'react-redux';
import {
  Range,
  // This type is opaque and should only be interacted with using builtin selectors and action creators.
  ChartProviderState,
  // This is one such selector.
  selectXDomain,
  // This is one such action creator.
  setXDomain
} from 'react-layered-chart';

// Props we expect to receive from our our parent component.
interface OwnProps {
  resetXDomain: Range;
}

// Props auto-injected from the internally managed state.
interface ConnectedProps {
  currentXDomain: Range;
}

// Actions we want to be able to fire.
interface DispatchProps {
  setXDomain: typeof setXDomain;
}

class SnapToXDomainButton extends React.Component<OwnProps & ConnectedProps & DispatchProps, void> {
  render() {
    // Implement a simple text-based <div> that reacts to clicks.
    return (
      <div className='lc-layer snap-to-x-domain-button' onClick={() => this.props.setXDomain(this.props.resetXDomain)}>
        {this.props.currentXDomain.min} to {this.props.currentXDomain.max}
      </div>
    );
  }
}

// See react-redux docs for more.
function mapStateToProps(state: ChartProviderState): ConnectedProps {
  return {
    currentXDomain: selectXDomain(state)
  };
}

// See react-redux docs for more.
function mapDispatchToProps(dispatch: Dispatch): DispatchProps {
  return bindActionCreators({ setXDomain }, dispatch);
}

// In Typescript, this cast is sometimes necessary.
// https://github.com/DefinitelyTyped/DefinitelyTyped/issues/8787
export default connect(mapStateToProps, mapDispatchToProps)(SnapToXDomainButton) as React.ComponentClass<OwnProps>;
```

Then you can put a `SnapToXDomainButton` component in a `Stack` and you'll have a functional button that also displays the current domain!

### Custom Interaction Example

This example implements some state management that prevents the user from panning or zooming beyond the current day.

```tsx
import {
  Range,
  // This utility method implements logic to clamp ranges.
  enforceRangeBounds
} from 'react-layered-chart';

const CHART_BOUNDS = {
  min: moment('1950-01-01').valueOf(),
  max: moment().add(1, 'day').endOf('day').valueOf()
};

interface Props { ... }

// For simplicity in this example, the controlled domain is kept on component
// state, but you should use whatever means is appropriate for your environment.
interface State {
  xDomain: Range;
}

class MyControlledChart extends React.Component<Props, State> {
  // Declare some sane default.
  state: State = {
    xDomain: {
      min: moment('2000-01-01').valueOf(),
      max: moment().valueOf()
    }
  };

  render() {
    return (
      <ChartProvider
        seriesIds={[ 'my-series-id' ]}
        // Control the prop!
        xDomain={this.state.xDomain}
        // Capture any requested changes, such as from a ConnectedInteractionLayer.
        onXDomainChange={this._onXDomainChange.bind(this)}
      >
        // Put whatever stuff you want in here!
      </ChartProvider>
    );
  }

  private _onXDomainChange(xDomain: Range) {
    // Use the provided utility to munge the X domain to something acceptable.
    this.setState({
      xDomain: enforceRangeBounds(xDomain, CHART_BOUNDS)
    });
  };
}
```

## <a name="caveats"></a>Caveats/Limitations

### <a name="physicalchartsize"></a>Physical chart size

`ChartProvider` needs to know how large it is on the page in order to scale and request data at an appropriate resolution. By default, it injects a hidden `ConnectedResizeSentinelLayer` to poll for the width of the container.

If you adjust the margins/padding or change the layout to be horizontally-aligned, you may need to set `ChartProvider`'s `includeResizeSentinel` to `false` and supply your own `ConnectedResizeSentinelLayer` in a place where it can determine the correct width. You only need one.

### Usage with react-redux

`ChartProvider` is implemented under the hood with [Redux](https://github.com/reactjs/redux) and [react-redux](https://github.com/reactjs/react-redux)'s `Provider`. If you are using react-redux elsewhere, watch out for nested `Provider`s: you cannot access the outer provider from a child of a `ChartProvider` component!

### <a name="chartid"></a>Tracking transient state across (un)mount cycles

Each `ChartProvider` component is highly stateful: both in the data that's automatically loaded for you and in the state of the UI as the user interacts. If you want to preserve the transient state across renders but the nature of your application causes React to unmount it frequently, you can provide the optional `chartId` to `ChartProvider`. `chartId` is an arbitrary, *globally-unique* string for this particular chart that will allow react-layered-chart to restore state from the the last time a chart with this ID was mounted.

A common example of undesirable state loss is in a tabbed application: charts in one tab will be unmounted and removed from the DOM as you switch, but to provide good UX, you'll want to make sure they're still loaded and panned over to the same place when the user tabs back.

## <a name="issues"></a>Common Issues

Please [file an issue on Github](https://github.com/palantir/react-layered-chart/issues) for any issues that aren't covered here.

### The chart is slowly but unstoppably increasing in height.

This likely happens because you've forgotten to include react-layered-chart's stylesheet, which sets some default sizes to prevent this issue. See the [caveat about physical chart size](#physicalchartsize) for an explanation of why this happens.

### When `ChartProvider` unmounts, I lose all my loaded state.

Specify a globally-unique `chartId` string prop to `ChartProvider` so on next mount it can retrieve its old state. See the [caveat on (un)mounting](#chartid) for more details.

## <a name="api"></a>API Reference

See [API Reference](API.md).

## <a name="developing"></a>Developing

```
npm install
./hooks/install.sh
npm run dev:hot-reload
```

Then visit [localhost:8085](http://localhost:8085/) to see the example page. This runs `webpack-dev-server` on port 8085, including auto-recompilation and hot code injection.
