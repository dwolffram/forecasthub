import { TruthToPlotSource } from './truth-to-plot';

export type SeriesInfo = DataSourceSeriesInfo | ForecastSeriesInfo;

export interface DataSourceSeriesInfo {
  $type: 'dataSource';
  source: TruthToPlotSource;

  name: string;
  data: any[];

  style: {
    color: string;
    symbol: string;
  }
}

export interface ForecastSeriesInfo {
  $type: 'forecast'
  targetSource: TruthToPlotSource;

  name: string;
  data: any[];

  style: {
    color: string;
    symbol: string;
  }
}
