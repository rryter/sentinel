import { LintCreateComponent } from './lint-create.component';
import { ComponentFixture, TestBed } from '@angular/core/testing';

describe('LintCreateComponent', () => {
  let component: LintCreateComponent;
  let fixture: ComponentFixture<LintCreateComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LintCreateComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(LintCreateComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
