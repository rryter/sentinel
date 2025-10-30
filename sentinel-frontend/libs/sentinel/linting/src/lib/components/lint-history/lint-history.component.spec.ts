import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LintHistoryComponent } from './lint-history.component';

describe('LintHistoryComponent', () => {
  let component: LintHistoryComponent;
  let fixture: ComponentFixture<LintHistoryComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LintHistoryComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(LintHistoryComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
