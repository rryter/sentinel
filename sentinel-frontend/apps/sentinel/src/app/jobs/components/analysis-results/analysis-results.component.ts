import {
  Component,
  input,
  Input,
  effect,
  signal,
  computed,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { AnalysisResults } from '../model/analysis/analysis.model';
import { AnalysisJobsService } from 'src/app/api/generated/api/analysis-jobs.service';
import { ApiV1AnalysisJobsGet200ResponseDataInner } from 'src/app/api/generated/model/api-v1-analysis-jobs-get200-response-data-inner';
import { HlmSkeletonComponent } from '@spartan-ng/ui-skeleton-helm';
import { ContentTileComponent } from '../../../shared/components/content-tile/content-tile.component';
import { TileDetailComponent } from '../../../shared/components/content-tile/tile-detail/tile-detail.component';
import { DetailsContainerComponent } from '../../../shared/components/content-tile/details-container/details-container.component';
import { TileDividerComponent } from '../../../shared/components/content-tile/tile-divider/tile-divider.component';
import { BadgeVariants } from '@spartan-ng/ui-badge-helm';
import { firstValueFrom } from 'rxjs';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideCircleSlash } from '@ng-icons/lucide';
import { ApiV1ViolationsGet200Response, ViolationsService } from '@sentinel-api';
import { PaginationComponent } from '../../../shared/components/pagination/pagination.component';
import { StripPathPrefixPipe } from '../../../shared/pipes/strip-path-prefix.pipe';

@Component({
  selector: 'app-analysis-results',
  standalone: true,
  imports: [
    CommonModule,
    HlmSkeletonComponent,
    ContentTileComponent,
    TileDetailComponent,
    DetailsContainerComponent,
    TileDividerComponent,
    NgIcon,
    PaginationComponent,
    StripPathPrefixPipe,
  ],
  providers: [provideIcons({ lucideCircleSlash })],
  templateUrl: './analysis-results.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AnalysisResultsComponent {
  @Input() totalExecutionTimeSeconds = 0;
  jobId = input<number>(0);

  // Make Math accessible in the template
  Math = Math;

  private resultsData = signal<ApiV1AnalysisJobsGet200ResponseDataInner | null>(
    null,
  );
  
  violationsData = signal<ApiV1ViolationsGet200Response | null>(
    null,
  );
    
  // Use writable signals instead of computed ones for pagination
  private _currentPage = signal<number>(1);
  private _itemsPerPage = signal<number>(10);

  // Computed properties that derive from signals
  currentPage = computed(() => this._currentPage());
  itemsPerPage = computed(() => this._itemsPerPage());
  totalItems = computed(() => this.violationsData()?.meta?.total_count || 0);

  // Computed signal that derives from resultsData
  results = computed(() => this.resultsData());
  violations = computed(() => this.violationsData());
  
  constructor(private analysisJobService: AnalysisJobsService, private violationsService: ViolationsService) {
    // Side effect to fetch data when jobId changes
    effect(() => {
      const id = this.jobId();
      if (id) {
        this.fetchResults(id);
        this.fetchViolations(id, this._currentPage(), this._itemsPerPage());
      }
    });

    // Side effect to fetch violations when pagination changes
    effect(() => {
      const id = this.jobId();
      const page = this._currentPage();
      const perPage = this._itemsPerPage();
      
      if (id) {
        this.fetchViolations(id, page, perPage);
      }
    });
  }

  private async fetchResults(id: number): Promise<void> {
    try {
      const response = await firstValueFrom(
        this.analysisJobService.apiV1AnalysisJobsIdGet({ id }),
      );
      this.resultsData.set(response.data);
    } catch (error) {
      console.error('Error fetching results:', error);
    }
  }

  private async fetchViolations(id: number, page: number = 1, perPage: number = 10): Promise<void> {
    try {
      const response = await firstValueFrom(
        this.violationsService.apiV1ViolationsGet({ 
          analysisJobId: id,
          page,
          perPage
        }),
      );
      this.violationsData.set(response ?? null);
    } catch (error) {
      console.error('Error fetching violations:', error);
    }
  }

  // Update these methods to handle pagination changes
  setCurrentPage(page: number): void {
    this._currentPage.set(page);
  }

  setItemsPerPage(perPage: number): void {
    this._itemsPerPage.set(perPage);
    // Reset to first page when changing items per page
    this._currentPage.set(1);
  }

  getBadgeVariant(status: string): BadgeVariants['variant'] {
    return status === 'completed' ? 'default' : 'secondary';
  }

  getBadgeClass(status: string): string {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 hover:bg-green-200';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200';
      case 'failed':
        return 'bg-red-100 text-red-800 hover:bg-red-200';
      default:
        return 'bg-gray-100 text-gray-800 hover:bg-gray-200';
    }
  }

  formatTime(seconds: number): string {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }

  formatMilliseconds(ms: number): string {
    if (ms >= 1000) {
      return `${(ms / 1000).toFixed(2)}s`;
    }
    return `${ms}ms`;
  }

  formatPercentage(value: number): string {
    return `${value.toFixed(2)}%`;
  }

  formatNumber(value: number): string {
    if (!value && value !== 0) return '0';

    if (value >= 1000) {
      return `${(value / 1000).toFixed(1)}k`;
    }

    return value.toString();
  }

  getObjectKeys(obj: any): string[] {
    return Object.keys(obj || {});
  }

  getObjectEntries(obj: any): [string, any][] {
    // Filter out the performance metrics and other non-rule fields
    const keysToFilter = [
      'id',
      'project_id',
      'status',
      'total_files',
      'total_matches',
      'rules_matched',
      'completed_at',
      'created_at',
      'updated_at',
      'duration',
      'files_processed',
      'files_per_second_wall_time',
      'cumulative_processing_time_ms',
      'avg_time_per_file_ms',
      'files_per_second_cpu_time',
      'parallel_cores_used',
      'parallel_speedup_factor',
      'parallel_efficiency_percent',
      'files_with_violations',
      'pattern_matches',
    ];

    const filteredEntries = Object.entries(obj || {}).filter(
      ([key]) => !keysToFilter.includes(key),
    );

    return filteredEntries;
  }

  capitalizeFirstLetter(text: string): string {
    if (!text) return '';
    return text.charAt(0).toUpperCase() + text.slice(1);
  }
}
