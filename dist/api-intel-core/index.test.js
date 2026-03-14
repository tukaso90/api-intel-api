"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// src/index.test.ts
const vitest_1 = require("vitest");
const index_1 = require("./index");
(0, vitest_1.describe)("analyze()", () => {
    (0, vitest_1.it)("returns something for empty input", () => {
        const result = (0, index_1.analyze)({});
        (0, vitest_1.expect)(result).toHaveProperty("riskReport");
        (0, vitest_1.expect)(result).toHaveProperty("coverageReport");
    });
    (0, vitest_1.it)("flags POST with no auth as high risk", () => {
        const openapi = {
            openapi: "3.0.3",
            info: { title: "Test", version: "1.0.0" },
            paths: {
                "/danger": {
                    post: {
                        summary: "Dangerous write",
                        requestBody: {
                            required: true,
                            content: {
                                "application/json": {
                                    schema: {
                                        type: "object",
                                        properties: {
                                            value: { type: "string" }
                                        }
                                    }
                                }
                            }
                        },
                        responses: {
                            "200": {
                                description: "OK",
                                content: {
                                    "application/json": {
                                        schema: {
                                            type: "object",
                                            properties: {
                                                id: { type: "string" }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        };
        const { riskReport } = (0, index_1.analyze)({ openapi });
        (0, vitest_1.expect)(riskReport.perEndpoint.length).toBe(1);
        const ep = riskReport.perEndpoint[0];
        (0, vitest_1.expect)(["Medium", "High", "Critical"]).toContain(ep.endpointRiskLevel);
        (0, vitest_1.expect)(["Medium", "High", "Critical"]).toContain(riskReport.riskLevel);
    });
    (0, vitest_1.it)("matches Postman URL with env variables to OpenAPI path", () => {
        const openapi = {
            openapi: "3.0.3",
            info: { title: "Test", version: "1.0.0" },
            servers: [{ url: "https://api.example.com" }],
            paths: {
                "/users": {
                    get: {
                        summary: "List users",
                        responses: {
                            "200": { description: "OK" }
                        }
                    }
                }
            }
        };
        const postman = {
            info: {
                name: "Demo",
                schema: "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
            },
            item: [
                {
                    name: "List users via env",
                    request: {
                        method: "GET",
                        url: {
                            raw: "{{baseUrl}}/users",
                            host: ["{{baseUrl}}"],
                            path: ["users"]
                        }
                    }
                }
            ]
        };
        const env = {
            name: "Demo env",
            values: [
                { key: "baseUrl", value: "api.example.com", enabled: true }
            ]
        };
        const { coverageReport } = (0, index_1.analyze)({ openapi, postman, env });
        (0, vitest_1.expect)(coverageReport.totalSpec).toBe(1);
        (0, vitest_1.expect)(coverageReport.coveredByPostman).toBe(1);
        (0, vitest_1.expect)(coverageReport.percentCovered).toBe(100);
    });
});
