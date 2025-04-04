import { Component, Input } from "@angular/core";
import { Observable, of } from "rxjs";

@Component({
  selector: "test-component",
  template: "<div>Test</div>",
})
export class TestComponent {
  // This should trigger the rule - Observable as Input type
  @Input() observableInput: Observable<string>;

  // This should also trigger the rule - Observable initializer
  @Input() observableWithInit: Observable<string> = of("test");

  // These should NOT trigger the rule
  @Input() regularInput: string;

  // This is not an Input
  nonInput: Observable<string>;
}
