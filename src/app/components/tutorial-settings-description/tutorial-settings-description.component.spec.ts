import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TutorialSettingsDescriptionComponent } from './tutorial-settings-description.component';

describe('TutorialSettingsDescriptionComponent', () => {
  let component: TutorialSettingsDescriptionComponent;
  let fixture: ComponentFixture<TutorialSettingsDescriptionComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ TutorialSettingsDescriptionComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(TutorialSettingsDescriptionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
