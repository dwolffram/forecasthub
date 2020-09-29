import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TutorialPlotForecastDescriptionComponent } from './tutorial-plot-forecast-description.component';

describe('TutorialPlotForecastDescriptionComponent', () => {
  let component: TutorialPlotForecastDescriptionComponent;
  let fixture: ComponentFixture<TutorialPlotForecastDescriptionComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ TutorialPlotForecastDescriptionComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(TutorialPlotForecastDescriptionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
