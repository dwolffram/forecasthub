import { Component, OnInit, NgZone } from '@angular/core';
import { LookupService } from 'src/app/services/lookup.service';
import { Observable, forkJoin } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import { LocationLookup } from 'src/app/models/lookups';
import * as L from 'leaflet';
import * as _ from 'lodash';
import { GeoShapeService, GeoShape } from 'src/app/services/geo-shape.service';

@Component({
  selector: 'app-map',
  templateUrl: './map.component.html',
  styleUrls: ['./map.component.scss']
})
export class MapComponent implements OnInit {

  // items$: Observable<LocationLookup[]>;

  // leafletData$: Observable<any>;

  data$: Observable<any>;
  selectedRoot: LocationLookup;
  selectedProvince: LocationLookup;

  options = {
    layers: [
      L.tileLayer('http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 18, attribution: '...' })
    ],
    zoom: 5,
    center: L.latLng(46.879966, -121.726909)
  }

  constructor(private luService: LookupService, private shapeService: GeoShapeService, private zone: NgZone) { }

  ngOnInit(): void {
    // this.initItems();
    // this.initLeaflet()

    // const items$ = ;

    // const layerGermany$ = this.shapeService.getGermany()
    //   .pipe(map(x => {
    //     const geojsonData = x.map(r => r.geom);
    //     return L.geoJSON(
    //       <any>geojsonData,
    //       { style: () => ({ color: '#ff7800' }) })
    //   }));
    // const layerPoland$ = this.shapeService.getPoland()
    //   .pipe(map(x => {
    //     const geojsonData = x.map(r => r.geom);
    //     return L.geoJSON(
    //       <any>geojsonData,
    //       { style: () => ({ color: '#ff7800' }) })
    //   }));

    // const layerAll$ = this.shapeService.getAll()
    //   .pipe(map(x => {
    //     const geojsonData = x.map(r => r.geom);
    //     return L.geoJSON(
    //       <any>geojsonData,
    //       {
    //         style: () => ({ color: '#ff0000' }),
    //         onEachFeature: (feature, layer) => {
    //           layer.on('click', (x) => {
    //             x.target.feature.geometry.properties.id
    //           })
    //         }
    //       })
    //   }));

    this.data$ = forkJoin([this.luService.getLocations(), this.shapeService.getGermany(), this.shapeService.getPoland(), this.shapeService.getAll()])
      .pipe(map(([items, germany, poland, all]) => {
        const gLAyer = this.createProvinceLayer(germany);
        const pLayer = this.createProvinceLayer(poland);

        const allLayer = L.geoJSON(
          <any>all.map(r => r.geom),
          {
            style: () => ({ color: '#ff0000' }),
            onEachFeature: (feature, layer) => {
              layer.on('click', (x) => {
                const selected = _.find(items, { id: x.target.feature.geometry.properties.id });
                this.zone.run(() => this.selectRoot(selected));
              })
            }
          });

        return {
          center: allLayer.getBounds(),
          items: items,
          layers: {
            germany: gLAyer,
            poland: pLayer,
            all: allLayer
          }
        }
      }));

  }

  private createProvinceLayer(shapes: GeoShape[]) {
    const geojsonData = shapes.map(r => r.geom);
    return L.geoJSON(<any>geojsonData, { style: () => ({ color: '#ff7800' }) })
  }

  // private initItems() {
  //   this.items$ = this.luService.getLocations();
  // }

  // private initLeaflet() {
  //   const layerGermany$ = this.shapeService.getGermany()
  //     .pipe(map(x => {
  //       const geojsonData = x.map(r => r.geom);
  //       return L.geoJSON(
  //         <any>geojsonData,
  //         { style: () => ({ color: '#ff7800' }) })
  //     }));
  //   const layerPoland$ = this.shapeService.getPoland()
  //     .pipe(map(x => {
  //       const geojsonData = x.map(r => r.geom);
  //       return L.geoJSON(
  //         <any>geojsonData,
  //         { style: () => ({ color: '#ff7800' }) })
  //     }));

  //   const layerAll$ = this.shapeService.getAll()
  //     .pipe(map(x => {
  //       const geojsonData = x.map(r => r.geom);
  //       return L.geoJSON(
  //         <any>geojsonData,
  //         {
  //           style: () => ({ color: '#ff0000' }),
  //           onEachFeature: (feature, layer) => {
  //             layer.on('click', (x) => {
  //               x.target.feature.geometry.properties.id
  //             })
  //           }
  //         })
  //     }));

  //   this.leafletData$ = forkJoin([layerGermany$, layerPoland$, layerAll$])
  //     .pipe(map(x => {
  //       return {
  //         center: x[2].getBounds(),
  //         layers: {
  //           germany: x[0],
  //           poland: x[1],
  //           all: x[2]
  //         }
  //       }
  //     }));
  // }

  selectRoot(item: LocationLookup) {
    this.selectedRoot = item;
    this.selectedProvince = null;
  }

}
