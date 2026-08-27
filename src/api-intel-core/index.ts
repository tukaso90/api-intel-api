// src/index.ts
//import { AnalyzeInput, AnalyzeOutput } from "./types";
import { AnalyzeInput, AnalyzeOutput } from "./types"; // this will pick src/types/index.ts
import { normalizeOpenApi } from "./normalize/openapi";
import { normalizePostman } from "./normalize/postman";
import { computeRisk } from "./core/risk";
import { computeCoverage } from "./coverage/coverage";
import { contractCheckAll } from "./core/contract";
import { generateTestCases } from "./testgen/testgen";
import { toPostmanCollection } from "./testgen/postmanExport";

export function analyze(input: AnalyzeInput): AnalyzeOutput {
  const openapi = input.openapi || {};
  const postman = input.postman || null;
  const env = input.env || null;

  // 1) normalize
  const specEndpoints = normalizeOpenApi(openapi as any);
  const postmanEndpoints = normalizePostman(postman as any, env as any);

  // 2) risk
const riskReport = computeRisk(specEndpoints);

  // 3) coverage
  const coverageReport = computeCoverage(specEndpoints, postmanEndpoints);

  // 4) contract
  const contractFindings = contractCheckAll(openapi as any, specEndpoints, postmanEndpoints);

  // 5) test case generation
  const testCases = generateTestCases(specEndpoints);
  const postmanCollection = toPostmanCollection(testCases);

  return {
    endpoints: specEndpoints,
    riskReport,
    coverageReport,
    contractFindings,
    testCases,
    postmanCollection
  };
}
