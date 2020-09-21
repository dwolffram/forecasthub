import { Component, OnInit, OnDestroy } from '@angular/core';
import * as _ from 'lodash';
import { ForecastDateLookup, LocationLookupItem } from 'src/app/models/lookups';
import { TruthToPlotValue } from 'src/app/models/truth-to-plot';
import { LookupService } from 'src/app/services/lookup.service';
import { combineLatest, forkJoin, Observable, Subscription } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import { ForecastDisplayMode, ForecastPlotService } from 'src/app/services/forecast-plot.service';
import { GeoShapeService } from 'src/app/services/geo-shape.service';

@Component({
  selector: 'app-forecast',
  templateUrl: './forecast.component.html',
  styleUrls: ['./forecast.component.scss']
})
export class ForecastComponent implements OnInit, OnDestroy {
  activeSeriesLoader$: Observable<any>;



  constructor(private lookupService: LookupService, private stateService: ForecastPlotService, private geoService: GeoShapeService) {

  }

  ngOnInit(): void {
    this.activeSeriesLoader$ = combineLatest([
      this.stateService.activeSeries$.pipe(tap(x => console.log("### active"))),
      this.geoService.all$.pipe(tap(x => console.log("### all"))),
      this.geoService.germany$.pipe(tap(x => console.log("### germany"))),
      this.geoService.poland$.pipe(tap(x => console.log("### poland")))
    ]).pipe(tap(x => console.log("### DONE", x)));

  }

  ngOnDestroy(): void {
  }


}
