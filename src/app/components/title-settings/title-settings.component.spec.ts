import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TitleSettingsComponent } from './title-settings.component';

describe('TitleSettingsComponent', () => {
  let component: TitleSettingsComponent;
  let fixture: ComponentFixture<TitleSettingsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ TitleSettingsComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(TitleSettingsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
