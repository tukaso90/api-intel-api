"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateAnalyze = validateAnalyze;
// @ts-nocheck
const zod_1 = require("zod");
const analyzeSchema = zod_1.z.object({
    openapi: zod_1.z.any().optional(),
    postman: zod_1.z.any().optional(),
    env: zod_1.z.any().optional()
}).refine((body) => body.openapi || body.postman, {
    message: 'At least one of openapi or postman must be provided'
});
function validateAnalyze(req, res, next) {
    try {
        req.body = analyzeSchema.parse(req.body);
        next();
    }
    catch (err) {
        res.status(400).json({
            error: 'Validation failed',
            details: (err.errors || []).map(e => ({
                field: e.path.join('.'),
                message: e.message
            }))
        });
    }
}
