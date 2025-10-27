import { HlmFormFieldImports } from '@spartan-ng/helm/form-field';
import { HlmInput } from '@spartan-ng/helm/input';
import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { email, Field, form } from '@angular/forms/signals';
import { Router, RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideFingerprint, lucideGithub, lucideMail } from '@ng-icons/lucide';
import { startAuthentication } from '@simplewebauthn/browser';

import { firstValueFrom } from 'rxjs';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'lib-login',
  standalone: true,
  imports: [
    CommonModule,
    NgIcon,
    RouterLink,
    HlmFormFieldImports,
    HlmInput,
    Field,
  ],
  providers: [provideIcons({ lucideFingerprint, lucideMail, lucideGithub })],
  templateUrl: './login.component.html',
})
export class LoginComponent {
  private authService = inject(AuthService);
  private router = inject(Router);

  showEmailLogin = false;
  initialFeedbackFormValue = {
    email: '',
  };

  feedbackFormModel = signal<typeof this.initialFeedbackFormValue>(
    this.initialFeedbackFormValue,
  );
  feedbackForm = form(this.feedbackFormModel);

  async startWebAuthnLogin() {
    if (!this.feedbackForm().valid()) {
      return;
    }

    if (!this.feedbackForm().value()) {
      console.error('Email is required for WebAuthn login');
      return;
    }

    try {
      // Get authentication options from server
      const optionsJSON = await firstValueFrom(
        this.authService.getWebAuthnSignInOptions(
          this.feedbackForm().value().email,
        ),
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
