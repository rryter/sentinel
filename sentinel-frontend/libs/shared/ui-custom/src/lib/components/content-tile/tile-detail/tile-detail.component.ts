import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgIcon } from '@ng-icons/core';
import { HlmIconDirective } from '@spartan-ng/ui-icon-helm';

@Component({
  selector: 'app-tile-detail',
  imports: [CommonModule, NgIcon, HlmIconDirective],
  template: `
    <div class="flex items-center text-gray-500">
      <ng-icon [name]="icon" hlm size="sm" class="mr-1"> </ng-icon>
      <span><ng-content></ng-content></span>
    </div>
  `,
})
export class TileDetailComponent {
  @Input() icon: string = 'lucideInfo';
}
