import { Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject, Subscription, forkJoin, combineLatest, Observable, pipe } from 'rxjs';
import { LocationLookupItem, ForecastDateLookup, LocationLookup } from '../models/lookups';
import { TruthToPlotValue, TruthToPlotSource, DataSource } from '../models/truth-to-plot';
import { LookupService } from './lookup.service';
import * as moment from 'moment';
import { ForecastToPlot, ForecastToPlotType } from '../models/forecast-to-plot';
import * as _ from 'lodash';
import { DataService } from './data.service';
import { map, tap, shareReplay } from 'rxjs/operators';
import { cache } from './service-helper';
import { SeriesInfo, ForecastSeriesInfo } from '../models/series-info';

@Injectable({
  providedIn: 'root'
})
export class ForecastPlotService implements OnDestroy {
  private readonly _location = new BehaviorSubject<LocationLookupItem>(null);
  private readonly _plotValue = new BehaviorSubject<TruthToPlotValue>(TruthToPlotValue.CumulatedCases);
  private readonly _forecastDate = new BehaviorSubject<moment.Moment>(null);
  private readonly _highlightedSeries = new BehaviorSubject<SeriesInfo[]>(null);
  private readonly _enabledSeries = new BehaviorSubject<SeriesInfo[]>(null);
  private readonly _maxDate = new BehaviorSubject<moment.Moment>(null);
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
  readonly enabledSeries$ = this._enabledSeries.asObservable();
  readonly maxDate$ = this._maxDate.asObservable();

  get location(): LocationLookupItem {
    return this._location.getValue();
  }

  set location(value: LocationLookupItem) {
    this._location.next(value);
  }

  get enabledSeries(): SeriesInfo[] {
    return this._enabledSeries.getValue();
  }
  set enabledSeries(value: SeriesInfo[]) {
    this._enabledSeries.next(value);
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

        this._maxDate.next(moment(dates.maximum).add(6, 'w'));

      });

    const dataFilter$ = combineLatest([
      this.location$,
      this.plotValue$
    ]);

    const dataSourceData$ = cache(() => forkJoin([
      this.dataService.getEcdcData(),
      this.dataService.getJhuData()]
    ))();

    const dataSources$ = combineLatest([dataSourceData$, dataFilter$])
      .pipe(map(([data, filter]) => {
        const [ecdc, jhu] = data;
        const [location, plotValue] = filter;

        const ecdcSeries = this.createTruthSeries(ecdc, location, plotValue);
        const jhuSeries = this.createTruthSeries(jhu, location, plotValue);

        return [ecdcSeries, jhuSeries].filter(x => x != null);
      }));

    const forecasts$ = combineLatest([this.dataService.getForecasts(), dataFilter$, this.forecastDate$])
      .pipe(map(([data, [location, plotValue], forecastDate]) => {
        return this.createForecastSeries(data, location, plotValue, forecastDate);
      }));

    this.series$ = combineLatest([dataSources$, forecasts$])
      .pipe(map((([ds, fc]) => (ds || []).concat(fc || []))));

    this.activeSeries$ = combineLatest([this.series$, this.enabledSeries$])
      .pipe(map(([series, enabledSeries]) => enabledSeries ?? series))
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


  private createForecastSeries(data: ForecastToPlot[], location: LocationLookupItem, plotValue: TruthToPlotValue, forecastDate: moment.Moment): SeriesInfo[] {
    return location && plotValue && forecastDate
      && _.chain(data)
        .filter(x => x.location === location.id && x.type === ForecastToPlotType.Point && x.target.value_type === plotValue && x.timezero.isSame(forecastDate))
        .groupBy(x => x.model)
        .map((x, key) => ({ key, value: x }))
        .map((x, index) => {
          const dsName = _.head(x.value).truth_data_source;
          return {
            $type: 'forecast',
            targetSource: dsName,
            name: x.key,
            style: {
              color: this._forecastSeriesColors[index % this._forecastSeriesColors.length],
              symbol: this.getSymbol(dsName)
            },
            data: _.orderBy(x.value.map(d => {
              return {
                value: [d.target.end_date.toDate(), d.value, d],
              };
            }), d => d[0])
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

  private createTruthSeries(dataSource: DataSource, location: LocationLookupItem, plotValue: TruthToPlotValue): SeriesInfo {
    if(!location || !plotValue) return null;

    const seriesData = !location ? [] : _.chain(dataSource.data)
      .filter(x => x.idLocation === location.id)
      .orderBy(x => x.date.toDate())
      .map(d => [d.date.toDate(), d[plotValue]])
      .value();

    const color = this._dataSourceSeriesColors.get(dataSource.name);
    return { $type: 'dataSource', source: dataSource.name, name: dataSource.name, data: seriesData, style: { symbol: this.getSymbol(dataSource.name), color } };
  }
}
