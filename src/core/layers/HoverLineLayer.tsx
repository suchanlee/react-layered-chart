import * as React from 'react';
import * as d3Scale from 'd3-scale';
import * as _ from 'lodash';

import NonReactRender from '../decorators/NonReactRender';
import PixelRatioContext, { Context } from '../decorators/PixelRatioContext';

import PollingResizingCanvasLayer from './PollingResizingCanvasLayer';
import propTypes from '../propTypes';
import { Interval, Color } from '../interfaces';

export interface Props {
  xDomain: Interval;
  hover?: number;
  color?: Color;
}

@NonReactRender
@PixelRatioContext
export default class HoverLineLayer extends React.PureComponent<Props, void> {
  context: Context;

  static propTypes = {
    hover: React.PropTypes.number,
    xDomain: propTypes.interval.isRequired,
    color: React.PropTypes.string
  } as React.ValidationMap<Props>;

  static defaultProps = {
    color: 'rgba(0, 0, 0, 1)'
  } as any as Props;

  render() {
    return <PollingResizingCanvasLayer
      ref='canvasLayer'
      onSizeChange={this.nonReactRender}
      pixelRatio={this.context.pixelRatio}
    />;
  }

  nonReactRender = () => {
    const { width, height, context } = (this.refs['canvasLayer'] as PollingResizingCanvasLayer).resetCanvas();
    _renderCanvas(this.props, width, height, context);
  };
}

// Export for testing.
export function _renderCanvas(props: Props, width: number, height: number, context: CanvasRenderingContext2D) {
  if (!_.isFinite(props.hover)) {
    return;
  }

  const xScale = d3Scale.scaleLinear()
    .domain([ props.xDomain.min, props.xDomain.max ])
    .rangeRound([ 0, width ]);
  const xPos = xScale(props.hover!);

  if (xPos >= 0 && xPos < width) {
    context.lineWidth = 1;
    context.strokeStyle = props.color!;
    context.translate(0.5, -0.5);
    context.beginPath();
    context.moveTo(xPos, 0);
    context.lineTo(xPos, height);
    context.stroke();
  }
}
