import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Rule, RulesService } from '../../../services/rules.service';
import { HlmButtonDirective } from '@spartan-ng/ui-button-helm';

@Component({
  selector: 'app-rule-list',
  imports: [CommonModule, RouterModule, HlmButtonDirective],
  providers: [RulesService],
  templateUrl: './rule-list.component.html',
  styleUrl: './rule-list.component.scss',
})
export class RuleListComponent implements OnInit {
  rules: Rule[] = [];
  isLoading = true;
  errorMessage = '';

  constructor(private rulesService: RulesService) {}

  ngOnInit(): void {
    this.rulesService.getRules().subscribe({
      next: (rules) => {
        this.rules = rules;
        this.isLoading = false;
      },
      error: () => {
        this.errorMessage = 'Failed to fetch rules';
        this.isLoading = false;
      },
    });
  }

  toggleRuleActive(rule: any): void {
    rule.isActive = !rule.isActive;
    // Here you would typically call a service to update the rule status
    console.log(
      `Rule ${rule.name} is now ${rule.isActive ? 'active' : 'inactive'}`,
    );
  }
}
