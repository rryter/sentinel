// src/app/shared/components/error-display/error-display.component.ts
import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { ErrorService } from '../../../services/error/error.service';

@Component({
  selector: 'saas-error-display',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (errors$ | async; as errors) {
      @if (errors.length > 0) {
        <!-- Global notification live region, render this permanently at the end of the document -->
        <div
          aria-live="assertive"
          class="pointer-events-none fixed inset-0 flex items-end px-4 py-6 sm:items-start sm:p-6"
        >
          <div class="flex w-full flex-col items-center space-y-4 sm:items-end">
            <!--
      Notification panel, dynamically insert this into the live region when it needs to be displayed

      Entering: "transform ease-out duration-300 transition"
        From: "translate-y-2 opacity-0 sm:translate-y-0 sm:translate-x-2"
        To: "translate-y-0 opacity-100 sm:translate-x-0"
      Leaving: "transition ease-in duration-100"
        From: "opacity-100"
        To: "opacity-0"
    -->
            <div
              class="pointer-events-auto w-full max-w-sm overflow-hidden rounded-lg bg-white shadow-lg ring-1 ring-black/5"
            >
              <div class="p-4">
                <div class="flex items-start">
                  <div class="shrink-0">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke-width="1.5"
                      stroke="#EF4444"
                      class="size-6"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
                      />
                    </svg>
                  </div>
                  <div class="ml-3 w-0 flex-1 pt-0.5">
                    <p class="text-sm font-medium text-gray-900">
                      Whooops, there was an error.
                    </p>
                    <ul
                      *ngIf="errors.length > 1"
                      class="list-disc space-y-1 pl-5"
                    >
                      <li *ngFor="let error of errors">{{ error }}</li>
                    </ul>
                    <p *ngIf="errors.length === 1">{{ errors[0] }}</p>
                  </div>
                  <div class="ml-4 flex shrink-0">
                    <button
                      type="button"
                      class="inline-flex rounded-md bg-white text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                    >
                      <span class="sr-only">Close</span>
                      <svg
                        class="size-5"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                        aria-hidden="true"
                        data-slot="icon"
                      >
                        <path
                          d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z"
                        />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      }
    }
  `,
})
export class ErrorDisplayComponent {
  errorService = inject(ErrorService);
  errors$ = this.errorService.errors$;
  title = 'There was an error';
}
