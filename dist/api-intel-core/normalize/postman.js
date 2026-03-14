"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizePostman = normalizePostman;
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
function buildEnvMap(env) {
    const map = {};
    if (!env || !Array.isArray(env.values))
        return map;
    env.values.forEach((v) => {
        if (!v || !v.enabled)
            return;
        if (typeof v.key === "string") {
            map[v.key] = String(v.value ?? "");
        }
    });
    return map;
}
function resolveVars(str, envMap) {
    if (!str)
        return str;
    return str.replace(/{{\s*([^}]+)\s*}}/g, (_, key) => Object.prototype.hasOwnProperty.call(envMap, key)
        ? envMap[key]
        : `{{${key}}}`);
}
function extractUrlParts(url, envMap) {
    if (typeof url === "string") {
        const raw = resolveVars(url, envMap);
        const path = raw.replace(/^https?:\/\/[^/]+/, "") || "/";
        return { raw, path, host: null, query: [] };
    }
    if (!url || typeof url !== "object") {
        return { raw: "", path: "/", host: null, query: [] };
    }
    const raw = resolveVars(url.raw || "", envMap);
    const hostArr = Array.isArray(url.host) ? url.host : [];
    const host = hostArr.length
        ? resolveVars(hostArr.join("."), envMap)
        : null;
    const pathSegments = Array.isArray(url.path) ? url.path : [];
    const path = "/" + pathSegments.join("/");
    const query = Array.isArray(url.query) ? url.query : [];
    return { raw, path, host, query };
}
function normalizePostman(collection, env) {
    if (!collection || !Array.isArray(collection.item))
        return [];
    const envMap = buildEnvMap(env);
    const endpoints = [];
    function flatten(items, folderName) {
        items.forEach(it => {
            if (it.item) {
                // folder
                flatten(it.item, it.name || folderName);
                return;
            }
            const req = it.request;
            if (!req)
                return;
            const method = String(req.method || "GET").toLowerCase();
            if (!METHODS.includes(method))
                return;
            const { raw, path, host, query } = extractUrlParts(req.url, envMap);
            const baseUrl = host ? `https://${host}` : null;
            const params = [];
            // query params
            query.forEach((q) => {
                params.push({
                    name: q.key || "",
                    in: "query",
                    required: false,
                    schema: null
                });
            });
            // headers
            const headers = Array.isArray(req.header) ? req.header : [];
            headers.forEach((h) => {
                params.push({
                    name: resolveVars(h.key || "", envMap),
                    in: "header",
                    required: false,
                    schema: null
                });
            });
            // request example (JSON)
            let requestExample = null;
            if (req.body &&
                req.body.mode === "raw" &&
                typeof req.body.raw === "string") {
                const ctHeader = headers.find((h) => /^content-type$/i.test(h.key || ""));
                const ct = ctHeader?.value || "";
                if (ct.includes("application/json")) {
                    const rawBody = resolveVars(req.body.raw, envMap).trim();
                    try {
                        requestExample = JSON.parse(rawBody);
                    }
                    catch {
                        requestExample = null;
                    }
                }
            }
            endpoints.push({
                source: "postman",
                method,
                path,
                baseUrl,
                params,
                requestSchema: null,
                requestExample,
                responses: [],
                auth: {
                    requiresAuth: !!(req.auth && req.auth.type),
                    schemes: req.auth?.type ? [req.auth.type] : []
                },
                summary: it.name || "",
                description: typeof req.description === "string" ? req.description : "",
                tags: folderName ? [folderName] : []
            });
        });
    }
    flatten(collection.item, null);
    return endpoints;
}
