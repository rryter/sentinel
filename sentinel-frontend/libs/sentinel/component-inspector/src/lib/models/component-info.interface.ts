export interface ComponentInfo {
  element: Element;
  className: string;
  selector: string;
  filePath?: string;
  relativePath?: string;
  library?: string;
  isStandalone?: boolean;
  line?: number;
}

export interface ComponentManifest {
  generated: string;
  components: ComponentManifestEntry[];
}

export interface ComponentManifestEntry {
  className: string;
  selector: string;
  filePath: string;
  relativePath: string;
  library?: string;
  line: number;
}
