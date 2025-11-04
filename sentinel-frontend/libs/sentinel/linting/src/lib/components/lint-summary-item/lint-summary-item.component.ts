import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from '@angular/core';
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

  formattedRuleName = computed(() => {
    return this.rule()
      .split(/[-_]/)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  });
}
