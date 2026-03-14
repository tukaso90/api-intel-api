"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const path_1 = __importDefault(require("path"));
const index_js_1 = require("./api-intel-core/index.js");
const app = (0, express_1.default)();
app.use(express_1.default.json({ limit: '10mb' }));
app.use((0, cors_1.default)({ origin: '*' }));
app.get('/health', (req, res) => res.json({ status: 'Live!' })); // ← ADD THIS
app.post('/analyze', (req, res) => {
    if (!req.body.openapi && !req.body.postman) {
        return res.status(400).json({
            error: 'Validation failed',
            details: [{ field: '', message: 'openapi or postman required' }]
        });
    }
    try {
        const result = (0, index_js_1.analyze)(req.body);
        res.json(result);
    }
    catch (error) {
        res.status(400).json({ error: error.message });
    }
});
app.use(express_1.default.static('public'));
app.get('/', (req, res) => {
    res.sendFile(path_1.default.join(__dirname, '../public/index.html'));
});
app.listen(3000, () => {
    console.log('🚀 http://localhost:3000');
});
