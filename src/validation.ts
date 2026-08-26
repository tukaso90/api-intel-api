import { z, ZodError } from 'zod';
import { Request, Response, NextFunction } from 'express';

const analyzeSchema = z.object({
  openapi: z.any().optional(),
  postman: z.any().optional(),
  env: z.any().optional()
}).refine((body) => body.openapi || body.postman, {
  message: 'At least one of openapi or postman must be provided'
});

export function validateAnalyze(req: Request, res: Response, next: NextFunction): void {
  try {
    req.body = analyzeSchema.parse(req.body);
    next();
  } catch (err) {
    if (err instanceof ZodError) {
      res.status(400).json({
        error: 'Validation failed',
        details: err.issues.map(e => ({
          field: e.path.map(String).join('.'),
          message: e.message
        }))
      });
    } else {
      next(err);
    }
  }
}
