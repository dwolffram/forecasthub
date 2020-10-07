import { TemplateRef } from '@angular/core';
import { Directive, Input, OnChanges, OnInit, SimpleChanges } from '@angular/core';
import { LeafletDirective } from '@asymmetrik/ngx-leaflet';
import { Control, DomUtil, Map } from 'leaflet';
import { ThresholdColorScale } from '../models/color-scale';
import { NumberHelper } from '../util/number-helper';

@Directive({
  selector: '[appLeafletExtention]'
})
export class LeafletExtentionDirective implements OnInit, OnChanges {

  @Input() colorScale: ThresholdColorScale;
  @Input() title: string;

  constructor(private _leaflet: LeafletDirective,) { }

  ngOnInit(): void {
    this._leaflet.map.whenReady(() => this.updateAll(this._leaflet.map));
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes.colorScale) {
      this.updateLegend(this._leaflet.map, this.colorScale);
    }
    if(changes.title){
      this.updateTitle(this._leaflet.map, this.title);
    }
  }

  private titleControl: Control;
  private updateTitle(map: Map, title: string) {
    const onOpen = () => this.titleControl.remove();
    const onClose = () => this.titleControl.addTo(map);

    if (this.titleControl) {
      this.titleControl.remove();
      this.titleControl = null;
      map.off('tooltipopen', onOpen);
      map.off('tooltipclose', onClose);
    }

    if (map && title !== undefined) {
      const titleControl = new Control({ position: 'topleft' });
      titleControl.onAdd = (map) => {
        const div = DomUtil.create('div', 'info title');
        div.innerHTML = title;
        return div;
      };
      map.on('tooltipopen', onOpen);
      map.on('tooltipclose', onClose);
      titleControl.addTo(map);
      this.titleControl = titleControl;
    }
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
