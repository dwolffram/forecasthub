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

  data$: Observable<any>;
  selectedRoot: LocationLookupItem = null;
  LocationIds = LocationId;

  options = {
    layers: [
      L.tileLayer('http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 18, attribution: '...' })
    ],
  }

  private selectedProvince$: Subject<LocationLookupItem> = new BehaviorSubject(null);
  private _locationSubscription: Subscription;

  constructor(private luService: LookupService, private shapeService: GeoShapeService, private stateService: ForecastPlotService, private zone: NgZone) { }


  private updateSelectedLocation(location: LocationLookupItem) {
    if (!location) {
      this.selectedRoot = null;
      this.selectedProvince$.next(null);
    }
    else if (location.parent) {
      this.selectedRoot = location.parent;
      this.selectedProvince$.next(location);
    } else {
      this.selectedRoot = location;
      this.selectedProvince$.next(null);
    }
  }

  ngOnInit(): void {
    const loadLuAndMaps$ = forkJoin([this.luService.locations$, this.shapeService.germany$, this.shapeService.poland$, this.shapeService.all$])

    this.data$ = combineLatest([loadLuAndMaps$, this.selectedProvince$])
      .pipe(map(([[locationLu, germany, poland, all], selectedProvince]) => {

        const gLAyer = this.createProvinceLayer(germany, locationLu.get(LocationId.Germany).children, selectedProvince);
        const pLayer = this.createProvinceLayer(poland, locationLu.get(LocationId.Poland).children, selectedProvince);

        const allLayer = L.geoJSON(
          <any>all.map(r => r.geom),
          {
            style: (feature) => ({
              color: '#ff0000',
              weight: this.selectedRoot ? 1 : 2,
              opacity: this.selectedRoot ? (this.selectedRoot.id !== feature.id ? 1 : 0) : 1,
              fillOpacity: this.selectedRoot ? (this.selectedRoot.id !== feature.id ? .4 : 0) : .4
            }),
            // filter: (feature) => {
            //   if (this.selectedRoot) {
            //     return this.selectedRoot.id !== feature.id;
            //   }
            //   return true;
            // },
            onEachFeature: (feature, layer) => {
              layer.on('click', (x) => {
                const selected = _.find(locationLu.items, { id: x.target.feature.id });
                this.zone.run(() => this.selectRoot(selected));
              });
            }
          });

        const allLayerBounds = allLayer.getBounds();
        return {
          maxBounds: allLayerBounds.pad(0.3),
          items: locationLu.items,
          selectedProvince: selectedProvince,
          layers: {
            [LocationId.Germany]: { instance: gLAyer, bounds: gLAyer.getBounds() },
            [LocationId.Poland]: { instance: pLayer, bounds: pLayer.getBounds() },
            all: { instance: allLayer, bounds: allLayerBounds }
          }
        }
      }));

    this._locationSubscription = this.stateService.location$.subscribe(x => this.updateSelectedLocation(x));
  }

  ngOnDestroy(): void {
    this._locationSubscription.unsubscribe();
  }

  // ngOnChanges(changes: SimpleChanges): void {
  //   if (changes.location) {
  //     this.updateSelectedLocation();
  //   }
  // }


  private createProvinceLayer(shapes: GeoShape[], provinceItems: LocationLookupItem[], selectedProv: LocationLookupItem) {
    const geojsonData = shapes.map(r => r.geom);
    return L.geoJSON(<any>geojsonData, {
      onEachFeature: (feature, layer) => {
        if (selectedProv && selectedProv.id === feature.properties.id) {
          setTimeout(() => (<any>layer).bringToFront());
        }

        layer.on('click', (x) => {
          const selected = _.find(provinceItems, { id: x.target.feature.id });
          const toSelect = selected === selectedProv ? null : selected;
          this.zone.run(() => this.selectProvince(toSelect));
        });
      },
      style: (f: any) => ({ color: selectedProv && f.properties.id === selectedProv.id ? 'black' : '#ff7800' })
    })
  }

  selectRoot(item: LocationLookupItem) {
    this.selectedRoot = item;
    this.selectedProvince$.next(null);
    this.stateService.location = item;
  }

  selectProvince(item: LocationLookupItem) {
    // this.selectedProvince = item;
    this.selectedProvince$.next(item);
    this.stateService.location = item ? item : this.selectedRoot;
  }

}
