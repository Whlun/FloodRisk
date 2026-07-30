#!/usr/bin/env node
/**
 * 德清内涝风险原型：禁止在运行时逻辑中按指标编码/预置表做特殊分支。
 * 修改 survey / 条件赋分 / 辅助条件 相关代码后请运行：npm run check:deqing-indicators
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const PROTOTYPE_DIR = 'src/prototypes/deqing-waterlogging-risk';

/** 允许出现导则指标编码的数据表/迁移（非 UI 分支逻辑） */
const CODE_LITERAL_ALLOWLIST = new Set([
  'appendixEWeights.ts',
  'designReturnPeriod.ts',
  'numericIndicatorConstraints.ts',
  'indicatorPersistence.ts',
  // 一次性工作区数据迁移可按历史指标编码修复当前目录；不得用于运行时赋分。
  'workspaceService.ts',
  'indicatorScoringProfile.ts',
  'surveyFieldHints.ts',
  'defaultScoreExplanation.ts',
  'scoreRuleNumericBands.ts',
]);

/** 仅启动时加载种子数据 */
const INITIAL_RISK_ALLOWLIST = new Set(['index.tsx']);

const BANNED_IDENTIFIERS = [
  /\bfindLowLying\w*/i,
  /\bFmLlCollect\w*/i,
  /\bfmLlCollect\w*/i,
];

const BANNED_CODE_LITERALS = ['FM_LL_COLLECT_SLOPE', 'FM_LL_COLLECT'];

const IND_CODE_BRANCH = /\bind\.code\s*===/;

/** 通用新建模板函数内禁止导则区间字面量（PRESET 表除外） */
const GENERIC_TEMPLATE_MARKERS = [
  'export function createGenericNumericUniformRules',
  'export function createGenericNumericBranchRules',
];
const GUIDELINE_BAND_LITERALS = ['N≤8', '8<N≤16', '16<N≤24'];

function walk(dir, acc = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) walk(p, acc);
    else if (/\.(ts|tsx)$/.test(name) && !/\.test\.(ts|tsx)$/.test(name)) acc.push(p);
  }
  return acc;
}

function isCommentLine(line) {
  const t = line.trim();
  return t.startsWith('//') || t.startsWith('*') || t.startsWith('/*');
}

function checkGenericTemplateNoGuidelineBands(content, rel) {
  const violations = [];
  for (const marker of GENERIC_TEMPLATE_MARKERS) {
    const start = content.indexOf(marker);
    if (start < 0) continue;
    const nextExport = content.indexOf('\nexport function ', start + marker.length);
    const body = content.slice(start, nextExport > start ? nextExport : undefined);
    for (const lit of GUIDELINE_BAND_LITERALS) {
      if (body.includes(lit)) {
        violations.push(`${rel}: 通用模板 ${marker} 内禁止导则字面量 ${lit}`);
      }
    }
  }
  return violations;
}

const violations = [];

for (const file of walk(PROTOTYPE_DIR)) {
  const rel = relative(process.cwd(), file);
  const base = rel.split('/').pop() ?? '';
  const content = readFileSync(file, 'utf8');
  const allowCodes = CODE_LITERAL_ALLOWLIST.has(base);

  if (content.includes('initialRiskIndicators') && !INITIAL_RISK_ALLOWLIST.has(base)) {
    violations.push(
      `${rel}: 不得引用 initialRiskIndicators；运行时使用 props/state 中的 indicators`,
    );
  }

  for (const re of BANNED_IDENTIFIERS) {
    if (re.test(content)) {
      violations.push(`${rel}: 禁止专用标识符 ${re}`);
    }
  }

  if (!allowCodes) {
    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (isCommentLine(line)) continue;
      for (const lit of BANNED_CODE_LITERALS) {
        if (line.includes(lit)) {
          violations.push(`${rel}:${i + 1}: 禁止硬编码 ${lit}（应使用 survey.auxiliaryCondition 配置）`);
        }
      }
      if (IND_CODE_BRANCH.test(line)) {
        violations.push(`${rel}:${i + 1}: 禁止按 ind.code 分支（应读 scoreRules / conditionalScoring 配置）`);
      }
    }
  }

  if (base === 'scoreRuleNumericBands.ts') {
    violations.push(...checkGenericTemplateNoGuidelineBands(content, rel));
  }
}

if (violations.length) {
  console.error('check:deqing-indicators 失败:\n\n' + violations.join('\n'));
  console.error('\n参见 src/prototypes/deqing-waterlogging-risk/rules-indicator-config.md');
  process.exit(1);
}

console.log('check:deqing-indicators 通过');
