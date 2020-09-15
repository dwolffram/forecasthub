import { Component, OnInit, Input, SimpleChanges, OnChanges } from '@angular/core';
import { Observable, BehaviorSubject, Subject, combineLatest, forkJoin } from 'rxjs';
import { map } from 'rxjs/operators';
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
import { SeriesInfo } from '../plot-container/plot-container.component';

@Component({
  selector: 'app-forecast-plot',
  templateUrl: './forecast-plot.component.html',
  styleUrls: ['./forecast-plot.component.scss']
})
export class ForecastPlotComponent implements OnInit, OnChanges {

  @Input() dataSources: SeriesInfo[];
  @Input() forecasts: SeriesInfo[];
  @Input() maxDate: moment.Moment;
  @Input() forecastDate: moment.Moment;
  @Input() highlight: SeriesInfo[];

  private _dataSourceSeries: any[];
  private _forecastSeries: any[];
  private _forecastDateSeries: any;
  private _lastDataZoom: { start: any; end: any; };

  chartOption: EChartOption<EChartOption.Series>;
  private _chart: ECharts;


  ngOnChanges(changes: SimpleChanges): void {
    if (changes.dataSources || changes.forecasts || changes.forecastDate) {
      if (changes.dataSources) {
        this._dataSourceSeries = this._createDataSourceSeries(this.dataSources);
      }
      if (changes.forecasts) {
        this._forecastSeries = this._createForecastSeries(this.forecasts);
      }
      if (changes.forecastDate) {
        this._forecastDateSeries = this._createForecastLine(this.forecastDate);
      }
      this._updateChartOption();
    }

    this._updateHighlight();
  }

  private _updateHighlight() {
    if (this._chart) {
      if (this.highlight && this.highlight.length > 0) {
        const h = _.map(this.highlight, x => x.name);
        setTimeout(() => {
          // console.log("PERFORMING HIGHLIGHT", {
          //   type: 'highlight',
          //   seriesName: h
          // });
          this._chart.dispatchAction({
            type: 'highlight',
            seriesName: h
          });
        }, 80);
      } else {
        this._chart.dispatchAction({ type: 'downplay' });
      }

    }
  }

  private _updateChartOption(): void {
    const dzXInside: any = { type: 'inside', filterMode: 'filter', xAxisIndex: 0 };
    if (this._lastDataZoom) {
      dzXInside.start = this._lastDataZoom.start;
      dzXInside.end = this._lastDataZoom.end;
    }

    let series = [];
    if (this._dataSourceSeries) {
      series = series.concat(this._dataSourceSeries);
    }
    if (this._forecastSeries) {
      series = series.concat(this._forecastSeries);
    }
    if (this._forecastDateSeries) {
      series = series.concat([this._forecastDateSeries]);
    }

    const xAxis: any = {
      type: 'time',
      interval: 1000 * 3600 * 24,
      axisLabel: {
        formatter: (value, index) => {
          return moment(value).format('YYYY-MM-DD - hh:mm:ss');
        }
      }
    };

    if (this.maxDate) {
      xAxis.max = this.maxDate.toDate()
    }

    this.chartOption = {
      xAxis: xAxis,
      yAxis: { type: 'value', scale: true },
      tooltip: { trigger: 'axis' },
      dataZoom: [dzXInside],
      series: series,
    };
  }

  constructor() { }

  ngOnInit(): void {
    // this.chartData$ = combineLatest([
    //   combineLatest(
    //     this._location$,
    //     this._plotValue$
    //   ),
    //   // this._zoom$,
    //   forkJoin([this.dataService.getEcdcData(), this.dataService.getJhuData()]),
    //   this._forecastDate$,
    //   this.dataService.getForecasts(),
    //   this.lookupService.getForecastDates()
    // ]).pipe(map(([[location, plotValue], [ecdc, jhu], forecastDate, forecasts, forecastDateLus]) => {

    //   const forecastDateLine = this.createForecastLine(forecastDate);
    //   const series: any[] = [ecdcSeries, jhuSeries, ...forecastSeries, forecastDateLine];
    //   const seriesInfo: SeriesInfo[] = [
    //     { name: ecdcSeries.name, enabled: true, style: { color: 'red', fillColor: 'red', symbol: 'circle' } },
    //     { name: jhuSeries.name, enabled: true, style: { color: 'darkblue', fillColor: 'darkblue', symbol: 'triangle' } },
    //     ...forecastSeries.map(x => ({ name: x.name, enabled: true, style: { color: x.color, fillColor: 'none', symbol: 'circle' } }))
    //   ]

    //   const defaultChartOption = this.getDefaultChartOptions();
    //   return {
    //     chartOption: {
    //       ...defaultChartOption,
    //       xAxis: {
    //         ...defaultChartOption.xAxis,
    //         max: moment(forecastDateLus.maximum).add(6, 'w').toDate()
    //       },
    //       series
    //     },
    //     seriesInfo,
    //     debug: {}
    //   };
    // }));
  }

  onDataZoom(event) {
    const dataZoom = event.batch[0];
    this._lastDataZoom = { start: dataZoom.start, end: dataZoom.end };
  }

  onChartInit(event: ECharts) {
    this._chart = event;
  }

  private _createForecastSeries(seriesData: SeriesInfo[]) {
    return (seriesData && seriesData.length > 0) ? seriesData.map(x => ({ type: 'line', name: x.name, data: x.data, color: x.style.color, symbol: x.style.symbol })) : [];
  }

  private _createDataSourceSeries(dataSources: SeriesInfo[]) {
    return (dataSources && dataSources.length > 0) ? dataSources.map(x => ({ type: 'line', name: x.name, data: x.data, color: x.style.color, symbol: x.style.symbol })) : [];
  }


  private _createForecastLine(forecastDate: moment.Moment): any {

    return forecastDate
      ? {
        type: 'line',
        markLine: {
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
