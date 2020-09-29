import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { DataComponent } from './pages/data/data.component';
import { ForecastComponent } from './pages/forecast/forecast.component';
import { PageNotFoundComponent } from './pages/page-not-found/page-not-found.component';
import { TeamComponent } from './pages/team/team.component';
import { TutorialComponent } from './pages/tutorial/tutorial.component';

const routes: Routes = [
  { path: 'forecast', component: ForecastComponent },
  { path: 'forecast/:locationId', component: ForecastComponent },
  { path: 'team', component: TeamComponent },
  { path: 'data', component: DataComponent },
  { path: 'tutorial', component: TutorialComponent },
  { path: '', redirectTo: 'forecast', pathMatch: 'full' },
  { path: '**', component: PageNotFoundComponent }
];

@NgModule({
  imports: [RouterModule.forRoot(routes, { anchorScrolling: 'enabled' })],
  exports: [RouterModule]
})
export class AppRoutingModule { }
