import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ComponentInspectorComponent } from './component-inspector.component';

describe('ComponentInspectorComponent', () => {
  let component: ComponentInspectorComponent;
  let fixture: ComponentFixture<ComponentInspectorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ComponentInspectorComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ComponentInspectorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
