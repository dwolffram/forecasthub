import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, shareReplay } from 'rxjs/operators';
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
    germany: 'https://public.opendatasoft.com/api/records/1.0/search/?dataset=bundesland&rows=16',
    poland: 'https://gist.githubusercontent.com/filipstachura/391ecb779d56483c070616a4d9239cc7/raw/b0793391ab0478e0d92052d204e7af493a7ecc92/poland_woj.json',
    all: 'https://data.opendatasoft.com/api/records/1.0/search/?dataset=european-union-countries%40public&q=POL+OR+GER&rows=2'
  }

  constructor(private http: HttpClient) { }

  private germanyNutsToFips10Map: Map<string, string> = new Map<string, string>([
    ['DE2', 'GM02'],
    ['DE6', 'GM04'],
    ['DED', 'GM13'],
    ['DE3', 'GM16'],
    ['DEF', 'GM10'],
    ['DEB', 'GM08'],
    ['DEE', 'GM14'],
    ['DE5', 'GM03'],
    ['DE8', 'GM12'],
    ['DEC', 'GM09'],
    ['DEA', 'GM07'],
    ['DE7', 'GM05'],
    ['DE9', 'GM06'],
    ['DE4', 'GM11'],
    ['DEG', 'GM15'],
    ['DE1', 'GM01']
  ]);

  private polandID1ToFips10Map: Map<number, string> = new Map<number, string>([
    [1, 'PL74'],
    [2, 'PL84'],
    [3, 'PL86'],
    [4, 'PL73'],
    [5, 'PL77'],
    [6, 'PL72'],
    [7, 'PL75'],
    [8, 'PL76'],
    [9, 'PL78'],
    [10, 'PL79'],
    [11, 'PL81'],
    [12, 'PL82'],
    [13, 'PL83'],
    [14, 'PL80'],
    [15, 'PL85'],
    [16, 'PL87']
  ]);

  getGermany(): Observable<GeoShape[]> {
    return this.http.get<any>(this._urls.germany)
      .pipe(map(x => {

        return x.records.map(r => {
          if (!this.germanyNutsToFips10Map.has(r.fields.nuts)) throw Error(`Unmappable nuts value '${r.fields.nuts}' while loading german provinces.`);

          const id = this.germanyNutsToFips10Map.get(r.fields.nuts);
          const name = `${r.fields.bez} ${r.fields.gen}`;
          return {
            id: id,
            name: name,
            geom: {
              "type": "Feature",
              "geometry": r.fields.geo_shape,
              "properties": {
                "name": name,
                "id": id
              },
              "id": id
            }
          };
        })
      }))
      .pipe(shareReplay(1));
  }

  getPoland(): Observable<GeoShape[]> {
    return this.http.get<any>(this._urls.poland)
      .pipe(map(x => {
        return x.features.map(f => {
          if (!this.polandID1ToFips10Map.has(f.properties.ID_1)) throw new Error(`Unmappable id_1 value '${f.properties.ID_1}' while loading polish provinces.`)

          const id = this.polandID1ToFips10Map.get(f.properties.ID_1);
          return {
            id: id,
            name: f.properties.NAME_1,
            geom: { ...f, properties: { name: f.properties.NAME_1, id: id }, id }
          };
        });
      }))
      .pipe(shareReplay(1));;
  }

  getAll(): Observable<GeoShape[]> {
    return this.http.get<any>(this._urls.all)
      .pipe(map(x => x.records.map(r => ({
        id: r.fields.fips_10, name: r.fields.name_sort, geom: {
          "type": "Feature",
          "geometry": r.fields.geo_shape,
          "properties": {
            "name": r.fields.name_sort,
            "id": r.fields.fips_10
          },
          "id": r.fields.fips_10
        }
      }))))
      .pipe(shareReplay(1));;
  }
}
