import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-tile-divider',
  imports: [CommonModule],
  template: '<span class="mx-2 text-gray-300">|</span>',
})
export class TileDividerComponent {}
