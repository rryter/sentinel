import { CommonModule } from '@angular/common';
import { Component, input } from '@angular/core';
import { NgIcon } from '@ng-icons/core';
import { HlmIcon } from '@spartan-ng/helm/icon';

@Component({
  selector: 'app-content-tile',
  imports: [CommonModule, NgIcon, HlmIcon],
  templateUrl: './content-tile.component.html',
  styleUrls: ['./content-tile.component.scss'],
})
export class ContentTileComponent {
  title = input<string>('');
  iconName = input<string>('lucideInfo');
  iconClass = input<string>('text-gray-400');
}
