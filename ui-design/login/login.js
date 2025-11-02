/**
 * Sentinel Login Screen - Client-side Interactions
 *
 * Features:
 * - Form validation (client-side, before submission)
 * - Password visibility toggle
 * - WebAuthn/biometric authentication
 * - Keyboard navigation support
 * - Accessibility enhancements
 */

(function() {
  'use strict';

  // ============================================
  // DOM Elements
  // ============================================
  const form = document.querySelector('.login-form');
  const emailInput = document.getElementById('email');
  const passwordInput = document.getElementById('password');
  const emailError = document.getElementById('email-error');
  const passwordError = document.getElementById('password-error');
  const togglePasswordBtn = document.querySelector('.toggle-password');
  const rememberMeCheckbox = document.getElementById('remember-me');
  const primaryButton = document.querySelector('.btn-primary');
  const webAuthnBtn = document.querySelector('.webauthn-btn');

  // ============================================
  // Validation Utilities
  // ============================================

  /**
   * Validates email format using HTML5 validation + additional checks
   */
  function validateEmail(email) {
    const trimmedEmail = email.trim();

    if (!trimmedEmail) {
      return { valid: false, message: 'Email address is required' };
    }

    // Basic email pattern
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailPattern.test(trimmedEmail)) {
      return { valid: false, message: 'Please enter a valid email address' };
    }

    return { valid: true, message: '' };
  }

  /**
   * Validates password strength
   */
  function validatePassword(password) {
    if (!password) {
      return { valid: false, message: 'Password is required' };
    }

    if (password.length < 8) {
      return { valid: false, message: 'Password must be at least 8 characters' };
    }

    return { valid: true, message: '' };
  }

  /**
   * Shows error message for a field
   */
  function showError(input, errorElement, message) {
    input.classList.add('error');
    input.setAttribute('aria-invalid', 'true');
    errorElement.textContent = message;
  }

  /**
   * Clears error message for a field
   */
  function clearError(input, errorElement) {
    input.classList.remove('error');
    input.setAttribute('aria-invalid', 'false');
    errorElement.textContent = '';
  }

  // ============================================
  // Real-time Validation (on blur)
  // ============================================

  emailInput.addEventListener('blur', function() {
    const validation = validateEmail(this.value);

    if (!validation.valid) {
      showError(this, emailError, validation.message);
    } else {
      clearError(this, emailError);
    }
  });

  emailInput.addEventListener('input', function() {
    // Clear error on input if field was previously invalid
    if (this.classList.contains('error')) {
      const validation = validateEmail(this.value);
      if (validation.valid) {
        clearError(this, emailError);
      }
    }
  });

  passwordInput.addEventListener('blur', function() {
    const validation = validatePassword(this.value);

    if (!validation.valid) {
      showError(this, passwordError, validation.message);
    } else {
      clearError(this, passwordError);
    }
  });

  passwordInput.addEventListener('input', function() {
    // Clear error on input if field was previously invalid
    if (this.classList.contains('error')) {
      const validation = validatePassword(this.value);
      if (validation.valid) {
        clearError(this, passwordError);
      }
    }
  });

  // ============================================
  // Password Visibility Toggle
  // ============================================

  let passwordVisible = false;

  togglePasswordBtn.addEventListener('click', function() {
    passwordVisible = !passwordVisible;

    if (passwordVisible) {
      passwordInput.type = 'text';
      this.setAttribute('aria-label', 'Hide password');
      this.setAttribute('aria-pressed', 'true');
    } else {
      passwordInput.type = 'password';
      this.setAttribute('aria-label', 'Show password');
      this.setAttribute('aria-pressed', 'false');
    }
  });

  // ============================================
  // Form Submission
  // ============================================

  form.addEventListener('submit', async function(event) {
    event.preventDefault();

    // Validate all fields
    const emailValidation = validateEmail(emailInput.value);
    const passwordValidation = validatePassword(passwordInput.value);

    let hasErrors = false;

    if (!emailValidation.valid) {
      showError(emailInput, emailError, emailValidation.message);
      hasErrors = true;
    } else {
      clearError(emailInput, emailError);
    }

    if (!passwordValidation.valid) {
      showError(passwordInput, passwordError, passwordValidation.message);
      hasErrors = true;
    } else {
      clearError(passwordInput, passwordError);
    }

    // Stop if there are validation errors
    if (hasErrors) {
      // Focus first invalid field
      if (!emailValidation.valid) {
        emailInput.focus();
      } else if (!passwordValidation.valid) {
        passwordInput.focus();
      }
      return;
    }

    // Show loading state
    const originalButtonText = primaryButton.querySelector('.btn-text').textContent;
    primaryButton.querySelector('.btn-text').textContent = 'Signing in...';
    primaryButton.disabled = true;
    primaryButton.style.opacity = '0.7';

    // Prepare form data
    const formData = {
      email: emailInput.value.trim(),
      password: passwordInput.value,
      remember_me: rememberMeCheckbox.checked
    };

    try {
      // In production, this would be an actual API call
      const response = await fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        throw new Error('Login failed');
      }

      const data = await response.json();

      // Handle successful login
      // Store JWT token
      if (data.token) {
        localStorage.setItem('auth_token', data.token);
      }

      // Redirect to dashboard
      window.location.href = '/dashboard';

    } catch (error) {
      // Reset button state
      primaryButton.querySelector('.btn-text').textContent = originalButtonText;
      primaryButton.disabled = false;
      primaryButton.style.opacity = '1';

      // Show error message
      showError(passwordInput, passwordError, 'Invalid email or password. Please try again.');

      console.error('Login error:', error);
    }
  });

  // ============================================
  // WebAuthn / Biometric Authentication
  // ============================================

  webAuthnBtn.addEventListener('click', async function() {
    // Check if WebAuthn is supported
    if (!window.PublicKeyCredential) {
      alert('Biometric authentication is not supported on this browser. Please use email and password.');
      return;
    }

    // Show loading state
    const originalText = this.querySelector('.btn-text').textContent;
    this.querySelector('.btn-text').textContent = 'Authenticating...';
    this.disabled = true;

    try {
      // In production, you would:
      // 1. Request challenge from server
      // 2. Use navigator.credentials.get() with the challenge
      // 3. Send assertion to server for verification

      // For demo purposes, we'll simulate the flow
      const challenge = await fetch('/api/v1/auth/webauthn/challenge', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!challenge.ok) {
        throw new Error('Failed to get authentication challenge');
      }

      const challengeData = await challenge.json();

      // Request credential from authenticator
      const credential = await navigator.credentials.get({
        publicKey: challengeData.publicKey
      });

      // Send credential to server for verification
      const verifyResponse = await fetch('/api/v1/auth/webauthn/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          credential: credential
        })
      });

      if (!verifyResponse.ok) {
        throw new Error('Authentication verification failed');
      }

      const data = await verifyResponse.json();

      // Store token and redirect
      if (data.token) {
        localStorage.setItem('auth_token', data.token);
      }

      window.location.href = '/dashboard';

    } catch (error) {
      // Reset button
      this.querySelector('.btn-text').textContent = originalText;
      this.disabled = false;

      // Handle specific WebAuthn errors
      if (error.name === 'NotAllowedError') {
        alert('Authentication was cancelled or timed out. Please try again.');
      } else if (error.name === 'NotSupportedError') {
        alert('This authenticator is not supported. Please use email and password.');
      } else {
        alert('Biometric authentication failed. Please use email and password.');
      }

      console.error('WebAuthn error:', error);
    }
  });

  // ============================================
  // Keyboard Navigation Enhancement
  // ============================================

  // Allow Enter key to submit when focus is on checkbox
  rememberMeCheckbox.addEventListener('keypress', function(event) {
    if (event.key === 'Enter') {
      form.dispatchEvent(new Event('submit', { cancelable: true }));
    }
  });

  // ============================================
  // Auto-focus Email Field on Load
  // ============================================

  window.addEventListener('load', function() {
    // Only auto-focus on desktop (not mobile to prevent keyboard popup)
    if (window.innerWidth >= 768) {
      emailInput.focus();
    }
  });

  // ============================================
  // Remember Me - Load from localStorage
  // ============================================

  const savedEmail = localStorage.getItem('remembered_email');
  if (savedEmail && rememberMeCheckbox.checked) {
    emailInput.value = savedEmail;
  }

  // Save email when "Remember me" is checked
  form.addEventListener('submit', function() {
    if (rememberMeCheckbox.checked) {
      localStorage.setItem('remembered_email', emailInput.value.trim());
    } else {
      localStorage.removeItem('remembered_email');
    }
  });

})();
