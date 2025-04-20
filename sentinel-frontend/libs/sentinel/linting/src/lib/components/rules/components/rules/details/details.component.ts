import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MarkdownRendererComponent } from '../../../../../../../../../shared/ui-custom/src/lib/markdown/markdown-renderer.component';

@Component({
  selector: 'app-rule-details',
  imports: [CommonModule, MarkdownRendererComponent],
  templateUrl: './details.component.html',
  styleUrl: './details.component.scss',
})
export class RuleDetailsComponent {
  ruleId = input.required<string>();
}
