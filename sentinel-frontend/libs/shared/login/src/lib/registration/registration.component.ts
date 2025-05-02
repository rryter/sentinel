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
import {
  PublicKeyCredentialCreationOptionsJSON,
  startRegistration,
} from '@simplewebauthn/browser';
import { HlmButtonModule } from '@spartan-ng/ui-button-helm';
import { HlmFormFieldModule } from '@spartan-ng/ui-formfield-helm';
import { HlmInputDirective } from '@spartan-ng/ui-input-helm';
import { AuthService } from '../services/auth.service';
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
  private authService = inject(AuthService);

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

    this.authService.signUp({ email, name }).subscribe({
      next: (optionsJSON) => {
        this.handleRegistration(optionsJSON);
      },
      error: (err) => {
        console.error('Registration failed:', err);
        // Here you might want to show a user-friendly error message
        // You could inject a notification service or use your preferred UI feedback mechanism
      },
    });
  }

  private async handleRegistration(
    optionsJSON: PublicKeyCredentialCreationOptionsJSON,
  ) {
    try {
      if (!this.validateWebAuthnOptions(optionsJSON)) {
        throw new Error('Invalid WebAuthn options received from server');
      }

      const attResp = await startRegistration({ optionsJSON });

      await this.verifyRegistrationWithServer(attResp);
    } catch (error: unknown) {
      this.handleRegistrationError(error);
    }
  }

  private validateWebAuthnOptions(
    options: PublicKeyCredentialCreationOptionsJSON,
  ): boolean {
    if (!options?.challenge) {
      console.error('Missing challenge in WebAuthn options');
      return false;
    }
    if (!options.rp || !options.user || !options.user.id) {
      console.error('Missing relying party or user information');
      return false;
    }
    return true;
  }

  private async verifyRegistrationWithServer(attResp: any) {
    // Ensure the rawId is properly encoded for transmission
    if (attResp.id) {
      // Convert any + to - and / to _ for URL-safe base64
      attResp.id = attResp.id.replace(/\+/g, '-').replace(/\//g, '_');
    }

    return new Promise((resolve, reject) => {
      this.authService.verifyRegistration(attResp).subscribe({
        next: (response) => {
          console.log('Registration verified successfully');
          // Here you could navigate to the next step or show success message
          resolve(response);
        },
        error: (err) => {
          console.error('Registration verification failed:', err);
          reject(err);
        },
      });
    });
  }

  private handleRegistrationError(error: unknown): void {
    if (error instanceof Error) {
      switch (error.name) {
        case 'InvalidStateError':
          console.error('This authenticator has already been registered');
          // Show user-friendly message about already registered authenticator
          break;
        case 'NotAllowedError':
          console.error('User cancelled the registration');
          // Show message about user cancellation
          break;
        case 'NotSupportedError':
          console.error('WebAuthn is not supported in this browser');
          // Show browser compatibility message
          break;
        default:
          console.error('WebAuthn registration error:', error.message);
        // Show generic error message
      }
    } else {
      console.error('An unexpected error occurred:', error);
      // Show generic error message
    }
  }
}
