import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  ApiV1ProjectsProjectIdRulesGet200ResponseRulesInner,
  ProjectRulesService,
  RulesService,
} from '@sentinel/api';
import { HlmLabelDirective } from '@spartan-ng/ui-label-helm';
import { HlmSwitchComponent } from '@spartan-ng/ui-switch-helm';
import { map } from 'rxjs';

@Component({
  selector: 'lib-settings',
  imports: [CommonModule, FormsModule, HlmLabelDirective, HlmSwitchComponent],
  templateUrl: './settings.component.html',
  styleUrl: './settings.component.scss',
})
export class SettingsComponent {
  projectRulesService = inject(ProjectRulesService);
  rulesService = inject(RulesService);

  rules$ = this.rulesService.apiV1RulesGet();
  projectRules$ = this.projectRulesService
    .apiV1ProjectsProjectIdRulesGet({
      projectId: 2,
    })
    .pipe(map((response) => response.rules));

  onRuleToggle(
    rule: ApiV1ProjectsProjectIdRulesGet200ResponseRulesInner,
    checked: boolean,
  ) {
    if (checked == rule.enabled) {
      return;
    }
    console.log('onRuleToggle');
    rule.enabled = checked;
    this.projectRulesService
      .toggleRule({
        id: rule.id,
        projectId: 2,
      })
      .subscribe();
  }
}
