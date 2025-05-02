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
    name: ['', Validators.required],
    email: ['', Validators.required],
  });

  async register() {
    // The issue is that .subscribe() expects a synchronous callback (not async) and expects the type of optionsJSON to match exactly.
    // Also, the types from @simplewebauthn/browser must match those from your backend/service.
    // The error is likely due to a type mismatch between your local PublicKeyCredentialCreationOptionsJSON and the one from @simplewebauthn/browser.
    // Additionally, you cannot use an async function directly in .subscribe().

    this.authService.signUp().subscribe({
      next: (optionsJSON) => {
        // Use a separate async function to handle the async logic
        this.handleRegistration(optionsJSON);
      },
      error: (err) => {
        console.error('Sign up error:', err);
      },
    });
  }

  private async handleRegistration(
    optionsJSON: PublicKeyCredentialCreationOptionsJSON,
  ) {
    try {
      // Log the options for debugging
      console.log(
        'WebAuthn options before passing to startRegistration:',
        JSON.stringify(optionsJSON, null, 2),
      );

      // Validate required fields according to WebAuthn spec
      if (!optionsJSON || !optionsJSON.challenge) {
        throw new Error('WebAuthn options are invalid: missing challenge');
      }
      if (!optionsJSON.rp || !optionsJSON.user || !optionsJSON.user.id) {
        throw new Error(
          'WebAuthn options are invalid: missing rp or user information',
        );
      }

      // Make sure we're passing the options correctly - SimpleWebAuthn expects them as a property of an object
      const attResp = await startRegistration({ optionsJSON });
      console.log('Registration response:', attResp);

      // Send the attestation back to the server for verification
      this.authService.verifyRegistration(attResp).subscribe({
        next: (response) => {
          console.log('Registration verified successfully:', response);
          // Redirect to login or dashboard as appropriate
        },
        error: (err) => {
          console.error('Registration verification failed:', err);
        },
      });
    } catch (error: any) {
      if (error.name === 'InvalidStateError') {
        console.error(
          'Error: Authenticator was probably already registered by user',
        );
      } else if (error.name === 'NotAllowedError') {
        console.error('User declined the registration request');
      } else {
        console.error('WebAuthn registration error:', error);
      }
    }
  }
}
