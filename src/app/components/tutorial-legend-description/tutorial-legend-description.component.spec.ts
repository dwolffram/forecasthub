import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TutorialLegendDescriptionComponent } from './tutorial-legend-description.component';

describe('TutorialLegendDescriptionComponent', () => {
  let component: TutorialLegendDescriptionComponent;
  let fixture: ComponentFixture<TutorialLegendDescriptionComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ TutorialLegendDescriptionComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(TutorialLegendDescriptionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
