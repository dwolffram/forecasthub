import { Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject, Subscription, forkJoin, combineLatest, Observable, pipe, MonoTypeOperatorFunction } from 'rxjs';
import { LocationLookupItem, ForecastDateLookup, LocationLookup } from '../models/lookups';
import { TruthToPlotValue, TruthToPlotSource, DataSource } from '../models/truth-to-plot';
import { LookupService } from './lookup.service';
import * as moment from 'moment';
import { ForecastToPlot, ForecastToPlotType, QuantilePointType, QuantileType } from '../models/forecast-to-plot';
import * as _ from 'lodash';
import { DataService } from './data.service';
import { map, tap, shareReplay } from 'rxjs/operators';
import { SeriesInfo, ForecastSeriesInfo, DataSourceSeriesInfo, ForecastSeriesInfoDataItem, Interval, DataSourceSeriesInfoDataItem } from '../models/series-info';

// TODO: forecast horizon
interface ForecastSettings {
  location: LocationLookupItem;
  plotValue: TruthToPlotValue;
  forecastDate: moment.Moment;
  seriesAdjustments: Map<string, TruthToPlotSource>;
  confInterval: QuantileType;
}

@Injectable({
  providedIn: 'root'
})
export class ForecastPlotService implements OnDestroy {
  private readonly _location = new BehaviorSubject<LocationLookupItem>(null);
  private readonly _plotValue = new BehaviorSubject<TruthToPlotValue>(TruthToPlotValue.CumulatedCases);
  private readonly _forecastDate = new BehaviorSubject<moment.Moment>(null);
  private readonly _highlightedSeries = new BehaviorSubject<SeriesInfo[]>(null);
  private readonly _enabledSeriesNames = new BehaviorSubject<string[]>(null);
  private readonly _dateRange = new BehaviorSubject<[moment.Moment, moment.Moment]>(null);
  private readonly _seriesAdjustments = new BehaviorSubject<Map<string, TruthToPlotSource>>(new Map<string, TruthToPlotSource>());
  private readonly _confidenceInterval = new BehaviorSubject<QuantileType>(null);

  private _initSubscription: Subscription;
  private _lookups: { forecastDates: ForecastDateLookup, locations: LocationLookup };

  private _forecastSeriesColors = ['#543005', '#003c30', '#8c510a', '#01665e', '#bf812d', '#35978f', '#dfc27d', '#80cdc1', '#f6e8c3', '#c7eae5', '#f5f5f5',];
  private _dataSourceSeriesColors = new Map<TruthToPlotSource, string>([[TruthToPlotSource.ECDC, 'red'], [TruthToPlotSource.JHU, 'blue']]);

  readonly location$ = this._location.asObservable();
  readonly plotValue$ = this._plotValue.asObservable();
  readonly forecastDate$ = this._forecastDate.asObservable();
  readonly highlightedSeries$ = this._highlightedSeries.asObservable();
  readonly series$: Observable<{ data: SeriesInfo[], settings: { location: LocationLookupItem, plotValue: TruthToPlotValue, forecastDate: moment.Moment } }>;
  readonly activeSeries$: Observable<{ data: SeriesInfo[], settings: { location: LocationLookupItem, plotValue: TruthToPlotValue, forecastDate: moment.Moment } }>;
  readonly enabledSeriesNames$ = this._enabledSeriesNames.asObservable();
  readonly dateRange$ = this._dateRange.asObservable();
  readonly seriesAdjustments$ = this._seriesAdjustments.asObservable();
  readonly confidenceInterval$ = this._confidenceInterval.asObservable();

  get location(): LocationLookupItem {
    return this._location.getValue();
  }

  set location(value: LocationLookupItem) {
    this._location.next(value);
  }

  get enabledSeriesNames(): string[] {
    return this._enabledSeriesNames.getValue();
  }
  set enabledSeriesNames(value: string[]) {
    this._enabledSeriesNames.next(value);
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

  get forecastDate(): moment.Moment {
    return this._forecastDate.getValue();
  }

  set forecastDate(value: moment.Moment) {
    this._forecastDate.next(value);
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
    this._initSubscription = forkJoin([this.lookupService.getForecastDates(), this.lookupService.getLocations()])
      .subscribe(([dates, locations]) => {
        this._lookups = { forecastDates: dates, locations };

        if (this.location === null) {
          this.location = locations.get('GM');
        }
        if (this.forecastDate === null) {
          this.forecastDate = dates.maximum;
        }
        this._dateRange.next([moment(dates.minimum).add(-3, 'w').endOf('day'), moment(dates.maximum).add(6, 'w').endOf('day')]);
      });

    const allSettings$ = combineLatest([this.location$, this.plotValue$]);
    const forecastSettings$ = combineLatest([allSettings$, this.forecastDate$, this.seriesAdjustments$, this.confidenceInterval$])
      .pipe(map(([[location, plotValue], forecastDate, seriesAdjustments, confInterval]) => ({ location, plotValue, forecastDate, seriesAdjustments, confInterval } as ForecastSettings)));

    const dataSourceData$ = forkJoin([this.dataService.getEcdcData(), this.dataService.getJhuData()])
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

    const forecasts$ = combineLatest([this.dataService.getForecasts(), forecastSettings$])
      // .pipe(tap(([data, dataSources, forecastDate]) => console.log(`START forecasts$ -> ${JSON.stringify(dataSources.settings.plotValue)}`)))
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

    this.activeSeries$ = combineLatest([this.series$, this.enabledSeriesNames$])
      .pipe(tap(x => console.log(`START activeSeries$`)))
      .pipe(map(([series, enabledSeriesNames]) => {
        if (!enabledSeriesNames) return series;
        return { settings: { ...series.settings }, data: series.data.filter(x => enabledSeriesNames.indexOf(x.name) > -1) };
      }))
      .pipe(tap(x => console.log(`END activeSeries$`)));
  }

  ngOnDestroy(): void {
    this._initSubscription.unsubscribe();
  }

  changeForecastDateByDir(dir: 'next' | 'prev') {
    if (this._lookups.forecastDates) {
      const dates = this._lookups.forecastDates;

      let dateUpdate = dates.maximum;
      const index = this._lookups.forecastDates.getIndex(this.forecastDate);
      if (index >= 0) {
        const newIndex = dir === 'next'
          ? (index + 1) % dates.items.length
          : (index - 1 < 0 ? dates.items.length - 1 : index - 1);
        dateUpdate = dates.items[newIndex];
      }
      this.forecastDate = dateUpdate;
    }
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
    if (!settings || !settings.location || !settings.plotValue || !settings.forecastDate || !data || data.length === 0) return [];
    return _.chain(data)
      .filter(x => x.location === settings.location.id &&
        // (x.type === ForecastToPlotType.Point || x.type === ForecastToPlotType.Observed) &&
        x.target.value_type === settings.plotValue &&
        x.timezero.isSame(settings.forecastDate))
      .groupBy(x => x.model)
      .map((x, key) => ({ key, value: x }))
      .map((x, index) => {

        const orderedData = _.chain(x.value).orderBy(d => d.target.end_date);
        const firstDataPoint = orderedData.head().value();

        const intervals = settings.confInterval !== null && orderedData.filter(d => d.type === ForecastToPlotType.Quantile)
          .groupBy(x => x.target.end_date.toISOString())
          .reduce((prev, curr, key) => {
            prev.set(key, {
              lower: _.find(curr, c => c.quantile.type === settings.confInterval && c.quantile.point === QuantilePointType.Lower).value,
              upper: _.find(curr, c => c.quantile.type === settings.confInterval && c.quantile.point === QuantilePointType.Upper).value
            });
            return prev;
          }, new Map<string, Interval>())
          .value();

        const data = orderedData
          .filter(d => d.type === ForecastToPlotType.Point || d.type === ForecastToPlotType.Observed)
          .map((d, i, array) => {
            let y = d.value;
            if (settings.seriesAdjustments && settings.seriesAdjustments.has(x.key)) {
              const adjustedTo = settings.seriesAdjustments.get(x.key);
              y += d.shifts.get(adjustedTo);
            }

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
          $type: 'forecast',
          targetSource: firstDataPoint.truth_data_source,
          name: x.key,
          style: {
            color: this._forecastSeriesColors[index % this._forecastSeriesColors.length],
            symbol: this.getSymbol(firstDataPoint.truth_data_source)
          },
          data: data
        } as ForecastSeriesInfo;
      })
      .value();
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
    return { $type: 'dataSource', source: dataSource.name, name: dataSource.name, data: seriesData, style: { symbol: this.getSymbol(dataSource.name), color } };
  }
}
