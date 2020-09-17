import { Component, OnInit, Output, EventEmitter, Input } from '@angular/core';
import { TruthToPlotValue } from 'src/app/models/truth-to-plot';
import { LookupService } from 'src/app/services/lookup.service';
import { Observable } from 'rxjs';
import { tap, map } from 'rxjs/operators';
import * as _ from 'lodash';
import { ForecastDateLookup } from 'src/app/models/lookups';
import { ForecastPlotService } from 'src/app/services/forecast-plot.service';
import { QuantileType } from 'src/app/models/forecast-to-plot';

@Component({
  selector: 'app-title-settings',
  templateUrl: './title-settings.component.html',
  styleUrls: ['./title-settings.component.scss']
})
export class TitleSettingsComponent implements OnInit {
  forecastDates$: Observable<ForecastDateLookup>;
  forecastDate$: Observable<moment.Moment>;

  TruthToPlotValue = TruthToPlotValue;
  plotValue$: Observable<TruthToPlotValue>;

  QuantileType = QuantileType;
  confidenceInterval$: Observable<QuantileType>;

  constructor(private lookupService: LookupService, private stateService: ForecastPlotService) {
   }

  ngOnInit(): void {
    this.forecastDates$ = this.lookupService.getForecastDates();
    this.plotValue$ = this.stateService.plotValue$;
    this.forecastDate$ = this.stateService.forecastDate$;
    this.confidenceInterval$ = this.stateService.confidenceInterval$;
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

  changeConfidenceInterval(qType: QuantileType) {
    this.stateService.confidenceInterval = qType;
  }
}
