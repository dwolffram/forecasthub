import { Component, OnInit, Input, SimpleChanges, OnChanges, OnDestroy, NgZone } from '@angular/core';
import { Observable, BehaviorSubject, Subject, combineLatest, forkJoin, Subscription } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import { EChartOption, ECharts } from 'echarts';
import * as _ from 'lodash';
import { LocationLookupItem, LocationId, LocationLookup, ForecastDateLookup } from 'src/app/models/lookups';
import { keyBy, indexOf, groupBy } from 'lodash';
import { DataService } from 'src/app/services/data.service';
import { TruthToPlot, TruthToPlotValue, DataSource, TruthToPlotSource } from 'src/app/models/truth-to-plot';
import { ForecastToPlot, ForecastToPlotType, ForecastToPlotTarget } from 'src/app/models/forecast-to-plot';
import { ForecastToPlotDto } from 'src/app/models/forecast-to-plot.dto';
import { off } from 'process';
import { LookupService } from 'src/app/services/lookup.service';
import * as moment from 'moment';
import { ForecastPlotService, ForecastSettings } from 'src/app/services/forecast-plot.service';
import { SeriesInfo, DataSourceSeriesInfo, ForecastSeriesInfo, SeriesInfoDataItem, ForecastDateSeriesInfo, ModelInfo, ForecastSeriesInfoDataItem, DataSourceSeriesInfoDataItem, Interval } from 'src/app/models/series-info';
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

  data$: Observable<{ chartOptions: EChartOption<EChartOption.Series>, dates: ForecastDateLookup, settings: ForecastSettings }>;

  constructor(private stateService: ForecastPlotService, private lookupService: LookupService) {

  }

  ngOnDestroy(): void {
    this._highlightSubscription.unsubscribe();
  }

  ngOnInit(): void {
    this._highlightSubscription = this.stateService.highlightedSeries$.subscribe(x => this._updateHighlight(x));

    const chartOption$ = combineLatest([
      this.stateService.activeSeries$
        .pipe(map(x => {
          const result = this._createSeries(x.data, x.settings);
          if (x.settings?.displayMode?.$type && x.settings.displayMode.$type === 'ForecastDateDisplayMode') {
            result.push(this._createForecastLine(x.settings.displayMode.date))
          }
          return [result, x.settings] as [any[], ForecastSettings];
        })),
      this.stateService.dateRange$
    ])
      .pipe(map(([[series, settings], dateRange]) => {
        const r = this._createChartOption(series, dateRange, settings);
        console.log("created chartOptions", r, "for", series, dateRange);
        return [r, settings] as [EChartOption<EChartOption.Series>, ForecastSettings];
      }));

    this.data$ = combineLatest([chartOption$, this.lookupService.forecastDates$])
      .pipe(map(([[chartOptions, settings], dates]) => {
        return { chartOptions, dates, settings }
      }));
  }

  zrClick(event: any, dates: ForecastDateLookup, currentSettings: ForecastSettings) {
    if (currentSettings.displayMode.$type === 'ForecastDateDisplayMode') {
      const model = event.chart.getModel();
      const component = model.getComponent('axisPointer');
      if (component) {
        const axesInfo: any = _.head(_.values(component.coordSysAxesInfo.axesInfo));
        if (axesInfo?.axisPointerModel?.option) {
          const axisDate = moment(axesInfo.axisPointerModel.option.value);
          const closestDate = dates.getClosest(axisDate);
          this.stateService.userDisplayMode = { $type: 'ForecastDateDisplayMode', date: closestDate };
        }
      }
    }
  }

  onDataZoom(event) {
    if (event.batch) {
      const dataZoom = event.batch[0];
      this._lastDataZoom = { start: dataZoom.start, end: dataZoom.end };
    } else {
      this._lastDataZoom = { start: event.start, end: event.end };
    }
  }


  onChartInit(event: ECharts) {
    this._chart = event;
  }

  private _resizeChart() {
    if (this._chart) {
      this._chart.resize();
    }
  }

  private _updateHighlight(highlights: ModelInfo[]) {
    if (this._chart) {
      if (highlights && highlights.length > 0) {
        const modelName = _.map(highlights, x => x.name);
        console.log("highlighting", modelName);
        this._chart.dispatchAction({ type: 'highlight', seriesName: modelName });
      } else {
        this._chart.dispatchAction({ type: 'downplay' });
      }

    }
  }


  private _createChartOption(series: any[], dateRange: [moment.Moment, moment.Moment], settings: ForecastSettings): EChartOption<EChartOption.Series> {
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

    let ttFormatter = (params: EChartOption.Tooltip.Format | EChartOption.Tooltip.Format[]): string => {
      if (Array.isArray(params)) {
        const dps = _.chain(params)
          .filter(x => Array.isArray(x.value) && x.value.length >= 4 && x.value.length <= 5)
          .map(x => {
            return {
              seriesName: x.seriesName,
              axisValue: x.axisValue,
              marker: this.createTooltipMarker(x.value[3]),
              item: x.value[2] as SeriesInfoDataItem,
              seriesInfo: x.value[3] as SeriesInfo,
              label: x.seriesName,
              value: x.value[1],
              interval: (<any[]>x.value).length === 5 && <Interval>x.value[4]
            }
          })
          .groupBy(x => x.seriesInfo.model.source)
          .map((x, key) => {
            const groupHeader = _.find(x, s => s.seriesInfo.$type === 'DataSourceSeriesInfo');
            const modelGroups = _.groupBy(_.orderBy(_.filter(x, s => s.seriesInfo.$type !== 'DataSourceSeriesInfo'), 'value', 'desc'), s => s.seriesInfo.model.name);

            const itemStrs = _.map(modelGroups, m => {
              const point = _.find(m, s => !s.interval);
              const ci = _.find(m, s => !!s.interval);
              return `${point.marker} ${point.label} ${point.value}` + (ci && ci.interval.lower !== ci.interval.upper ? ` (${ci.interval.lower} - ${ci.interval.upper})` : '');
            });

            const header = groupHeader ? `${groupHeader.marker} ${groupHeader.label} ${groupHeader.value}` : '';
            return `${header}${header && itemStrs.length > 0 ? '<br/>' : ''}${itemStrs.join('<br/>')}`;
          });

        return dps.value().join('<br/>');
      } else {
        return '?';
      }
    };
    if (settings.displayMode.$type === 'ForecastHorizonDisplayMode') {
      ttFormatter = (params: EChartOption.Tooltip.Format | EChartOption.Tooltip.Format[]): string => {
        if (Array.isArray(params)) {
          const dps = _.chain(params)
            .filter(x => Array.isArray(x.value) && x.value.length >= 4 && x.value.length <= 5)
            .map(x => {
              return {
                seriesName: x.seriesName,
                axisValue: x.axisValue,
                marker: this.createTooltipMarker(x.value[3]),
                item: x.value[2] as SeriesInfoDataItem,
                seriesInfo: x.value[3] as SeriesInfo,
                label: x.seriesName,
                value: x.value[1]
              }
            })
            .groupBy(x => x.seriesInfo.model.source)
            .map((x, key) => {
              const groupHeader = _.find(x, s => s.seriesInfo.$type === 'DataSourceSeriesInfo');
              const modelGroups = _.groupBy(_.orderBy(_.filter(x, s => s.item.$type === 'ForecastSeriesInfoDataItem' && s.item.dataPoint.target.time_ahead > 0 ), ['item.dataPoint.target.time_ahead', 'value'], ['asc', 'desc']), s => s.seriesInfo.model.name);

              const itemStrs = _.flatMap(modelGroups, m => {
                return m.map(mm => {
                  const forecastItem = mm.item as ForecastSeriesInfoDataItem;
                  const point = mm;
                  const ci = forecastItem.interval && forecastItem;
                  return `${point.marker} ${point.label} (${forecastItem.dataPoint.target.time_ahead} ${forecastItem.dataPoint.target.time_unit} ahead) ${point.value}` + (ci && ci.interval.lower !== ci.interval.upper ? ` (${ci.interval.lower} - ${ci.interval.upper})` : '');
                });
              });

              const header = groupHeader ? `${groupHeader.marker} ${groupHeader.label} ${groupHeader.value}` : '';
              return `${header}${header && itemStrs.length > 0 ? '<br/>' : ''}${itemStrs.join('<br/>')}`;
            });

          return dps.value().join('<br/>');
        } else {
          return '?';
        }
      };
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
      tooltip: {
        trigger: 'axis',
        axisPointer: { show: true },
        formatter: ttFormatter
      },
      dataZoom: [dzXInside, dzXSlider],
      series: series,
    };
  }

  private createTooltipMarker(series: SeriesInfo) {
    let svgContent = '<circle cx="8" cy="8" r="6"';
    if (series.model.style.symbol === 'triangle') {
      svgContent = '<polygon points="8,2 14,14 2,14"'
    }
    svgContent += ` stroke-width="1" stroke="${series.model.style.color}" fill="${series.$type === 'DataSourceSeriesInfo' ? series.model.style.color : 'transparent'}" />`
    return `<svg version="1.1" xmlns="http://www.w3.org/2000/svg" style="height: 16px;width: 16px;" class="d-block-inline">${svgContent}</svg>`
  }

  private _createSeries(seriesData: SeriesInfo[], settings: ForecastSettings) {
    if (!seriesData || seriesData.length === 0) return [];
    return _.flatMap(seriesData, (x, i) => {
      if (x.$type === 'ForecastHorizonSeriesInfo') {
        return x.data.map(d => {
          return {
            type: 'line',
            name: x.model.name,
            data: d.map(p => ([p.x.toDate(), p.y, p, _.omit(x, 'data')])),
            markArea: {
              itemStyle: {
                color: x.model.style.color,
                opacity: 0.4
              },
              data: d.filter(p => !!p.interval).map(p => {
                return [
                  { xAxis: moment(p.x).add(-2, 'd').toDate(), yAxis: p.interval.upper },
                  { xAxis: moment(p.x).add(2, 'd').toDate(), yAxis: p.interval.lower }
                ]
              })
            },
            animationDuration: 100,
            color: x.model.style.color,
            symbol: x.model.style.symbol,
            symbolSize: 8,
            symbolKeepAspect: true
          };
        });
      } else {
        const line: any = {
          type: 'line',
          name: x.model.name,
          id: `${settings?.location?.id || ''} - ${x.model.name}`,
          data: (x.data as SeriesInfoDataItem[]).map(d => ([d.x.toDate(), d.y, d, _.omit(x, 'data')])),
          animationDuration: 500,
          color: x.model.style.color,
          symbol: x.model.style.symbol,
          symbolSize: 8,
          symbolKeepAspect: true
        };

        if (x.$type === 'ForecastDateSeriesInfo') {
          line.itemStyle = { color: 'transparent', borderColor: x.model.style.color };
          line.lineStyle = { color: x.model.style.color };
        }

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
          stack: 'confidence-band - ' + x.model.name,
          color: x.model.style.color,
          symbol: 'none'
        };

        return [
          { ...def, name: x.model.name + '-confidence-lower', data: intervalData.map(d => [d.x.toDate(), d.interval.lower, d, _.omit(x, 'data'), d.interval]) },
          {
            ...def, name: x.model.name + '-confidence-upper', areaStyle: { color: x.model.style.color, opacity: 0.4 },
            data: intervalData.map(d => [d.x.toDate(), d.interval.upper - d.interval.lower, d, _.omit(x, 'data'), d.interval])
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
        },
        markArea: {
          silent: true,
          itemStyle: {
            color: '#ccc',
            opacity: 0.6
          },
          data: [[{
            xAxis: 'min',
          }, {
            xAxis: forecastDate.toDate(),
          }]]
        }

      }
      : null;
  }

}
