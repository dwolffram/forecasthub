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
import { Control, DomUtil, MapOptions } from 'leaflet';
import { features } from 'process';
import { DataSourceSeriesInfo } from 'src/app/models/series-info';
import * as d3scale from 'd3-scale';
import { DataSource } from 'src/app/models/truth-to-plot';

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
  private map: any;


  constructor(private luService: LookupService, private shapeService: GeoShapeService, private stateService: ForecastPlotService, private zone: NgZone) { }

  ngOnInit(): void {
    this.mapContext$ = combineLatest([this.stateService.dataSources$, this.stateService.datasourceSettings$, this.luService.locations$, this.shapeService.germany$, this.shapeService.poland$, this.shapeService.all$])
      .pipe(map(([dataSources, settings, locationLu, germany, poland, all]) => {
        const [selectedLocation, plotValue] = settings;
        const selectedRoot = selectedLocation.parent === null ? selectedLocation : selectedLocation.parent;
        const selectedProvince = selectedLocation.parent === null ? null : selectedLocation;

        const colorDataSource = _.head(dataSources);
        const maxDate = _.maxBy(colorDataSource.data, x => x.date.toDate()).date;

        const provinceColorScaleData = colorDataSource.select(x => maxDate.isSame(x.date) && selectedRoot.children.some(c => c.id === x.idLocation), plotValue);
        const provinceColorScaleValues = new Map<string, number>(provinceColorScaleData.map(x => [x.dataPoint.idLocation, x.y]));
        const provinceColorScale = this.createColorScale(provinceColorScaleValues);

        const gLAyer = this.createProvinceLayer(germany, locationLu.get(LocationId.Germany), selectedProvince, provinceColorScaleValues, provinceColorScale.func);
        const pLayer = this.createProvinceLayer(poland, locationLu.get(LocationId.Poland), selectedProvince, provinceColorScaleValues, provinceColorScale.func);

        const allLayer = L.geoJSON(
          <any>all.map(r => r.geom),
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
          selectedLayer: selectedLayer,
          provinceColorScale: provinceColorScale,
          fitBounds: selectedLayer.getBounds(),
          stateLayer: layers.all,
          provinceLayer: selectedProvinceLayer
        }
      }))
      .pipe(tap(x => this.updateLegend(this.map, x.provinceColorScale)));
  }

  ngOnDestroy(): void {
  }

  correctedFitBounds: L.LatLngBounds;
  onMapResized(selectedLayer: L.GeoJSON): void {
    this.correctedFitBounds = selectedLayer ? selectedLayer.getBounds() : null;
  }

  onMapReady(map: any, provinceScale: { scale: any, func: (x: number) => string }) {
    this.map = map;
    this.updateLegend(map, provinceScale);
  }

  private getStateStyle(isHovered: boolean): L.PathOptions {
    return {
      color: isHovered ? '#333' : '#4e555b',
      weight: isHovered ? 2 : 1,

      fillColor: '#333',
      fillOpacity: 0.5,
    };
  }

  private createProvinceLayer(shapes: GeoShape[], stateItem: LocationLookupItem, selectedProv: LocationLookupItem, dataMap: Map<string, number>, colorScale: (x: number) => string) {
    const isFeatureSelected = (f: GeoJSON.Feature<GeoJSON.Geometry, any>) => {
      return selectedProv && f.properties.id === selectedProv.id;
    };

    const getProvinceStyle = (feature: GeoJSON.Feature<GeoJSON.Geometry, any>, isSelected: boolean, isHovered: boolean): L.PathOptions => {
      return {
        color: isSelected ? '#007bff' : (isHovered ? '#333' : '#4e555b'),
        weight: isHovered || isSelected ? 2 : 1,

        fillColor: colorScale(dataMap.get(feature.id as string)),
        fillOpacity: 1,
      }
    }

    const getTooltipContent = (f: GeoJSON.Feature<GeoJSON.Geometry, any>) => {
      const locationItem = _.find(stateItem.children, x => x.id === f.id);
      const locationValue = dataMap.has(locationItem.id) && dataMap.get(locationItem.id);
      return `${locationItem.name} ${locationValue || ''}`;
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

  private createColorScale(data: Map<string, number>): { scale: d3scale.ScaleQuantize<string>, func: (x: number) => string } {
    if (data && data.size > 0) {
      const values = [...data.values()];
      const maxValue = _.min([9, _.max(values)]);
      if (maxValue > 0) {
        const colorsCandidates = ['#fff5eb', '#fee6ce', '#fdd0a2', '#fdae6b', '#fd8d3c', '#f16913', '#d94801', '#a63603', '#7f2704'];
        const colors = _.range(maxValue).map((x, i) => {
          const ls = 9 / maxValue;
          const start = ls * i;
          const end = ls * (i + 1);
          const newIndex = Math.round((start + end) / 2) - 1;
          return colorsCandidates[newIndex];
        }).slice(1);

        if (colors.length > 0) {
          const scale = d3scale.scaleQuantize<string>().domain([_.min(values), _.max(values)]).range(colors);
          return { scale, func: (x) => x > 0 ? scale(x) : '#fff' };
        }
      }
    }
    return { scale: null, func: () => '#fff' };
  }

  private createIntLegendItems(scale: { scale: any, func: (x: number) => string }) {
    if (!scale?.scale) return [];
    return [1, ...scale.scale.thresholds().map(x => Math.ceil(x))].map((grade, index, array) => {
      let label = '';
      if (index === array.length - 1) {
        label = array[index] + '+';
      } else if (array[index] === array[index + 1] - 1) {
        label = array[index];
      } else {
        label = array[index] + '&ndash;' + (array[index + 1] - 1);
      }
      return { grade, label };
    });
  }

  private legend: any;
  private updateLegend(map: any, scale: { scale: any, func: (x: number) => string }) {
    if (this.legend) {
      this.legend.remove();
      this.legend = null;
    }

    if (map && scale) {
      const legend = new Control({ position: 'bottomright' });
      const gradeLabels = this.createIntLegendItems(scale);
      legend.onAdd = (map) => {
        const div = DomUtil.create('div', 'info legend');
        div.innerHTML = '<span style=" background:' + scale.func(0) + '" class="legend-block"></span> ' + 0 + '<br />';
        gradeLabels.forEach((item) => {
          div.innerHTML +=
            '<span style=" background:' + (scale.func(item.grade)) + '" class="legend-block"></span> ' + item.label + '<br />';
        });
        return div;
      };
      legend.addTo(map);
      this.legend = legend;
    }
  }

}
