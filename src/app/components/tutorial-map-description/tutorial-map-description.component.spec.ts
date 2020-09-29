import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TutorialMapDescriptionComponent } from './tutorial-map-description.component';

describe('TutorialMapDescriptionComponent', () => {
  let component: TutorialMapDescriptionComponent;
  let fixture: ComponentFixture<TutorialMapDescriptionComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ TutorialMapDescriptionComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(TutorialMapDescriptionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
