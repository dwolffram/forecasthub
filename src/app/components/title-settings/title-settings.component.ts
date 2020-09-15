import { Component, OnInit, Output, EventEmitter, Input } from '@angular/core';
import { TruthToPlotValue } from 'src/app/models/truth-to-plot';
import { LookupService } from 'src/app/services/lookup.service';
import { Observable } from 'rxjs';
import { tap, map } from 'rxjs/operators';
import * as _ from 'lodash';
import { ForecastDateLookup } from 'src/app/models/lookups';

@Component({
  selector: 'app-title-settings',
  templateUrl: './title-settings.component.html',
  styleUrls: ['./title-settings.component.scss']
})
export class TitleSettingsComponent implements OnInit {

  @Input() plotValue: TruthToPlotValue;
  @Output() plotValueChanged: EventEmitter<TruthToPlotValue> = new EventEmitter<TruthToPlotValue>();

  @Input() forecastDate: moment.Moment;
  @Output() forecastDateChanged: EventEmitter<moment.Moment> = new EventEmitter<moment.Moment>();

  // plotValue: TruthToPlotValue = TruthToPlotValue.CumulatedCases;
  TruthToPlotValue = TruthToPlotValue;
  _forecastDates$: Observable<ForecastDateLookup>;

  constructor(private lookupService: LookupService) { }

  ngOnInit(): void {
    this._forecastDates$ = this.lookupService.getForecastDates();
  }

  onPlotValueChanged(plotValue: TruthToPlotValue) {
    this.plotValueChanged.emit(plotValue);
  }

  changeForecast(forecastDate: moment.Moment) {
    this.forecastDate = forecastDate;
    this.forecastDateChanged.emit(forecastDate);
  }
}
