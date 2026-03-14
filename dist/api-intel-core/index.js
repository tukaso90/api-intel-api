"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.analyze = analyze;
const openapi_1 = require("./normalize/openapi");
const postman_1 = require("./normalize/postman");
const risk_1 = require("./core/risk");
const coverage_1 = require("./coverage/coverage");
const contract_1 = require("./core/contract");
function analyze(input) {
    const openapi = input.openapi || {};
    const postman = input.postman || null;
    const env = input.env || null;
    // 1) normalize
    const specEndpoints = (0, openapi_1.normalizeOpenApi)(openapi);
    const postmanEndpoints = (0, postman_1.normalizePostman)(postman, env);
    // 2) risk
    const riskReport = (0, risk_1.computeRisk)(specEndpoints);
    // 3) coverage
    const coverageReport = (0, coverage_1.computeCoverage)(specEndpoints, postmanEndpoints);
    // 4) contract
    const contractFindings = (0, contract_1.contractCheckAll)(openapi, specEndpoints, postmanEndpoints);
    return {
        endpoints: specEndpoints,
        riskReport,
        coverageReport,
        contractFindings
    };
}
