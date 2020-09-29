import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DimBackgroundComponent } from './dim-background.component';

describe('DimBackgroundComponent', () => {
  let component: DimBackgroundComponent;
  let fixture: ComponentFixture<DimBackgroundComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ DimBackgroundComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(DimBackgroundComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
