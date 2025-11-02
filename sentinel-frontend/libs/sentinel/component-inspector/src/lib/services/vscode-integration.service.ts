import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import type { ComponentInfo } from '../models/component-info.interface';
import type { InspectorConfig } from '../models/inspector-config.interface';
import { firstValueFrom } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class VscodeIntegrationService {
  private http = inject(HttpClient);
  private config: InspectorConfig | null = null;

  /**
   * Initialize with configuration
   */
  initialize(config: InspectorConfig): void {
    this.config = config;
  }

  /**
   * Open component file in code editor
   * Supports VS Code, IntelliJ, Vim, Sublime, and 20+ other editors via auto-detection
   */
  async openInVSCode(componentInfo: ComponentInfo): Promise<void> {
    if (!this.config?.vscode.enabled) {
      console.warn('[ComponentInspector] Editor integration is disabled');
      return;
    }

    if (!componentInfo.filePath) {
      console.warn(
        '[ComponentInspector] No file path available for component:',
        componentInfo.selector
      );
      return;
    }

    const line = componentInfo.line ?? 1;

    // Try backend API first
    const backendSuccess = await this.openViaBackend(
      componentInfo.filePath,
      line
    );

    if (!backendSuccess && this.config.vscode.useFallbackProtocol) {
      // Fallback to vscode:// protocol
      this.openViaProtocol(componentInfo.filePath, line);
    }
  }

  /**
   * Open file via backend API
   */
  private async openViaBackend(
    filePath: string,
    line: number
  ): Promise<boolean> {
    if (!this.config) return false;

    try {
      const response = await firstValueFrom(
        this.http.post<{ success: boolean }>(
          this.config.vscode.backendUrl,
          {
            filePath,
            line,
            editor: this.config.vscode.editorVariant,
          },
          {
            headers: {
              'Content-Type': 'application/json',
            },
          }
        )
      );

      if (response.success) {
        console.log(
          `[ComponentInspector] Opened file in editor: ${filePath}:${line}`
        );
        return true;
      }

      return false;
    } catch (error) {
      console.warn(
        '[ComponentInspector] Failed to open file via backend:',
        error
      );
      return false;
    }
  }

  /**
   * Open file via vscode:// protocol
   */
  private openViaProtocol(filePath: string, line: number): void {
    if (!this.config) return;

    try {
      // Format: vscode://file/{absolute-path}:line:column or vscode-insiders://file/...
      const protocol = this.config.vscode.editorVariant;
      const url = `${protocol}://file${filePath}:${line}:1`;
      window.location.href = url;

      console.log(
        `[ComponentInspector] Opening via ${protocol}:// protocol: ${url}`
      );
    } catch (error) {
      console.error(
        '[ComponentInspector] Failed to open file via protocol:',
        error
      );
    }
  }
}
