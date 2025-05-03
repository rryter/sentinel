import { Injectable } from '@angular/core';
import {
  PublicKeyCredentialCreationOptionsJSON,
  RegistrationResponseJSON,
  startRegistration,
} from '@simplewebauthn/browser';
import { firstValueFrom } from 'rxjs';
import { AuthService } from './auth.service';

// Custom error types for better error handling
export class WebAuthnError extends Error {
  constructor(
    message: string,
    public readonly code: WebAuthnErrorCode,
  ) {
    super(message);
    this.name = 'WebAuthnError';
  }
}

export enum WebAuthnErrorCode {
  INVALID_OPTIONS = 'INVALID_OPTIONS',
  REGISTRATION_FAILED = 'REGISTRATION_FAILED',
  VERIFICATION_FAILED = 'VERIFICATION_FAILED',
  BROWSER_NOT_SUPPORTED = 'BROWSER_NOT_SUPPORTED',
  USER_CANCELLED = 'USER_CANCELLED',
  ALREADY_REGISTERED = 'ALREADY_REGISTERED',
}

/**
 * Service responsible for handling WebAuthn registration flow.
 * Manages the communication between the browser's WebAuthn API and the backend server.
 */
@Injectable({
  providedIn: 'root',
})
export class WebAuthnRegistrationService {
  constructor(private authService: AuthService) {}

  /**
   * Initiates the WebAuthn registration process for a new user.
   * @param email User's email address
   * @param name User's display name
   * @returns Promise that resolves when registration is complete
   * @throws WebAuthnError if registration fails
   */
  async registerUser(email: string, name: string) {
    const optionsJSON = await firstValueFrom(
      this.authService.signUp({ email, name }),
    );
    return this.processRegistrationFlow(optionsJSON);
  }

  /**
   * Processes the WebAuthn registration flow with the provided options.
   * @param optionsJSON Options received from the server
   * @returns Promise that resolves with the registration result
   * @throws WebAuthnError if any step fails
   */
  private async processRegistrationFlow(
    optionsJSON: PublicKeyCredentialCreationOptionsJSON,
  ) {
    try {
      this.validateRegistrationOptions(optionsJSON);
      const attestationResponse = await this.createCredential(optionsJSON);
      return await this.verifyCredentialWithServer(attestationResponse);
    } catch (error: unknown) {
      const webAuthnError = this.translateError(error);
      throw webAuthnError;
    }
  }

  /**
   * Validates the registration options received from the server.
   * @param options WebAuthn registration options
   * @throws WebAuthnError if options are invalid
   */
  private validateRegistrationOptions(
    options: PublicKeyCredentialCreationOptionsJSON,
  ): void {
    if (!options?.challenge) {
      throw new WebAuthnError(
        'Server did not provide a registration challenge',
        WebAuthnErrorCode.INVALID_OPTIONS,
      );
    }
    if (!options.rp || !options.user || !options.user.id) {
      throw new WebAuthnError(
        'Server provided incomplete registration options',
        WebAuthnErrorCode.INVALID_OPTIONS,
      );
    }
  }

  /**
   * Creates a new credential using the browser's WebAuthn API.
   * @param optionsJSON Registration options from the server
   * @returns Promise that resolves with the attestation response
   */
  private async createCredential(
    optionsJSON: PublicKeyCredentialCreationOptionsJSON,
  ): Promise<RegistrationResponseJSON> {
    return await startRegistration({ optionsJSON });
  }

  /**
   * Verifies the created credential with the server.
   * @param attestationResponse Response from the authenticator
   * @returns Promise that resolves with the server's verification response
   * @throws WebAuthnError if verification fails
   */
  private async verifyCredentialWithServer(
    attestationResponse: RegistrationResponseJSON,
  ) {
    const normalizedResponse = this.normalizeCredentialId(attestationResponse);

    try {
      const response = await firstValueFrom(
        this.authService.verifyRegistration(normalizedResponse),
      );
      return response;
    } catch (err) {
      throw new WebAuthnError(
        'Server rejected the registration',
        WebAuthnErrorCode.VERIFICATION_FAILED,
      );
    }
  }

  /**
   * Normalizes the credential ID for transmission to the server.
   * @param response Original attestation response
   * @returns Normalized response with URL-safe base64 credential ID
   */
  private normalizeCredentialId(
    response: RegistrationResponseJSON,
  ): RegistrationResponseJSON {
    if (response.id) {
      return {
        ...response,
        id: response.id.replace(/\+/g, '-').replace(/\//g, '_'),
      };
    }
    return response;
  }

  /**
   * Translates various error types into a consistent WebAuthnError format.
   * @param error Original error from any source
   * @returns WebAuthnError with appropriate error code and message
   */
  private translateError(error: unknown): WebAuthnError {
    if (error instanceof WebAuthnError) {
      return error;
    }

    if (error instanceof Error) {
      switch (error.name) {
        case 'InvalidStateError':
          return new WebAuthnError(
            'This authenticator has already been registered',
            WebAuthnErrorCode.ALREADY_REGISTERED,
          );
        case 'NotAllowedError':
          return new WebAuthnError(
            'Registration was cancelled',
            WebAuthnErrorCode.USER_CANCELLED,
          );
        case 'NotSupportedError':
          return new WebAuthnError(
            'WebAuthn is not supported in this browser',
            WebAuthnErrorCode.BROWSER_NOT_SUPPORTED,
          );
        default:
          return new WebAuthnError(
            'Registration failed: ' + error.message,
            WebAuthnErrorCode.REGISTRATION_FAILED,
          );
      }
    }

    return new WebAuthnError(
      'An unexpected error occurred during registration',
      WebAuthnErrorCode.REGISTRATION_FAILED,
    );
  }
}
