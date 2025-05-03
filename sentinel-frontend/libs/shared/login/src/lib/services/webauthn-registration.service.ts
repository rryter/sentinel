import { Injectable } from '@angular/core';
import {
  PublicKeyCredentialCreationOptionsJSON,
  startRegistration,
} from '@simplewebauthn/browser';
import { firstValueFrom } from 'rxjs';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root',
})
export class WebAuthnRegistrationService {
  constructor(private authService: AuthService) {}

  async registerUser(email: string, name: string) {
    const optionsJSON = await firstValueFrom(
      this.authService.signUp({ email, name }),
    );
    return this.handleRegistration(optionsJSON);
  }

  private async handleRegistration(
    optionsJSON: PublicKeyCredentialCreationOptionsJSON,
  ) {
    try {
      if (!this.validateWebAuthnOptions(optionsJSON)) {
        throw new Error('Invalid WebAuthn options received from server');
      }

      const attResp = await startRegistration({ optionsJSON });
      return await this.verifyRegistrationWithServer(attResp);
    } catch (error: unknown) {
      this.handleRegistrationError(error);
      throw error;
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

    try {
      const response = await firstValueFrom(
        this.authService.verifyRegistration(attResp),
      );
      console.log('Registration verified successfully');
      return response;
    } catch (err) {
      console.error('Registration verification failed:', err);
      throw err;
    }
  }

  private handleRegistrationError(error: unknown): void {
    if (error instanceof Error) {
      switch (error.name) {
        case 'InvalidStateError':
          console.error('This authenticator has already been registered');
          break;
        case 'NotAllowedError':
          console.error('User cancelled the registration');
          break;
        case 'NotSupportedError':
          console.error('WebAuthn is not supported in this browser');
          break;
        default:
          console.error('WebAuthn registration error:', error.message);
      }
    } else {
      console.error('An unexpected error occurred:', error);
    }
  }
}
