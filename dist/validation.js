"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateAnalyze = validateAnalyze;
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
        if (err instanceof zod_1.ZodError) {
            res.status(400).json({
                error: 'Validation failed',
                details: err.issues.map(e => ({
                    field: e.path.map(String).join('.'),
                    message: e.message
                }))
            });
        }
        else {
            next(err);
        }
    }
}
