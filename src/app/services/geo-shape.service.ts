import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map } from 'rxjs/operators';
import { Observable, of } from 'rxjs';

export class GeoShape {
  id: string;
  name: string;
  geom: any;
}

@Injectable({
  providedIn: 'root'
})
export class GeoShapeService {

  private readonly _urls = {
    germany: 'https://public.opendatasoft.com/api/records/1.0/search/?dataset=bundesland&q=&rows=16&facet=bez&facet=gen',
    poland: 'https://gist.githubusercontent.com/filipstachura/391ecb779d56483c070616a4d9239cc7/raw/b0793391ab0478e0d92052d204e7af493a7ecc92/poland_woj.json',
    all: 'https://data.opendatasoft.com/api/records/1.0/search/?dataset=european-union-countries%40public&q=POL+OR+GER&rows=2'
  }

  constructor(private http: HttpClient) { }

  getGermany(): Observable<GeoShape[]> {
    return this.http.get<any>(this._urls.germany)
      .pipe(map(x => x.records.map(r => ({ id: r.fields.fips_10, name: `${r.fields.bez} ${r.fields.gen}`, geom: r.fields.geo_shape }))))
  }

  getPoland(): Observable<GeoShape[]> {
    return this.http.get<any>(this._urls.poland)
      .pipe(map(x => x.features.map(f => ({ id: f.properties.ID_1, name: f.properties.NAME_1, geom: f }))));
  }

  getAll(): Observable<GeoShape[]> {
    return this.http.get<any>(this._urls.all)
      .pipe(map(x => x.records.map(r => ({ id: r.fields.fips_10, name: r.fields.name_sort, geom: { ...r.fields.geo_shape, properties: { id: r.fields.fips_10 } } }))));
  }
}
