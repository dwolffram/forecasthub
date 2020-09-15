import { Component, OnInit, Input, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';
import { SeriesInfo } from '../plot-container/plot-container.component';
import * as _ from 'lodash';

export interface LegendItem {
  series: SeriesInfo;
  enabled: boolean;
}

export interface DataSourceLegendItem extends LegendItem {
  forecasts: LegendItem[];
}

export function isDataSourceLegendItem(arg: any): arg is DataSourceLegendItem {
  return arg.hasOwnProperty('forecasts');
}

@Component({
  selector: 'app-legend',
  templateUrl: './legend.component.html',
  styleUrls: ['./legend.component.scss']
})
export class LegendComponent implements OnInit, OnChanges {

  @Input() items: DataSourceLegendItem[];

  @Output() hoverItem: EventEmitter<LegendItem> = new EventEmitter<LegendItem>();
  @Output() enabledItemsChanged: EventEmitter<LegendItem[]> = new EventEmitter<LegendItem[]>();

  constructor() { }


  ngOnInit(): void {

  }

  ngOnChanges(changes: SimpleChanges): void {
    this._updateLegendItems();
  }

  private _updateLegendItems() {

  }

  onMouseOver(item: LegendItem) {
    this.hoverItem.emit(item);
  }

  toggleEnabled(item: LegendItem) {
    const action = (x: LegendItem) => x.enabled = !x.enabled;

    action(item);
    if (isDataSourceLegendItem(item)) {
      item.forecasts.forEach(action);
    }

    this.enabledItemsChanged.emit(this._collectEnabledItems());
  }

  private _collectEnabledItems(): LegendItem[] {
    return _.filter(_.flatMap(this.items, x => [<LegendItem>x].concat(x.forecasts)), x => x.enabled);
  }
}
