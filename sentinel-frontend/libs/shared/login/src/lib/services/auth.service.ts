import { HttpClient, HttpHeaders } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import {
  AuthenticationResponseJSON,
  PublicKeyCredentialCreationOptionsJSON,
  PublicKeyCredentialRequestOptionsJSON,
} from '@simplewebauthn/browser';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private http = inject(HttpClient);

  isAuthenticated(): boolean {
    return !!localStorage.getItem('token');
  }

  getCurrentUserRole() {
    return this.http.get('/user/get-role');
  }

  signIn(credentials: { email: string; password: string }) {
    return this.http.post('/users/tokens/sign_in', {
      ...credentials,
    });
  }

  signUp({
    name,
    email,
  }: {
    email: string;
    name: string;
  }): Observable<PublicKeyCredentialCreationOptionsJSON> {
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      Accept: 'application/json',
    });

    return this.http
      .post<any>(
        'http://localhost:3000/api/v1/auth/webauthn/setup',
        {
          registration: {
            name,
            email,
          },
        },
        {
          headers: headers,
          withCredentials: true, // Include credentials (cookies)
        },
      )
      .pipe(
        map((response) => {
          console.log('Raw backend response:', response);

          // Complete the required fields for WebAuthn registration
          // SimpleWebAuthn expects specific structure
          return {
            challenge: response.challenge,
            rp: {
              name: response.rp.name || 'Sentinel App',
              id: response.rp.id || window.location.hostname,
            },
            user: {
              id: response.user.id || btoa('user-id'), // User ID is required
              name: response.user.name,
              displayName: response.user.displayName,
            },
            pubKeyCredParams: response.pubKeyCredParams,
            timeout: response.timeout,
            excludeCredentials: response.excludeCredentials || [],
            authenticatorSelection: response.authenticatorSelection,
            attestation: response.attestation,
            extensions: response.extensions || {},
          };
        }),
      );
  }

  refreshToken() {
    const refresh_token = localStorage.getItem('refresh_token');
    return this.http.post(
      '/users/tokens/refresh',
      {},
      {
        headers: {
          Authorization: `Bearer ${refresh_token}`,
        },
      },
    );
  }

  revokeToken() {
    return this.http.post('/users/tokens/revoke', {});
  }

  // Verify WebAuthn registration with the server
  verifyRegistration(attestation: any) {
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      Accept: 'application/json',
    });

    return this.http.post(
      'http://localhost:3000/api/v1/auth/webauthn/register',
      attestation,
      {
        headers: headers,
        withCredentials: true, // Important for session cookies
      },
    );
  }

  // Get WebAuthn sign-in options
  getWebAuthnSignInOptions(
    email: string,
  ): Observable<PublicKeyCredentialRequestOptionsJSON> {
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      Accept: 'application/json',
    });

    return this.http
      .post<any>(
        'http://localhost:3000/api/v1/auth/webauthn/login/options',
        { email },
        {
          headers: headers,
          withCredentials: true,
        },
      )
      .pipe(
        map((response) => {
          // Transform the response to match SimpleWebAuthn's expected format
          return {
            ...response,
            allowCredentials: response.allowCredentials.map((cred: any) => ({
              type: 'public-key',
              id: cred.id.id, // The base64URL ID string with proper padding
              transports: cred.transports || [],
            })),
          };
        }),
      );
  }

  // Verify WebAuthn sign-in
  verifyWebAuthnSignIn(assertion: AuthenticationResponseJSON) {
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      Accept: 'application/json',
    });

    return this.http.post(
      'http://localhost:3000/api/v1/auth/webauthn/login/authenticate',
      assertion,
      {
        headers: headers,
        withCredentials: true,
      },
    );
  }
}
