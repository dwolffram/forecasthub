import { Component, OnInit, Output, EventEmitter, Input } from '@angular/core';
import { TruthToPlotValue } from 'src/app/models/truth-to-plot';
import { LookupService } from 'src/app/services/lookup.service';
import { combineLatest, Observable } from 'rxjs';
import { tap, map } from 'rxjs/operators';
import * as _ from 'lodash';
import { ForecastDateLookup } from 'src/app/models/lookups';
import { ForecastDateDisplayMode, ForecastDisplayMode, ForecastHorizonDisplayMode, ForecastPlotService } from 'src/app/services/forecast-plot.service';
import { QuantileType } from 'src/app/models/forecast-to-plot';

@Component({
  selector: 'app-title-settings',
  templateUrl: './title-settings.component.html',
  styleUrls: ['./title-settings.component.scss']
})
export class TitleSettingsComponent implements OnInit {


  TruthToPlotValue = TruthToPlotValue;
  plotValue$: Observable<TruthToPlotValue>;

  QuantileType = QuantileType;
  confidenceInterval$: Observable<QuantileType>;

  displayMode$: Observable<{ availableDates: ForecastDateLookup; mode: ForecastDisplayMode; }>;

  // forecastDates$: Observable<ForecastDateLookup>;
  // forecastDate$: Observable<moment.Moment>;
  // displayMode$: Observable<ForecastDisplayMode>;
  // displayModeData$: Observable<{ mode: ForecastDisplayMode; dates: ForecastDateLookup; }>;

  // private _forecastDates: ForecastDateLookup;


  constructor(private lookupService: LookupService, private stateService: ForecastPlotService) {
  }

  ngOnInit(): void {
    // this.forecastDates$ = this.lookupService.forecastDates$;

    this.plotValue$ = this.stateService.plotValue$;
    this.confidenceInterval$ = this.stateService.confidenceInterval$;
    // this.displayMode$ = this.stateService.displayMode$;

    this.displayMode$ = combineLatest([
      this.lookupService.forecastDates$,
      this.stateService.displayMode$
    ]).pipe(map(([dates, displayMode]) => {
      return { availableDates: dates, mode: displayMode };
    }));
  }

  onPlotValueChanged(plotValue: TruthToPlotValue) {
    this.stateService.plotValue = plotValue;
  }

  changeConfidenceInterval(qType: QuantileType) {
    this.stateService.confidenceInterval = qType;
  }

  changeForecastDate(forecastDate: moment.Moment) {
    this.stateService.userDisplayMode = { $type: 'ForecastDateDisplayMode', date: forecastDate };
  }

  changeForecastHorizon(horizon: 1 | 2 | 3 | 4) {
    this.stateService.userDisplayMode = { $type: 'ForecastHorizonDisplayMode', horizon };
  }

  changeForecastDateByDir(dir: 'prev' | 'next', forecastDates: ForecastDateLookup, currentDate: moment.Moment) {
    const dateUpdate = forecastDates.getDateByDir(currentDate, dir);
    this.changeForecastDate(dateUpdate);
  }

  changeDisplayMode(displayModeType: 'ForecastDateDisplayMode' | 'ForecastHorizonDisplayMode', maxDate: moment.Moment) {
    if (displayModeType === 'ForecastDateDisplayMode') {
      this.changeForecastDate(maxDate);
    }
    else if (displayModeType === 'ForecastHorizonDisplayMode') {
      this.changeForecastHorizon(1);
    }
    else {
      throw new Error(`Invalid displayMode type '${displayModeType}'. Unable to change display mode.`);
    }
  }



}
