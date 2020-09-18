import { Component, OnInit, Input, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';
import * as _ from 'lodash';
import { ForecastPlotService } from 'src/app/services/forecast-plot.service';
import { map } from 'rxjs/operators';
import { combineLatest, Observable } from 'rxjs';
import { SeriesInfo, DataSourceSeriesInfo, ForecastSeriesInfo } from 'src/app/models/series-info';
import { TruthToPlotSource } from 'src/app/models/truth-to-plot';

type LegendItem = ForecastLegendItem | DataSourceLegendItem;

interface ForecastLegendItem {
  $type: 'ForecastLegendItem';

  series: ForecastSeriesInfo;
  enabled: boolean;
  adjust: boolean;
}

interface DataSourceLegendItem {
  $type: 'DataSourceLegendItem';

  series: DataSourceSeriesInfo;
  enabled: boolean;
  adjust?: boolean;

  forecasts: ForecastLegendItem[];
}

@Component({
  selector: 'app-legend',
  templateUrl: './legend.component.html',
  styleUrls: ['./legend.component.scss']
})
export class LegendComponent implements OnInit {
  items$: Observable<DataSourceLegendItem[]>;

  constructor(private stateService: ForecastPlotService) { }

  ngOnInit(): void {
    this.items$ = combineLatest([this.stateService.series$, this.stateService.seriesAdjustments$])
      .pipe(map(([series, adjustments]) => this._createLegendItems(series.data, adjustments)))
  }

  private _createLegendItems(series: SeriesInfo[], adjustments: Map<string, TruthToPlotSource>): DataSourceLegendItem[] {
    if (!series || series.length === 0) return [];

    const dataSourceSeries = series.filter(x => x.$type === 'dataSource') as DataSourceSeriesInfo[];
    const forecastSeries = series.filter(x => x.$type === 'forecast') as ForecastSeriesInfo[];

    return _.map(dataSourceSeries, x => {

      const forecasts = forecastSeries
        .map(f => {
          return { $type: 'ForecastLegendItem', series: f, enabled: this.isEnabledInStateService(f), adjust: adjustments.has(f.name) } as ForecastLegendItem;
        })
        .filter(f => (f.adjust && f.series.targetSource !== x.source) || (!f.adjust && f.series.targetSource === x.source));

      return {
        $type: 'DataSourceLegendItem',
        series: x,
        enabled: this.isEnabledInStateService(x),
        adjust: forecasts.every(x => x.adjust) ? true : (forecasts.some(x => x.adjust) ? null : false),
        forecasts: forecasts
      };
    });
  }

  onMouseOver(item: LegendItem) {
    let highlight: SeriesInfo[];
    if (item === null) {
      highlight = null;
    } else if (item.$type === 'DataSourceLegendItem') {
      highlight = [item.series, ...item.forecasts.map(x => x.series)]
    } else {
      highlight = [item.series];
    }
    this.stateService.highlightedSeries = highlight;
  }

  toggleEnabled(item: LegendItem, rootItems: DataSourceLegendItem[]) {
    item.enabled = !item.enabled
    if (item.$type === 'DataSourceLegendItem') {
      item.forecasts.forEach(x => x.enabled = item.enabled);
    }

    this.stateService.enabledSeriesNames = this._collectEnabledSeries(rootItems).map(x => x.name);
    this.onMouseOver(item);
  }

  toggleAdjust(item: LegendItem) {
    // if(item.series.
    if (item.$type === 'DataSourceLegendItem') {
      const adjustValue = item.adjust ? null : this.getOppositeSource(item.series.source)
      const fcSeries = item.forecasts.map(x => [x.series, adjustValue] as [ForecastSeriesInfo, TruthToPlotSource])
      this.stateService.setSeriesAdjustment(fcSeries)
    } else {
      const adjust = item.adjust ? null : this.getOppositeSource(item.series.targetSource);
      this.stateService.setSeriesAdjustment([[item.series, adjust]]);
    }

  }

  private getOppositeSource(source: TruthToPlotSource) {
    switch (source) {
      case TruthToPlotSource.ECDC: return TruthToPlotSource.JHU;
      default: return TruthToPlotSource.ECDC;
    }
  }

  private isEnabledInStateService(info: SeriesInfo) {
    if (this.stateService.enabledSeriesNames === null) return true;
    return this.stateService.enabledSeriesNames.indexOf(info.name) > -1
  }

  private _collectEnabledSeries(rootItems: DataSourceLegendItem[]): SeriesInfo[] {
    try {
      return _.filter(_.flatMap(rootItems, x => [<LegendItem>x].concat(x.forecasts)), x => x.enabled).map(x => x.series);
    } catch (error) {
      return null;
    }

  }
}
