import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-tile-detail',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './tile-detail.component.html',
  styleUrls: ['./tile-detail.component.scss'],
})
export class TileDetailComponent {
  @Input() icon: string = '';
}
