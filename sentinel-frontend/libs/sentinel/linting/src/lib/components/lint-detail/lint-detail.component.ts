import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { HlmButtonDirective } from '@spartan-ng/ui-button-helm';

@Component({
  selector: 'lib-lint-detail',
  imports: [CommonModule, HlmButtonDirective],
  templateUrl: './lint-detail.component.html',
  styleUrl: './lint-detail.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LintDetailComponent {
  onSubmit(): void {
    // Handle submit logic here
    console.log('Submit button clicked');
  }

  onCancel(): void {
    // Handle cancel logic here
    console.log('Cancel button clicked');
  }
}
