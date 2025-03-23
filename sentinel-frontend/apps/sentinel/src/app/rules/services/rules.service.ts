import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';

export interface Rule {
  id: string;
  name: string;
  description: string;
  category: string;
  severity: string;
  isEnabled: boolean;
}

export interface RulesByCategory {
  [category: string]: string[];
}

@Injectable({
  providedIn: 'root',
})
export class RulesService {
  private apiUrl = 'http://localhost:8080/api/rules';

  constructor(private http: HttpClient) {}

  /**
   * Fetches all rules from the API
   * @returns Observable with an array of rules
   */
  getRules(): Observable<Rule[]> {
    return this.http.get<RulesByCategory>(this.apiUrl).pipe(
      map((rulesByCategory) => {
        const rules: Rule[] = [];

        // Transform the category-based object into a flat array of rules
        Object.entries(rulesByCategory).forEach(([category, ruleFiles]) => {
          ruleFiles.forEach((ruleFile) => {
            // Extract rule name from filename (removing the .go extension)
            const name = ruleFile.replace('.go', '');

            rules.push({
              id: name,
              name: name,
              description: '', // You might want to fetch this separately or use a default
              category: category,
              severity: 'medium', // Default severity
              isEnabled: true, // Default enabled state
            });
          });
        });

        return rules;
      })
    );
  }

  /**
   * Formats the rule name for display
   * Converts kebab-case to Title Case with spaces
   */
  private formatRuleName(ruleName: string): string {
    return ruleName
      .split('-')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }
}
