import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BrnDialogRef, injectBrnDialogContext } from '@spartan-ng/brain/dialog';
import { HlmButtonDirective } from '@spartan-ng/ui-button-helm';
import {
  HlmDialogCloseDirective,
  HlmDialogFooterComponent,
  HlmDialogHeaderComponent,
  HlmDialogTitleDirective,
} from '@spartan-ng/ui-dialog-helm';
import { HlmInputDirective } from '@spartan-ng/ui-input-helm';
import { HlmLabelDirective } from '@spartan-ng/ui-label-helm';
import { generateBrowserApiToken } from '../../helpers/api-token.helpers';

@Component({
  selector: 'lib-update-api-token-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    HlmDialogHeaderComponent,
    HlmDialogTitleDirective,
    HlmDialogFooterComponent,
    HlmDialogCloseDirective,
    HlmInputDirective,
    HlmButtonDirective,
    HlmLabelDirective,
  ],
  template: `
    <hlm-dialog-header>
      <h2 hlmDialogTitle class="text-lg font-semibold">Update API Token</h2>
      <p class="text-sm text-gray-500 mt-1">
        Your API token is used to authenticate with the Sentinel API.
      </p>
    </hlm-dialog-header>

    <div class="py-4">
      <div class="space-y-3">
        <label hlmLabel>
          New API Token
          <input
            hlmInput
            type="text"
            class="mt-1.5 w-full"
            placeholder="Enter new API token"
            [(ngModel)]="newToken"
          />
        </label>
      </div>
    </div>

    <hlm-dialog-footer>
      <button type="button" hlmBtn variant="outline">Cancel</button>
      <button
        type="button"
        hlmBtn
        (click)="updateToken()"
        [disabled]="!newToken"
      >
        Update Token
      </button>
    </hlm-dialog-footer>
  `,
})
export class UpdateApiTokenDialogComponent implements OnInit {
  private dialogContext = injectBrnDialogContext<{ currentToken: string }>();

  // Get token from context or use default value as fallback
  currentToken = this.dialogContext?.currentToken || '';
  newToken = generateBrowserApiToken();

  constructor(private dialogRef: BrnDialogRef) {}

  ngOnInit(): void {
    // No need to load anything - we get the token from context
  }

  updateToken(): void {
    // Implementation to update the token would go here
    // For now, we'll just close the dialog with the new token
    this.dialogRef.close(this.newToken);
  }
}
