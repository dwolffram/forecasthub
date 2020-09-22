import { Directive, EventEmitter, NgZone, OnDestroy, Output } from '@angular/core';
import { LeafletDirective } from '@asymmetrik/ngx-leaflet';
import { ResizeEvent } from 'leaflet';
import { Subscription } from 'rxjs';

@Directive({
  selector: '[appLeafletResize]'
})
export class LeafletResizeDirective implements OnDestroy {

  @Output() resized: EventEmitter<ResizeEvent> = new EventEmitter<ResizeEvent>();
  private _leafletSubscription: Subscription;

  constructor(private _leaflet: LeafletDirective, private _zone: NgZone) {
    this._leafletSubscription = this._leaflet.mapReady.subscribe((map: L.Map) => {
      map.on('resize', x => {
        this._zone.run(() => this.resized.emit(x));
      })
    });
  }

  ngOnDestroy(): void {
    this._leafletSubscription.unsubscribe();
  }

}
