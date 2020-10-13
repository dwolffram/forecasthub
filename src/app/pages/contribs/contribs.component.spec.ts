import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ContribsComponent } from './contribs.component';

describe('TeamComponent', () => {
  let component: ContribsComponent;
  let fixture: ComponentFixture<ContribsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ContribsComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ContribsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
