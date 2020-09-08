import { Component, OnInit, NgZone } from '@angular/core';
import { LookupService } from 'src/app/services/lookup.service';
import { Observable, forkJoin, BehaviorSubject, Subject, combineLatest } from 'rxjs';
import { map, tap, timeout } from 'rxjs/operators';
import { LocationLookup } from 'src/app/models/lookups';
import * as L from 'leaflet';
import * as _ from 'lodash';
import { GeoShapeService, GeoShape } from 'src/app/services/geo-shape.service';

// TODO: dbl click => selectedRoot(null), shapes einfärben
@Component({
  selector: 'app-map',
  templateUrl: './map.component.html',
  styleUrls: ['./map.component.scss']
})
export class MapComponent implements OnInit {
  data$: Observable<any>;
  selectedRoot: LocationLookup = null;

  options = {
    layers: [
      L.tileLayer('http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 18, attribution: '...' })
    ],
  }

  private selectedProvince$: Subject<LocationLookup> = new BehaviorSubject(null);

  constructor(private luService: LookupService, private shapeService: GeoShapeService, private zone: NgZone) { }

  ngOnInit(): void {
    const loadLuAndMaps$ = forkJoin([this.luService.getLocations(), this.shapeService.getGermany(), this.shapeService.getPoland(), this.shapeService.getAll()])

    this.data$ = combineLatest(loadLuAndMaps$, this.selectedProvince$)
      .pipe(map(([[items, germany, poland, all], selectedProvince]) => {
        const gLAyer = this.createProvinceLayer(germany, _.find(items, { id: 'GM' }).children, selectedProvince);
        const pLayer = this.createProvinceLayer(poland, _.find(items, { id: 'PL' }).children, selectedProvince);

        const allLayer = L.geoJSON(
          <any>all.map(r => r.geom),
          {
            style: () => ({ color: '#ff0000' }),
            onEachFeature: (feature, layer) => {
              layer.on('click', (x) => {
                const selected = _.find(items, { id: x.target.feature.id });
                this.zone.run(() => this.selectRoot(selected));
              });
            }
          });

        return {
          center: allLayer.getBounds(),
          items: items,
          selectedProvince: selectedProvince,
          layers: {
            germany: gLAyer,
            poland: pLayer,
            all: allLayer
          }
        }
      }));
  }

  private createProvinceLayer(shapes: GeoShape[], provinceItems: LocationLookup[], selectedProv: LocationLookup) {
    const geojsonData = shapes.map(r => r.geom);
    return L.geoJSON(<any>geojsonData, {
      onEachFeature: (feature, layer) => {
        if (selectedProv && selectedProv.id === feature.properties.id) {
          setTimeout(() => (<any>layer).bringToFront());
        }

        layer.on('click', (x) => {
          const selected = _.find(provinceItems, { id: x.target.feature.id });
          this.zone.run(() => this.selectProvince(selected));
        });
      },
      style: (f: any) => ({ color: selectedProv && f.properties.id === selectedProv.id ? 'black' : '#ff7800' })
    })
  }

  selectRoot(item: LocationLookup) {
    this.selectedRoot = item;
    this.selectProvince(null);
  }

  selectProvince(item: LocationLookup) {
    // this.selectedProvince = item;
    this.selectedProvince$.next(item);
  }

}
