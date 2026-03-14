"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeOpenApi = normalizeOpenApi;
const METHODS = [
    "get",
    "post",
    "put",
    "patch",
    "delete",
    "head",
    "options",
    "trace"
];
function resolveRef(doc, ref) {
    if (!ref || typeof ref !== "string" || !ref.startsWith("#/"))
        return null;
    const parts = ref.substring(2).split("/");
    let cur = doc;
    for (const p of parts) {
        if (cur && Object.prototype.hasOwnProperty.call(cur, p)) {
            cur = cur[p];
        }
        else {
            return null;
        }
    }
    return cur;
}
function getSchemaForContent(doc, content) {
    if (!content || typeof content !== "object")
        return null;
    const keys = Object.keys(content);
    if (!keys.length)
        return null;
    const preferred = keys.find(k => k.includes("json")) || keys[0];
    const media = content[preferred];
    if (!media || typeof media !== "object")
        return null;
    const schema = media.schema;
    if (!schema)
        return null;
    if (schema["$ref"]) {
        const resolved = resolveRef(doc, schema["$ref"]);
        return resolved || schema;
    }
    return schema;
}
function summarizeResponses(op) {
    const responses = op.responses || {};
    return Object.entries(responses).map(([code, resp]) => {
        const r = resp || {};
        const content = r.content || {};
        const mediaTypes = Object.keys(content);
        let hasSchema = false;
        let hasExample = false;
        mediaTypes.forEach(ct => {
            const mt = content[ct];
            if (!mt)
                return;
            if (mt.schema)
                hasSchema = true;
            if (mt.example || mt.examples)
                hasExample = true;
        });
        return {
            statusCode: String(code),
            hasSchema,
            hasExample,
            contentTypes: mediaTypes
        };
    });
}
function collectParams(pathItem, op) {
    const allParams = []
        .concat(pathItem?.parameters || [])
        .concat(op?.parameters || []);
    return allParams.map((p) => ({
        name: p.name || "",
        in: (p.in || "query"),
        required: !!p.required,
        schema: p.schema || null
    }));
}
function summarizeAuth(doc, op) {
    const schemes = (doc.components && doc.components.securitySchemes) || {};
    const effectiveSecurity = Array.isArray(op.security)
        ? op.security
        : Array.isArray(doc.security)
            ? doc.security
            : [];
    const entries = [];
    effectiveSecurity.forEach((req) => {
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
function normalizeOpenApi(doc) {
    const paths = doc.paths || doc.openapi?.startsWith('3.1') ? doc.paths : {};
    if (!doc || typeof doc !== "object" || !doc.paths)
        return [];
    const endpoints = [];
    const servers = Array.isArray(doc.servers) ? doc.servers : [];
    const baseUrl = servers[0]?.url || null;
    Object.entries(doc.paths).forEach(([path, pathItem]) => {
        if (!pathItem || typeof pathItem !== "object")
            return;
        METHODS.forEach(method => {
            const op = pathItem[method];
            if (!op || typeof op !== "object")
                return;
            const params = collectParams(pathItem, op);
            const responses = summarizeResponses(op);
            let requestSchema = null;
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
    });
    return endpoints;
}
