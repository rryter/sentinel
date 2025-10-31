import { ChangeDetectionStrategy, Component, input, computed } from '@angular/core';
import { HlmBadgeDirective } from '@spartan-ng/helm/badge';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideCheckCircle, lucideAlertCircle, lucideXCircle } from '@ng-icons/lucide';

export type BadgeStatus = 'success' | 'warning' | 'error';

/**
 * A badge component that shows status with color coding and an optional icon.
 *
 * Example usage:
 * ```html
 * <app-test-badge status="success" [showIcon]="true">Active</app-test-badge>
 * <app-test-badge status="warning">Pending</app-test-badge>
 * <app-test-badge status="error" [showIcon]="true">Failed</app-test-badge>
 * ```
 */
@Component({
  selector: 'app-test-badge',
  standalone: true,
  imports: [
    HlmBadgeDirective,
    NgIcon,
  ],
  providers: [
    provideIcons({
      lucideCheckCircle,
      lucideAlertCircle,
      lucideXCircle
    })
  ],
  templateUrl: './test-badge.component.html',
  styleUrls: ['./test-badge.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TestBadgeComponent {
  /**
   * The status type that determines the color and icon
   */
  readonly status = input.required<BadgeStatus>();

  /**
   * Whether to show an icon alongside the badge text
   */
  readonly showIcon = input(false);

  /**
   * Computed CSS classes based on status
   */
  protected readonly statusClass = computed(() => {
    const status = this.status();
    return {
      'badge-success': status === 'success',
      'badge-warning': status === 'warning',
      'badge-error': status === 'error',
    };
  });

  /**
   * Computed icon name based on status
   */
  protected readonly iconName = computed(() => {
    const status = this.status();
    switch (status) {
      case 'success':
        return 'lucideCheckCircle';
      case 'warning':
        return 'lucideAlertCircle';
      case 'error':
        return 'lucideXCircle';
      default:
        return '';
    }
  });
}
