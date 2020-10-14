import { Injectable } from '@angular/core';
import { BehaviorSubject, combineLatest, Observable } from 'rxjs';
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
      this.stateService.activeSeries$,
      this.geoService.all$,
      this.geoService.germany$,
      this.geoService.poland$
    ]).pipe(shareReplay(1));
  }
}
