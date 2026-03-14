// @ts-nocheck
import { z } from 'zod';

const analyzeSchema = z.object({
  openapi: z.any().optional(),
  postman: z.any().optional(),
  env: z.any().optional()
}).refine((body) => body.openapi || body.postman, {
  message: 'At least one of openapi or postman must be provided'
});

export function validateAnalyze(req, res, next) {
  try {
    req.body = analyzeSchema.parse(req.body);
    next();
  } catch (err) {
    res.status(400).json({
      error: 'Validation failed',
      details: (err.errors || []).map(e => ({
        field: e.path.join('.'),
        message: e.message
      }))
    });
  }
}
