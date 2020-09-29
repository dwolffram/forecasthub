import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TutorialPlotDescriptionComponent } from './tutorial-plot-description.component';

describe('TutorialPlotDescriptionComponent', () => {
  let component: TutorialPlotDescriptionComponent;
  let fixture: ComponentFixture<TutorialPlotDescriptionComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ TutorialPlotDescriptionComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(TutorialPlotDescriptionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
