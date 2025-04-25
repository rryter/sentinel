import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LintMetricsComponent } from './lint-metrics.component';

describe('LintMetricsComponent', () => {
  let component: LintMetricsComponent;
  let fixture: ComponentFixture<LintMetricsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LintMetricsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(LintMetricsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
