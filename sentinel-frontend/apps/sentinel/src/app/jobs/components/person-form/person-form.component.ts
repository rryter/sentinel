import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HlmInputDirective } from '@spartan-ng/ui-input-helm';
import { HlmButtonDirective } from '@spartan-ng/ui-button-helm';

@Component({
  selector: 'app-person-form',
  standalone: true,
  imports: [CommonModule, FormsModule, HlmInputDirective, HlmButtonDirective],
  template: `
    <form>
      <div class="space-y-12">
        <div class="border-b border-gray-900/10 pb-12">
          <h2 class="text-base/7 font-semibold text-gray-900">
            Personal Information
          </h2>
          <p class="mt-1 text-sm/6 text-gray-600">
            Enter your basic information below.
          </p>

          <div class="mt-10 grid grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-6">
            <div class="sm:col-span-3">
              <label
                for="name"
                class="block text-sm/6 font-medium text-gray-900"
                >Name</label
              >
              <div class="mt-2">
                <input
                  type="text"
                  id="name"
                  name="name"
                  hlmInput
                  [(ngModel)]="name"
                  class="block w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 outline outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm/6"
                  placeholder="Enter your name"
                />
              </div>
            </div>

            <div class="sm:col-span-3">
              <label for="age" class="block text-sm/6 font-medium text-gray-900"
                >Age</label
              >
              <div class="mt-2">
                <input
                  type="number"
                  id="age"
                  name="age"
                  hlmInput
                  [(ngModel)]="age"
                  class="block w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 outline outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm/6"
                  placeholder="Enter your age"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="mt-6 flex items-center justify-end gap-x-6">
        <button type="button" hlmBtn variant="outline">Cancel</button>
        <button type="submit" hlmBtn>Save</button>
      </div>
    </form>
  `,
})
export class PersonFormComponent {
  name = '';
  age: number | null = null;
}
