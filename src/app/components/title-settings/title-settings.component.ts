import { Component, OnInit, Output, EventEmitter, Input } from '@angular/core';
import { TruthToPlotSource, TruthToPlotValue } from 'src/app/models/truth-to-plot';
import { LookupService } from 'src/app/services/lookup.service';
import { combineLatest, interval, noop, Observable, Subscription } from 'rxjs';
import { tap, map } from 'rxjs/operators';
import * as _ from 'lodash';
import { ForecastDateLookup } from 'src/app/models/lookups';
import { ForecastDateDisplayMode, ForecastDisplayMode, ForecastHorizonDisplayMode, ForecastPlotService } from 'src/app/services/forecast-plot.service';
import { QuantileType } from 'src/app/models/forecast-to-plot';
import { faAngleLeft, faAngleRight, faArrowLeft, faArrowRight, faPause, faPlay, faStop } from '@fortawesome/free-solid-svg-icons';
import * as moment from 'moment';

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

  TruthToPlotSource = TruthToPlotSource;
  shiftToSource$: Observable<TruthToPlotSource>;

  displayMode$: Observable<{ availableDates: ForecastDateLookup; mode: ForecastDisplayMode; }>;

  currentDate = new Date();

  isPlayingForecastDate: boolean = false;
  icons = {
    left: faAngleLeft,
    right: faAngleRight,
    play: faPlay,
    stop: faStop,
    pause: faPause
  };

  constructor(private lookupService: LookupService, private stateService: ForecastPlotService) {
  }

  ngOnInit(): void {
    this.plotValue$ = this.stateService.plotValue$;
    this.confidenceInterval$ = this.stateService.confidenceInterval$;
    this.shiftToSource$ = this.stateService.shiftToSource$;

    this.displayMode$ = combineLatest([
      this.lookupService.forecastDates$,
      this.stateService.displayMode$
    ]).pipe(map(([dates, displayMode]) => {
      return { availableDates: dates, mode: displayMode };
    }));
  }

  changePlotValue(plotValue: TruthToPlotValue) {
    this.stateService.plotValue = plotValue;
  }

  changeConfidenceInterval(qType: QuantileType) {
    this.stateService.confidenceInterval = qType;
  }

  changeForecastDate(forecastDate: moment.Moment) {
    this.stateService.userDisplayMode = { $type: 'ForecastDateDisplayMode', date: forecastDate };
  }

  changeForecastHorizon(horizon: 1 | 2 | 3 | 4) {
    if (this.isPlayingForecastDate) {
      this.stopForecastDate();
    }
    this.stateService.userDisplayMode = { $type: 'ForecastHorizonDisplayMode', horizon };
  }

  changeShiftToSource(shiftTo: TruthToPlotSource) {
    this.stateService.shiftToSource = shiftTo;
  }

  changeForecastDateByDir(dir: 'prev' | 'next', forecastDates: ForecastDateLookup, currentDate: moment.Moment) {
    const dateUpdate = forecastDates.getDateByDir(currentDate, dir);
    this.changeForecastDate(dateUpdate);
    return dateUpdate;
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

  player: Subscription;
  forecastDateBeforePlayer: moment.Moment;
  playPauseForecastDate(forecastDates: ForecastDateLookup, currentDate: moment.Moment) {
    this.isPlayingForecastDate = !this.isPlayingForecastDate;
    if (this.isPlayingForecastDate) {
      this.forecastDateBeforePlayer = this.forecastDateBeforePlayer || moment(currentDate);

      let d = currentDate;
      this.player = interval(1000).subscribe((interval) => {
        d = this.changeForecastDateByDir('prev', forecastDates, d);
      });
    } else {
      this.player.unsubscribe();
    }
  }

  stopForecastDate() {
    this.isPlayingForecastDate = false;
    this.player.unsubscribe();
    this.changeForecastDate(this.forecastDateBeforePlayer);
    this.forecastDateBeforePlayer = null;
  }

}
