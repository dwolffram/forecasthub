import { Component, OnInit, NgZone, Input, Output, EventEmitter, SimpleChanges, OnChanges, OnDestroy } from '@angular/core';
import { LookupService } from 'src/app/services/lookup.service';
import { Observable, forkJoin, BehaviorSubject, Subject, combineLatest, Subscription } from 'rxjs';
import { defaultIfEmpty, map, tap, timeout } from 'rxjs/operators';
import { LocationLookupItem, LocationId } from 'src/app/models/lookups';
import * as L from 'leaflet';
import * as _ from 'lodash';
import { GeoShapeService, GeoShape } from 'src/app/services/geo-shape.service';
import { ForecastPlotService } from 'src/app/services/forecast-plot.service';
import { NgxEchartsConfig } from 'ngx-echarts/lib/ngx-echarts.directive';
import { MapOptions } from 'leaflet';
import { features } from 'process';

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

  options: MapOptions = {
    zoomControl: false,
    doubleClickZoom: false,
    scrollWheelZoom: false,
    dragging: false,
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
            filter: (feature) => {
              return selectedRoot ? selectedRoot.id !== feature.id : true;
            },
            style: (feature) => this.getStateStyle(feature, false, selectedRoot && selectedRoot.id !== feature.id),
            onEachFeature: (feature, layer: L.GeoJSON) => {
              layer.on('click', (x) => {
                const selected = _.find(locationLu.items, { id: x.target.feature.id });
                this.zone.run(() => this.stateService.userLocation = selected);
              });
              layer.on('mouseover', x => {
                layer.setStyle(this.getStateStyle(feature, true, selectedRoot && selectedRoot.id !== feature.id));
                setTimeout(() => layer.bringToFront());
              });

              layer.on('mouseout', x => {
                layer.setStyle(this.getStateStyle(feature, false, selectedRoot && selectedRoot.id !== feature.id))
                setTimeout(() => layer.bringToBack());
              });
            }
          });

        const layers = {
          [LocationId.Germany]: gLAyer,
          [LocationId.Poland]: pLayer,
          all: allLayer
        };

        const selectedLayer = selectedRoot ? layers[selectedRoot.id] : layers.all;
        const selectedProvinceLayer = selectedRoot ? layers[selectedRoot.id] : null;

        this.correctedFitBounds = null;

        return {
          selectedLayer: selectedLayer,
          fitBounds: selectedLayer.getBounds(),
          stateLayer: layers.all,
          provinceLayer: selectedProvinceLayer
        }
      }));
  }

  ngOnDestroy(): void {
  }

  correctedFitBounds: L.LatLngBounds;
  onMapResized(selectedLayer: L.GeoJSON): void {
    this.correctedFitBounds = selectedLayer ? selectedLayer.getBounds() : null;
  }

  private provinceColors = new Map<string, string>();
  private getProvinceColor(feature: GeoJSON.Feature<GeoJSON.Geometry, any>): string {
    if(!this.provinceColors.has(feature.id as string)){
      this.provinceColors.set(feature.id as string, ['green', 'yellow', 'red'][_.random(0, 2, false)]);
    }
    return this.provinceColors.get(feature.id as string);
  }

  private stateColors = new Map<string, string>();
  private getStateColor(feature: GeoJSON.Feature<GeoJSON.Geometry, any>): string {
    if(!this.stateColors.has(feature.id as string)){
      this.stateColors.set(feature.id as string, ['green', 'yellow', 'red'][_.random(0, 2, false)]);
    }
    return this.stateColors.get(feature.id as string);
  }

  private getStateStyle(feature: GeoJSON.Feature<GeoJSON.Geometry, any>, isHovered: boolean, grayFill: boolean): L.PathOptions {
    return ({
      color: isHovered ? '#333' : '#4e555b',
      weight: isHovered ? 2 : 1,

      fillColor: grayFill ? '#333' : this.getStateColor(feature),
      fillOpacity: 0.5,
    })
  }

  private getProvinceStyle(feature: GeoJSON.Feature<GeoJSON.Geometry, any>, isSelected: boolean, isHovered: boolean): L.PathOptions {
    return {
      color: isSelected ? '#007bff' : (isHovered ? '#333' : '#4e555b'),
      weight: isHovered || isSelected ? 2 : 1,

      fillColor: this.getProvinceColor(feature),
      fillOpacity: 0.5,
    }
  }

  private createProvinceLayer(shapes: GeoShape[], stateItem: LocationLookupItem, selectedProv: LocationLookupItem) {
    const isFeatureSelected = (f: GeoJSON.Feature<GeoJSON.Geometry, any>) => {
      return selectedProv && f.properties.id === selectedProv.id;
    };

    const getTooltipContent = (f: GeoJSON.Feature<GeoJSON.Geometry, any>) => {
      const locationItem = _.find(stateItem.children, x => x.id === f.id);
      return locationItem.name;
    };

    const geojsonData = shapes.map(r => r.geom);
    return L.geoJSON(<any>geojsonData, {
      onEachFeature: (feature: GeoJSON.Feature<GeoJSON.Geometry, any>, layer: L.GeoJSON) => {
        if (selectedProv && selectedProv.id === feature.properties.id) {
          setTimeout(() => (<any>layer).bringToFront());
        }

        layer.on('click', (x) => {
          const selected = _.find(stateItem.children, { id: x.target.feature.id });
          const toSelect = selected === selectedProv ? stateItem : selected;
          this.zone.run(() => this.stateService.userLocation = toSelect);
        });

        layer.on('mouseover', x => {
          layer.setStyle(this.getProvinceStyle(feature, isFeatureSelected(feature), true));
          setTimeout(() => layer.bringToFront());
        });

        layer.on('mouseout', x => {
          layer.setStyle(this.getProvinceStyle(feature,isFeatureSelected(feature), false))
          if (!isFeatureSelected(feature)) {
            setTimeout(() => layer.bringToBack());
          }
        });
      },
      style: (f: any) => this.getProvinceStyle(f, isFeatureSelected(f), false)
    }).bindTooltip((l: L.GeoJSON) => getTooltipContent(l.feature as GeoJSON.Feature<GeoJSON.Geometry, any>))
  }
}
