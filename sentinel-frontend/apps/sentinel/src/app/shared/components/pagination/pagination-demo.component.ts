import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { PaginationComponent } from './pagination.component';

@Component({
  selector: 'app-pagination-demo',
  imports: [PaginationComponent],
  template: `
    <div class="space-y-4">
      <h2 class="text-lg font-semibold">Pagination Demo</h2>
      
      <div class="p-4 border rounded-md bg-slate-50">
        <p class="mb-4">
          Current Page: {{ currentPage() }} | 
          Items Per Page: {{ itemsPerPage() }} | 
          Total Items: {{ totalItems() }}
        </p>
        
        <app-pagination
          [(currentPage)]="currentPage"
          [(itemsPerPage)]="itemsPerPage"
          [totalItems]="totalItems()"
          [pageSizes]="[5, 10, 25, 50]"
        />
      </div>
      
      <div class="flex gap-4">
        <button 
          class="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
          (click)="setTotalItems(50)">
          Set to 50 items
        </button>
        <button 
          class="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
          (click)="setTotalItems(100)">
          Set to 100 items
        </button>
        <button 
          class="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
          (click)="setTotalItems(250)">
          Set to 250 items
        </button>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PaginationDemoComponent {
  // Pagination state
  currentPage = signal(1);
  itemsPerPage = signal(10);
  totalItems = signal(100);

  // Method to change total items (for demo purposes)
  setTotalItems(count: number): void {
    this.totalItems.set(count);
    // Reset to first page when changing the dataset
    this.currentPage.set(1);
  }
} 