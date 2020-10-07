import { Pipe, PipeTransform } from '@angular/core';
import { TruthToPlotValue } from '../models/truth-to-plot';

@Pipe({
  name: 'labelTruthToPlotValue'
})
export class LabelTruthToPlotValuePipe implements PipeTransform {

  transform(value: TruthToPlotValue, ...args: [boolean?]): string {
    const trim = (args.length > 0 && args[0]) || false;
    if (trim) {
      switch (value) {
        case TruthToPlotValue.CumulatedCases: return 'Cum. Cases'
        case TruthToPlotValue.CumulatedDeath: return 'Cum. Death'
        case TruthToPlotValue.IncidenceCases: return 'Inc. Cases'
        case TruthToPlotValue.IncidenceDeath: return 'Inc. Death'
        default: return `Unknown TruthToPlotValue (${value})`;
      }
    }

    switch (value) {
      case TruthToPlotValue.CumulatedCases: return 'Cumulated Cases'
      case TruthToPlotValue.CumulatedDeath: return 'Cumulated Death'
      case TruthToPlotValue.IncidenceCases: return 'Incidence Cases'
      case TruthToPlotValue.IncidenceDeath: return 'Incidence Death'
      default: return `Unknown TruthToPlotValue (${value})`;
    }
  }
}
