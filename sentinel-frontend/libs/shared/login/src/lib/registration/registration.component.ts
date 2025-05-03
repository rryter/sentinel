import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import {
  NonNullableFormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
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
import { HlmButtonModule } from '@spartan-ng/ui-button-helm';
import { HlmFormFieldModule } from '@spartan-ng/ui-formfield-helm';
import { HlmInputDirective } from '@spartan-ng/ui-input-helm';
import { WebAuthnRegistrationService } from '../services/webauthn-registration.service';

@Component({
  selector: 'lib-registration',
  imports: [
    CommonModule,
    NgIcon,
    RouterLink,
    ReactiveFormsModule,
    HlmFormFieldModule,
    HlmInputDirective,
    HlmButtonModule,
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
  private _formBuilder = inject(NonNullableFormBuilder);
  private webAuthnService = inject(WebAuthnRegistrationService);

  form = this._formBuilder.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.required, Validators.email]],
  });

  // Form getter helpers
  get emailControl() {
    return this.form.get('email');
  }
  get nameControl() {
    return this.form.get('name');
  }

  async register() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { email, name } = this.form.value;

    // Type guard to ensure values are not undefined
    if (!email || !name) {
      console.error('Form values are invalid');
      return;
    }

    try {
      await this.webAuthnService.registerUser(email, name);
      // Handle successful registration (e.g., redirect or show success message)
    } catch (err) {
      console.error('Registration failed:', err);
      // Handle registration error (e.g., show error message)
    }
  }
}
