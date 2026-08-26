import express from 'express';
import cors from 'cors';
import path from 'path';
import { analyze } from "./api-intel-core/index.js";
import { validateAnalyze } from "./validation.js";

const app = express();
app.use(express.json({ limit: '10mb' }));
app.use(cors({ origin: '*' }));

app.post('/analyze', validateAnalyze, (req, res) => {
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

const PORT = Number(process.env.PORT) || 3000;
app.listen(PORT, () => {
  console.log(`🚀 http://localhost:${PORT}`);
});

app.get('/health', (req, res) => {
  res.json({ 
    status: 'API Intel Server Live', 
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});
