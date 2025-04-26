import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'lib-lint-detail',
  imports: [CommonModule],
  templateUrl: './lint-detail.component.html',
  styleUrl: './lint-detail.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LintDetailComponent {}
