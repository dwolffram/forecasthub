import { Component, OnInit, OnChanges, Input, SimpleChanges, Output, EventEmitter } from '@angular/core';
import { ForecastToPlot, ForecastToPlotType } from 'src/app/models/forecast-to-plot';
import { LocationLookupItem, ForecastDateLookup } from 'src/app/models/lookups';
import { TruthToPlotValue, DataSource, TruthToPlotSource } from 'src/app/models/truth-to-plot';
import * as _ from 'lodash';
import { Subject, BehaviorSubject, forkJoin, combineLatest, Observable } from 'rxjs';
import { DataService } from 'src/app/services/data.service';
import { LookupService } from 'src/app/services/lookup.service';
import { shareReplay, map, tap } from 'rxjs/operators';
import * as moment from 'moment';
import { DataSourceLegendItem, LegendItem, isDataSourceLegendItem } from '../legend/legend.component';


export interface SeriesInfo {
  name: string;
  data: any[];
  source?: TruthToPlotSource;

  style: {
    color: string;
    symbol: string;
  }
}

interface ForecastInfo {
  forecastDate: moment.Moment;
  series: SeriesInfo[];
}

@Component({
  selector: 'app-plot-container',
  templateUrl: './plot-container.component.html',
  styleUrls: ['./plot-container.component.scss']
})
export class PlotContainerComponent implements OnInit, OnChanges {

  @Input() location: LocationLookupItem;
  @Input() plotValue: TruthToPlotValue;
  @Input() forecastDate: moment.Moment;
  @Output() changeForecastDate: EventEmitter<moment.Moment> = new EventEmitter<moment.Moment>();

  private _location$: Subject<LocationLookupItem> = new BehaviorSubject(null);
  private _enabledSeries$: Subject<SeriesInfo[]> = new BehaviorSubject([]);
  private _plotValue$: Subject<TruthToPlotValue> = new BehaviorSubject(TruthToPlotValue.CumulatedCases);
  private _forecastDate$: Subject<moment.Moment> = new BehaviorSubject(null)

  maxDate$: Observable<moment.Moment>;
  highlight: SeriesInfo[];
  legendContext$: Observable<{ items: DataSourceLegendItem[] }>;
  plotContext$: Observable<{ dataSources: SeriesInfo[], forecast: ForecastInfo }>;
  forecastDateLookup$: Observable<ForecastDateLookup>;

  constructor(private dataService: DataService, private lookupService: LookupService) {

  }

  ngOnInit(): void {
    this._initDataContext();
    this._initMaxDate();
    this._initForecastDateLookups();
  }
  private _initForecastDateLookups() {
    this.forecastDateLookup$ = this.lookupService.getForecastDates();
  }
  private _initMaxDate() {
    this.maxDate$ = this.lookupService.getForecastDates().pipe(map(x => moment(x.maximum).add(6, 'w')));
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes.location) {
      this._location$.next(this.location);
    }
    if (changes.plotValue) {
      this._plotValue$.next(this.plotValue);
    }
    if (changes.forecastDate) {
      this._forecastDate$.next(this.forecastDate);
    }
  }

  onEnabledLegendItemsChanged(enabledItems: LegendItem[]) {
    this._enabledSeries$.next(enabledItems.map(x => x.series));
  }

  changeForecastDateByDir(dir: 'prev' | 'next', lookup: ForecastDateLookup) {
    let dateUpdate = lookup.maximum;
    const index = lookup.getIndex(this.forecastDate);
    if (index >= 0) {
      const newIndex = dir === 'next' ? (index + 1) % lookup.items.length : (index - 1 < 0 ? lookup.items.length - 1 : index - 1);
      dateUpdate = lookup.items[newIndex];
    }
    this.changeForecastDate.emit(dateUpdate);
  }

  onHoverItem(item: LegendItem) {
    if (item === null) {
      this.highlight = null;
    } else if (isDataSourceLegendItem(item)) {
      this.highlight = [item.series, ...item.forecasts.map(x => x.series)]
    } else {
      this.highlight = [item.series];
    }
    // console.log("SETTED highlight", this.highlight);
  }

  private _forecastSeriesColors = ['#543005', '#8c510a', '#bf812d', '#dfc27d', '#f6e8c3', '#f5f5f5', '#c7eae5', '#80cdc1', '#35978f', '#01665e', '#003c30'];
  private _dataSourceSeriesColors = new Map<TruthToPlotSource, string>([[TruthToPlotSource.ECDC, 'red'], [TruthToPlotSource.JHU, 'blue']]);

  private _initDataContext() {
    const dataFilter$ = combineLatest(
      this._location$,
      this._plotValue$
    );

    const dataSourceData$ = forkJoin([
      this.dataService.getEcdcData(),
      this.dataService.getJhuData()]
    );

    const dataSources$ = combineLatest([dataSourceData$, dataFilter$])
      .pipe(map(([data, filter]) => {
        const [location, plotValue] = filter;
        const [ecdc, jhu] = data;

        const ecdcSeries = this.createTruthSeries(ecdc, location, plotValue);
        const jhuSeries = this.createTruthSeries(jhu, location, plotValue);

        return [ecdcSeries, jhuSeries];
      }));

    const forecasts$ = combineLatest([this.dataService.getForecasts(), dataFilter$, this._forecastDate$])
      .pipe(map(([data, [location, plotValue], forecastDate]) => {
        return this.createForecastSeries(data, location, plotValue, forecastDate);
      }));

    const merge$ = combineLatest([dataSources$, forecasts$])
      .pipe(map(([dataSources, forecast]) => ({ dataSources, forecast })))
      .pipe(tap(x => this._enabledSeries$.next([...x.dataSources, ...(x.forecast?.series || [])])));

    this.legendContext$ = merge$.pipe(map(x => {
      return { items: x.dataSources && x.forecast?.series ? this._createLegendItems(x.dataSources, x.forecast.series) : [] };
    }));

    this.plotContext$ = combineLatest([merge$, this._enabledSeries$])
      .pipe(map(([series, enabled]) => {
        return {
          dataSources: series?.dataSources ? series.dataSources.filter(x => enabled.some(e => x.name === e.name)) : [],
          forecast: series?.forecast
            ? {
              forecastDate: series.forecast.forecastDate,
              series: series.forecast.series.filter(x => enabled.some(e => e.name === x.name))
            }
            : { forecastDate: null, series: [] }
        };
      }));
  }

  private createForecastSeries(data: ForecastToPlot[], location: LocationLookupItem, plotValue: TruthToPlotValue, forecastDate: moment.Moment): ForecastInfo {
    return location && plotValue && forecastDate
      && {
      forecastDate,
      series:
        _.chain(data)
          .filter(x => x.location === location.id && x.type === ForecastToPlotType.Point && x.target.value_type === plotValue && x.timezero.isSame(forecastDate))
          .groupBy(x => x.model)
          .map((x, key) => ({ key, value: x }))
          .map((x, index) => {
            const dsName = _.head(x.value).truth_data_source;
            return {
              name: x.key,
              style: {
                color: this._forecastSeriesColors[index % this._forecastSeriesColors.length],
                symbol: this.getSymbol(dsName)
              },
              source: dsName,
              data: _.orderBy(x.value.map(d => {
                return {
                  value: [d.target.end_date.toDate(), d.value, d],
                };
              }), d => d[0])
            };
          })
          .value()
    };
  }

  private _createLegendItems(dataSourceSeries: SeriesInfo[], forecastSeries: SeriesInfo[]): DataSourceLegendItem[] {
    return _.map(_.groupBy(forecastSeries, x => x.source), (x, key) => {
      return { series: _.find(dataSourceSeries, { name: key }), enabled: true, forecasts: x.map(f => ({ series: f, enabled: true })) };
    });
  }

  private getSymbol(sourceName: TruthToPlotSource) {
    switch (sourceName) {
      case TruthToPlotSource.ECDC: return 'circle';
      case TruthToPlotSource.JHU: return 'triangle';
      default: throw new Error(`Unknown sourceName '${sourceName}'.`);
    }
  }

  private createTruthSeries(dataSource: DataSource, location: LocationLookupItem, plotValue: TruthToPlotValue): SeriesInfo {

    const seriesData = !location ? [] : _.chain(dataSource.data)
      .filter(x => x.idLocation === location.id)
      .orderBy(x => x.date.toDate())
      .map(d => [d.date.toDate(), d[plotValue]])
      .value();

    const color = this._dataSourceSeriesColors.get(dataSource.name);
    return { name: dataSource.name, data: seriesData, style: { symbol: this.getSymbol(dataSource.name), color } };
  }

}
