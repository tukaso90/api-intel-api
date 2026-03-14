declare module 'api-intel-core' {
  export interface AnalyzeInput {
    openapi?: Record<string, any>;
    postman?: any;
    env?: any;
  }
  
  export interface RiskReport {
    totalEndpoints: number;
    totalFindings: number;
    avgScore: number;
    perEndpoint: Array<{
      path: string;
      method: string;
      endpointScore: number;
      endpointRiskLevel: string;
      categoryScores: Record<string, number>;
    }>;
  }
  
  export interface AnalyzeOutput {
    endpoints: any[];
    riskReport: RiskReport;
    coverageReport: any;
    contractFindings: Record<string, any[]>;
  }
  
  export function analyze(input: AnalyzeInput): AnalyzeOutput;
}
