/**
 * 从《湖州全生命周期场景-已梳理表格》xlsx 生成 parcelFieldSchema.ts
 * 用法：node scripts/parse-huzhou-parcel-schema.mjs
 */
import { execSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const py = path.join(__dirname, 'parse-huzhou-parcel-schema.py');
execSync(`python3 "${py}"`, { stdio: 'inherit' });
