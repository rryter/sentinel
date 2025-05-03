import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import {
  NonNullableFormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideFingerprint, lucideGithub, lucideMail } from '@ng-icons/lucide';
import { startAuthentication } from '@simplewebauthn/browser';
import { HlmButtonDirective } from '@spartan-ng/ui-button-helm';
import { HlmFormFieldModule } from '@spartan-ng/ui-formfield-helm';
import { HlmInputDirective } from '@spartan-ng/ui-input-helm';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'lib-login',
  standalone: true,
  imports: [
    CommonModule,
    NgIcon,
    RouterLink,
    ReactiveFormsModule,
    HlmFormFieldModule,
    HlmInputDirective,
    HlmButtonDirective,
  ],
  providers: [provideIcons({ lucideFingerprint, lucideMail, lucideGithub })],
  templateUrl: './login.component.html',
})
export class LoginComponent {
  private _formBuilder = inject(NonNullableFormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);
  showEmailLogin = false;

  form = this._formBuilder.group({
    email: ['', [Validators.required, Validators.email]],
  });

  async startWebAuthnLogin() {
    if (!this.form.valid) {
      return;
    }

    if (!this.form.value.email) {
      console.error('Email is required for WebAuthn login');
      return;
    }

    try {
      // Get authentication options from server
      const optionsJSON = await firstValueFrom(
        this.authService.getWebAuthnSignInOptions(this.form.value.email),
      );

      // Start the WebAuthn authentication process
      const authResp = await startAuthentication({ optionsJSON });

      // Send the assertion to the server for verification
      const response = await firstValueFrom(
        this.authService.verifyWebAuthnSignIn(authResp),
      );

      console.log('Authentication successful:', response);
      // Navigate to the dashboard or home page
      this.router.navigate(['/']);
    } catch (error: any) {
      if (error.name === 'NotAllowedError') {
        console.error('User declined the authentication request');
      } else {
        console.error('WebAuthn authentication error:', error);
      }
    }
  }
}
