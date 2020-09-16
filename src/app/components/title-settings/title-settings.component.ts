import { Component, OnInit, Output, EventEmitter, Input } from '@angular/core';
import { TruthToPlotValue } from 'src/app/models/truth-to-plot';
import { LookupService } from 'src/app/services/lookup.service';
import { Observable } from 'rxjs';
import { tap, map } from 'rxjs/operators';
import * as _ from 'lodash';
import { ForecastDateLookup } from 'src/app/models/lookups';
import { ForecastPlotService } from 'src/app/services/forecast-plot.service';

@Component({
  selector: 'app-title-settings',
  templateUrl: './title-settings.component.html',
  styleUrls: ['./title-settings.component.scss']
})
export class TitleSettingsComponent implements OnInit {
  TruthToPlotValue = TruthToPlotValue;
  _forecastDates$: Observable<ForecastDateLookup>;

  plotValue$: Observable<TruthToPlotValue>;
  forecastDate$: any;

  constructor(private lookupService: LookupService, private stateService: ForecastPlotService) {
    this.plotValue$ = this.stateService.plotValue$;
    this.forecastDate$ = this.stateService.forecastDate$;
   }

  ngOnInit(): void {
    this._forecastDates$ = this.lookupService.getForecastDates();
  }

  onPlotValueChanged(plotValue: TruthToPlotValue) {
    this.stateService.plotValue = plotValue;
  }

  changeForecastDate(forecastDate: moment.Moment) {
    this.stateService.forecastDate = forecastDate;
  }

  changeForecastDateByDir(dir: 'prev' | 'next') {
    this.stateService.changeForecastDateByDir(dir);
  }
}
