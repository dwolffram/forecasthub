import { Directive, EventEmitter, HostListener, NgZone, Output } from '@angular/core';
import { ECharts } from 'echarts';
import { NgxEchartsDirective } from 'ngx-echarts';

@Directive({
  selector: '[appEchartsZrClick]'
})
export class EchartsZrClickDirective {

  @Output() zrClick: EventEmitter<any> = new EventEmitter<any>();

  constructor(private _chart: NgxEchartsDirective, private _zone: NgZone) { }

  @HostListener('chartInit', ["$event"])
  onEchartInit(chart: ECharts) {
    const zr = (<any>chart)?.getZr();
    if (zr) {
      zr.on('click', x => {
        this._zone.run(() => this.zrClick.emit({ ...x, chart }));
      });
    }
  }

}
