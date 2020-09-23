import { Component, OnInit, OnDestroy } from '@angular/core';
import * as _ from 'lodash';
import { ForecastDateLookup, LocationLookupItem } from 'src/app/models/lookups';
import { TruthToPlotValue } from 'src/app/models/truth-to-plot';
import { LookupService } from 'src/app/services/lookup.service';
import { BehaviorSubject, combineLatest, defer, forkJoin, Observable, pipe, Subject, Subscription } from 'rxjs';
import { delay, map, shareReplay, takeUntil, tap, finalize, mapTo, startWith, takeWhile } from 'rxjs/operators';
import { ForecastDisplayMode, ForecastPlotService } from 'src/app/services/forecast-plot.service';
import { GeoShapeService } from 'src/app/services/geo-shape.service';

@Component({
  selector: 'app-forecast',
  templateUrl: './forecast.component.html',
  styleUrls: ['./forecast.component.scss']
})
export class ForecastComponent implements OnInit, OnDestroy {
  loading$: Observable<any>;


  constructor(private stateService: ForecastPlotService, private geoService: GeoShapeService) {

  }

  ngOnInit(): void {
    let loading = true;
    this.loading$ = combineLatest([
      this.stateService.series$.pipe(tap(x => console.log("### series"))),
      this.geoService.all$.pipe(tap(x => console.log("### all"))),
      this.geoService.germany$.pipe(tap(x => console.log("### germany"))),
      this.geoService.poland$.pipe(tap(x => console.log("### poland")))
    ])
      .pipe(takeWhile(x => loading))
      .pipe(
        tap(x => loading = false),
        tap(x => console.log("### DONE"))
      );
  }

  ngOnDestroy(): void {
  }

}
