import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
@Component({
  selector: 'app-info-tile',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './info-tile.component.html',
  styleUrls: ['./info-tile.component.scss'],
})
export class InfoTileComponent {
  @Input() title: string = '';
  @Input() value: string | number = '';
  @Input() iconName: string = '';
  @Input() iconClass: string = 'text-gray-400';

  @Input() detail1Icon: string = '';
  @Input() detail1Label: string = '';
  @Input() detail2Icon: string = '';
  @Input() detail2Label: string = '';
}
