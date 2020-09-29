import { TestBed } from '@angular/core/testing';

import { ForecastTutorialService } from './forecast-tutorial.service';

describe('ForecastTutorialService', () => {
  let service: ForecastTutorialService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ForecastTutorialService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
