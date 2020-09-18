import { Component, OnInit, Input, SimpleChanges, OnChanges, OnDestroy, NgZone } from '@angular/core';
import { Observable, BehaviorSubject, Subject, combineLatest, forkJoin, Subscription } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import { EChartOption, ECharts } from 'echarts';
import * as _ from 'lodash';
import { LocationLookupItem, LocationId, LocationLookup } from 'src/app/models/lookups';
import { keyBy, indexOf, groupBy } from 'lodash';
import { DataService } from 'src/app/services/data.service';
import { TruthToPlot, TruthToPlotValue, DataSource, TruthToPlotSource } from 'src/app/models/truth-to-plot';
import { ForecastToPlot, ForecastToPlotType, ForecastToPlotTarget } from 'src/app/models/forecast-to-plot';
import { ForecastToPlotDto } from 'src/app/models/forecast-to-plot.dto';
import { off } from 'process';
import { LookupService } from 'src/app/services/lookup.service';
import * as moment from 'moment';
import { ForecastPlotService } from 'src/app/services/forecast-plot.service';
import { SeriesInfo, DataSourceSeriesInfo, ForecastSeriesInfo, SeriesInfoDataItem, ForecastDateSeriesInfo } from 'src/app/models/series-info';
import { settings } from 'cluster';

@Component({
  selector: 'app-forecast-plot',
  templateUrl: './forecast-plot.component.html',
  styleUrls: ['./forecast-plot.component.scss']
})
export class ForecastPlotComponent implements OnInit, OnDestroy {
  private _lastDataZoom: { start: any; end: any; };

  private _chart: any;
  private _highlightSubscription: Subscription;

  chartOption$: Observable<EChartOption<EChartOption.Series>>;

  constructor(private stateService: ForecastPlotService, private zone: NgZone) {

  }

  ngOnDestroy(): void {
    this._highlightSubscription.unsubscribe();
  }

  ngOnInit(): void {
    this._highlightSubscription = this.stateService.highlightedSeries$.subscribe(x => this._updateHighlight(x));

    this.chartOption$ = combineLatest([
      this.stateService.activeSeries$
        .pipe(map(x => {
          const result = this._createSeries(x.data, x.settings.location);
          if (x.settings?.displayMode?.$type && x.settings.displayMode.$type === 'ForecastDateDisplayMode') {
            result.push(this._createForecastLine(x.settings.displayMode.date))
          }
          return result;
        })),
      // this.stateService.forecastDate$
      //   .pipe(map(x => this._createForecastLine(x))),
      this.stateService.dateRange$
    ]).pipe(map(([series, dateRange]) => {
      const r = this._createChartOption(series, dateRange);
      console.log("created chartOptions", r, "for", series, dateRange);
      return r;
    }))
      .pipe(tap(() => {
        // setTimeout(() => this._resizeChart());
        setTimeout(() => this._updateHighlight(this.stateService.highlightedSeries));
      }));
  }

  onDataZoom(event) {
    if (event.batch) {
      const dataZoom = event.batch[0];
      this._lastDataZoom = { start: dataZoom.start, end: dataZoom.end };
    } else {
      this._lastDataZoom = { start: event.start, end: event.end };
    }
  }

  onChartClick(event) {
    console.log("CLICK", event);
  }

  onChartInit(event: ECharts) {
    this._chart = event;

    const zr = this._chart.getZr();
    zr.on('click', x => {
      const model = this._chart.getModel();
      const component = model.getComponent('axisPointer');
      if (component) {
        const axesInfo: any = _.head(_.values(component.coordSysAxesInfo.axesInfo));
        if (axesInfo?.axisPointerModel?.option) {
          this.zone.run(() => {
            this.stateService.changeForecastDateToClosest(moment(axesInfo.axisPointerModel.option.value))
          });
        }
      }
    });

  }

  private _resizeChart() {
    if (this._chart) {
      this._chart.resize();
    }
  }

  private _updateHighlight(highlights: SeriesInfo[]) {
    if (this._chart) {
      if (highlights && highlights.length > 0) {
        const seriesName = _.map(highlights, x => x.name);
        this._chart.dispatchAction({ type: 'highlight', seriesName });
      } else {
        this._chart.dispatchAction({ type: 'downplay' });
      }

    }
  }

  private _createChartOption(series: any[], dateRange: [moment.Moment, moment.Moment]): EChartOption<EChartOption.Series> {
    const dzXInside: any = { type: 'inside', filterMode: 'filter', xAxisIndex: 0, minValueSpan: 1000 * 3600 * 24 * 7 * 10 };
    const dzXSlider: any = { type: 'slider', filterMode: 'filter', xAxisIndex: 0, minValueSpan: 1000 * 3600 * 24 * 7 * 10 };

    if (this._lastDataZoom) {
      dzXInside.start = this._lastDataZoom.start;
      dzXInside.end = this._lastDataZoom.end;
    }

    const xAxis: any = {
      type: 'time',
      minInterval: 1000 * 3600 * 24 * 7,
    };

    if (dateRange) {
      xAxis.min = dateRange[0].toDate();
      xAxis.max = dateRange[1].toDate();
    }

    return {
      grid: {
        top: 20,
        left: 60,
        right: 20,
        bottom: 60
      },
      xAxis: xAxis,
      yAxis: { type: 'value', scale: true },
      tooltip: { trigger: 'axis', axisPointer: { show: true } },
      dataZoom: [dzXInside, dzXSlider],
      series: series,
    };
  }

  private _createSeries(seriesData: SeriesInfo[], location: LocationLookupItem) {
    if (!seriesData || seriesData.length === 0) return [];
    return _.flatMap(seriesData, (x, i) => {
      if (x.$type === 'ForecastHorizonSeriesInfo') {
        return x.data.map(d => {
          return {
            type: 'line',
            name: x.name,
            data: d.map(p => ([p.x.toDate(), p.y, p.dataPoint])),
            markArea: {
              itemStyle: {
                color: x.style.color,
                opacity: 0.4
              },
              data: d.filter(p => !!p.interval).map(p => {
                // p.interval
                return [
                  { xAxis: moment(p.x).add(-2, 'd').toDate(), yAxis: p.interval.upper },
                  { xAxis: moment(p.x).add(2, 'd').toDate(), yAxis: p.interval.lower }
                ]
              })
            },
            // animation: x.$type === 'forecast',
            animationDuration: 100,
            color: x.style.color,
            symbol: x.style.symbol
          };
        });
      } else {
        const line: any = {
          type: 'line',
          name: x.name,
          id:  `${location?.id || ''} - ${i}`,
          data: (x.data as SeriesInfoDataItem[]).map(d => ([d.x.toDate(), d.y, d.dataPoint])),
          // animation: x.$type === 'ForecastDateSeriesInfo',
          animationDuration: 500,
          color: x.style.color,
          symbol: x.style.symbol
        };

        const band = this._createConfidenceBand(x);

        return [line, ...band];
      }
    });
  }

  private _createConfidenceBand(x: SeriesInfo): any[] {
    if (x.$type === 'ForecastDateSeriesInfo') {
      const intervalData = x.data.filter(x => !!x.interval);
      if (intervalData.length > 0) {
        const def = {
          type: 'line',
          animationDuration: 500,
          lineStyle: {
            opacity: 0
          },
          stack: 'confidence-band - ' + x.name,
          color: x.style.color,
          symbol: 'none'
        };

        return [
          { ...def, name: x.name + '-confidence-lower', data: intervalData.map(d => [d.x.toDate(), d.interval.lower]) },
          {
            ...def, name: x.name + '-confidence-upper', areaStyle: { color: x.style.color, opacity: 0.4 },
            data: intervalData.map(d => [d.x.toDate(), d.interval.upper - d.interval.lower])
          }
        ];
      }
    }
    return [];
  }

  private _createForecastLine(forecastDate: moment.Moment): any {

    return forecastDate
      ? {
        type: 'line',
        markLine: {
          animation: false,
          silent: true,
          symbol: 'none',
          label: {
            formatter: forecastDate.format('YYYY-MM-DD')
          },
          itemStyle: { color: '#333' },
          data: [
            { xAxis: forecastDate.toDate() }
          ]
        }
      }
      : null;
  }

}
