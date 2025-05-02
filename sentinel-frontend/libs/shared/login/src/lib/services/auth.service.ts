import { HttpClient, HttpHeaders } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { PublicKeyCredentialCreationOptionsJSON } from '@simplewebauthn/browser';
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

  signUp(): Observable<PublicKeyCredentialCreationOptionsJSON> {
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      Accept: 'application/json',
    });

    return this.http
      .post<any>(
        'http://localhost:3000/api/v1/auth/webauthn/setup',
        {
          registration: {
            username: 'rryter',
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
}
