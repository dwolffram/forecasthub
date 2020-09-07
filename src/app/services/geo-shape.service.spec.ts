import { TestBed } from '@angular/core/testing';

import { GeoShapeService } from './geo-shape.service';

describe('GeoShapeService', () => {
  let service: GeoShapeService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(GeoShapeService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
