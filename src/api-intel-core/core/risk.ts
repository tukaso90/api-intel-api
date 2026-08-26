import {
  NormalizedEndpoint,
  EndpointFinding,
  EndpointRisk,
  RiskReport,
  FindingSeverity,
  HttpMethod
} from "../types";

const PII_FIELD_NAMES = ["email", "password", "ssn", "cardnumber", "card_number"];

function collectSchemaFieldNames(schema: any): string[] {
  const names: string[] = [];
  if (schema && typeof schema === "object" && schema.properties && typeof schema.properties === "object") {
    Object.keys(schema.properties).forEach(k => names.push(k.toLowerCase()));
  }
  return names;
}

function hasPIIFields(schema: any): boolean {
  const names = collectSchemaFieldNames(schema);
  return names.some(n => PII_FIELD_NAMES.some(p => n.includes(p)));
}

function riskLevelForScore(score: number): "Low" | "Medium" | "High" | "Critical" {
  if (score >= 80) return "Low";
  if (score >= 60) return "Medium";
  if (score >= 35) return "High";
  return "Critical";
}

function inferEndpointFindings(ep: NormalizedEndpoint): EndpointFinding[] {
  const findings: EndpointFinding[] = [];
  const method = ep.method.toUpperCase();
  const isWrite = ["POST", "PUT", "PATCH", "DELETE"].includes(method);
  const requiresAuth = ep.auth?.requiresAuth ?? false;

  if (isWrite && !requiresAuth) {
    findings.push({
      code: "UNAUTHENTICATED_WRITE",
      message: `${method} ${ep.path} allows writes without authentication`,
      severity: "High"
    });
  }

  const statusCodes = (ep.responses || []).map(r => r.statusCode);
  const has4xx = statusCodes.some(code => /^4\d\d$/.test(code));
  if (!has4xx) {
    findings.push({
      code: "NO_4XX_RESPONSES",
      message: `${method} ${ep.path} has no 4xx responses documented`,
      severity: "Medium"
    });
  }

  if (hasPIIFields(ep.requestSchema) && !requiresAuth) {
    findings.push({
      code: "PII_NO_AUTH",
      message: `${method} ${ep.path} appears to expose PII fields without auth`,
      severity: "High"
    });
  }

  if (!ep.summary && !ep.description) {
    findings.push({
      code: "NO_DOCS",
      message: `${method} ${ep.path} has no summary or description`,
      severity: "Low"
    });
  }

  return findings;
}

export function computeRisk(endpoints: NormalizedEndpoint[]): RiskReport {
  const perEndpoint: EndpointRisk[] = endpoints.map(ep => {
    const findings = inferEndpointFindings(ep);
    const severityCounts = findings.reduce((acc: Record<string, number>, f) => {
      acc[f.severity] = (acc[f.severity] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const hasPII = hasPIIFields(ep.requestSchema);

    const endpointScore = Math.max(
      0,
      100 - ((severityCounts.High || 0) * 25 + (severityCounts.Medium || 0) * 10)
    );

    return {
      path: ep.path,
      method: ep.method,
      endpointScore,
      endpointRiskLevel: riskLevelForScore(endpointScore),
      categoryScores: {
        security: Math.max(0, 100 - (severityCounts.High || 0) * 30),
        errors: findings.some(f => f.code === "NO_4XX_RESPONSES") ? 50 : 90,
        validation: hasPII ? 60 : 90,
        docs: findings.some(f => f.code === "NO_DOCS") ? 40 : 90
      },
      findings
    };
  });

  const totalEndpoints = endpoints.length;
  const totalFindings = perEndpoint.reduce((sum, ep) => sum + ep.findings.length, 0);

  const healthyEndpoints = perEndpoint.filter(
    ep => !ep.findings.some(f => f.severity === "High" || f.severity === "Critical")
  ).length;

  const score = totalEndpoints
    ? Math.round(perEndpoint.reduce((sum, ep) => sum + ep.endpointScore, 0) / totalEndpoints)
    : 100;
  const apiHealth = totalEndpoints ? Math.round((healthyEndpoints / totalEndpoints) * 100) : 100;

  return {
    totalEndpoints,
    totalFindings,
    score,
    riskLevel: riskLevelForScore(score),
    apiHealth,
    perEndpoint
  };
}
