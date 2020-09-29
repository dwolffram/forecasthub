import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TutorialItemDescriptionComponent } from './tutorial-item-description.component';

describe('TutorialItemDescriptionComponent', () => {
  let component: TutorialItemDescriptionComponent;
  let fixture: ComponentFixture<TutorialItemDescriptionComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ TutorialItemDescriptionComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(TutorialItemDescriptionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
