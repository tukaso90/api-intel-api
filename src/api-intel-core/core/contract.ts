// src/core/contract.ts
import { NormalizedEndpoint } from "../types/index";

function key(method: string, path: string): string {
  return method.toLowerCase() + " " + path;
}

export function contractCheckAll(
  openapi: any,
  specEndpoints: NormalizedEndpoint[],
  postmanEndpoints: NormalizedEndpoint[]
): Record<string, string[]> {
  // stub: later you port your contract validation here
  const findings: Record<string, string[]> = {};
  specEndpoints.forEach(ep => {
    const k = key(ep.method, ep.path);
    findings[k] = [];
  });
  return findings;
}
