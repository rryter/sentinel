import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgIcon } from '@ng-icons/core';
import { HlmIconDirective } from '@spartan-ng/ui-icon-helm';

@Component({
  selector: 'app-content-tile',
  imports: [CommonModule, NgIcon, HlmIconDirective],
  templateUrl: './content-tile.component.html',
  styleUrls: ['./content-tile.component.scss'],
})
export class ContentTileComponent {
  @Input() title: string = '';
  @Input() iconName: string = 'lucideInfo';
  @Input() iconClass: string = 'text-gray-400';
}
