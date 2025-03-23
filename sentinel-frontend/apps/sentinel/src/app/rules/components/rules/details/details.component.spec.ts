import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RuleDetailsComponent } from './details.component';

describe('RuleDetailsComponent', () => {
  let component: RuleDetailsComponent;
  let fixture: ComponentFixture<RuleDetailsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RuleDetailsComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(RuleDetailsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
