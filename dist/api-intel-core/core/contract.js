"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.contractCheckAll = contractCheckAll;
function key(method, path) {
    return method.toLowerCase() + " " + path;
}
function contractCheckAll(openapi, specEndpoints, postmanEndpoints) {
    // stub: later you port your contract validation here
    const findings = {};
    specEndpoints.forEach(ep => {
        const k = key(ep.method, ep.path);
        findings[k] = [];
    });
    return findings;
}
