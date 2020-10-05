import { Pipe, PipeTransform } from '@angular/core';
import { TruthToPlotSource } from '../models/truth-to-plot';

@Pipe({
  name: 'labelDataSource'
})
export class LabelDataSourcePipe implements PipeTransform {

  transform(value: TruthToPlotSource, ...args: never[]): string {
    switch (value) {
      case TruthToPlotSource.ECDC: return 'ECDC/RKI/MZ';
      case TruthToPlotSource.JHU: return 'JHU';
      default: return 'Unknown Datasource';
    }
  }

}
