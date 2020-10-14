import { AfterViewInit, Component, ElementRef, OnInit, QueryList, ViewChild, ViewChildren, ViewContainerRef } from '@angular/core';
import { BehaviorSubject, combineLatest, Observable } from 'rxjs';
import { LoadingService } from 'src/app/services/loading.service';

@Component({
  selector: 'app-tutorial',
  templateUrl: './tutorial.component.html',
  styleUrls: ['./tutorial.component.scss']
})
export class TutorialComponent implements OnInit, AfterViewInit {
  loading$: Observable<any>;
  step = 0;

  constructor(private loadingService: LoadingService) { }

  ngOnInit(): void {
    this.loading$ = this.loadingService.loading$;
  }

  ngAfterViewInit(): void {
  }
}
