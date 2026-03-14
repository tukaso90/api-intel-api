// src/coverage/coverage.ts
import { NormalizedEndpoint, CoverageReport } from "../types/index";

function key(ep: NormalizedEndpoint): string {
  return ep.method.toLowerCase() + " " + ep.path;
}

export function computeCoverage(
  specEndpoints: NormalizedEndpoint[],
  postmanEndpoints: NormalizedEndpoint[]
): CoverageReport {
  const specIndex = new Map<string, NormalizedEndpoint>();
  specEndpoints.forEach(ep => specIndex.set(key(ep), ep));

  const postmanIndex = new Set<string>();
  postmanEndpoints.forEach(ep => postmanIndex.add(key(ep)));

  let covered = 0;
  let securedWithout = 0;
  const coveredEndpoints: { method: string; path: string }[] = [];

  specEndpoints.forEach(ep => {
    const k = key(ep);
    const hasPm = postmanIndex.has(k);
    if (hasPm) {
      covered++;
      coveredEndpoints.push({ method: ep.method, path: ep.path });
    }
    if (ep.auth.requiresAuth && !hasPm) {
      securedWithout++;
    }
  });

  const total = specEndpoints.length;
  const percentCovered = total ? Math.round((covered / total) * 100) : 0;

  return {
    totalSpec: total,
    coveredByPostman: covered,
    percentCovered,
    securedWithoutPostman: securedWithout,
    coveredEndpoints
  };
}
