import { Directive, Input, OnChanges, OnInit, SimpleChanges } from '@angular/core';
import { LeafletDirective } from '@asymmetrik/ngx-leaflet';
import { Control, DomUtil, Map } from 'leaflet';
import { ThresholdColorScale } from '../models/color-scale';

@Directive({
  selector: '[appLeafletColorLegend]'
})
export class LeafletColorLegendDirective implements OnInit, OnChanges {

  @Input() colorScale: ThresholdColorScale;

  constructor(private _leaflet: LeafletDirective,) { }

  ngOnInit(): void {
    this._leaflet.map.whenReady(() => this.updateLegend(this._leaflet.map, this.colorScale));
  }

  ngOnChanges(changes: SimpleChanges): void {
    this.updateLegend(this._leaflet.map, this.colorScale);
  }

  private createIntLegendItems(scale: ThresholdColorScale) {
    if (!scale) return [];
    return [1, ...scale.getThresholds().map(x => Math.ceil(x))].map((grade, index, array) => {
      let label = '';
      if (index === array.length - 1) {
        label = array[index] + '+';
      } else if (array[index] === array[index + 1] - 1) {
        label = array[index] + '';
      } else {
        label = array[index] + '&ndash;' + (array[index + 1] - 1);
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
}
