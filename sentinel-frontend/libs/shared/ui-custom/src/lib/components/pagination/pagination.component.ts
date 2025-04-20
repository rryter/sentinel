import { ChangeDetectionStrategy, Component, input, model } from '@angular/core';
import { HlmNumberedPaginationComponent } from '@spartan-ng/ui-pagination-helm';

/**
 * A reusable pagination component that wraps Spartan UI's HlmNumberedPaginationComponent
 * and provides a clean API for handling pagination in the application.
 * 
 * Example usage:
 * ```html
 * <app-pagination
 *   [(currentPage)]="currentPage"
 *   [(itemsPerPage)]="itemsPerPage"
 *   [totalItems]="totalItems()"
 *   [pageSizes]="[10, 25, 50, 100]"
 * />
 * ```
 */
@Component({
  selector: 'app-pagination',
  imports: [HlmNumberedPaginationComponent],
  template: `
    <hlm-numbered-pagination
      [(currentPage)]="currentPage"
      [(itemsPerPage)]="itemsPerPage"
      [totalItems]="totalItems()"
    />
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PaginationComponent {
  /**
   * The current page number (1-based)
   */
  public readonly currentPage = model.required<number>();

  /**
   * The number of items to display per page
   */
  public readonly itemsPerPage = model.required<number>();

  /**
   * The total number of items in the dataset
   */
  public readonly totalItems = input.required<number>();

  /**
   * The maximum number of page buttons to display
   * @default 7
   */
  public readonly maxSize = input<number>(4);

  /**
   * Whether to show the first/last navigation buttons
   * @default true
   */
  public readonly showEdges = input<boolean>(true);

  /**
   * Available page size options to display in the dropdown
   * @default [10, 20, 50, 100]
   */
  public readonly pageSizes = input<number[]>([10, 20, 50, 100]);
} 