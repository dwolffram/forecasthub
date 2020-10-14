import { EventEmitter, NgZone, OnDestroy, Output, TemplateRef } from '@angular/core';
import { Directive, Input, OnChanges, OnInit, SimpleChanges } from '@angular/core';
import { LeafletDirective } from '@asymmetrik/ngx-leaflet';
import { Control, DomUtil, Map, ResizeEvent } from 'leaflet';
import { ThresholdColorScale } from '../models/color-scale';
import { NumberHelper } from '../util/number-helper';
import * as _ from 'lodash';

@Directive({
  selector: '[appLeafletExtention]'
})
export class LeafletExtentionDirective implements OnInit, OnChanges, OnDestroy {

  @Input() colorScale: ThresholdColorScale;
  @Input() title: string;
  @Output() tooltipVisibilityChanged: EventEmitter<boolean> = new EventEmitter<boolean>();
  @Output() resized: EventEmitter<ResizeEvent> = new EventEmitter<ResizeEvent>();

  private readonly delayedResizeEmit = _.debounce((x) => this.zone.run(() => this.resized.emit(x)), 80);
  private readonly delayedTTVisibilityEmit = _.debounce((x) => this.zone.run(() => this.tooltipVisibilityChanged.emit(x)), 80);

  private readonly onTTOpen = () => { this.zone.run(() => this.delayedTTVisibilityEmit(true)); };
  private readonly onTTClose = () => { this.zone.run(() => this.delayedTTVisibilityEmit(false)); };

  constructor(private leaflet: LeafletDirective, private zone: NgZone) { }

  ngOnInit(): void {
    this.leaflet.map.whenReady(() => {
      this.registerEvents(this.leaflet.map);
      this.updateAll(this.leaflet.map);
    });
  }

  ngOnDestroy(): void {
    if (this.leaflet.map) {
      this.leaflet.map.off('resize', this.delayedResizeEmit);
      this.leaflet.map.off('tooltipopen', this.onTTOpen);
      this.leaflet.map.off('tooltipclose', this.onTTClose);
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes.colorScale) {
      this.updateLegend(this.leaflet.map, this.colorScale);
    }
    if (changes.title) {
      this.updateTitle(this.leaflet.map, this.title);
    }
  }

  private titleControl: Control;
  private updateTitle(map: Map, title: string) {
    if (this.titleControl) {
      this.titleControl.remove();
      this.titleControl = null;
    }

    if (map && title !== undefined) {
      const titleControl = new Control({ position: 'topleft' });
      titleControl.onAdd = (map) => {
        const div = DomUtil.create('div', 'info title');
        div.innerHTML = title;
        return div;
      };
      titleControl.addTo(map);
      this.titleControl = titleControl;
    }
  }

  private registerEvents(map: Map) {
    map.on('resize', this.delayedResizeEmit);
    map.on('tooltipopen', this.onTTOpen);
    map.on('tooltipclose', this.onTTClose);
  }

  private createIntLegendItems(scale: ThresholdColorScale) {
    const thresholds = scale?.getThresholds();
    if (!thresholds || thresholds.length === 0) return [];

    return [1, ...thresholds.map(x => Math.ceil(x))].map((grade, index, array) => {
      let label = '';
      if (index === array.length - 1) {
        label = NumberHelper.formatInt(array[index]) + '+';
      } else if (array[index] === array[index + 1] - 1) {
        label = NumberHelper.formatInt(array[index]) + '';
      } else {
        label = NumberHelper.formatInt(array[index]) + ' - ' + (NumberHelper.formatInt(array[index + 1] - 1));
      }
      return { grade, label };
    });
  }

  private legend: Control;
  private updateLegend(map: Map, scale: ThresholdColorScale) {
    if (this.legend) {
      this.legend.remove();
      this.legend = null;
    }

    if (map && scale) {
      const legend = new Control({ position: 'bottomright' });
      const gradeLabels = this.createIntLegendItems(scale);
      legend.onAdd = (map) => {
        const div = DomUtil.create('div', 'info legend');
        div.innerHTML = '<span style=" background:' + scale.getColor(0) + '" class="legend-block"></span> ' + 0 + '<br />';
        gradeLabels.forEach((item) => {
          div.innerHTML +=
            '<span style=" background:' + (scale.getColor(item.grade)) + '" class="legend-block"></span> ' + item.label + '<br />';
        });
        return div;
      };
      legend.addTo(map);
      this.legend = legend;
    }
  }

  private updateAll(map: Map): void {
    this.updateLegend(map, this.colorScale);
    this.updateTitle(map, this.title);
  }
}
