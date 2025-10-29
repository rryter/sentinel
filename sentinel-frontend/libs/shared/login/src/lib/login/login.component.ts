import { CommonModule } from '@angular/common';
import { Component, input, model, output, signal } from '@angular/core';
import { Field, form } from '@angular/forms/signals';
import { RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideFingerprint, lucideGithub, lucideMail } from '@ng-icons/lucide';
import { HlmFormFieldImports } from '@spartan-ng/helm/form-field';
import { HlmInput } from '@spartan-ng/helm/input';

import { LoginConfig, LoginForm } from '../models/login.model';

@Component({
  selector: 'lib-login',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    HlmFormFieldImports,
    HlmInput,
    Field,
    NgIcon,
  ],
  providers: [provideIcons({ lucideFingerprint, lucideMail, lucideGithub })],
  templateUrl: './login.component.html',
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
