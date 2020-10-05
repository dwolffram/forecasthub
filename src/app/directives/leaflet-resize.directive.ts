import { Directive, EventEmitter, NgZone, OnDestroy, Output } from '@angular/core';
import { LeafletDirective } from '@asymmetrik/ngx-leaflet';
import { ResizeEvent } from 'leaflet';
import { Subscription } from 'rxjs';
import * as _ from 'lodash';

@Directive({
  selector: '[appLeafletResize]'
})
export class LeafletResizeDirective implements OnDestroy {

  @Output() resized: EventEmitter<ResizeEvent> = new EventEmitter<ResizeEvent>();
  private _leafletSubscription: Subscription;
  private delayedEmit = _.debounce((x) => this._zone.run(() => this.resized.emit(x)), 100);
  constructor(private _leaflet: LeafletDirective, private _zone: NgZone) {
    this._leafletSubscription = this._leaflet.mapReady.subscribe((map: L.Map) => {
      map.on('resize', x => this.delayedEmit(x))
    });
  }

  ngOnDestroy(): void {
    this._leafletSubscription.unsubscribe();
  }

}
