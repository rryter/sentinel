import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideCircleAlert } from '@ng-icons/lucide';

@Component({
  selector: 'sen-lint-summary-item',
  imports: [CommonModule, NgIcon],
  providers: [provideIcons({ lucideCircleAlert })],
  templateUrl: './lint-summary-item.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LintSummaryItemComponent {
  rule = input.required<string>();
  count = input.required<number>();

  formatRuleName(rule: string): string {
    // Convert kebab-case or snake_case to Title Case
    return rule
      .split(/[-_]/)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }
}
