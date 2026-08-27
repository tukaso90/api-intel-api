// src/api-intel-core/testgen/testgen.ts
import {
  NormalizedEndpoint,
  NormalizedParam,
  GeneratedTestCase
} from "../types";

const FORMAT_SAMPLES: Record<string, any> = {
  email: "user@example.com",
  uuid: "123e4567-e89b-12d3-a456-426614174000",
  date: "2024-01-01",
  "date-time": "2024-01-01T00:00:00Z",
  uri: "https://example.com",
  hostname: "example.com",
  ipv4: "192.0.2.1"
};

function sampleForSchema(schema: any, depth = 0): any {
  if (!schema || typeof schema !== "object" || depth > 5) return "string";

  if (schema.example !== undefined) return schema.example;
  if (Array.isArray(schema.enum) && schema.enum.length) return schema.enum[0];

  const type = schema.type;

  if (type === "object" || (!type && schema.properties)) {
    const result: Record<string, any> = {};
    const properties = schema.properties || {};
    Object.keys(properties).forEach(key => {
      result[key] = sampleForSchema(properties[key], depth + 1);
    });
    return result;
  }

  if (type === "array") {
    return schema.items ? [sampleForSchema(schema.items, depth + 1)] : [];
  }

  if (type === "integer" || type === "number") {
    if (typeof schema.minimum === "number") return schema.minimum;
    return type === "integer" ? 1 : 1.0;
  }

  if (type === "boolean") return true;

  // string (default fallback too)
  if (schema.format && FORMAT_SAMPLES[schema.format] !== undefined) {
    return FORMAT_SAMPLES[schema.format];
  }
  return "string";
}

function sampleForParam(param: NormalizedParam): string {
  const schema = param.schema;
  if (schema && typeof schema === "object") {
    const value = sampleForSchema(schema);
    return typeof value === "string" ? value : String(value);
  }
  return "sample";
}

type StatusKind = "success" | "validation" | "auth";

function pickStatus(ep: NormalizedEndpoint, kind: StatusKind): number {
  const codes = (ep.responses || []).map(r => r.statusCode);

  if (kind === "success") {
    const twoXX = codes.find(c => /^2\d\d$/.test(c));
    return twoXX ? Number(twoXX) : 200;
  }

  if (kind === "auth") {
    const auth = codes.find(c => c === "401") || codes.find(c => c === "403");
    return auth ? Number(auth) : 401;
  }

  // validation — only trust explicitly-documented 400/422; other 4xx codes
  // (404, 409, ...) mean something else and would mislabel the expectation
  const preferred = codes.find(c => c === "400" || c === "422");
  return preferred ? Number(preferred) : 400;
}

interface HappyPathBase {
  pathParams: Record<string, string>;
  queryParams: Record<string, string>;
  headers: Record<string, string>;
  body: any | null;
}

interface Mutation {
  reasonSuffix: string;
  value: any;
}

function typeMismatchMutation(schema: any): Mutation | null {
  const type = schema?.type;
  switch (type) {
    case "string":
      return { reasonSuffix: "invalid type (expected string)", value: 12345 };
    case "integer":
    case "number":
      return { reasonSuffix: `invalid type (expected ${type})`, value: "not-a-number" };
    case "boolean":
      return { reasonSuffix: "invalid type (expected boolean)", value: "not-a-boolean" };
    case "array":
      return { reasonSuffix: "invalid type (expected array)", value: "not-an-array" };
    case "object":
      return { reasonSuffix: "invalid type (expected object)", value: "not-an-object" };
    default:
      return null;
  }
}

function enumMutation(schema: any): Mutation | null {
  if (!Array.isArray(schema?.enum) || !schema.enum.length) return null;
  return { reasonSuffix: "invalid enum value", value: "__INVALID_ENUM_VALUE__" };
}

function boundaryMutations(schema: any): Mutation[] {
  if (!schema || typeof schema !== "object") return [];
  const mutations: Mutation[] = [];
  const type = schema.type;

  if (type === "string") {
    if (typeof schema.maxLength === "number") {
      mutations.push({
        reasonSuffix: `exceeds maxLength (${schema.maxLength})`,
        value: "x".repeat(schema.maxLength + 1)
      });
    }
    if (typeof schema.minLength === "number" && schema.minLength > 0) {
      mutations.push({
        reasonSuffix: `below minLength (${schema.minLength})`,
        value: "x".repeat(schema.minLength - 1)
      });
    }
    if (typeof schema.maxLength !== "number" && typeof schema.minLength !== "number") {
      mutations.push({ reasonSuffix: "empty string", value: "" });
    }
  } else if (type === "integer" || type === "number") {
    if (typeof schema.minimum === "number") {
      mutations.push({
        reasonSuffix: `below minimum (${schema.minimum})`,
        value: schema.minimum - 1
      });
    }
    if (typeof schema.maximum === "number") {
      mutations.push({
        reasonSuffix: `above maximum (${schema.maximum})`,
        value: schema.maximum + 1
      });
    }
  }

  return mutations;
}

function cloneBase(base: HappyPathBase): HappyPathBase {
  return {
    pathParams: { ...base.pathParams },
    queryParams: { ...base.queryParams },
    headers: { ...base.headers },
    body: base.body !== null && typeof base.body === "object" ? { ...base.body } : base.body
  };
}

function applyParamValue(base: HappyPathBase, param: NormalizedParam, value: any): HappyPathBase {
  const next = cloneBase(base);
  const strValue = String(value);
  if (param.in === "path") next.pathParams[param.name] = strValue;
  else if (param.in === "query") next.queryParams[param.name] = strValue;
  else if (param.in === "header") next.headers[param.name] = strValue;
  return next;
}

function applyBodyField(base: HappyPathBase, field: string, value: any): HappyPathBase {
  const next = cloneBase(base);
  if (next.body && typeof next.body === "object") {
    next.body[field] = value;
  }
  return next;
}

function buildHappyPathBase(ep: NormalizedEndpoint): HappyPathBase {
  const pathParams: Record<string, string> = {};
  const queryParams: Record<string, string> = {};
  const headers: Record<string, string> = {};

  (ep.params || []).forEach(param => {
    if (!param.required) return;
    const value = sampleForParam(param);
    if (param.in === "path") pathParams[param.name] = value;
    else if (param.in === "query") queryParams[param.name] = value;
    else if (param.in === "header") headers[param.name] = value;
  });

  const body = ep.requestSchema ? sampleForSchema(ep.requestSchema) : null;
  if (body !== null) headers["Content-Type"] = "application/json";

  if (ep.auth?.requiresAuth) {
    headers["Authorization"] = "Bearer {{token}}";
  }

  return { pathParams, queryParams, headers, body };
}

function makeCase(
  ep: NormalizedEndpoint,
  index: number,
  category: GeneratedTestCase["category"],
  reason: string,
  base: HappyPathBase,
  expectedStatus: number
): GeneratedTestCase {
  return {
    id: `${ep.method}-${ep.path}-${index}`,
    method: ep.method,
    path: ep.path,
    category,
    reason,
    headers: { ...base.headers },
    pathParams: { ...base.pathParams },
    queryParams: { ...base.queryParams },
    body: base.body !== null ? JSON.parse(JSON.stringify(base.body)) : null,
    expectedStatus
  };
}

export function generateTestCases(endpoints: NormalizedEndpoint[]): GeneratedTestCase[] {
  const testCases: GeneratedTestCase[] = [];

  endpoints.forEach(ep => {
    let index = 0;
    const base = buildHappyPathBase(ep);

    testCases.push(
      makeCase(ep, index++, "happy", "happy path", base, pickStatus(ep, "success"))
    );

    (ep.params || []).forEach(param => {
      if (param.required) {
        const negativeBase: HappyPathBase = {
          pathParams: { ...base.pathParams },
          queryParams: { ...base.queryParams },
          headers: { ...base.headers },
          body: base.body
        };

        if (param.in === "path") delete negativeBase.pathParams[param.name];
        else if (param.in === "query") delete negativeBase.queryParams[param.name];
        else if (param.in === "header") delete negativeBase.headers[param.name];

        testCases.push(
          makeCase(
            ep,
            index++,
            "negative",
            `missing required ${param.in} param: ${param.name}`,
            negativeBase,
            pickStatus(ep, "validation")
          )
        );

        const enumMut = enumMutation(param.schema);
        if (enumMut) {
          testCases.push(
            makeCase(
              ep,
              index++,
              "negative",
              `${param.in} param ${param.name}: ${enumMut.reasonSuffix}`,
              applyParamValue(base, param, enumMut.value),
              pickStatus(ep, "validation")
            )
          );
        }
      }

      // type-mismatch and boundary cases apply regardless of required/optional —
      // an optional param sent with a malformed value should still be rejected
      const schema = param.schema;

      // type-mismatch is meaningless for string params — everything on the
      // wire is already a string, so skip it there
      const mismatch = schema && schema.type !== "string" ? typeMismatchMutation(schema) : null;
      if (mismatch) {
        testCases.push(
          makeCase(
            ep,
            index++,
            "negative",
            `${param.in} param ${param.name}: ${mismatch.reasonSuffix}`,
            applyParamValue(base, param, mismatch.value),
            pickStatus(ep, "validation")
          )
        );
      }

      boundaryMutations(schema).forEach(mutation => {
        testCases.push(
          makeCase(
            ep,
            index++,
            "negative",
            `${param.in} param ${param.name}: ${mutation.reasonSuffix}`,
            applyParamValue(base, param, mutation.value),
            pickStatus(ep, "validation")
          )
        );
      });
    });

    const bodyProperties: Record<string, any> =
      (ep.requestSchema && typeof ep.requestSchema === "object" && ep.requestSchema.properties) || {};
    const requiredFields: string[] = Array.isArray(ep.requestSchema?.required)
      ? ep.requestSchema.required
      : [];
    const optionalFields: string[] = Object.keys(bodyProperties).filter(
      f => !requiredFields.includes(f)
    );

    requiredFields.forEach(field => {
      if (!base.body || typeof base.body !== "object") return;
      const negativeBody = { ...base.body };
      delete negativeBody[field];

      const negativeBase: HappyPathBase = {
        pathParams: { ...base.pathParams },
        queryParams: { ...base.queryParams },
        headers: { ...base.headers },
        body: negativeBody
      };

      testCases.push(
        makeCase(
          ep,
          index++,
          "negative",
          `missing required field: ${field}`,
          negativeBase,
          pickStatus(ep, "validation")
        )
      );

      const fieldSchema = bodyProperties[field];
      if (!fieldSchema) return;

      const enumMut = enumMutation(fieldSchema);
      if (enumMut) {
        testCases.push(
          makeCase(
            ep,
            index++,
            "negative",
            `field ${field}: ${enumMut.reasonSuffix}`,
            applyBodyField(base, field, enumMut.value),
            pickStatus(ep, "validation")
          )
        );
      }
    });

    // type-mismatch and boundary cases apply to every declared field, required
    // or not — an optional field sent with a malformed value should still be
    // rejected by the API
    [...requiredFields, ...optionalFields].forEach(field => {
      if (!base.body || typeof base.body !== "object") return;
      const fieldSchema = bodyProperties[field];
      if (!fieldSchema) return;

      const mismatch = typeMismatchMutation(fieldSchema);
      if (mismatch) {
        testCases.push(
          makeCase(
            ep,
            index++,
            "negative",
            `field ${field}: ${mismatch.reasonSuffix}`,
            applyBodyField(base, field, mismatch.value),
            pickStatus(ep, "validation")
          )
        );
      }

      boundaryMutations(fieldSchema).forEach(mutation => {
        testCases.push(
          makeCase(
            ep,
            index++,
            "negative",
            `field ${field}: ${mutation.reasonSuffix}`,
            applyBodyField(base, field, mutation.value),
            pickStatus(ep, "validation")
          )
        );
      });
    });

    if (ep.auth?.requiresAuth) {
      const negativeBase: HappyPathBase = {
        pathParams: { ...base.pathParams },
        queryParams: { ...base.queryParams },
        headers: { ...base.headers },
        body: base.body
      };
      delete negativeBase.headers["Authorization"];

      testCases.push(
        makeCase(
          ep,
          index++,
          "negative",
          "missing authentication",
          negativeBase,
          pickStatus(ep, "auth")
        )
      );
    }
  });

  return testCases;
}
