import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
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
import { NgIcon, provideIcons } from '@ng-icons/core';
import { 
  lucideCircle, 
  lucideFile, 
  lucideInfo,
  lucideX
} from '@ng-icons/lucide';
import { ApiV1ViolationsGet200Response, ApiV1ViolationsGet200ResponseDataInner } from '@sentinel-api';

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
    HlmTableComponent,
    HlmTableDirective,
    HlmCaptionComponent,
    HlmThComponent,
    HlmTdComponent,
    HlmTrowComponent,
    HlmButtonDirective,
    HlmBadgeDirective,
    NgIcon
  ],
  providers: [
    provideIcons({ 
      lucideCircle, 
      lucideFile, 
      lucideInfo,
      lucideX
    })
  ],
  templateUrl: './rule-results.component.html',
  styleUrl: './rule-results.component.scss',
})
export class RuleResultsComponent implements OnInit {
  @Input() results: ApiV1ViolationsGet200Response | null = null;
  @Input() loading = false;

  get violationItems(): ApiV1ViolationsGet200ResponseDataInner[] {
    return this.results?.data || [];
  }
  
  ngOnInit(): void {
    // Nothing to initialize
  }

  getSeverityIcon(severity: string): string {
    switch(severity) {
      case 'error': return 'lucideX';
      case 'warning': return 'lucideCircle';
      case 'info': return 'lucideInfo';
      default: return 'lucideInfo';
    }
  }

  getSeverityClass(severity: string): string {
    switch(severity) {
      case 'error': return 'text-red-500';
      case 'warning': return 'text-yellow-500';
      case 'info': return 'text-blue-500';
      default: return 'text-blue-500';
    }
  }

  getLocationString(item: any): string {
    if (item.file_with_violations?.line && item.file_with_violations?.column) {
      return `Line ${item.file_with_violations.line}, Column ${item.file_with_violations.column}`;
    }
    return 'N/A';
  }
} 