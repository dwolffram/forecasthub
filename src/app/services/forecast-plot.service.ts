import { Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject, Subscription, forkJoin, combineLatest, Observable, pipe, MonoTypeOperatorFunction, iif } from 'rxjs';
import { LocationLookupItem, ForecastDateLookup, LocationLookup } from '../models/lookups';
import { TruthToPlotValue, TruthToPlotSource, DataSource } from '../models/truth-to-plot';
import { LookupService } from './lookup.service';
import * as moment from 'moment';
import { ForecastToPlot, ForecastToPlotType, QuantilePointType, QuantileType } from '../models/forecast-to-plot';
import * as _ from 'lodash';
import { DataService } from './data.service';
import { map, tap, shareReplay, withLatestFrom } from 'rxjs/operators';
import { SeriesInfo, ForecastSeriesInfo, DataSourceSeriesInfo, ForecastSeriesInfoDataItem, Interval, DataSourceSeriesInfoDataItem, ForecastDateSeriesInfo, ForecastHorizonSeriesInfo, ModelInfo } from '../models/series-info';
import { values } from 'lodash';
import { LabelTruthToPlotValuePipe } from '../pipes/label-truth-to-plot-value.pipe';
import { LabelTruthToPlotSourcePipe } from '../pipes/label-truth-to-plot-source.pipe';

export interface ForecastSettingsBase<T extends ForecastDisplayMode> {
  location: LocationLookupItem;
  plotValue: TruthToPlotValue;
  shiftToSource: TruthToPlotSource;
  confInterval: QuantileType;
  displayMode: T;
}

export interface ForecastSettings extends ForecastSettingsBase<ForecastDisplayMode> { };

export interface ForecastDateDisplaySettings extends ForecastSettingsBase<ForecastDateDisplayMode> { }

export interface ForecastHorizonDisplaySettings extends ForecastSettingsBase<ForecastHorizonDisplayMode> { }

export interface ForecastHorizonDisplayMode {
  $type: 'ForecastHorizonDisplayMode';
  horizon: 1 | 2 | 3 | 4;
}

export interface ForecastDateDisplayMode {
  $type: 'ForecastDateDisplayMode';
  date: moment.Moment;
}

// export enum ForecastShiftMode {
//   None,
//   Ecdc,
//   Jhu
// }

export type ForecastDisplayMode = ForecastHorizonDisplayMode | ForecastDateDisplayMode;


@Injectable({
  providedIn: 'root'
})
export class ForecastPlotService implements OnDestroy {

  static EnsembleModelNames = ['KITCOVIDhub-median_ensemble'];

  private readonly _highlightedSeries = new BehaviorSubject<ModelInfo[]>(null);
  private readonly _plotValue = new BehaviorSubject<TruthToPlotValue>(TruthToPlotValue.CumulatedDeath);
  private readonly _disabledSeriesNames = new BehaviorSubject<string[]>([]);
  private readonly _confidenceInterval = new BehaviorSubject<QuantileType>(QuantileType.Q95);
  private readonly _shiftToSource = new BehaviorSubject<TruthToPlotSource>(null);
  private readonly _userLocation = new BehaviorSubject<LocationLookupItem>(undefined);
  private readonly _userDisplayMode = new BehaviorSubject<ForecastDisplayMode>(undefined);

  private _dataSourceSeriesColors = new Map<TruthToPlotSource, string>([[TruthToPlotSource.ECDC, '#555'], [TruthToPlotSource.JHU, '#999']]);


  readonly highlightedSeries$ = this._highlightedSeries.asObservable().pipe(shareReplay(1));
  readonly disabledSeriesNames$ = this._disabledSeriesNames.asObservable().pipe(shareReplay(1));
  // readonly disabledSeriesNames$: Observable<string[]>;
  readonly plotValue$ = this._plotValue.asObservable().pipe(shareReplay(1));
  readonly confidenceInterval$ = this._confidenceInterval.asObservable().pipe(shareReplay(1));
  readonly shiftToSource$ = this._shiftToSource.asObservable().pipe(shareReplay(1));
  readonly userLocation$ = this._userLocation.asObservable().pipe(shareReplay(1));
  readonly userDisplayMode$ = this._userDisplayMode.asObservable().pipe(shareReplay(1));

  readonly dateRange$: Observable<[moment.Moment, moment.Moment]>;
  readonly displayMode$: Observable<ForecastDisplayMode>;
  readonly series$: Observable<{ data: SeriesInfo[], settings: ForecastSettings }>;
  readonly activeSeries$: Observable<{ data: SeriesInfo[], settings: ForecastSettings }>;
  readonly location$: Observable<LocationLookupItem>;
  readonly availableModels$: Observable<ModelInfo[]>;
  readonly dataSources$: Observable<DataSource[]>;
  readonly datasourceSettings$: Observable<[LocationLookupItem, TruthToPlotValue, TruthToPlotSource]>;

  get userLocation(): LocationLookupItem {
    return this._userLocation.getValue();
  }
  set userLocation(value: LocationLookupItem) {
    this._userLocation.next(value);
  }

  get userDisplayMode(): ForecastDisplayMode {
    return this._userDisplayMode.getValue();
  }
  set userDisplayMode(value: ForecastDisplayMode) {
    this._userDisplayMode.next(value);
  }

  get shiftToSource(): TruthToPlotSource {
    return this._shiftToSource.getValue();
  }
  set shiftToSource(value: TruthToPlotSource) {
    this._shiftToSource.next(value);
  }

  get disabledSeriesNames(): string[] {
    return this._disabledSeriesNames.getValue();
  }
  set disabledSeriesNames(value: string[]) {
    this._disabledSeriesNames.next(value);
  }

  get highlightedModels(): ModelInfo[] {
    return this._highlightedSeries.getValue();
  }

  set highlightedSeries(value: ModelInfo[]) {
    this._highlightedSeries.next(value);
  }

  get plotValue(): TruthToPlotValue {
    return this._plotValue.getValue();
  }

  set plotValue(value: TruthToPlotValue) {
    this._plotValue.next(value);
  }

  get confidenceInterval(): QuantileType {
    return this._confidenceInterval.getValue();
  }

  set confidenceInterval(value: QuantileType) {
    this._confidenceInterval.next(value);
  }

  private getNextSaturday(date: moment.Moment) {
    const sat = date.isoWeekday() === 6 ? date : moment(date).isoWeekday(6);
    return sat;
  }

  constructor(private lookupService: LookupService, private dataService: DataService) {
    this.dateRange$ = this.lookupService.forecastDates$.pipe(map(dates => [
      this.getNextSaturday(moment(dates.minimum).add(-3, 'w').startOf('day')),
      this.getNextSaturday(moment(dates.maximum).add(6, 'w').startOf('day'))]
    ));

    this.location$ = combineLatest([this.userLocation$, this.lookupService.locations$])
      .pipe(map(([userLocation, defaultLocation]) => {
        return userLocation ? userLocation : defaultLocation.get('GM');
      })).pipe(shareReplay(1));

    this.displayMode$ = combineLatest([this.userDisplayMode$, this.lookupService.forecastDates$])
      .pipe(map(([userDisplayMode, defaultDisplayMode]) => {
        return userDisplayMode !== undefined ? userDisplayMode : { $type: 'ForecastDateDisplayMode', date: defaultDisplayMode.maximum } as ForecastDateDisplayMode;
      })).pipe(shareReplay(1));

    this.datasourceSettings$ = combineLatest([this.location$, this.plotValue$, this.shiftToSource$])
      .pipe(tap(() => this.clearDisabledSeriesNames()))
      .pipe(shareReplay(1));

    const forecastSettings$ = combineLatest([this.datasourceSettings$, this.confidenceInterval$, this.displayMode$])
      .pipe(map(([[location, plotValue, shiftToSource], confInterval, displayMode]) => ({ location, plotValue, shiftToSource, confInterval, displayMode } as ForecastSettings)))
      .pipe(shareReplay(1));

    this.dataSources$ = forkJoin([this.dataService.ecdcData$, this.dataService.jhuData$])
      .pipe(shareReplay(1));

    const datasourceSeries$ = combineLatest([this.dataSources$, this.datasourceSettings$])
      .pipe(map(([data, [location, plotValue, shiftTo]]) => {
        const [ecdc, jhu] = data;

        const ecdcSeries = this.createTruthSeries(ecdc, location, plotValue, shiftTo);
        const jhuSeries = this.createTruthSeries(jhu, location, plotValue, shiftTo);

        return { settings: { location, plotValue, shiftTo }, data: [ecdcSeries, jhuSeries].filter(x => x != null) };
      }))
      .pipe(shareReplay(1));

    const filteredForecasts$ = combineLatest([this.dataService.forecasts$, forecastSettings$])
      .pipe(map(([data, settings]) => {
        const d = (!settings.location || !settings.plotValue) ? [] : _.filter(data, x => x.location === settings.location.id && x.target.value_type === settings.plotValue);
        return [d, settings] as [ForecastToPlot[], ForecastSettings];
      })).pipe(shareReplay(1));

    this.availableModels$ = filteredForecasts$.pipe(map(([data, settings]) => {
      return _.uniqWith(_.map(data, d => [d.model, d.truth_data_source]), (l, r) => l[0] === r[0] && l[1] === r[1])
        .map(d => {
          const modelName = d[0];
          const source = d[1] as TruthToPlotSource;
          return {
            name: modelName,
            source: source,
            style: {
              color: this.getColor(modelName),
              symbol: this.getSymbol(settings.shiftToSource ? settings.shiftToSource : source)
            }
          } as ModelInfo;
        });
    })).pipe(shareReplay(1));

    const forecasts$ = filteredForecasts$
      .pipe(map(x => {
        const [data, settings] = x;
        return {
          settings: settings,
          data: this.createForecastSeries(data, settings)
        };
      })).pipe(shareReplay(1));

    this.series$ = combineLatest([datasourceSeries$, forecasts$])
      .pipe(map(([ds, fc]) => {
        return {
          data: [...ds.data, ...fc.data],
          settings: { ...ds.settings, ...fc.settings }
        };
      })).pipe(shareReplay(1));

    this.activeSeries$ = combineLatest([this.series$, this.disabledSeriesNames$])
      .pipe(map(([series, disabledSeriesNames]) => {
        if (!disabledSeriesNames || disabledSeriesNames.length === 0) return series;
        return { settings: { ...series.settings }, data: series.data.filter(x => disabledSeriesNames.indexOf(x.model.name) === -1) };
      })).pipe(shareReplay(1));
  }

  ngOnDestroy(): void {
  }

  clearDisabledSeriesNames() {
    this.disabledSeriesNames = [];
  }

  private createForecastSeries(data: ForecastToPlot[], settings: ForecastSettings): ForecastSeriesInfo[] {
    if (!settings || !settings.location || !settings.plotValue || !settings.displayMode || !data || data.length === 0) return [];

    const seriesFactory = this.getSeriesFactory(settings.displayMode);
    return _.chain(data)
      // .filter(x => x.location === settings.location.id && x.target.value_type === settings.plotValue)
      .groupBy(x => x.model)
      .map((x, key) => ({ key, value: x }))
      .map((x, index) => seriesFactory(x, settings, index))
      .filter(x => x !== null)
      .value();
  }

  private getSeriesFactory(displayMode: ForecastDisplayMode): (x: { key: string; value: ForecastToPlot[]; }, settings: ForecastSettings, index: number) => ForecastSeriesInfo {
    switch (displayMode?.$type) {
      case 'ForecastDateDisplayMode': return (a, b, c) => this.createForecastDateSeries(a, b as ForecastDateDisplaySettings, c);
      case 'ForecastHorizonDisplayMode': return (a, b, c) => this.createForecastHorizon(a, b as ForecastHorizonDisplaySettings, c);
      default: throw new Error(`Invalid displayMode '${displayMode}'. Unable to determine factory.`);
    }
  }

  private createForecastHorizon(x: { key: string; value: ForecastToPlot[]; }, settings: ForecastHorizonDisplaySettings, index: number): ForecastHorizonSeriesInfo {
    const orderedData = _.chain(x.value)
      .filter(d => d.target.time_ahead >= 0 && d.target.time_ahead <= settings.displayMode.horizon)
      .orderBy(d => d.target.end_date);
    const firstDataPoint = orderedData.head().value();
    if (firstDataPoint === null) return null;

    const getGroupName = (d: ForecastToPlot) => {
      if (d.type === ForecastToPlotType.Observed) return d.target.end_date.toISOString();
      let momentUnit: moment.unitOfTime.DurationConstructor = d.target.time_unit === 'day' ? 'd' : 'w';
      return moment(d.target.end_date).add(-d.target.time_ahead, momentUnit).toISOString()
    }

    const data = orderedData.groupBy(d => getGroupName(d))
      .map((g, key) => {
        if (g.length <= 1) return null;

        const quantiles = _.chain(g.filter(c => c.type === ForecastToPlotType.Quantile && c.target.time_ahead === settings.displayMode.horizon));
        const points = g.filter(c => c.type === ForecastToPlotType.Observed || (c.type === ForecastToPlotType.Point && c.target.time_ahead === settings.displayMode.horizon));

        const intervals = settings.confInterval !== null && quantiles
          .groupBy(x => x.target.end_date.toISOString())
          .reduce((prev, curr, key) => {
            const l = _.find(curr, c => c.quantile.type === settings.confInterval && c.quantile.point === QuantilePointType.Lower);
            const u = _.find(curr, c => c.quantile.type === settings.confInterval && c.quantile.point === QuantilePointType.Upper);
            if (l && u) {
              prev.set(key, {
                lower: this.getYValue(l, settings.shiftToSource),
                upper: this.getYValue(u, settings.shiftToSource)
              });
            }
            return prev;
          }, new Map<string, Interval>())
          .value();

        const allPoints = _.orderBy(points.map(p => {
          const linePoint = { $type: 'ForecastSeriesInfoDataItem', x: p.target.end_date, y: this.getYValue(p, settings.shiftToSource), dataPoint: p } as ForecastSeriesInfoDataItem;
          if (intervals && p.type === ForecastToPlotType.Point && intervals.has(linePoint.x.toISOString())) {
            linePoint.interval = intervals.get(linePoint.x.toISOString());
          }
          return linePoint;
        }), x => x.x.toDate(), 'asc');

        return allPoints.length > 1 ? allPoints : null;
      })
      .filter(d => d !== null)
      .value();

    return {
      $type: 'ForecastHorizonSeriesInfo',
      model: {
        name: x.key,
        source: firstDataPoint.truth_data_source,
        style: {
          color: this.getColor(x.key),
          symbol: settings.shiftToSource ? this.getSymbol(settings.shiftToSource) : this.getSymbol(firstDataPoint.truth_data_source)
        }
      },
      data: data
    };
  }

  private getYValue(dataItem: ForecastToPlot, shiftToSource: TruthToPlotSource): number {
    let y = dataItem.value;
    if (shiftToSource !== null) {
      y += dataItem.shifts.get(shiftToSource);
    }
    return y;
  }

  private createForecastDateSeries(x: { key: string; value: ForecastToPlot[]; }, settings: ForecastDateDisplaySettings, index: number) {
    const orderedData = _.chain(x.value).filter(d => d.timezero.isSame(settings.displayMode.date)).orderBy(d => d.target.end_date);
    const firstDataPoint = orderedData.head().value();

    // if no data available after filtering date, abort series creation
    if (!firstDataPoint) return null;

    const intervals = settings.confInterval !== null && orderedData.filter(d => d.type === ForecastToPlotType.Quantile)
      .groupBy(x => x.target.end_date.toISOString())
      .reduce((prev, curr, key) => {
        const l = _.find(curr, c => c.quantile.type === settings.confInterval && c.quantile.point === QuantilePointType.Lower);
        const u = _.find(curr, c => c.quantile.type === settings.confInterval && c.quantile.point === QuantilePointType.Upper);
        if (l && u) {
          prev.set(key, {
            lower: this.getYValue(l, settings.shiftToSource),
            upper: this.getYValue(u, settings.shiftToSource)
          });
        }
        return prev;
      }, new Map<string, Interval>())
      .value();

    const data = orderedData
      .filter((d, i, array) => d.type === ForecastToPlotType.Point || (d.type === ForecastToPlotType.Observed && !_.find(array, f => f.type === ForecastToPlotType.Observed, i + 1)))
      .map((d, i, array) => {
        const y = this.getYValue(d, settings.shiftToSource);
        const result = { x: d.target.end_date, y: y, dataPoint: d } as ForecastSeriesInfoDataItem;
        const isLastObservedPoint = d.type === ForecastToPlotType.Observed && !_.find(array, f => f.type === ForecastToPlotType.Observed, i + 1);

        if (intervals) {
          if (intervals.has(result.x.toISOString())) {
            result.interval = intervals.get(result.x.toISOString());
          } else if (isLastObservedPoint) {
            result.interval = { lower: y, upper: y };
          }
        }

        return result;
      }).value();

    return {
      $type: 'ForecastDateSeriesInfo',
      model: {
        source: firstDataPoint.truth_data_source,
        name: x.key,
        style: {
          color: this.getColor(x.key),
          symbol: settings.shiftToSource ? this.getSymbol(settings.shiftToSource) : this.getSymbol(firstDataPoint.truth_data_source)
        },
      },
      data: data
    } as ForecastDateSeriesInfo;
  }

  private getSymbol(sourceName: TruthToPlotSource) {
    switch (sourceName) {
      case TruthToPlotSource.ECDC: return 'circle';
      case TruthToPlotSource.JHU: return 'triangle';
      default: throw new Error(`Unknown sourceName '${sourceName}'.`);
    }
  }

  private dsNamePipe = new LabelTruthToPlotSourcePipe();
  private getDataSourceName(source: TruthToPlotSource) {
    return this.dsNamePipe.transform(source);
  }

  private createTruthSeries(dataSource: DataSource, location: LocationLookupItem, plotValue: TruthToPlotValue, shiftTo: TruthToPlotSource): DataSourceSeriesInfo {
    if (!location || !plotValue) return null;
    if (shiftTo && dataSource.name !== shiftTo) return null;
    const seriesData = dataSource.select(x => x.idLocation === location.id, plotValue);

    if (seriesData.length === 0) return null;
    const color = this._dataSourceSeriesColors.get(dataSource.name);
    return { $type: 'DataSourceSeriesInfo', data: seriesData, model: { source: dataSource.name, name: this.getDataSourceName(dataSource.name), style: { symbol: this.getSymbol(dataSource.name), color } } };
  }

  private _forecastSeriesColorMap = new Map<string, string>();
  // private _forecastSeriesColors = ['#543005', '#003c30', '#8c510a', '#01665e', '#bf812d', '#35978f', '#dfc27d', '#80cdc1', '#f6e8c3', '#c7eae5', '#f5f5f5',];
  private _forecastSeriesColors = ['#a6cee3', '#1f78b4', '#b2df8a', '#33a02c', '#fb9a99', '#e31a1c', '#fdbf6f', '#ff7f00', '#cab2d6', '#6a3d9a', '#b15928'];

  private _lastPickedColorIndex = -1;
  private getColor(modelName: string) {
    if (!this._forecastSeriesColorMap.has(modelName)) {
      this._lastPickedColorIndex = (this._lastPickedColorIndex + 1) % this._forecastSeriesColors.length;
      const color = this._forecastSeriesColors[this._lastPickedColorIndex];
      this._forecastSeriesColorMap.set(modelName, color);
    }

    return this._forecastSeriesColorMap.get(modelName);
  }
}
