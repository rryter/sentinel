import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MarkdownComponent } from 'ngx-markdown';

@Component({
  selector: 'sen-markdown-renderer',
  imports: [CommonModule, MarkdownComponent],
  templateUrl: './markdown-renderer.component.html',
  styleUrl: './markdown-renderer.component.scss',
})
export class MarkdownRendererComponent {
  src = input.required<string>();
}
