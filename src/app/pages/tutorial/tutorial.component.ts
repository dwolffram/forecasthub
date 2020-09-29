import { AfterViewInit, Component, ElementRef, OnInit, QueryList, ViewChild, ViewChildren, ViewContainerRef } from '@angular/core';
import { BehaviorSubject, combineLatest, Observable } from 'rxjs';
import { delayWhen, tap } from 'rxjs/operators';
import { TitleSettingsComponent } from 'src/app/components/title-settings/title-settings.component';
import { TutorialItemDescriptionComponent } from 'src/app/components/tutorial-item-description/tutorial-item-description.component';
import { TutorialItemDescriptionDirective } from 'src/app/directives/tutorial-item-description.directive';
import { ForecastTutorialService } from 'src/app/services/forecast-tutorial.service';
import { LoadingService } from 'src/app/services/loading.service';

enum TutorialSteps {
  Settings = 0,
  Map = 1,
  Legend = 2,
  Plot = 3
}

@Component({
  selector: 'app-tutorial',
  templateUrl: './tutorial.component.html',
  styleUrls: ['./tutorial.component.scss']
})
export class TutorialComponent implements OnInit, AfterViewInit {
  loading$: Observable<any>;

  // private viewInit = new BehaviorSubject<boolean>(false);

  constructor(private tutorialService: ForecastTutorialService, private loadingService: LoadingService) { }
  step = TutorialSteps.Settings;

  // @ViewChild(TitleSettingsComponent, { read: ElementRef }) settingsComp: ElementRef;

  ngOnInit(): void {
    this.loading$ = this.loadingService.loading$;
  }

  ngAfterViewInit(): void {
  }
}
