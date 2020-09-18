import { TestBed } from '@angular/core/testing';

import { ForecastPlotService } from './forecast-plot.service';

describe('ForecastPlotService', () => {
  let service: ForecastPlotService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ForecastPlotService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
