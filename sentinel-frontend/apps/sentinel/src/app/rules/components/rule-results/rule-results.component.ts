import { Component, Input, OnInit, computed, signal } from '@angular/core';
import { CommonModule, DecimalPipe, TitleCasePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { 
  HlmTableComponent, 
  HlmTableDirective, 
  HlmCaptionComponent, 
  HlmThComponent, 
  HlmTdComponent, 
  HlmTrowComponent 
} from '@spartan-ng/ui-table-helm';
import { HlmButtonDirective } from '@spartan-ng/ui-button-helm';
import { HlmBadgeDirective } from '@spartan-ng/ui-badge-helm';
import { HlmInputDirective } from '@spartan-ng/ui-input-helm';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { 
  lucideCircle, 
  lucideFile, 
  lucideInfo,
  lucideX,
  lucideChevronDown,
  lucideEllipsis,
  lucideArrowUpDown
} from '@ng-icons/lucide';
import { ApiV1ViolationsGet200Response, ApiV1ViolationsGet200ResponseDataInner } from '@sentinel-api';
import { BrnMenuTriggerDirective } from '@spartan-ng/brain/menu';
import { HlmMenuModule } from '@spartan-ng/ui-menu-helm';
import { BrnTableModule, useBrnColumnManager } from '@spartan-ng/brain/table';
import { HlmIconDirective } from '@spartan-ng/ui-icon-helm';

export interface RuleResultItem {
  id: string;
  ruleName: string;
  description: string;
  filePath: string;
  line: number;
  column: number;
  severity: 'error' | 'warning' | 'info';
}

@Component({
  selector: 'app-rule-results',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    BrnTableModule,
    HlmTableDirective,
    HlmThComponent,
    HlmTdComponent,
    HlmButtonDirective,
    HlmInputDirective,
    NgIcon,
    BrnMenuTriggerDirective,
    HlmMenuModule,
  ],
  providers: [
    provideIcons({ 
      lucideCircle, 
      lucideFile, 
      lucideInfo,
      lucideX,
      lucideChevronDown,
      lucideEllipsis,
      lucideArrowUpDown
    })
  ],
  host: {
    class: 'w-full',
  },
  templateUrl: './rule-results.component.html',
  styleUrl: './rule-results.component.scss',
})
export class RuleResultsComponent implements OnInit {
  @Input() set results(value: ApiV1ViolationsGet200Response | null) {
    this._results.set(value);
  };
  @Input() set loading(value: boolean) {
    this._loading.set(value);
  };

  protected readonly _results = signal<ApiV1ViolationsGet200Response | null>(null);
  protected readonly _loading = signal<boolean>(false);
  protected readonly _filter = signal<string>('');

  protected readonly _brnColumnManager = useBrnColumnManager({
    severity: { visible: true, label: 'Severity' },
    rule: { visible: true, label: 'Rule' },
    description: { visible: true, label: 'Description' },
    file: { visible: true, label: 'File' },
    location: { visible: true, label: 'Location' },
  });

  protected readonly _allDisplayedColumns = computed(() => [
    ...this._brnColumnManager.displayedColumns()
  ]);

  protected readonly _filteredItems = computed(() => {
    const filter = this._filter()?.toLowerCase()?.trim();
    const items = this._results()?.data || [];
    
    if (!filter) return items;
    
    return items.filter(item => 
      item.rule_name?.toLowerCase().includes(filter) ||
      item.match_text?.toLowerCase().includes(filter) ||
      item.file_with_violations?.file_path?.toLowerCase().includes(filter)
    );
  });
  
  ngOnInit(): void {
    // Nothing to initialize
  }

  getSeverityIcon(severity: string): string {
    // For now, we map all results to 'info' level
    // In the future, severity can be derived from rule metadata
    return 'lucideInfo';
  }

  getSeverityClass(severity: string): string {
    // For now, we map all results to 'info' level
    // In the future, severity can be derived from rule metadata
    return 'text-blue-500';
  }

  getLocationString(item: ApiV1ViolationsGet200ResponseDataInner): string {
    if (item.line_number && item.column) {
      return `Line ${item.line_number}, Column ${item.column}`;
    } else if (item.line_number) {
      return `Line ${item.line_number}`;
    }
    return 'N/A';
  }
} 