import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'lib-lint-detail',
  imports: [CommonModule],
  templateUrl: './lint-detail.component.html',
  styleUrl: './lint-detail.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LintDetailComponent {}
