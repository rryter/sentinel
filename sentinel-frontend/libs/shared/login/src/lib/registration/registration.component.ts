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
import { HlmButtonModule } from '@spartan-ng/ui-button-helm';
import { HlmFormFieldModule } from '@spartan-ng/ui-formfield-helm';
import { HlmInputDirective } from '@spartan-ng/ui-input-helm';
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

  form = this._formBuilder.group({
    name: ['', Validators.required],
    email: ['', Validators.required],
  });
}
