import { CommonModule } from '@angular/common';
import { Component, input } from '@angular/core';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'lib-page-header',
  imports: [CommonModule, RouterModule],
  templateUrl: './page-header.component.html',
  styleUrl: './page-header.component.scss',
})
export class PageHeaderComponent {
  title = input.required<string>();
  description = input<string>();
  breadcrumbs = input<Array<{ label: string; route?: string }>>();
}
