import { Component, OnInit, Input, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';
import * as _ from 'lodash';
import { ForecastPlotService } from 'src/app/services/forecast-plot.service';
import { map } from 'rxjs/operators';
import { combineLatest, Observable } from 'rxjs';
import { SeriesInfo, DataSourceSeriesInfo, ForecastSeriesInfo, ModelInfo } from 'src/app/models/series-info';
import { TruthToPlotSource } from 'src/app/models/truth-to-plot';
import { faChevronLeft, faChevronRight, faExclamationTriangle, faEye, faEyeSlash, faIndent, faOutdent } from '@fortawesome/free-solid-svg-icons';

type LegendItem = ForecastLegendItem | DataSourceLegendItem;

interface ForecastLegendItem {
  $type: 'ForecastLegendItem';

  model: ModelInfo;
  enabled: boolean;
  hasSeries: boolean;
}

interface DataSourceLegendItem {
  $type: 'DataSourceLegendItem';

  model: ModelInfo;
  enabled: boolean;

  forecasts: ForecastLegendItem[];
  shiftedForecasts: { origin: TruthToPlotSource, forecasts: ForecastLegendItem[] };
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
    adjusted: faExclamationTriangle,
    visible: faEye,
    invisible: faEyeSlash
  }

  constructor(private stateService: ForecastPlotService) { }

  ngOnInit(): void {
    this.items$ = combineLatest([this.stateService.series$, this.stateService.availableModels$, this.stateService.shiftToSource$])
      .pipe(map(([series, availableModels, shiftToSource]) => this._createLegendItems(availableModels, series.data, shiftToSource)))
  }

  private createForecastLegendItems(forecastModels: ModelInfo[], forecastSeries: SeriesInfo[]) {
    return _.chain(forecastModels)
      .orderBy(m => m.name)
      .map(m => {
        // const adjustment = adjustments.has(f.name) && adjustments.get(f.name);
        // const adjust = adjustment && adjustment !== f.targetSource ? adjustment : null;
        const hasSeries = forecastSeries.some(f => f.model.name === m.name);
        return {
          $type: 'ForecastLegendItem',
          model: m,
          enabled: this.isEnabledInStateService(m),
          hasSeries: hasSeries
        } as ForecastLegendItem;
      })
      .value();
  }

  private _createLegendItems(availableModels: ModelInfo[], series: SeriesInfo[], shiftTo: TruthToPlotSource): DataSourceLegendItem[] {
    if (!series || series.length === 0) return [];

    const dataSourceSeries = series.filter(x => x.$type === 'DataSourceSeriesInfo') as DataSourceSeriesInfo[];
    const forecastSeries = series.filter(x => x.$type === 'ForecastDateSeriesInfo' || x.$type === 'ForecastHorizonSeriesInfo') as ForecastSeriesInfo[];

    return _.map(dataSourceSeries, x => {

      const ownModels = _.filter(availableModels, m => m.source === x.model.source);
      const shiftedForecasts = shiftTo && this.createForecastLegendItems(_.without(availableModels, ...ownModels), forecastSeries);

      return {
        $type: 'DataSourceLegendItem',
        model: x.model,
        enabled: this.isEnabledInStateService(x.model),
        forecasts: this.createForecastLegendItems(ownModels, forecastSeries),
        shiftedForecasts: shiftedForecasts && shiftedForecasts.length > 0 && { forecasts: shiftedForecasts, origin: _.head(shiftedForecasts).model.source }
      };
    });
  }

  onMouseOver(item: LegendItem) {
    let highlight: ModelInfo[];
    if (item === null) {
      highlight = null;
    } else if (item.$type === 'DataSourceLegendItem') {
      highlight = [item.model, ...item.forecasts.concat(item.shiftedForecasts ? item.shiftedForecasts.forecasts : []).map(x => x.model)]
    } else {
      highlight = [item.model];
    }
    this.stateService.highlightedSeries = highlight;
  }

  toggleEnabled(item: LegendItem, dsItems: DataSourceLegendItem[]) {
    item.enabled = !item.enabled
    if (item.$type === 'DataSourceLegendItem') {
      item.forecasts.concat(item.shiftedForecasts ? item.shiftedForecasts.forecasts : []).forEach(x => x.enabled = item.enabled);
    }

    this.stateService.disabledSeriesNames = this._collectDisabledModels(dsItems).map(x => x.name);
  }

  // toggleAdjust(item: LegendItem) {
  //   if (item.$type === 'DataSourceLegendItem') {
  //     const adjustValue = this.getOppositeSource(item.series.source)
  //     const fcSeries = item.forecasts.map(x => [x.series, adjustValue] as [ForecastSeriesInfo, TruthToPlotSource])
  //     this.stateService.setSeriesAdjustment(fcSeries)
  //   } else {
  //     const adjust = item.adjust ? null : this.getOppositeSource(item.series.targetSource);
  //     this.stateService.setSeriesAdjustment([[item.series, adjust]]);
  //   }

  //   const newHighlight = this.stateService.highlightedSeries.filter(x => x !== item.series);
  //   if (newHighlight.length !== this.stateService.highlightedSeries.length) {
  //     this.stateService.highlightedSeries = newHighlight;
  //   }
  // }

  private getOppositeSource(source: TruthToPlotSource) {
    switch (source) {
      case TruthToPlotSource.ECDC: return TruthToPlotSource.JHU;
      default: return TruthToPlotSource.ECDC;
    }
  }

  private isEnabledInStateService(info: ModelInfo) {
    if (this.stateService.disabledSeriesNames === null || this.stateService.disabledSeriesNames.length === 0) return true;
    return this.stateService.disabledSeriesNames.indexOf(info.name) === -1;
  }

  private _collectDisabledModels(rootItems: DataSourceLegendItem[]): ModelInfo[] {
    try {
      return _.filter(_.flatMap(rootItems, x => [<LegendItem>x].concat(x.forecasts).concat(x.shiftedForecasts ? x.shiftedForecasts.forecasts : [])), x => !x.enabled).map(x => x.model);
    } catch (error) {
      return null;
    }

  }
}
