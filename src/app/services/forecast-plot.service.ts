import { Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject, Subscription, forkJoin, combineLatest, Observable, pipe, MonoTypeOperatorFunction } from 'rxjs';
import { LocationLookupItem, ForecastDateLookup, LocationLookup } from '../models/lookups';
import { TruthToPlotValue, TruthToPlotSource, DataSource } from '../models/truth-to-plot';
import { LookupService } from './lookup.service';
import * as moment from 'moment';
import { ForecastToPlot, ForecastToPlotType } from '../models/forecast-to-plot';
import * as _ from 'lodash';
import { DataService } from './data.service';
import { map, tap, shareReplay } from 'rxjs/operators';
import { SeriesInfo, ForecastSeriesInfo, DataSourceSeriesInfo } from '../models/series-info';

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
  // private readonly _series;// = new BehaviorSubject<SeriesInfo[]>(null);

  private _initSubscription: Subscription;
  private _lookups: { forecastDates: ForecastDateLookup, locations: LocationLookup };

  private _forecastSeriesColors = ['#543005', '#8c510a', '#bf812d', '#dfc27d', '#f6e8c3', '#f5f5f5', '#c7eae5', '#80cdc1', '#35978f', '#01665e', '#003c30'];
  private _dataSourceSeriesColors = new Map<TruthToPlotSource, string>([[TruthToPlotSource.ECDC, 'red'], [TruthToPlotSource.JHU, 'blue']]);

  readonly location$ = this._location.asObservable();
  readonly plotValue$ = this._plotValue.asObservable();
  readonly forecastDate$ = this._forecastDate.asObservable();
  readonly highlightedSeries$ = this._highlightedSeries.asObservable();
  readonly series$: Observable<SeriesInfo[]>;
  readonly activeSeries$: Observable<SeriesInfo[]>;
  readonly enabledSeriesNames$ = this._enabledSeriesNames.asObservable();
  readonly dateRange$ = this._dateRange.asObservable();

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


    const dataSourceData$ = forkJoin([this.dataService.getEcdcData(), this.dataService.getJhuData()])
      .pipe(shareReplay(1))
      .pipe(tap(x => console.log(`dataSourceData$ -> ${x}`)));

    const dataSources$ = combineLatest([dataSourceData$, this.location$, this.plotValue$])
      .pipe(tap(([data, location, plotValue]) => console.log(`START dataSources$ -> ${plotValue}`)))
      .pipe(map(([data, location, plotValue]) => {
        const [ecdc, jhu] = data;

        const ecdcSeries = this.createTruthSeries(ecdc, location, plotValue);
        const jhuSeries = this.createTruthSeries(jhu, location, plotValue);

        return [ecdcSeries, jhuSeries].filter(x => x != null);
      }))
      .pipe(tap(x => console.log(`END dataSources$}`)));

    const forecasts$ = combineLatest([this.dataService.getForecasts(), dataSources$, this.location$, this.plotValue$, this.forecastDate$])
      .pipe(tap(([data, dataSources, location, plotValue, forecastDate]) => console.log(`START forecasts$ -> ${JSON.stringify(plotValue)}`)))
      .pipe(map(([data, dataSources, location, plotValue, forecastDate]) => {
        return this.createForecastSeries(data, dataSources, location, plotValue, forecastDate);
      }))
      .pipe(tap(x => console.log(`END forecasts$}`)));

    this.series$ = combineLatest([dataSources$, forecasts$])
      .pipe(map(([ds, fc]) => {
        let result: SeriesInfo[] = [];
        if (ds) result = [...ds];
        if (fc) result = [...result, ...fc];
        return result;
      }))
      .pipe(tap(x => console.log(`series$`)));

    this.activeSeries$ = combineLatest([this.series$, this.enabledSeriesNames$])
      .pipe(map(([series, enabledSeriesNames]) => {
        if (!enabledSeriesNames) return series;
        return series.filter(x => enabledSeriesNames.indexOf(x.name) > -1);
      }))
      .pipe(tap(x => console.log(x => `activeSeries$`)));
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


  private createForecastSeries(data: ForecastToPlot[], dataSources: DataSourceSeriesInfo[], location: LocationLookupItem, plotValue: TruthToPlotValue, forecastDate: moment.Moment): SeriesInfo[] {
    if (!location || !plotValue || !forecastDate || !data || data.length === 0) return [];
    return _.chain(data)
      .filter(x => x.location === location.id && x.type === ForecastToPlotType.Point && x.target.value_type === plotValue && x.timezero.isSame(forecastDate) && dataSources.some(d => d.source === x.truth_data_source))
      .groupBy(x => x.model)
      .map((x, key) => ({ key, value: x }))
      .map((x, index) => {

        const forecastData = _.orderBy(x.value, d => d.target.end_date);
        const firstDataPoint = _.head(forecastData);
        const minDate = firstDataPoint.target.end_date;
        const ds = _.find(dataSources, x => x.source === firstDataPoint.truth_data_source);
        const lastSourceDataPoint = _.last(_.dropRightWhile(ds.data, x => x.x.isSameOrAfter(minDate)));
        // ds.data.
        const connectPoint = lastSourceDataPoint && { x: lastSourceDataPoint.x, y: lastSourceDataPoint.y, dataPoint: 'datasourceConnectorPoint' }
        const mappedData = forecastData.map(x => ({ x: x.target.end_date, y: x.value, dataPoint: x }));
        const data = connectPoint ? [connectPoint, ...mappedData] : mappedData;

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
      .map(d => ({ x: d.date, y: d[plotValue], dataPoint: null }))
      .value();

    if(seriesData.length === 0) return null;

    const color = this._dataSourceSeriesColors.get(dataSource.name);
    return { $type: 'dataSource', source: dataSource.name, name: dataSource.name, data: seriesData, style: { symbol: this.getSymbol(dataSource.name), color } };
  }
}
