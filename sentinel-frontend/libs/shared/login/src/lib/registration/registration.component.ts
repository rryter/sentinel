import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { Field, form } from '@angular/forms/signals';
import { RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideArrowRight,
  lucideEye,
  lucideFingerprint,
  lucideGithub,
  lucideLock,
  lucideMail,
  lucideUser,
} from '@ng-icons/lucide';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmFormFieldImports } from '@spartan-ng/helm/form-field';
import { HlmInput } from '@spartan-ng/helm/input';

import { RegistrationForm } from '../models/registration.model';
import { WebAuthnRegistrationService } from '../services/webauthn-registration.service';

@Component({
  selector: 'lib-registration',
  imports: [
    CommonModule,
    NgIcon,
    RouterLink,
    ReactiveFormsModule,
    HlmFormFieldImports,
    HlmInput,
    HlmButtonImports,
    Field,
  ],
  templateUrl: './registration.component.html',
  providers: [
    provideIcons({
      lucideFingerprint,
      lucideMail,
      lucideGithub,
      lucideUser,
      lucideLock,
      lucideEye,
      lucideArrowRight,
    }),
  ],
  styleUrl: './registration.component.scss',
})
export class RegistrationComponent {
  private webAuthnService = inject(WebAuthnRegistrationService);

  private readonly initialRegistrationFormValue: RegistrationForm = {
    name: '',
    email: '',
  };

  private readonly loginRegistrationState = signal<RegistrationForm>(
    this.initialRegistrationFormValue,
  );

  protected readonly registrationForm = form(this.loginRegistrationState);

  async register(e: Event) {
    e.preventDefault();

    if (this.registrationForm().invalid()) {
      return;
    }

    const { email, name } = this.registrationForm().value();

    try {
      await this.webAuthnService.registerUser(email, name);
      // Handle successful registration (e.g., redirect or show success message)
    } catch (err) {
      console.error('Registration failed:', err);
      // Handle registration error (e.g., show error message)
    }
  }
}
