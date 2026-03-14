import express from 'express';
import cors from 'cors';
import path from 'path';
import { analyze } from "./api-intel-core/index.js";

const app = express();
app.use(express.json({ limit: '10mb' }));
app.use(cors({ origin: '*' }));

app.get('/health', (req, res) => res.json({ status: 'Live!' }));  // ← ADD THIS

app.post('/analyze', (req, res) => {
  if (!req.body.openapi && !req.body.postman) {
    return res.status(400).json({
      error: 'Validation failed',
      details: [{ field: '', message: 'openapi or postman required' }]
    });
  }
  try {
    const result = analyze(req.body);
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

app.use(express.static('public'));
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

app.listen(3000, () => {
  console.log('🚀 http://localhost:3000');
});
