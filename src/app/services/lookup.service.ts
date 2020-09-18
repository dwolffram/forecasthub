import { Injectable } from '@angular/core';
import { Observable, of, forkJoin } from 'rxjs';
import { LocationLookupItem, LocationLookup, LocationId, ForecastDateLookup } from '../models/lookups';
import { HttpClient } from '@angular/common/http';
import { map, shareReplay } from 'rxjs/operators';
import * as _ from 'lodash';
import * as Papa from 'papaparse';
import { DataService } from './data.service';
import { cacheTest } from './service-helper';


@Injectable({
  providedIn: 'root'
})
export class LookupService {
  private readonly _urls = {
    location: {
      germany: 'https://raw.githubusercontent.com/KITmetricslab/covid19-forecast-hub-de/master/template/state_codes_germany.csv',
      poland: 'https://raw.githubusercontent.com/KITmetricslab/covid19-forecast-hub-de/master/template/state_codes_poland.csv'
    }
  }

  locations$: Observable<LocationLookup>;
  forecastDates$: Observable<ForecastDateLookup>;

  constructor(private http: HttpClient, private dataService: DataService) {
    const germanyLu$ = this.readLocation(this._urls.location.germany, LocationId.Germany);
    const polandLu$ = this.readLocation(this._urls.location.poland, LocationId.Poland);
    this.locations$ = forkJoin([germanyLu$, polandLu$]).pipe(map(([g, p]) => new LocationLookup([g, p]))).pipe(shareReplay(1));
    this.forecastDates$ = this.dataService.forecasts$
      .pipe(map(x => new ForecastDateLookup(_.map(_.uniqBy(x, d => d.timezero.toISOString()), d => d.timezero))))
      .pipe(shareReplay(1));
  }

  private readLocation(url: string, rootIdentifier: string): Observable<LocationLookupItem> {
    return this.http.get(url, { responseType: 'text' })
      .pipe(map(x => {
        const parsed = Papa.parse(x, { header: true, skipEmptyLines: true });
        const rows = parsed.data.map((r: any) => ({ id: r.state_code, name: r.state_name }));
        const root = _.find(rows, { id: rootIdentifier });

        const rootLu = new LocationLookupItem(root);
        rootLu.children = _.orderBy(_.without(rows, root).map(l => new LocationLookupItem({ ...l, parent: rootLu })), x => x.name);
        return rootLu;
      }));
  }

}
