import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MarkdownRendererComponent } from '@shared/ui-custom';

@Component({
  selector: 'sen-rule-details',
  imports: [CommonModule, MarkdownRendererComponent],
  templateUrl: './details.component.html',
  styleUrl: './details.component.scss',
})
export class RuleDetailsComponent {
  ruleId = input.required<string>();
}
