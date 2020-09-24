import { Component, OnInit } from '@angular/core';
import { Subject, BehaviorSubject, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { LocationLookupItem, LocationId } from 'src/app/models/lookups';
import { ForecastPlotService } from 'src/app/services/forecast-plot.service';
import { LookupService } from 'src/app/services/lookup.service';

@Component({
  selector: 'app-location-select',
  templateUrl: './location-select.component.html',
  styleUrls: ['./location-select.component.scss']
})
export class LocationSelectComponent implements OnInit {
  LocationIds = LocationId;

  items$: Observable<LocationLookupItem[]>;
  selections$: Observable<{ root: LocationLookupItem; province: LocationLookupItem; }>;

  constructor(private stateService: ForecastPlotService, private lookupService: LookupService) {
    this.items$ = this.lookupService.locations$.pipe(map(x => x.items));
    this.selections$ = this.stateService.location$.pipe(map(x => {
      return this.createSelection(x);
    }));
  }

  private createSelection(location: LocationLookupItem) {
    if (!location) throw new Error('Location has to be specified.');
    if (location.parent) return { root: location.parent, province: location }
    return { root: location, province: null }
  }

  ngOnInit(): void {
  }

  select(item: LocationLookupItem) {
    this.stateService.userLocation = item;
  }

}
