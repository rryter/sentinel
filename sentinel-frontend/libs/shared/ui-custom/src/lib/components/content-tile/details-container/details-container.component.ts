import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-details-container',
  imports: [CommonModule],
  template: `
    <div class="flex items-center text-sm">
      <ng-content></ng-content>
    </div>
  `,
})
export class DetailsContainerComponent {}
