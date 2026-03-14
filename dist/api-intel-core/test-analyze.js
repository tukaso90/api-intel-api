"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// test-analyze.ts
const index_1 = require("../src/index");
const fs_1 = require("fs");
const raw = JSON.parse((0, fs_1.readFileSync)('./petstore.json', 'utf8'));
console.log('📄 Raw spec version:', raw.openapi || raw.swagger);
console.log('📄 Paths found:', Object.keys(raw.paths || {}).length);
const result = (0, index_1.analyze)({ openapi: raw });
console.log('🔍 Endpoints after normalize:', result.endpoints.length);
console.log('📊 Risk Report:', JSON.stringify(result.riskReport, null, 2));
