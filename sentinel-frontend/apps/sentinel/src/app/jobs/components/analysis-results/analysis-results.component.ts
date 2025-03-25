import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AnalysisResults } from '../model/analysis/analysis.model';
@Component({
  selector: 'app-analysis-results',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="mt-6">
      <h3 class="text-lg font-medium text-gray-900 mb-2">Analysis Results</h3>
      <div
        class="bg-white shadow-sm border border-gray-200 rounded-lg overflow-hidden"
      >
        <!-- Duration and Summary -->
        <div class="bg-gray-50 p-3 border-b border-gray-200">
          <div class="flex items-center justify-between">
            <span class="text-sm font-medium text-gray-900">
              Total Duration:
              <span class="text-blue-700">{{
                formatTime(totalExecutionTimeSeconds)
              }}</span>
            </span>
          </div>
        </div>

        <!-- Summary Card -->
        <div
          class="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 border-b border-gray-200"
        >
          <div class="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div class="bg-white rounded-lg p-3 shadow-sm">
              <p class="text-sm text-gray-500">Total Files Analyzed</p>
              <p class="text-2xl font-semibold text-blue-700">
                {{ results?.totalFiles || 0 }}
              </p>
            </div>
            <div class="bg-white rounded-lg p-3 shadow-sm">
              <p class="text-sm text-gray-500">Total Matches Found</p>
              <p class="text-2xl font-semibold text-indigo-700">
                {{ results?.totalMatches || 0 }}
              </p>
            </div>
            <div
              class="bg-white rounded-lg p-3 shadow-sm md:col-span-1 col-span-2"
            >
              <p class="text-sm text-gray-500">Rules Matched</p>
              <p class="text-2xl font-semibold text-purple-700">
                {{ getObjectKeys(results?.matchesByRule || {}).length }}
              </p>
            </div>
          </div>
        </div>

        <!-- Rules Breakdown -->
        <div class="p-4">
          <h4 class="text-md font-medium text-gray-800 mb-3">
            Matches by Rule
          </h4>
          <div class="space-y-3 max-h-80 overflow-y-auto pr-2">
            @for (rule of getObjectEntries(results?.matchesByRule || {}); track
            $index) {
            <div
              class="flex items-center justify-between p-3 bg-gray-50 rounded-md hover:bg-gray-100 transition-colors"
            >
              <div>
                <p class="font-medium text-gray-800">{{ rule[0] }}</p>
                <p class="text-xs text-gray-500">Pattern match</p>
              </div>
              <div class="flex items-center">
                <span
                  class="px-2.5 py-1 text-xs font-medium rounded-full"
                  [ngClass]="{
                    'bg-red-100 text-red-800': rule[1] > 100,
                    'bg-yellow-100 text-yellow-800':
                      rule[1] > 20 && rule[1] <= 100,
                    'bg-green-100 text-green-800': rule[1] <= 20
                  }"
                >
                  {{ rule[1] }} matches
                </span>
              </div>
            </div>
            } @empty {
            <div class="text-center py-4 text-gray-500">
              No rule matches found
            </div>
            }
          </div>
        </div>
      </div>
    </div>
  `,
})
export class AnalysisResultsComponent {
  @Input() results: AnalysisResults | null = null;
  @Input() totalExecutionTimeSeconds = 0;

  formatTime(seconds: number): string {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }

  getObjectKeys(obj: any): string[] {
    return Object.keys(obj || {});
  }

  getObjectEntries(obj: any): [string, any][] {
    return Object.entries(obj || {});
  }
}
