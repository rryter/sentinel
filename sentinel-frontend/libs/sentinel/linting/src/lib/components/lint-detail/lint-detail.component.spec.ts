import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LintDetailComponent } from './lint-detail.component';

describe('LintDetailComponent', () => {
  let component: LintDetailComponent;
  let fixture: ComponentFixture<LintDetailComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LintDetailComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(LintDetailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
