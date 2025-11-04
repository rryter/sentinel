import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ComponentInspectorService } from '../../services/component-inspector.service';
import { ComponentDetectorService } from '../../services/component-detector.service';

interface LibraryInfo {
  name: string;
  color: string;
  enabled: boolean;
  componentCount: number;
}

@Component({
  selector: 'lib-inspector-config-panel',
  imports: [CommonModule],
  templateUrl: './inspector-config-panel.component.html',
  styleUrl: './inspector-config-panel.component.css',
})
export class InspectorConfigPanelComponent {
  private inspectorService = inject(ComponentInspectorService);
  private detectorService = inject(ComponentDetectorService);

  isVisible = signal(false);

  libraries = computed<LibraryInfo[]>(() => {
    const config = this.inspectorService.getConfig();
    const manifest = this.detectorService.getManifest();

    if (!manifest) {
      return [];
    }

    // Count components per library and get colors
    const libraryMap = new Map<string, { count: number; color: string }>();

    manifest.components.forEach(component => {
      if (component.library) {
        const existing = libraryMap.get(component.library);
        const color = this.detectorService.getColorForLibrary(component.library);

        if (existing) {
          existing.count++;
        } else {
          libraryMap.set(component.library, { count: 1, color });
        }
      }
    });

    // Convert to array and sort by name
    return Array.from(libraryMap.entries())
      .map(([name, { count, color }]) => ({
        name,
        color,
        enabled: config.filter.libraries?.[name] ?? true,
        componentCount: count,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  });

  toggle(): void {
    this.isVisible.update(v => !v);
  }

  show(): void {
    this.isVisible.set(true);
  }

  hide(): void {
    this.isVisible.set(false);
  }

  toggleLibrary(libraryName: string): void {
    const config = this.inspectorService.getConfig();
    const currentLibraries = config.filter.libraries || {};
    const currentState = currentLibraries[libraryName] ?? true;

    this.inspectorService.updateConfig({
      filter: {
        libraries: {
          ...currentLibraries,
          [libraryName]: !currentState,
        },
      },
    });
  }

  toggleAll(enabled: boolean): void {
    const config = this.inspectorService.getConfig();
    const libraries = this.libraries();
    const libraryMap: Record<string, boolean> = {};

    libraries.forEach(lib => {
      libraryMap[lib.name] = enabled;
    });

    this.inspectorService.updateConfig({
      filter: {
        libraries: libraryMap,
      },
    });
  }
}
