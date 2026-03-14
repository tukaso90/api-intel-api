// src/normalize/openapi.ts
import {
  HttpMethod,
  NormalizedEndpoint,
  NormalizedParam,
  NormalizedResponse,
  NormalizedAuth
} from "../types";

const METHODS: HttpMethod[] = [
  "get",
  "post",
  "put",
  "patch",
  "delete",
  "head",
  "options",
  "trace"
];

function resolveRef(doc: any, ref: string): any | null {
  if (!ref || typeof ref !== "string" || !ref.startsWith("#/")) return null;
  const parts = ref.substring(2).split("/");
  let cur: any = doc;
  for (const p of parts) {
    if (cur && Object.prototype.hasOwnProperty.call(cur, p)) {
      cur = cur[p];
    } else {
      return null;
    }
  }
  return cur;
}

function getSchemaForContent(doc: any, content: any): any | null {
  if (!content || typeof content !== "object") return null;
  const keys = Object.keys(content);
  if (!keys.length) return null;
  const preferred = keys.find(k => k.includes("json")) || keys[0];
  const media = content[preferred];
  if (!media || typeof media !== "object") return null;
  const schema = media.schema;
  if (!schema) return null;
  if (schema["$ref"]) {
    const resolved = resolveRef(doc, schema["$ref"]);
    return resolved || schema;
  }
  return schema;
}

function summarizeResponses(op: any): NormalizedResponse[] {
  const responses = op.responses || {};
  return Object.entries(responses).map(([code, resp]) => {
    const r: any = resp || {};
    const content = r.content || {};
    const mediaTypes = Object.keys(content);
    let hasSchema = false;
    let hasExample = false;

    mediaTypes.forEach(ct => {
      const mt = content[ct];
      if (!mt) return;
      if (mt.schema) hasSchema = true;
      if (mt.example || mt.examples) hasExample = true;
    });

    return {
      statusCode: String(code),
      hasSchema,
      hasExample,
      contentTypes: mediaTypes
    };
  });
}

function collectParams(pathItem: any, op: any): NormalizedParam[] {
  const allParams = ([] as any[])
    .concat(pathItem?.parameters || [])
    .concat(op?.parameters || []);

  return allParams.map((p: any) => ({
    name: p.name || "",
    in: (p.in || "query") as NormalizedParam["in"],
    required: !!p.required,
    schema: p.schema || null
  }));
}

function summarizeAuth(doc: any, op: any): NormalizedAuth {
  const schemes =
    (doc.components && doc.components.securitySchemes) || {};

  const effectiveSecurity = Array.isArray(op.security)
    ? op.security
    : Array.isArray(doc.security)
    ? doc.security
    : [];

  const entries: string[] = [];

effectiveSecurity.forEach((req: any) => {
  Object.keys(req || {}).forEach(name => {
    if (schemes[name]) {
      entries.push(name);
    }
  });
});


  return {
    requiresAuth: entries.length > 0,
    schemes: entries
  };
}

export function normalizeOpenApi(doc: any): NormalizedEndpoint[] {
  const paths = doc.paths || doc.openapi?.startsWith('3.1') ? doc.paths : {};
  if (!doc || typeof doc !== "object" || !doc.paths) return [];

  const endpoints: NormalizedEndpoint[] = [];

  const servers = Array.isArray(doc.servers) ? doc.servers : [];
  const baseUrl: string | null = servers[0]?.url || null;

  Object.entries(doc.paths as Record<string, any>).forEach(
    ([path, pathItem]) => {
      if (!pathItem || typeof pathItem !== "object") return;
      METHODS.forEach(method => {
        const op = pathItem[method];
        if (!op || typeof op !== "object") return;

        const params = collectParams(pathItem, op);
        const responses = summarizeResponses(op);
        let requestSchema: any | null = null;

        if (op.requestBody && op.requestBody.content) {
          requestSchema = getSchemaForContent(doc, op.requestBody.content);
        }

        const auth = summarizeAuth(doc, op);

        endpoints.push({
          source: "openapi",
          method,
          path,
          baseUrl,
          params,
          requestSchema,
          requestExample: null,
          responses,
          auth,
          summary: op.summary || "",
          description: op.description || "",
          tags: Array.isArray(op.tags) ? op.tags : []
        });
      });
    }
  );

  return endpoints;
}
