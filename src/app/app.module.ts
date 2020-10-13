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
import { LoadingSpinnerComponent } from './components/loading-spinner/loading-spinner.component';
import { AboutComponent } from './pages/about/about.component';
import { TutorialComponent } from './pages/tutorial/tutorial.component';
import { LeafletExtentionDirective } from './directives/leaflet-extention.directive';
import { TutorialSettingsDescriptionComponent } from './components/tutorial-settings-description/tutorial-settings-description.component';
import { DimBackgroundComponent } from './components/dim-background/dim-background.component';
import { TutorialLegendDescriptionComponent } from './components/tutorial-legend-description/tutorial-legend-description.component';
import { TutorialMapDescriptionComponent } from './components/tutorial-map-description/tutorial-map-description.component';
import { TutorialPlotDescriptionComponent } from './components/tutorial-plot-description/tutorial-plot-description.component';
import { TutorialPlotForecastDescriptionComponent } from './components/tutorial-plot-forecast-description/tutorial-plot-forecast-description.component';
import { LabelTruthToPlotSourcePipe } from './pipes/label-truth-to-plot-source.pipe';
import { LabelTruthToPlotValuePipe } from './pipes/label-truth-to-plot-value.pipe';
import { ContribsComponent } from './pages/contribs/contribs.component';

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
    LoadingSpinnerComponent,
    ContribsComponent,
    AboutComponent,
    TutorialComponent,
    LeafletExtentionDirective,
    TutorialSettingsDescriptionComponent,
    DimBackgroundComponent,
    TutorialLegendDescriptionComponent,
    TutorialMapDescriptionComponent,
    TutorialPlotDescriptionComponent,
    TutorialPlotForecastDescriptionComponent,
    LabelTruthToPlotSourcePipe,
    LabelTruthToPlotValuePipe
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
    FontAwesomeModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
