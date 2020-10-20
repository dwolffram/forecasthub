import { Pipe, PipeTransform } from '@angular/core';
import { TruthToPlotValue } from '../models/truth-to-plot';

@Pipe({
  name: 'labelTruthToPlotValue'
})
export class LabelTruthToPlotValuePipe implements PipeTransform {

  transform(value: TruthToPlotValue, ...args: [boolean?, boolean?]): string {
    const trim = (args.length > 0 && args[0]) || false;
    const mapLabel = (args.length > 1 && args[1]) || false;
    if (trim) {
      switch (value) {
        case TruthToPlotValue.CumulatedCases: return 'Cum. Cases'
        case TruthToPlotValue.CumulatedDeath: return 'Cum. Deaths'
        case TruthToPlotValue.IncidenceCases: return 'Inc. Cases'
        case TruthToPlotValue.IncidenceDeath: return 'Inc. Deaths'
        default: return `Unknown TruthToPlotValue (${value})`;
      }
    }

    if(mapLabel){
      switch (value) {
        case TruthToPlotValue.CumulatedCases: return 'Cumulative Cases'
        case TruthToPlotValue.CumulatedDeath: return 'Cumulative Deaths'
        case TruthToPlotValue.IncidenceCases: return 'Incidence Cases'
        case TruthToPlotValue.IncidenceDeath: return 'Incidence Deaths'
        default: return `Unknown TruthToPlotValue (${value})`;
      }
    }

    switch (value) {
      case TruthToPlotValue.CumulatedCases: return 'Cumulated Cases'
      case TruthToPlotValue.CumulatedDeath: return 'Cumulated Deaths'
      case TruthToPlotValue.IncidenceCases: return 'Incidence Cases'
      case TruthToPlotValue.IncidenceDeath: return 'Incidence Deaths'
      default: return `Unknown TruthToPlotValue (${value})`;
    }
  }
}
