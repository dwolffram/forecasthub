import { Pipe, PipeTransform } from '@angular/core';
import { TruthToPlotSource } from '../models/truth-to-plot';

@Pipe({
  name: 'labelTruthToPlotSource'
})
export class LabelTruthToPlotSourcePipe implements PipeTransform {

  transform(value: TruthToPlotSource, ...args: unknown[]): unknown {
    switch(value){
      case TruthToPlotSource.ECDC: return 'ECDC';
      case TruthToPlotSource.JHU: return 'JHU';
      default: return `Unknown TruthToPlotSource (${value})`;
    }
  }

}
