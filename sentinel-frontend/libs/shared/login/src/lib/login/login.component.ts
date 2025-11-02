import { CommonModule } from '@angular/common';
import { Component, input, model, output, signal } from '@angular/core';
import { Field, form } from '@angular/forms/signals';
import { provideIcons } from '@ng-icons/core';
import { lucideFingerprint, lucideGithub, lucideMail } from '@ng-icons/lucide';
import { HlmFormFieldImports } from '@spartan-ng/helm/form-field';
import { HlmInput } from '@spartan-ng/helm/input';

import { LoginConfig, LoginForm } from '../models/login.model';

@Component({
  selector: 'lib-login',
  standalone: true,
  imports: [CommonModule, HlmFormFieldImports, HlmInput, Field],
  providers: [provideIcons({ lucideFingerprint, lucideMail, lucideGithub })],
  templateUrl: './login.component.html',
  styles: [
    `
      :host {
        display: block;
        height: 100vh;
      }
      .diagonal-edge {
        position: absolute;
        top: 0;
        right: -60px;
        width: 120px;
        height: 100%;
        background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
        transform: skewX(-10deg);
        box-shadow: 2px 0 10px rgba(0, 0, 0, 0.1);
        z-index: 1;
      }
      .social-icon {
        width: 48px;
        height: 48px;
        border-radius: 50%;
        border: 1px solid #d1d5db;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s;
        background: white;
      }
      .social-icon:hover {
        background: #f9fafb;
        border-color: #9ca3af;
      }
    `,
  ],
})
export class LoginComponent {
  loginConfig = input<LoginConfig>({
    passkey: true,
  });
  startLogin = output<LoginForm>();
  pending = model<boolean>();

  private readonly initialLoginFormValue: LoginForm = {
    email: '',
  };

  private readonly loginFormState = signal<LoginForm>(
    this.initialLoginFormValue,
  );

  protected readonly loginForm = form(this.loginFormState);

  protected async submitForm(e: Event) {
    e.preventDefault();

    this.pending.set(true);
    this.startLogin.emit(this.loginForm().value());
  }
}
