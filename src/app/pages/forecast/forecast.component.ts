import { Component, OnInit, OnDestroy } from '@angular/core';
import * as _ from 'lodash';
import { LocationLookupItem } from 'src/app/models/lookups';
import { TruthToPlotValue } from 'src/app/models/truth-to-plot';
import { LookupService } from 'src/app/services/lookup.service';
import { combineLatest, Subscription } from 'rxjs';
import { tap } from 'rxjs/operators';
import { ForecastPlotService } from 'src/app/services/forecast-plot.service';

@Component({
  selector: 'app-forecast',
  templateUrl: './forecast.component.html',
  styleUrls: ['./forecast.component.scss']
})
export class ForecastComponent implements OnInit, OnDestroy{

  // location: LocationLookupItem;
  // plotValue: TruthToPlotValue = TruthToPlotValue.CumulatedCases;
  // forecastDate: moment.Moment;
  // private _initSubscription: Subscription;

  constructor(private lookupService: LookupService, private stateService: ForecastPlotService) { }

  ngOnInit(): void {
    // this._initSubscription = combineLatest([this.lookupService.getForecastDates(), this.lookupService.getLocations()])
    //   .subscribe(([forecastDates, locations]) => {
    //     this.location = locations.get('GM');
    //     this.forecastDate = forecastDates.maximum;
    //   });

  }

  ngOnDestroy(): void {
  }

}
