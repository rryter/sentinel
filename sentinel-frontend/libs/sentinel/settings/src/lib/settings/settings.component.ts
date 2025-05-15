import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  ApiV1ProjectsProjectIdRulesGet200ResponseRulesInner,
  ProjectRulesService,
  RulesService,
} from '@sentinel/api';
import { HlmDialogService } from '@spartan-ng/ui-dialog-helm';
import { HlmLabelDirective } from '@spartan-ng/ui-label-helm';
import { HlmSwitchComponent } from '@spartan-ng/ui-switch-helm';
import { map } from 'rxjs';
import { ObfuscatedPipe } from '../pipes/obfuscated.pipe';
import { UpdateApiTokenDialogComponent } from './update-api-token-dialog/update-api-token-dialog.component';

@Component({
  selector: 'lib-settings',
  imports: [
    CommonModule,
    FormsModule,
    HlmLabelDirective,
    HlmSwitchComponent,
    UpdateApiTokenDialogComponent,
    ObfuscatedPipe,
  ],
  templateUrl: './settings.component.html',
  styleUrl: './settings.component.scss',
})
export class SettingsComponent {
  projectRulesService = inject(ProjectRulesService);
  rulesService = inject(RulesService);
  private dialogService = inject(HlmDialogService);

  apiToken = 'a3e363b4ea23b0b17edb87a6609f9a0bf3b30f0515d4a52f1d093267bbf689d8';

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

  openUpdateApiTokenDialog() {
    const dialogRef = this.dialogService.open(UpdateApiTokenDialogComponent, {
      context: { currentToken: this.apiToken },
    });

    dialogRef.closed$.subscribe((newToken: string | undefined) => {
      if (newToken) {
        this.apiToken = newToken;
        // Here you would normally call a service to update the API token
        console.log('API Token updated:', newToken);
      }
    });
  }
}
