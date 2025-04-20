import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LintingComponent } from './linting.component';

describe('LintingComponent', () => {
  let component: LintingComponent;
  let fixture: ComponentFixture<LintingComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LintingComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(LintingComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
