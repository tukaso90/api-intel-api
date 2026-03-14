"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.computeCoverage = computeCoverage;
function key(ep) {
    return ep.method.toLowerCase() + " " + ep.path;
}
function computeCoverage(specEndpoints, postmanEndpoints) {
    const specIndex = new Map();
    specEndpoints.forEach(ep => specIndex.set(key(ep), ep));
    const postmanIndex = new Set();
    postmanEndpoints.forEach(ep => postmanIndex.add(key(ep)));
    let covered = 0;
    let securedWithout = 0;
    const coveredEndpoints = [];
    specEndpoints.forEach(ep => {
        const k = key(ep);
        const hasPm = postmanIndex.has(k);
        if (hasPm) {
            covered++;
            coveredEndpoints.push({ method: ep.method, path: ep.path });
        }
        if (ep.auth.requiresAuth && !hasPm) {
            securedWithout++;
        }
    });
    const total = specEndpoints.length;
    const percentCovered = total ? Math.round((covered / total) * 100) : 0;
    return {
        totalSpec: total,
        coveredByPostman: covered,
        percentCovered,
        securedWithoutPostman: securedWithout,
        coveredEndpoints
    };
}
