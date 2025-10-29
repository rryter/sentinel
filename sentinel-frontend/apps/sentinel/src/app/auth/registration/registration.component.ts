import { Component } from '@angular/core';
import { RegistrationComponent } from '@shared/login';
@Component({
  selector: 'app-registration',
  imports: [RegistrationComponent],
  template: `<lib-registration></lib-registration>`,
  styles: `
    :host {
      display: block;
    }
  `,
})
export class RegistrationPageComponent {}
