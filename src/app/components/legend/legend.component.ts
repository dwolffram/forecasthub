import { Component, OnInit, Input, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';
import * as _ from 'lodash';
import { ForecastPlotService } from 'src/app/services/forecast-plot.service';
import { map } from 'rxjs/operators';
import { Observable } from 'rxjs';
import { SeriesInfo, DataSourceSeriesInfo, ForecastSeriesInfo } from 'src/app/models/series-info';

interface LegendItem {
  series: SeriesInfo;
  enabled: boolean;
}

interface DataSourceLegendItem extends LegendItem {
  forecasts: LegendItem[];
}

function isDataSourceLegendItem(arg: any): arg is DataSourceLegendItem {
  return arg.hasOwnProperty('forecasts');
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
    this.items$ = this.stateService.series$.pipe(map(x => this._createLegendItems(x.data)))
  }

  private _createLegendItems(series: SeriesInfo[]): DataSourceLegendItem[] {
    if (!series || series.length === 0) return [];

    const dataSourceSeries = series.filter(x => x.$type === 'dataSource') as DataSourceSeriesInfo[];
    const forecastSeries = series.filter(x => x.$type === 'forecast') as ForecastSeriesInfo[];

    return _.map(dataSourceSeries, x => {

      return {
        series: x,
        enabled: this.isEnabledInStateService(x),
        forecasts: forecastSeries
          .filter(f => f.targetSource === x.source)
          .map(f => ({ series: f, enabled: this.isEnabledInStateService(f) }))
      };
    });
  }

  onMouseOver(item: LegendItem) {
    let highlight: SeriesInfo[];
    if (item === null) {
      highlight = null;
    } else if (isDataSourceLegendItem(item)) {
      highlight = [item.series, ...item.forecasts.map(x => x.series)]
    } else {
      highlight = [item.series];
    }
    this.stateService.highlightedSeries = highlight;
  }

  toggleEnabled(item: LegendItem, rootItems: DataSourceLegendItem[]) {
    const action = (x: LegendItem) => x.enabled = !x.enabled;

    action(item);
    if (isDataSourceLegendItem(item)) {
      item.forecasts.forEach(action);
    }

    this.stateService.enabledSeriesNames = this._collectEnabledSeries(rootItems).map(x => x.name);
    this.onMouseOver(item);
  }

  private isEnabledInStateService(info: SeriesInfo) {
    if (this.stateService.enabledSeriesNames === null) return true;
    return this.stateService.enabledSeriesNames.indexOf(info.name) > -1
  }

  private _collectEnabledSeries(rootItems: DataSourceLegendItem[]): SeriesInfo[] {
    return _.filter(_.flatMap(rootItems, x => [<LegendItem>x].concat(x.forecasts)), x => x.enabled).map(x => x.series);
  }
}
