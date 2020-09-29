import * as d3scale from 'd3-scale';
import * as _ from 'lodash';

export class ThresholdColorScale {
  private _innerScale: d3scale.ScaleQuantize<string>;

  constructor(values: number[]) {
    this._innerScale = this.createInnerScale(values);
  }

  private createInnerScale(values: number[]) {
    if (values && values.length > 0) {
      const maxValue = _.min([9, _.max(values)]);
      if (maxValue > 0) {
        const colorsCandidates = ['#fff5eb', '#fee6ce', '#fdd0a2', '#fdae6b', '#fd8d3c', '#f16913', '#d94801', '#a63603', '#7f2704'];
        const colors = _.range(maxValue).map((x, i) => {
          const ls = 9 / maxValue;
          const start = ls * i;
          const end = ls * (i + 1);
          const newIndex = Math.round((start + end) / 2) - 1;
          return colorsCandidates[newIndex];
        }).slice(1);

        if (colors.length > 0) {
          return d3scale.scaleQuantize<string>().domain([_.min(values), _.max(values)]).range(colors);
          // return { scale, func: (x) => x > 0 ? scale(x) : '#fff' };
        }
      }
    }
    return null;
  }

  getThresholds(): number[] {
    return this._innerScale ? (<any>this._innerScale).thresholds() : [];
  }

  getColor(value: number): string {
    return this._innerScale === null || value <= 0 ? '#fff' : this._innerScale(value);
  }


}
