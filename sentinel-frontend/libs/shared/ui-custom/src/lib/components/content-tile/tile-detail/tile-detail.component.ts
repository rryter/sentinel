import { Component, input } from '@angular/core';
import { NgIcon } from '@ng-icons/core';
import { HlmIcon } from '@spartan-ng/helm/icon';

@Component({
  selector: 'app-tile-detail',
  imports: [NgIcon, HlmIcon],
  template: `
    <div class="flex items-center text-gray-500">
      <ng-icon [name]="icon()" hlm size="sm" class="mr-1"> </ng-icon>
      <span><ng-content></ng-content></span>
    </div>
  `,
})
export class TileDetailComponent {
  icon = input<string>('lucideInfo');
}
