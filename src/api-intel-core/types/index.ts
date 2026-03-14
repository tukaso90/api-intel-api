// src/types/index.ts

export type HttpMethod =
  | "get"
  | "post"
  | "put"
  | "patch"
  | "delete"
  | "head"
  | "options"
  | "trace";

export interface NormalizedParam {
  name: string;
  in: "path" | "query" | "header" | "cookie";
  required: boolean;
  schema?: any;
}

export interface NormalizedResponse {
  statusCode: string;
  hasSchema: boolean;
  hasExample: boolean;
  contentTypes: string[];
}

export interface NormalizedAuth {
  requiresAuth: boolean;
  schemes: string[];
}

export interface NormalizedEndpoint {
  source: "openapi" | "postman";
  method: HttpMethod;
  path: string;
  baseUrl?: string | null;
  params: NormalizedParam[];
  requestSchema?: any | null;
  requestExample?: any | null;
  responses: NormalizedResponse[];
  auth: NormalizedAuth;
  summary?: string;
  description?: string;
  tags?: string[];
}

export type FindingSeverity = "Info" | "Low" | "Medium" | "High" | "Critical";

export interface EndpointFinding {
  code: string;
  message: string;
  severity: FindingSeverity;
}

export interface EndpointRisk {
  path: string;
  method: string | HttpMethod;
  endpointScore: number;
  endpointRiskLevel: string;
  categoryScores: {
    security: number;
    errors: number;
    validation: number;
    docs: number;
  };
  findings: EndpointFinding[]; // NEW
}


export interface RiskReport {
  score: number;
  riskLevel: "Low" | "Medium" | "High" | "Critical";
  apiHealth: number;
  perEndpoint: Array<
    {
      path: string;
      method: HttpMethod;
    } & EndpointRisk
  >;
}

export interface CoverageReport {
  totalSpec: number;
  coveredByPostman: number;
  percentCovered: number;
  securedWithoutPostman: number;
  coveredEndpoints: { method: string; path: string }[];
}


export interface AnalyzeInput {
  openapi?: unknown;
  postman?: unknown;
  env?: unknown;
}

export interface AnalyzeOutput {
  endpoints: NormalizedEndpoint[];      // spec endpoints only
  riskReport: RiskReport;
  coverageReport: CoverageReport;
  // optional: map of contract issues per endpoint key
  contractFindings: Record<string, string[]>;
}
