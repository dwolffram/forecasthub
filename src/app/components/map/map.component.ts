import { Component, OnInit, NgZone, Input, Output, EventEmitter, SimpleChanges, OnChanges, OnDestroy, AfterViewInit } from '@angular/core';
import { LookupService } from 'src/app/services/lookup.service';
import { Observable, forkJoin, BehaviorSubject, Subject, combineLatest, Subscription } from 'rxjs';
import { defaultIfEmpty, map, tap, timeout } from 'rxjs/operators';
import { LocationLookupItem, LocationId } from 'src/app/models/lookups';
import * as L from 'leaflet';
import * as _ from 'lodash';
import { GeoShapeService, GeoShape } from 'src/app/services/geo-shape.service';
import { ForecastPlotService } from 'src/app/services/forecast-plot.service';
import { NgxEchartsConfig } from 'ngx-echarts/lib/ngx-echarts.directive';
import { Control, DomUtil, MapOptions } from 'leaflet';
import { features } from 'process';
import { DataSourceSeriesInfo } from 'src/app/models/series-info';
import * as d3scale from 'd3-scale';
import { DataSource, TruthToPlotValue } from 'src/app/models/truth-to-plot';
import { ThresholdColorScale } from 'src/app/models/color-scale';
import { NumberHelper } from 'src/app/util/number-helper';
import { settings } from 'cluster';

@Component({
  selector: 'app-map',
  templateUrl: './map.component.html',
  styleUrls: ['./map.component.scss']
})
export class MapComponent implements OnInit, OnDestroy {
  mapContext$: Observable<any>;
  LocationIds = LocationId;
  tooltipVisible = false;

  options: MapOptions = {
    zoomControl: false,
    doubleClickZoom: false,
    scrollWheelZoom: false,
    dragging: false,
    layers: [
      L.tileLayer('https://tiles.stadiamaps.com/tiles/alidade_smooth/{z}/{x}/{y}{r}.png?api_key=72893ba3-bd5c-43cc-a377-80e865a2e3e5', {
        maxZoom: 20,
        attribution: '&copy; <a href="https://stadiamaps.com/">Stadia Maps</a>, &copy; <a href="https://openmaptiles.org/">OpenMapTiles</a> &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors'
      })
    ],
  }

  constructor(private luService: LookupService, private shapeService: GeoShapeService, private stateService: ForecastPlotService, private zone: NgZone) { }

  ngOnInit(): void {
    this.mapContext$ = combineLatest([this.stateService.dataSources$, this.stateService.datasourceSettings$, this.luService.locations$, this.shapeService.germany$, this.shapeService.poland$, this.shapeService.all$])
      .pipe(map(([dataSources, [selectedLocation, plotValue, shiftTo], locationLu, germany, poland, all]) => {
        const selectedRoot = selectedLocation.parent === null ? selectedLocation : selectedLocation.parent;
        const selectedProvince = selectedLocation.parent === null ? null : selectedLocation;

        const colorDataSource = _.head(dataSources);
        const maxDate = _.maxBy(colorDataSource.data, x => x.date.toDate()).date;

        const provinceColorScaleData = colorDataSource.select(x => maxDate.isSame(x.date) && selectedRoot.children.some(c => c.id === x.idLocation), plotValue);

        const provinceColorScaleValues = new Map<string, number>(provinceColorScaleData.map(x => {
          const population = locationLu.get(x.dataPoint.idLocation)?.population || 0;
          const value = (x.y / (population > 0 ? population : Infinity)) * 100000;
          // let value = x.y;
          // if (plotValue === TruthToPlotValue.CumulatedCases || plotValue === TruthToPlotValue.CumulatedDeath) {
          //   value = (x.y / (population > 0 ? population : Infinity)) * 100000;
          // }

          return [x.dataPoint.idLocation, value];
        }));
        const provinceColorScale = this.createColorScale(provinceColorScaleValues);

        const gLAyer = this.createProvinceLayer(germany, locationLu.get(LocationId.Germany), selectedProvince, provinceColorScaleValues, provinceColorScale);
        const pLayer = this.createProvinceLayer(poland, locationLu.get(LocationId.Poland), selectedProvince, provinceColorScaleValues, provinceColorScale);

        const allLayer = L.geoJSON(
          <any>all.map(r => r.feature),
          {
            filter: (feature) => {
              return selectedRoot ? selectedRoot.id !== feature.id : true;
            },
            style: (feature) => this.getStateStyle(false),
            onEachFeature: (feature, layer: L.GeoJSON) => {
              layer.on('click', (x) => {
                const selected = _.find(locationLu.items, { id: x.target.feature.id });
                this.zone.run(() => this.stateService.userLocation = selected);
              });
              layer.on('mouseover', x => {
                layer.setStyle(this.getStateStyle(true));
                setTimeout(() => layer.bringToFront());
              });

              layer.on('mouseout', x => {
                layer.setStyle(this.getStateStyle(false))
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
          plotValue: plotValue,
          selectedLayer: selectedLayer,
          provinceColorScale: provinceColorScale,
          fitBounds: selectedLayer.getBounds(),
          stateLayer: layers.all,
          provinceLayer: selectedProvinceLayer
        }
      }));
  }

  ngOnDestroy(): void {
  }

  onMapReady(map: L.Map){
    setTimeout(() => map.invalidateSize(), 250);
  }

  correctedFitBounds: L.LatLngBounds;
  onMapResized(selectedLayer: L.GeoJSON): void {
    this.correctedFitBounds = selectedLayer ? selectedLayer.getBounds() : null
  }

  private getStateStyle(isHovered: boolean): L.PathOptions {
    return {
      color: isHovered ? '#333' : '#4e555b',
      weight: isHovered ? 2 : 1,

      fillColor: 'transparent',
      fillOpacity: 0.5,
    };
  }

  private createProvinceLayer(shapes: GeoShape[], stateItem: LocationLookupItem, selectedProv: LocationLookupItem, dataMap: Map<string, number>, colorScale: ThresholdColorScale) {
    const isFeatureSelected = (f: GeoJSON.Feature<GeoJSON.Geometry, any>) => {
      return selectedProv && f.properties.id === selectedProv.id;
    };

    const getProvinceStyle = (feature: GeoJSON.Feature<GeoJSON.Geometry, any>, isSelected: boolean, isHovered: boolean): L.PathOptions => {
      return {
        color: isSelected ? '#007bff' : (isHovered ? '#333' : '#4e555b'),
        weight: isHovered || isSelected ? 2 : 1,

        fillColor: colorScale.getColor(dataMap.get(feature.id as string)),
        fillOpacity: 1,
      }
    }

    const getTooltipContent = (f: GeoJSON.Feature<GeoJSON.Geometry, any>) => {
      const locationItem = _.find(stateItem.children, x => x.id === f.id);
      const locationValue = dataMap.has(locationItem.id) ? dataMap.get(locationItem.id) : 0;
      return `<b>${locationItem.name}</b><br/>${NumberHelper.formatDecimal(locationValue, 2)} per 100,000 inhabitants`;
    };

    const geojsonData = shapes.map(r => r.feature);
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
          layer.setStyle(getProvinceStyle(feature, isFeatureSelected(feature), true));
          setTimeout(() => layer.bringToFront());
        });

        layer.on('mouseout', x => {
          layer.setStyle(getProvinceStyle(feature, isFeatureSelected(feature), false))
          if (!isFeatureSelected(feature)) {
            setTimeout(() => layer.bringToBack());
          }
        });
      },
      style: (f: any) => getProvinceStyle(f, isFeatureSelected(f), false)
    }).bindTooltip((l: L.GeoJSON) => getTooltipContent(l.feature as GeoJSON.Feature<GeoJSON.Geometry, any>))
  }

  private createColorScale(data: Map<string, number>): ThresholdColorScale {
    if (data && data.size > 0) {
      return new ThresholdColorScale([...data.values()]);
    }
    return new ThresholdColorScale([]);
  }

}
