import { Component, OnInit, Input, SimpleChanges, OnChanges, OnDestroy } from '@angular/core';
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
import { SeriesInfo, DataSourceSeriesInfo, ForecastSeriesInfo } from 'src/app/models/series-info';

@Component({
  selector: 'app-forecast-plot',
  templateUrl: './forecast-plot.component.html',
  styleUrls: ['./forecast-plot.component.scss']
})
export class ForecastPlotComponent implements OnInit, OnDestroy {
  private _lastDataZoom: { start: any; end: any; };

  private _chart: ECharts;
  private _highlightSubscription: Subscription;

  chartOption$: Observable<EChartOption<EChartOption.Series>>;

  constructor(private stateService: ForecastPlotService) {

  }

  ngOnDestroy(): void {
    this._highlightSubscription.unsubscribe();
  }

  ngOnInit(): void {
    this._highlightSubscription = this.stateService.highlightedSeries$.subscribe(x => this._updateHighlight(x));

    this.chartOption$ = combineLatest([
      this.stateService.activeSeries$
        .pipe(map(x => this._createSeries(x))),
      this.stateService.forecastDate$
        .pipe(map(x => this._createForecastLine(x))),
      this.stateService.dateRange$
    ]).pipe(map(([series, forecastDateSeries, dateRange]) => {
      const allSeries = (series || []).concat([forecastDateSeries]);
      const r = this._createChartOption(allSeries, dateRange);
      console.log("created chartOptions", r, "for", allSeries, dateRange);
      return r;
    }))
      .pipe(tap(() => {
        // setTimeout(() => this._resizeChart());
        setTimeout(() => this._updateHighlight(this.stateService.highlightedSeries));
      }));
  }

  onDataZoom(event) {
    const dataZoom = event.batch[0];
    this._lastDataZoom = { start: dataZoom.start, end: dataZoom.end };
  }

  onChartInit(event: ECharts) {
    this._chart = event;
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
      // interval: 1000 * 3600 * 24,
      minInterval: 1000 * 3600 * 24 * 7,
      // maxInterval: 1000 * 3600 * 24 * 7 * 2,
      // axisLabel: {
      //   formatter: (value, index) => {
      //     return moment(value).format('YYYY-MM-DD - hh:mm:ss');
      //   }
      // }
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
      tooltip: { trigger: 'axis' },
      dataZoom: [dzXInside, dzXSlider],
      series: series,
    };
  }

  private _createSeries(seriesData: SeriesInfo[]) {
    if (!seriesData || seriesData.length === 0) return [];
    return seriesData.map(x => ({
      type: 'line',
      name: x.name,
      data: x.data.map(d => ([d.x.toDate(), d.y, d.dataPoint])),
      animation: x.$type === 'forecast',
      animationDuration: 500,
      color: x.style.color,
      symbol: x.style.symbol }));
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
