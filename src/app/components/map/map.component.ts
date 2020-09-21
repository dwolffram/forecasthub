import { Component, OnInit, NgZone, Input, Output, EventEmitter, SimpleChanges, OnChanges, OnDestroy } from '@angular/core';
import { LookupService } from 'src/app/services/lookup.service';
import { Observable, forkJoin, BehaviorSubject, Subject, combineLatest, Subscription } from 'rxjs';
import { map, tap, timeout } from 'rxjs/operators';
import { LocationLookupItem, LocationId } from 'src/app/models/lookups';
import * as L from 'leaflet';
import * as _ from 'lodash';
import { GeoShapeService, GeoShape } from 'src/app/services/geo-shape.service';
import { ForecastPlotService } from 'src/app/services/forecast-plot.service';

// TODO: shapes einfärben
// IDEA: dbl click => selectedRoot(null),
@Component({
  selector: 'app-map',
  templateUrl: './map.component.html',
  styleUrls: ['./map.component.scss']
})
export class MapComponent implements OnInit, OnDestroy {
  mapContext$: Observable<any>;
  LocationIds = LocationId;

  options = {
    layers: [
      L.tileLayer('https://tiles.stadiamaps.com/tiles/alidade_smooth/{z}/{x}/{y}{r}.png', {
        maxZoom: 20,
        attribution: '&copy; <a href="https://stadiamaps.com/">Stadia Maps</a>, &copy; <a href="https://openmaptiles.org/">OpenMapTiles</a> &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors'
      })
    ],
  }

  constructor(private luService: LookupService, private shapeService: GeoShapeService, private stateService: ForecastPlotService, private zone: NgZone) { }

  ngOnInit(): void {
    this.mapContext$ = combineLatest([this.stateService.location$, this.luService.locations$, this.shapeService.germany$, this.shapeService.poland$, this.shapeService.all$])
      .pipe(map(([selectedLocation, locationLu, germany, poland, all]) => {
        const selectedRoot = selectedLocation === null ? null : (selectedLocation.parent === null ? selectedLocation : selectedLocation.parent);
        const selectedProvince = selectedLocation === null ? null : (selectedLocation.parent === null ? null : selectedLocation)


        const gLAyer = this.createProvinceLayer(germany, locationLu.get(LocationId.Germany), selectedProvince);
        const pLayer = this.createProvinceLayer(poland, locationLu.get(LocationId.Poland), selectedProvince);

        const allLayer = L.geoJSON(
          <any>all.map(r => r.geom),
          {
            style: (feature) => ({
              color: '#ff0000',
              weight: selectedRoot ? 1 : 2,
              opacity: selectedRoot ? (selectedRoot.id !== feature.id ? 1 : 0) : 1,
              fillOpacity: selectedRoot ? (selectedRoot.id !== feature.id ? .4 : 0) : .4
            }),
            onEachFeature: (feature, layer) => {
              layer.on('click', (x) => {
                const selected = _.find(locationLu.items, { id: x.target.feature.id });
                this.zone.run(() => this.stateService.userLocation = selected);
              });
            }
          });

        const layers = {
          [LocationId.Germany]: gLAyer,
          [LocationId.Poland]: pLayer,
          all: allLayer
        };
        const selectedLayer = selectedRoot ? layers[selectedRoot.id] : null;

        return {
          maxBounds: allLayer.getBounds().pad(0.3),
          fitBounds: selectedLayer ? selectedLayer.getBounds() : layers.all.getBounds(),
          stateLayer: layers.all,
          provinceLayer: selectedLayer
        }
      }));
  }

  ngOnDestroy(): void {
  }

  private createProvinceLayer(shapes: GeoShape[], stateItem: LocationLookupItem, selectedProv: LocationLookupItem) {
    const geojsonData = shapes.map(r => r.geom);
    return L.geoJSON(<any>geojsonData, {
      onEachFeature: (feature, layer) => {
        if (selectedProv && selectedProv.id === feature.properties.id) {
          setTimeout(() => (<any>layer).bringToFront());
        }

        layer.on('click', (x) => {
          const selected = _.find(stateItem.children, { id: x.target.feature.id });
          const toSelect = selected === selectedProv ? stateItem : selected;
          this.zone.run(() => this.stateService.userLocation = toSelect);
        });
      },
      style: (f: any) => ({ color: selectedProv && f.properties.id === selectedProv.id ? 'black' : '#ff7800' })
    })
  }
}
