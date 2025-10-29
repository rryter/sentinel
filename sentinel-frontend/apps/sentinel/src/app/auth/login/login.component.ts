import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { LoginComponent as SharedLoginComponent } from '@shared/login';
import { startAuthentication } from '@simplewebauthn/browser';
import { LoginForm } from 'libs/shared/login/src/lib/models/login.model';
import { AuthService } from 'libs/shared/login/src/lib/services/auth.service';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-login',
  imports: [SharedLoginComponent],
  template: `<lib-login (startLogin)="startWebAuthnLogin($event)"></lib-login>`,
  styles: `
    :host {
      display: block;
    }
  `,
})
export class LoginComponent {
  private authService = inject(AuthService);
  private router = inject(Router);

  async startWebAuthnLogin(form: LoginForm) {
    console.log(form);

    try {
      // Get authentication options from server
      const optionsJSON = await firstValueFrom(
        this.authService.getWebAuthnSignInOptions(form.email),
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
