import {
  animate,
  query,
  stagger,
  style,
  transition,
  trigger,
} from '@angular/animations';
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
import {
  PublicKeyCredentialRequestOptionsJSON,
  startAuthentication,
} from '@simplewebauthn/browser';
import { HlmButtonDirective } from '@spartan-ng/ui-button-helm';
import { HlmFormFieldModule } from '@spartan-ng/ui-formfield-helm';
import { HlmInputDirective } from '@spartan-ng/ui-input-helm';
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
  animations: [
    trigger('fadeInUp', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(10px)' }),
        animate(
          '0.5s ease-out',
          style({ opacity: 1, transform: 'translateY(0)' }),
        ),
      ]),
    ]),
    trigger('staggerFade', [
      transition('* => *', [
        query(
          ':enter',
          [
            style({ opacity: 0, transform: 'translateY(10px)' }),
            stagger('100ms', [
              animate(
                '0.5s ease-out',
                style({ opacity: 1, transform: 'translateY(0)' }),
              ),
            ]),
          ],
          { optional: true },
        ),
      ]),
    ]),
  ],
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
    if (!this.form.value.email) {
      console.error('Email is required for WebAuthn login');
      return;
    }

    try {
      // Get authentication options from server
      this.authService
        .getWebAuthnSignInOptions(this.form.value.email)
        .subscribe({
          next: async (optionsJSON: PublicKeyCredentialRequestOptionsJSON) => {
            // Start the WebAuthn authentication process
            try {
              console.log(optionsJSON);
              const authResp = await startAuthentication({ optionsJSON });

              // Send the assertion to the server for verification
              this.authService.verifyWebAuthnSignIn(authResp).subscribe({
                next: (response) => {
                  console.log('Authentication successful:', response);
                  // Navigate to the dashboard or home page
                  this.router.navigate(['/']);
                },
                error: (err) => {
                  console.error('Authentication verification failed:', err);
                },
              });
            } catch (error: any) {
              if (error.name === 'NotAllowedError') {
                console.error('User declined the authentication request');
              } else {
                console.error('WebAuthn authentication error:', error);
              }
            }
          },
          error: (err) => {
            console.error('Error getting authentication options:', err);
          },
        });
    } catch (error) {
      console.error('WebAuthn authentication error:', error);
    }
  }

  toggleEmailLogin() {
    this.showEmailLogin = !this.showEmailLogin;
  }
}
