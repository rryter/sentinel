import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { ProjectRulesService, RulesService } from '@sentinel/api';
import {} from '@spartan-ng/brain/switch';
import { HlmLabelDirective } from '@spartan-ng/ui-label-helm';
import { HlmSwitchComponent } from '@spartan-ng/ui-switch-helm';
import { map } from 'rxjs';
@Component({
  selector: 'lib-settings',
  imports: [CommonModule, HlmLabelDirective, HlmSwitchComponent],
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
}
