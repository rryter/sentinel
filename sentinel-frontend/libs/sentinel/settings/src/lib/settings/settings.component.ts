import { HlmDialogService } from '@spartan-ng/helm/dialog';
import { HlmLabel } from '@spartan-ng/helm/label';
import { HlmToaster } from '@spartan-ng/helm/sonner';
import { HlmSwitch } from '@spartan-ng/helm/switch';
import { CommonModule } from '@angular/common';
import { Component, inject, input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  ApiV1ProjectsProjectIdRulesGet200ResponseRulesInner,
  ProjectRulesService,
  RulesService,
} from '@sentinel/api';
import { RoutingService } from '@shared/ui-custom';

import { toast } from 'ngx-sonner';
import { map, Subject } from 'rxjs';
import { ObfuscatedPipe } from '../pipes/obfuscated.pipe';
import { UpdateApiTokenDialogComponent } from './update-api-token-dialog/update-api-token-dialog.component';
import { PageHeaderComponent } from '@sentinel/layouts';

@Component({
  selector: 'lib-settings',
  imports: [
    CommonModule,
    FormsModule,
    HlmLabel,
    HlmSwitch,
    ObfuscatedPipe,
    PageHeaderComponent,
    HlmToaster,
  ],
  templateUrl: './settings.component.html',
  styleUrl: './settings.component.scss',
})
export class SettingsComponent {
  projectRulesService = inject(ProjectRulesService);
  rulesService = inject(RulesService);
  routingService = inject(RoutingService);
  private dialogService = inject(HlmDialogService);

  apiToken = 'a3e363b4ea23b0b17edb87a6609f9a0bf3b30f0515d4a52f1d093267bbf689d8';

  rules$ = this.rulesService.apiV1RulesGet();
  projectId = input();
  toggleRule$ = new Subject();

  constructor() {
    this.toggleRule$.subscribe(() => {
      toast('Event has been created', {
        description: 'Sunday, December 03, 2024 at 9:00 AM',
        action: {
          label: 'Undo',
          onClick: () => console.log('Undo'),
        },
      });
    });
  }

  projectRules$ = this.projectRulesService
    .apiV1ProjectsProjectIdRulesGet({
      projectId: this.routingService.projectId ?? 0,
    })
    .pipe(map((response) => response.rules));

  onRuleToggle(
    rule: ApiV1ProjectsProjectIdRulesGet200ResponseRulesInner,
    checked: boolean,
  ) {
    this.toggleRule$.next({
      id: rule.id,
      projectId: this.routingService.projectId,
    });

    rule.enabled = checked;
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
