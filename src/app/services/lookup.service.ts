import { Injectable } from '@angular/core';
import { Observable, of, forkJoin } from 'rxjs';
import { LocationLookup } from '../models/lookups';
import { HttpClient } from '@angular/common/http';
import { map } from 'rxjs/operators';
import * as _ from 'lodash';
import * as Papa from 'papaparse';

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

  constructor(private http: HttpClient) { }

  getLocations(): Observable<LocationLookup[]> {
    const germanyLu = this.readLocation(this._urls.location.germany, 'GM');
    const polandLu = this.readLocation(this._urls.location.poland, 'PL');
    return forkJoin([germanyLu, polandLu]);
  }

  private readLocation(url: string, rootIdentifier: string): Observable<LocationLookup> {
    return this.http.get(url, { responseType: 'text' })
      .pipe(map(x => {
        const parsed = Papa.parse(x, { header: true, skipEmptyLines: true });
        const rows = _.drop(parsed.data).map((r: any) => ({ id: r.state_code, name: r.state_name }));
        const root = _.find(rows, { id: rootIdentifier });
        return new LocationLookup({ ...root, children: _.orderBy(_.without(rows, root).map(l => new LocationLookup(l)), 'name') });
      }));
  }
}
