import { Component, OnInit, Input, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';
import * as _ from 'lodash';
import { ForecastPlotService } from 'src/app/services/forecast-plot.service';
import { map } from 'rxjs/operators';
import { combineLatest, Observable } from 'rxjs';
import { SeriesInfo, DataSourceSeriesInfo, ForecastSeriesInfo } from 'src/app/models/series-info';
import { TruthToPlotSource } from 'src/app/models/truth-to-plot';
import { faChevronLeft, faChevronRight, faExclamationTriangle, faIndent, faOutdent } from '@fortawesome/free-solid-svg-icons';

type LegendItem = ForecastLegendItem | DataSourceLegendItem;

interface ForecastLegendItem {
  $type: 'ForecastLegendItem';

  series: ForecastSeriesInfo;
  enabled: boolean;
  adjust?: TruthToPlotSource;
}

interface DataSourceLegendItem {
  $type: 'DataSourceLegendItem';

  series: DataSourceSeriesInfo;
  enabled: boolean;

  forecasts: ForecastLegendItem[];
}

@Component({
  selector: 'app-legend',
  templateUrl: './legend.component.html',
  styleUrls: ['./legend.component.scss']
})
export class LegendComponent implements OnInit {
  items$: Observable<DataSourceLegendItem[]>;
  TruthToPlotSource = TruthToPlotSource;

  icons = {
    left: faChevronLeft,
    right: faChevronRight,
    adjusted: faExclamationTriangle
  }

  constructor(private stateService: ForecastPlotService) { }

  ngOnInit(): void {
    this.items$ = combineLatest([this.stateService.series$, this.stateService.seriesAdjustments$])
      .pipe(map(([series, adjustments]) => this._createLegendItems(series.data, adjustments)))
  }

  private _createLegendItems(series: SeriesInfo[], adjustments: Map<string, TruthToPlotSource>): DataSourceLegendItem[] {
    if (!series || series.length === 0) return [];

    const dataSourceSeries = series.filter(x => x.$type === 'DataSourceSeriesInfo') as DataSourceSeriesInfo[];
    const forecastSeries = series.filter(x => x.$type === 'ForecastDateSeriesInfo' || x.$type === 'ForecastHorizonSeriesInfo') as ForecastSeriesInfo[];

    return _.map(dataSourceSeries, x => {

      const forecasts = _.chain(forecastSeries)
        .map(f => {
          const adjustment = adjustments.has(f.name) && adjustments.get(f.name);
          const adjust = adjustment && adjustment !== f.targetSource ? adjustment : null;
          return { $type: 'ForecastLegendItem', series: f, enabled: this.isEnabledInStateService(f), adjust: adjust } as ForecastLegendItem;
        })
        .filter(f => f.adjust ? f.adjust === x.source : f.series.targetSource === x.source)
        .orderBy(f => f.series.name)
        .value();

      return {
        $type: 'DataSourceLegendItem',
        series: x,
        enabled: this.isEnabledInStateService(x),
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

  toggleEnabled(item: LegendItem, dsItems: DataSourceLegendItem[]) {
    item.enabled = !item.enabled
    if (item.$type === 'DataSourceLegendItem') {
      item.forecasts.forEach(x => x.enabled = item.enabled);
    }

    this.stateService.disabledSeriesNames = this._collectDisabledSeries(dsItems).map(x => x.name);
  }

  toggleAdjust(item: LegendItem) {
    if (item.$type === 'DataSourceLegendItem') {
      const adjustValue = this.getOppositeSource(item.series.source)
      const fcSeries = item.forecasts.map(x => [x.series, adjustValue] as [ForecastSeriesInfo, TruthToPlotSource])
      this.stateService.setSeriesAdjustment(fcSeries)
    } else {
      const adjust = item.adjust ? null : this.getOppositeSource(item.series.targetSource);
      this.stateService.setSeriesAdjustment([[item.series, adjust]]);
    }

    const newHighlight = this.stateService.highlightedSeries.filter(x => x !== item.series);
    if (newHighlight.length !== this.stateService.highlightedSeries.length) {
      this.stateService.highlightedSeries = newHighlight;
    }
  }

  private getOppositeSource(source: TruthToPlotSource) {
    switch (source) {
      case TruthToPlotSource.ECDC: return TruthToPlotSource.JHU;
      default: return TruthToPlotSource.ECDC;
    }
  }

  private isEnabledInStateService(info: SeriesInfo) {
    if (this.stateService.disabledSeriesNames === null || this.stateService.disabledSeriesNames.length === 0) return true;
    return this.stateService.disabledSeriesNames.indexOf(info.name) === -1;
  }

  private _collectDisabledSeries(rootItems: DataSourceLegendItem[]): SeriesInfo[] {
    try {
      return _.filter(_.flatMap(rootItems, x => [<LegendItem>x].concat(x.forecasts)), x => !x.enabled).map(x => x.series);
    } catch (error) {
      return null;
    }

  }
}
