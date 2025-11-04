import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ComponentInspectorService } from '../../services/component-inspector.service';
import { ComponentDetectorService } from '../../services/component-detector.service';
import { groupLibrariesByNamespace, extractNamespace, type NamespaceGroup } from '../../utils/library-color.util';

interface LibraryInfo {
  name: string;
  color: string;
  enabled: boolean;
  componentCount: number;
}

interface NamespaceGroupInfo extends NamespaceGroup {
  enabled: boolean;
  totalComponents: number;
  libraryInfos: LibraryInfo[];
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

  namespaceGroups = computed<NamespaceGroupInfo[]>(() => {
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

    // Get all library names
    const allLibraries = Array.from(libraryMap.keys());

    // Group by namespace
    const namespaceGroups = groupLibrariesByNamespace(allLibraries);

    // Build namespace group info
    return namespaceGroups.map(group => {
      const libraryInfos = group.libraries.map(libName => ({
        name: libName,
        color: libraryMap.get(libName)!.color,
        enabled: config.filter.libraries?.[libName] ?? true,
        componentCount: libraryMap.get(libName)!.count,
      }));

      const totalComponents = libraryInfos.reduce((sum, lib) => sum + lib.componentCount, 0);
      const enabled = libraryInfos.some(lib => lib.enabled);

      return {
        ...group,
        enabled,
        totalComponents,
        libraryInfos,
      };
    });
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

  toggleNamespace(namespace: string): void {
    const config = this.inspectorService.getConfig();
    const currentLibraries = config.filter.libraries || {};
    const groups = this.namespaceGroups();
    const group = groups.find(g => g.namespace === namespace);

    if (!group) return;

    // Toggle all libraries in this namespace to the opposite of the current state
    const newState = !group.enabled;
    const libraryMap: Record<string, boolean> = { ...currentLibraries };

    group.libraries.forEach(libName => {
      libraryMap[libName] = newState;
    });

    this.inspectorService.updateConfig({
      filter: {
        libraries: libraryMap,
      },
    });
  }

  toggleAll(enabled: boolean): void {
    const groups = this.namespaceGroups();
    const libraryMap: Record<string, boolean> = {};

    groups.forEach(group => {
      group.libraries.forEach(libName => {
        libraryMap[libName] = enabled;
      });
    });

    this.inspectorService.updateConfig({
      filter: {
        libraries: libraryMap,
      },
    });
  }
}
