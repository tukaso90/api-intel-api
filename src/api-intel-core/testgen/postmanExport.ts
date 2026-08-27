// src/api-intel-core/testgen/postmanExport.ts
import { GeneratedTestCase } from "../types";

function buildUrl(testCase: GeneratedTestCase): string {
  let path = testCase.path;
  Object.entries(testCase.pathParams).forEach(([name, value]) => {
    path = path
      .replace(`{${name}}`, encodeURIComponent(value))
      .replace(`:${name}`, encodeURIComponent(value));
  });

  const query = Object.entries(testCase.queryParams)
    .map(([name, value]) => `${encodeURIComponent(name)}=${encodeURIComponent(value)}`)
    .join("&");

  const base = `{{baseUrl}}${path}`;
  return query ? `${base}?${query}` : base;
}

export function toPostmanCollection(
  testCases: GeneratedTestCase[],
  name = "Generated Test Cases"
): Record<string, any> {
  return {
    info: {
      name,
      schema: "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
    },
    item: testCases.map(tc => {
      const request: Record<string, any> = {
        method: tc.method.toUpperCase(),
        header: Object.entries(tc.headers).map(([key, value]) => ({ key, value })),
        url: buildUrl(tc)
      };

      if (tc.body !== null) {
        request.body = {
          mode: "raw",
          raw: JSON.stringify(tc.body, null, 2),
          options: { raw: { language: "json" } }
        };
      }

      return {
        name: `${tc.method.toUpperCase()} ${tc.path} — ${tc.reason}`,
        request
      };
    })
  };
}
