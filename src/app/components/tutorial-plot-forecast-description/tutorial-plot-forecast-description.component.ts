import { Component, OnInit } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ForecastPlotService } from 'src/app/services/forecast-plot.service';
import { LookupService } from 'src/app/services/lookup.service';

@Component({
  selector: 'app-tutorial-plot-forecast-description',
  templateUrl: './tutorial-plot-forecast-description.component.html',
  styleUrls: ['./tutorial-plot-forecast-description.component.scss']
})
export class TutorialPlotForecastDescriptionComponent implements OnInit {
  maxDate$: Observable<moment.Moment>;

  constructor(private stateService: ForecastPlotService, private lookupService: LookupService) { }

  ngOnInit(): void {
    this.maxDate$ = this.lookupService.forecastDates$.pipe(map(x => x.maximum));
  }

  changeDisplayModeToHorizon(){
    this.stateService.userDisplayMode = { $type: 'ForecastHorizonDisplayMode', horizon: 1 };
  }

  changeDisplayModeToDate(date: moment.Moment){
    this.stateService.userDisplayMode = { $type: 'ForecastDateDisplayMode', date: date };
  }
}
