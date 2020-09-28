import { ForecastToPlot } from './forecast-to-plot';
import { TruthToPlot, TruthToPlotSource } from './truth-to-plot';

// export interface SeriesInfo {
//   $type: 'dataSource' | 'forecast';

//   name: string;
//   data: SeriesInfoDataItem[];

//   style: {
//     color: string;
//     symbol: string;
//   }
// }

export type SeriesInfo = DataSourceSeriesInfo | ForecastSeriesInfo;

export interface DataSourceSeriesInfo {
  $type: 'DataSourceSeriesInfo';
  model: ModelInfo;
  data: DataSourceSeriesInfoDataItem[];
}

export interface ModelInfo {
  source: TruthToPlotSource;
  name: string;
  style: {
    color: string;
    symbol: string;
  }
}

export interface ForecastDateSeriesInfo {
  $type: 'ForecastDateSeriesInfo'
  model: ModelInfo;
  data: ForecastSeriesInfoDataItem[];
}

export interface ForecastHorizonSeriesInfo {
  $type: 'ForecastHorizonSeriesInfo'
  model: ModelInfo;
  data: ForecastSeriesInfoDataItem[][];
}

export type ForecastSeriesInfo = ForecastDateSeriesInfo | ForecastHorizonSeriesInfo;

export interface DataSourceSeriesInfoDataItem {
  $type: 'DataSourceSeriesInfoDataItem';

  x: moment.Moment;
  y: number;
  dataPoint: TruthToPlot
}

export interface ForecastSeriesInfoDataItem {
  $type: 'ForecastSeriesInfoDataItem';

  x: moment.Moment;
  y: number;
  dataPoint: ForecastToPlot;
  interval?: Interval
}

export type SeriesInfoDataItem = DataSourceSeriesInfoDataItem | ForecastSeriesInfoDataItem

export interface Interval {
  lower: number;
  upper: number;
}

