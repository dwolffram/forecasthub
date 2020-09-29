import * as _ from 'lodash';
import { DataSourceSeriesInfoDataItem } from './series-info';

export enum TruthToPlotSource {
  ECDC = 'ecdc',
  JHU = 'jhu'
}

export enum TruthToPlotValue {
  CumulatedDeath = 'cum_death',
  IncidenceDeath = 'inc_death',
  CumulatedCases = 'cum_case',
  IncidenceCases = 'inc_case'
}

export interface TruthToPlot {
  source: TruthToPlotSource;

  date: moment.Moment;

  week: {
    weekNumber: number,
    year: number
  }

  idLocation: string;

  cum_death: number;
  inc_death: number;
  cum_case: number;
  inc_case: number;
}

export class DataSource {
  name: TruthToPlotSource;
  data: TruthToPlot[];

  constructor(init: Partial<DataSource>) {
    Object.assign(this, init);
  }

  select(filterPredicate: (x: TruthToPlot) => boolean, plotValue: TruthToPlotValue): DataSourceSeriesInfoDataItem[] {
    if (!plotValue) return [];

    let lodashChain = _.chain(this.data);
    if (filterPredicate) {
      lodashChain = lodashChain.filter(x => filterPredicate(x));
    }
    return lodashChain.orderBy(x => x.date.toDate())
      .map(d => ({ x: d.date, y: d[plotValue], dataPoint: d } as DataSourceSeriesInfoDataItem))
      .value();
  }
}
