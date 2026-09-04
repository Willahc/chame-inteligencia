interface FerramentaWebMcp {
  name: string;
  title?: string;
  description: string;
  inputSchema: object;
  annotations?: { readOnlyHint?: boolean; untrustedContentHint?: boolean };
  execute(input: unknown): unknown | Promise<unknown>;
}

interface ModelContextWebMcp {
  registerTool(tool: FerramentaWebMcp, options?: { signal?: AbortSignal }): void | Promise<void>;
}

interface Document {
  readonly modelContext?: ModelContextWebMcp;
}
