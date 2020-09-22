import { Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject, Subscription, forkJoin, combineLatest, Observable, pipe, MonoTypeOperatorFunction, iif } from 'rxjs';
import { LocationLookupItem, ForecastDateLookup, LocationLookup } from '../models/lookups';
import { TruthToPlotValue, TruthToPlotSource, DataSource } from '../models/truth-to-plot';
import { LookupService } from './lookup.service';
import * as moment from 'moment';
import { ForecastToPlot, ForecastToPlotType, QuantilePointType, QuantileType } from '../models/forecast-to-plot';
import * as _ from 'lodash';
import { DataService } from './data.service';
import { map, tap, shareReplay } from 'rxjs/operators';
import { SeriesInfo, ForecastSeriesInfo, DataSourceSeriesInfo, ForecastSeriesInfoDataItem, Interval, DataSourceSeriesInfoDataItem, ForecastDateSeriesInfo, ForecastHorizonSeriesInfo } from '../models/series-info';
import { values } from 'lodash';

export interface ForecastSettingsBase<T extends ForecastDisplayMode> {
  location: LocationLookupItem;
  plotValue: TruthToPlotValue;
  seriesAdjustments: Map<string, TruthToPlotSource>;
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

export type ForecastDisplayMode = ForecastHorizonDisplayMode | ForecastDateDisplayMode;

@Injectable({
  providedIn: 'root'
})
export class ForecastPlotService implements OnDestroy {


  // private readonly _location = new BehaviorSubject<LocationLookupItem>(null);
  private readonly _plotValue = new BehaviorSubject<TruthToPlotValue>(TruthToPlotValue.CumulatedCases);
  private readonly _highlightedSeries = new BehaviorSubject<SeriesInfo[]>(null);
  private readonly _disabledSeriesNames = new BehaviorSubject<string[]>(null);
  // private readonly _dateRange = new BehaviorSubject<[moment.Moment, moment.Moment]>(null);
  private readonly _seriesAdjustments = new BehaviorSubject<Map<string, TruthToPlotSource>>(new Map<string, TruthToPlotSource>());
  private readonly _confidenceInterval = new BehaviorSubject<QuantileType>(null);
  // private readonly _displayMode = new BehaviorSubject<ForecastDisplayMode>(null);

  // private _initSubscription: Subscription;
  // private _lookups: { forecastDates: ForecastDateLookup, locations: LocationLookup };

  private _forecastSeriesColors = ['#543005', '#003c30', '#8c510a', '#01665e', '#bf812d', '#35978f', '#dfc27d', '#80cdc1', '#f6e8c3', '#c7eae5', '#f5f5f5',];
  private _dataSourceSeriesColors = new Map<TruthToPlotSource, string>([[TruthToPlotSource.ECDC, 'red'], [TruthToPlotSource.JHU, 'blue']]);

  readonly location$: Observable<LocationLookupItem>;// = this._location.asObservable();

  readonly plotValue$ = this._plotValue.asObservable();
  readonly highlightedSeries$ = this._highlightedSeries.asObservable();
  readonly series$: Observable<{ data: SeriesInfo[], settings: ForecastSettings }>;
  readonly activeSeries$: Observable<{ data: SeriesInfo[], settings: ForecastSettings }>;
  readonly disabledSeriesNames$ = this._disabledSeriesNames.asObservable();
  readonly dateRange$: Observable<[moment.Moment, moment.Moment]>;// = this._dateRange.asObservable();
  readonly seriesAdjustments$ = this._seriesAdjustments.asObservable();
  readonly confidenceInterval$ = this._confidenceInterval.asObservable();
  readonly displayMode$: Observable<ForecastDisplayMode>; // = this._displayMode.asObservable();

  private readonly _userLocation = new BehaviorSubject<LocationLookupItem>(undefined);
  readonly userLocation$ = this._userLocation.asObservable();
  get userLocation(): LocationLookupItem {
    return this._userLocation.getValue();
  }
  set userLocation(value: LocationLookupItem) {
    this._userLocation.next(value);
  }

  private readonly _userDisplayMode = new BehaviorSubject<ForecastDisplayMode>(undefined);
  readonly userDisplayMode$ = this._userDisplayMode.asObservable();
  get userDisplayMode(): ForecastDisplayMode {
    return this._userDisplayMode.getValue();
  }
  set userDisplayMode(value: ForecastDisplayMode) {
    this._userDisplayMode.next(value);
  }

  get disabledSeriesNames(): string[] {
    return this._disabledSeriesNames.getValue();
  }
  set disabledSeriesNames(value: string[]) {
    this._disabledSeriesNames.next(value);
  }

  get highlightedSeries(): SeriesInfo[] {
    return this._highlightedSeries.getValue();
  }

  set highlightedSeries(value: SeriesInfo[]) {
    this._highlightedSeries.next(value);
  }

  get plotValue(): TruthToPlotValue {
    return this._plotValue.getValue();
  }

  set plotValue(value: TruthToPlotValue) {
    this._plotValue.next(value);
  }

  get seriesAdjustments(): ReadonlyMap<string, TruthToPlotSource> {
    return this._seriesAdjustments.getValue();
  }

  get confidenceInterval(): QuantileType {
    return this._confidenceInterval.getValue();
  }

  set confidenceInterval(value: QuantileType) {
    this._confidenceInterval.next(value);
  }

  constructor(private lookupService: LookupService, private dataService: DataService) {
    this.dateRange$ = this.lookupService.forecastDates$.pipe(map(dates => [moment(dates.minimum).add(-3, 'w').endOf('day'), moment(dates.maximum).add(6, 'w').endOf('day')]))

    this.location$ = combineLatest([this.userLocation$, this.lookupService.locations$])
      .pipe(map(([userLocation, defaultLocation]) => {
        return userLocation !== undefined ? userLocation : defaultLocation.get('GM');
      }));

    this.displayMode$ = combineLatest([this.userDisplayMode$, this.lookupService.forecastDates$])
      .pipe(map(([userDisplayMode, defaultDisplayMode]) => {
        return userDisplayMode !== undefined ? userDisplayMode : { $type: 'ForecastDateDisplayMode', date: defaultDisplayMode.maximum }
      }));

    const allSettings$ = combineLatest([this.location$, this.plotValue$]).pipe(tap(() => this.clearDisabledSeriesNames()));
    const forecastSettings$ = combineLatest([allSettings$, this.seriesAdjustments$, this.confidenceInterval$, this.displayMode$])
      .pipe(map(([[location, plotValue], seriesAdjustments, confInterval, displayMode]) => ({ location, plotValue, seriesAdjustments, confInterval, displayMode } as ForecastSettings)));

    const dataSourceData$ = forkJoin([this.dataService.ecdcData$, this.dataService.jhuData$])
      .pipe(shareReplay(1))
      .pipe(tap(x => console.log(`dataSourceData$ -> ${x}`)));

    const dataSources$ = combineLatest([dataSourceData$, allSettings$])
      .pipe(tap(([data, [location, plotValue]]) => console.log(`START dataSources$ -> ${plotValue}`)))
      .pipe(map(([data, [location, plotValue]]) => {
        const [ecdc, jhu] = data;

        const ecdcSeries = this.createTruthSeries(ecdc, location, plotValue);
        const jhuSeries = this.createTruthSeries(jhu, location, plotValue);

        return { settings: { location, plotValue }, data: [ecdcSeries, jhuSeries].filter(x => x != null) };
      }))
      .pipe(tap(x => console.log(`END dataSources$}`)));

    const forecasts$ = combineLatest([this.dataService.forecasts$, forecastSettings$])
      .pipe(map(([data, settings]) => ({
        settings: settings,
        data: this.createForecastSeries(data, settings)
      })));

    this.series$ = combineLatest([dataSources$, forecasts$])
      .pipe(map(([ds, fc]) => {
        return {
          data: [...ds.data, ...fc.data],
          settings: { ...ds.settings, ...fc.settings }
        };
      }))
      .pipe(tap(x => console.log(`END forecasts$}`)));

    this.activeSeries$ = combineLatest([this.series$, this.disabledSeriesNames$])
      .pipe(tap(x => console.log(`START activeSeries$`)))
      .pipe(map(([series, disabledSeriesNames]) => {
        if (!disabledSeriesNames || disabledSeriesNames.length === 0) return series;
        return { settings: { ...series.settings }, data: series.data.filter(x => disabledSeriesNames.indexOf(x.name) === -1) };
      }))
      .pipe(tap(x => console.log(`END activeSeries$`)));
  }

  ngOnDestroy(): void {
  }

  clearDisabledSeriesNames() {
    this.disabledSeriesNames = null;
  }

  setSeriesAdjustment(adjustments: [ForecastSeriesInfo, TruthToPlotSource][]) {
    const map = new Map<string, TruthToPlotSource>([...this._seriesAdjustments.getValue().entries()]);
    adjustments.forEach(([series, adjustTo]) => {
      if (adjustTo) {
        map.set(series.name, adjustTo);
      } else {
        map.delete(series.name);
      }
    });
    this._seriesAdjustments.next(map);
  }

  private createForecastSeries(data: ForecastToPlot[], settings: ForecastSettings): ForecastSeriesInfo[] {
    if (!settings || !settings.location || !settings.plotValue || !settings.displayMode || !data || data.length === 0) return [];

    const seriesFactory = this.getSeriesFactory(settings.displayMode);
    return _.chain(data)
      .filter(x => x.location === settings.location.id && x.target.value_type === settings.plotValue)
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
        const points = g.filter(c => c.type !== ForecastToPlotType.Quantile);

        const intervals = settings.confInterval !== null && quantiles
          .groupBy(x => x.target.end_date.toISOString())
          .reduce((prev, curr, key) => {
            const l = _.find(curr, c => c.quantile.type === settings.confInterval && c.quantile.point === QuantilePointType.Lower);
            const u = _.find(curr, c => c.quantile.type === settings.confInterval && c.quantile.point === QuantilePointType.Upper);
            prev.set(key, {
              lower: this.getYValue(l, x.key, settings.seriesAdjustments),
              upper: this.getYValue(u, x.key, settings.seriesAdjustments)
            });
            return prev;
          }, new Map<string, Interval>())
          .value();

        return points.map(p => {
          const linePoint = { $type: 'ForecastSeriesInfoDataItem', x: p.target.end_date, y: this.getYValue(p, x.key, settings.seriesAdjustments), dataPoint: p } as ForecastSeriesInfoDataItem;
          if (intervals && p.type === ForecastToPlotType.Point && intervals.has(linePoint.x.toISOString())) {
            linePoint.interval = intervals.get(linePoint.x.toISOString());
          }
          return linePoint;
        });
      })
      .filter(d => d !== null)
      .value();

    return {
      $type: 'ForecastHorizonSeriesInfo',
      targetSource: firstDataPoint.truth_data_source,
      name: x.key,
      style: {
        color: this._forecastSeriesColors[index % this._forecastSeriesColors.length],
        symbol: this.getSymbol(firstDataPoint.truth_data_source)
      },
      data: data
    };
  }

  private getYValue(dataItem: ForecastToPlot, modelName: string, seriesAdjustments: Map<string, TruthToPlotSource>): number {
    let y = dataItem.value;
    if (seriesAdjustments && seriesAdjustments.has(modelName)) {
      const adjustedTo = seriesAdjustments.get(modelName);
      y += dataItem.shifts.get(adjustedTo);
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
        prev.set(key, {
          lower: this.getYValue(l, x.key, settings.seriesAdjustments),
          upper: this.getYValue(u, x.key, settings.seriesAdjustments)
        });
        return prev;
      }, new Map<string, Interval>())
      .value();

    const data = orderedData
      .filter(d => d.type === ForecastToPlotType.Point || d.type === ForecastToPlotType.Observed)
      .map((d, i, array) => {
        const y = this.getYValue(d, x.key, settings.seriesAdjustments);
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
      targetSource: firstDataPoint.truth_data_source,
      name: x.key,
      style: {
        color: this._forecastSeriesColors[index % this._forecastSeriesColors.length],
        symbol: this.getSymbol(firstDataPoint.truth_data_source)
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

  private createTruthSeries(dataSource: DataSource, location: LocationLookupItem, plotValue: TruthToPlotValue): DataSourceSeriesInfo {
    if (!location || !plotValue) return null;

    const seriesData = !location ? [] : _.chain(dataSource.data)
      .filter(x => x.idLocation === location.id)
      .orderBy(x => x.date.toDate())
      .map(d => ({ x: d.date, y: d[plotValue], dataPoint: null } as DataSourceSeriesInfoDataItem))
      .value();

    if (seriesData.length === 0) return null;

    const color = this._dataSourceSeriesColors.get(dataSource.name);
    return { $type: 'DataSourceSeriesInfo', source: dataSource.name, name: dataSource.name, data: seriesData, style: { symbol: this.getSymbol(dataSource.name), color } };
  }
}
