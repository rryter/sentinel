import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-content-tile',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './content-tile.component.html',
  styleUrls: ['./content-tile.component.scss'],
})
export class ContentTileComponent {
  @Input() title: string = '';
  @Input() iconName: string = '';
  @Input() iconClass: string = 'text-gray-400';
}
