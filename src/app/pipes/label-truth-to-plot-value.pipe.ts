import { Pipe, PipeTransform } from '@angular/core';
import { TruthToPlotValue } from '../models/truth-to-plot';

@Pipe({
  name: 'labelTruthToPlotValue'
})
export class LabelTruthToPlotValuePipe implements PipeTransform {

  transform(value: TruthToPlotValue, ...args: never[]): unknown {
    switch(value){
      case TruthToPlotValue.CumulatedCases: return 'Cumulated Cases'
      case TruthToPlotValue.CumulatedDeath: return 'Cumulated Death'
      case TruthToPlotValue.IncidenceCases: return 'Incidence Cases'
      case TruthToPlotValue.IncidenceDeath: return 'Incidence Death'
      default: return `Unknown TruthToPlotValue (${value})`;
    }
  }
}
