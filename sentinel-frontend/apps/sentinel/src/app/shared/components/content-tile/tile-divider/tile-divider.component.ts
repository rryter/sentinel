import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-tile-divider',
  standalone: true,
  imports: [CommonModule],
  template: '<div class="mx-2 text-gray-300">|</div>',
  styles: [''],
})
export class TileDividerComponent {}
