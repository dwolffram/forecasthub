import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { ForecastComponent } from './pages/forecast/forecast.component';
import { PageNotFoundComponent } from './pages/page-not-found/page-not-found.component';
import { MapComponent } from './components/map/map.component';
import { HttpClientModule } from '@angular/common/http';
import { LeafletModule } from '@asymmetrik/ngx-leaflet';
import { ForecastPlotComponent } from './components/forecast-plot/forecast-plot.component';
import { NgxEchartsModule } from 'ngx-echarts';
import { TitleSettingsComponent } from './components/title-settings/title-settings.component';
import { FormsModule } from '@angular/forms';
import { LegendComponent } from './components/legend/legend.component';
import { EchartsZrClickDirective } from './directives/echarts-zr-click.directive';
import { LocationSelectComponent } from './components/location-select/location-select.component';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { LeafletResizeDirective } from './directives/leaflet-resize.directive';

@NgModule({
  declarations: [
    AppComponent,
    ForecastComponent,
    PageNotFoundComponent,
    MapComponent,
    ForecastPlotComponent,
    TitleSettingsComponent,
    LegendComponent,
    EchartsZrClickDirective,
    LocationSelectComponent,
    LeafletResizeDirective,
  ],
  imports: [
    BrowserModule,
    HttpClientModule,
    AppRoutingModule,
    NgbModule,
    LeafletModule,
    FormsModule,
    NgxEchartsModule.forRoot({
      echarts: () => import('echarts')
    }),
    FontAwesomeModule,
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
