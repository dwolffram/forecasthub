import { Injectable } from '@angular/core';
import { combineLatest, Observable } from 'rxjs';
import { map, shareReplay, startWith, takeWhile, tap } from 'rxjs/operators';
import { ForecastPlotService } from './forecast-plot.service';
import { GeoShapeService } from './geo-shape.service';

@Injectable({
  providedIn: 'root'
})
export class LoadingService {
  loading$: Observable<any>;

  constructor(private stateService: ForecastPlotService, private geoService: GeoShapeService) {
    this.loading$ = combineLatest([
      this.stateService.series$.pipe(tap(x => console.log("### series"))),
      this.geoService.all$.pipe(tap(x => console.log("### all"))),
      this.geoService.germany$.pipe(tap(x => console.log("### germany"))),
      this.geoService.poland$.pipe(tap(x => console.log("### poland")))
    ])
      .pipe(tap(x => console.log("### done")))
      .pipe(shareReplay(1));
  }
}
