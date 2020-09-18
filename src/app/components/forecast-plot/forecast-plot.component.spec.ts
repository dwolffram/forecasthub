import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ForecastPlotComponent } from './forecast-plot.component';

describe('ForecastPlotComponent', () => {
  let component: ForecastPlotComponent;
  let fixture: ComponentFixture<ForecastPlotComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ForecastPlotComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ForecastPlotComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
