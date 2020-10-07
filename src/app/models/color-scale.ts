import * as d3scale from 'd3-scale';
import * as _ from 'lodash';

export class ThresholdColorScale {
  private _innerScale: d3scale.ScaleQuantize<string>;

  constructor(values: number[]) {
    this._innerScale = this.createInnerScale(values);
  }

  private colors = ['#eee', '#ccc', '#aaa', '#888', '#666', '#444'];

  private createInnerScale(values: number[]) {
    if (values && values.length > 0) {
      return d3scale.scaleQuantize<string>().domain([_.min(values), _.max(values)]).range(this.colors);
      // const maxValue = _.min([this.colorsCandidates.length, _.max(values)]);
      // if (maxValue > 0) {
      //   const colors = _.range(maxValue).map((x, i) => {
      //     const ls = this.colorsCandidates.length / maxValue;
      //     const start = ls * i;
      //     const end = ls * (i + 1);
      //     const newIndex = Math.round((start + end) / 2) - 1;
      //     return this.colorsCandidates[newIndex];
      //   }).slice(1);
      //   if (colors.length > 0) {
      //     return d3scale.scaleQuantize<string>().domain([_.min(values), _.max(values)]).range(colors);
      //   }
      // }
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
