import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { AboutComponent } from './pages/about/about.component';
import { ContribsComponent } from './pages/contribs/contribs.component';
import { ForecastComponent } from './pages/forecast/forecast.component';
import { PageNotFoundComponent } from './pages/page-not-found/page-not-found.component';
import { TutorialComponent } from './pages/tutorial/tutorial.component';

const routes: Routes = [
  { path: 'forecast', component: ForecastComponent },
  { path: 'forecast/:locationId', component: ForecastComponent },
  { path: 'contributors', component: ContribsComponent },
  { path: 'about', component: AboutComponent },
  { path: 'tutorial', component: TutorialComponent },
  { path: '', redirectTo: 'forecast', pathMatch: 'full' },
  { path: '**', component: PageNotFoundComponent }
];

@NgModule({
  imports: [RouterModule.forRoot(routes, { anchorScrolling: 'enabled' })],
  exports: [RouterModule]
})
export class AppRoutingModule { }
