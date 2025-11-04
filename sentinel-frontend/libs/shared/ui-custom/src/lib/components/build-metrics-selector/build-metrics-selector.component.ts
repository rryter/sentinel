import { BrnSelectImports } from '@spartan-ng/brain/select';
import { HlmSelectImports } from '@spartan-ng/helm/select';
import { Component, computed, input, output } from '@angular/core';

export interface SelectOption {
  label: string;
  value: string;
}

export const TIME_INTERVALS: SelectOption[] = [
  { label: '1 Minute', value: '1m' },
  { label: '5 Minutes', value: '5m' },
  { label: '15 Minutes', value: '15m' },
  { label: '30 Minutes', value: '30m' },
  { label: '1 Hour', value: '1h' },
  { label: '6 Hours', value: '6h' },
  { label: '12 Hours', value: '12h' },
  { label: '1 Day', value: '1d' },
];

@Component({
  selector: 'sen-build-metrics-selector',
  standalone: true,
  imports: [BrnSelectImports, HlmSelectImports],
  template: `
    <brn-select
      class="inline-block"
      [placeholder]="placeholder()"
      [disabled]="disabled()"
      [value]="selectedValue()"
      (valueChange)="onValueChange($event)"
    >
      <hlm-select-trigger [class]="triggerClass()">
        <hlm-select-value>
          {{ selectedLabel() }}
        </hlm-select-value>
      </hlm-select-trigger>
      <hlm-select-content>
        @for (option of options(); track option.value) {
          <hlm-option [value]="option.value">{{ option.label }}</hlm-option>
        }
      </hlm-select-content>
    </brn-select>
  `,
})
export class BuildMetricsSelectorComponent {
  options = input<SelectOption[]>(TIME_INTERVALS);
  disabled = input(false);
  label = input('');
  placeholder = input('Select time interval');
  triggerClass = input('w-56');
  selectedValue = input<string | undefined>(undefined);
  valueChange = output<string>();

  selectedLabel = computed(() => {
    const selected = this.options().find(
      (opt) => opt.value === this.selectedValue(),
    );
    return selected?.label || '';
  });

  onValueChange(value: string): void {
    this.valueChange.emit(value);
  }
}
