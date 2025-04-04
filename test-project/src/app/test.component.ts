import { Component, Input } from "@angular/core";
import { Observable } from "rxjs";

@Component({
  selector: "app-test",
  template: `<div>{{ data$ | async }}</div>`,
})
export class TestComponent {
  // This should trigger the rule
  @Input() data$: Observable<any>;

  // This should not trigger the rule
  @Input() normalInput: string;

  constructor() {
    this.data$ = new Observable();
    this.normalInput = "hello";
  }
}
