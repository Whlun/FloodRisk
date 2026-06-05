# 德清内涝 — 指标普查与条件赋分（禁止硬编码）

> **给 Agent / 维护者**：修改 `survey`、`conditionalScoring`、附录 B 专用信息、辅助条件相关代码前**必须先读本文**。用户要求：**不区分「预置 / 新增」**，初始化 JSON 只是种子数据。

## 核心原则

1. **单一数据源**：每条指标的 `survey`（含 `inputVariant`、`auxiliaryCondition`）存在 `RiskIndicatorRow` 上；UI 只读当前指标列表 + 表单中的配置。
2. **禁止按指标编码分支**（反例）：
   - `if (ind.code === 'FM_LL_COLLECT')`
   - `findLowLyingCollectIndicator(...)`
   - 为某一个指标单独写 React 组件或 Panel
3. **禁止用种子表驱动运行时逻辑**（反例）：
   - 在 `ConditionalScoringEditor`、`conditionalScoring.ts`、`compositeConditionalSurvey.ts` 等中 `import { initialRiskIndicators }` 再 `find(b => b.code === ...)`
   - 例外：测试、文档示例、数据库种子文件本身；应用启动时 `loadPersistedIndicators([])`，**不**合并导则种子。
4. **允许的数据表**（导则常量，不是「某个指标的 UI 特例」）：
   - `src/database/deqing-waterlogging-risk-indicators.ts` — 初始化种子（附录 F 分档 label 等初始文案；与用户新建共用中性模板）
   - `appendixEWeights.ts`、`designReturnPeriod.ts`、`numericIndicatorConstraints.ts` — 附录权重 / 重现期填报说明 / 数值合理范围（填报校验，非赋分注入）

## 三层边界（种子 / 常量表 / 运行时）

| 层级 | 位置 | 职责 |
|------|------|------|
| **种子** | `deqing-waterlogging-risk-indicators.ts` + `guidelineSeedBuilders.ts` | 参考数据与测试用例；**不**在运行时注入指标列表 |
| **常量表** | `appendixEWeights.ts`、`designReturnPeriod.ts` 等 | 权重参考、重现期填报校验与说明 UI；**不**在 `normalize` 时写入赋分区间或条件分支 |
| **运行时** | `matchScoreRuleFromValue`、`conditionalScoring` 等 | **仅读**当前 `RiskIndicatorRow` 配置；禁止 `ind.code ===` 数值 fallback；`enrichNumericUniformScoreRules` 不再按编码补全 `numericMatch` |

用户自建：**中性模板**，四档标准分 F（0.25/0.5/0.75/1），**无**预置区间，须手动配齐 `numericMatch`。加载持久化数据时同样不自动补全导则区间。

## 三种赋分规则（赋分规则 Tab，互斥）

| 模式 | 存储 | 编辑入口 |
|------|------|----------|
| 统一赋分档 | `scoringRuleMode: uniform` + `scoreRules`（数值型每档可配 `numericMatch`） | 赋分规则 Tab |
| 条件赋分 | `scoringRuleMode: conditional` + `conditionalScoring` | 赋分规则 Tab |
| 复合数值赋分 | `scoringRuleMode: composite` + `survey.appendixBSurveyParts` + `tierBands` + 派生 `scoreRules` | 赋分规则 Tab：可配置**多个**条件字段子项（内涝基本信息 / 本点数值型指标）、可选 `compositePreflightGate`（布尔前置门控）、聚合 `max_f`/`min_f` |

所有指标共用三选一；赋分区间与条件分支须在编辑中手动配齐。

**新建/编辑 · 场景卡片**：第二步按 `listTemplatesForValueType` 过滤，只展示与第一步「普查填报方式」兼容的场景；填数按区间赋分须第一步选「填数值」、第二步选「数值分档」，并配置 `ScoreRule.numericMatch`。

## 条件赋分（向导场景）

| 配置项 | 位置 | 说明 |
|--------|------|------|
| `scoringRuleMode` | 场景「条件赋分」 | `conditional`；由 `applyIndicatorConfigTemplate('auxiliary_conditional')` 写入 |
| `survey.inputVariant` | 场景「条件赋分」 | `default`；**不**自动写入 `auxiliary_then_select` |
| 条件赋分 | 赋分规则 Tab | **主配置入口**：`conditionalScoring.source`（内涝基本信息 / 本点其他指标）、条件字段、各分支匹配条件与 `scoreRules` |

用户先选条件来源与条件字段，再配置分支赋分；两类来源均可下拉选择。

## 辅助条件 + 条件赋分（高级 / 导则种子）

| 配置项 | 位置 | 说明 |
|--------|------|------|
| `survey.inputVariant` | 高级「先填条件字段，再选本分档」 | `auxiliary_then_select`；**不再**由向导场景模板自动写入 |
| `survey.auxiliaryCondition` | 高级（默认折叠） | `fieldKey`、`label`、`surveyPlacement` 等；名称/位置智能默认，分界值在条件分支 `numericMatch` 配置 |
| 条件赋分 | 赋分规则 Tab | 条件来源固定为本项辅助条件；各分支 `numericMatch` 与 `scoreRules` |

显式 `auxiliary_then_select`（导则种子或高级配置）须走 **`auxiliaryIndicatorDefaults.ts`**（`syncAuxiliaryConditionalToForm` / `buildAuxiliaryConditionalPackage`），勿在「条件赋分」向导模板里单独写 `surveyPlacement`。

| 场景 | 默认 `surveyPlacement` | 默认条件名称 | 默认 `fieldKey` | 默认分支 |
|------|------------------------|--------------|-----------------|----------|
| **用户新建 / 导则种子** | `indicator_census` | 辅助条件 | `{code}_COND` | 分支 1 / 分支 2，无数值条件 |

仅适用于显式 `auxiliary_then_select`（高级配置或导则种子）；向导场景「条件赋分」不自动注入上表默认值。

用户新建与种子均不默认 `thresholdPct`；数值分界仅在条件分支 `numericMatch` 中配置，保存前须手动配齐。

`normalizeConditionSourceKey` 会将错存为 `appendix_b` 的指标普查辅助字段（如 `*_COND`）自动纠正为 `indicator` 类型；加载本地缓存时一次性迁移（`dq-indicators-cond-source-fix-v1`）。

若条件下拉缺项，先查 `surveyPlacement === 'appendix_b'` 且条件赋分 `source` 与 `resolveAuxiliaryConditionSource` 一致。

## 下拉选档（enum_uniform）

| 配置项 | 位置 | 说明 |
|--------|------|------|
| `scoreRules[].label` | 赋分规则 Tab | 普查下拉选项名称 |
| `scoreRules[].tierRef` | 赋分规则 Tab | 分档说明（选填）：普查下拉项内及选中后下方展示 |
| 运行时 | 指标普查 | 用户手选档位，按 label 匹配 F |

## 复合数值赋分（与条件赋分并列）

| 配置项 | 位置 | 说明 |
|--------|------|------|
| `survey.inputVariant` | 赋分规则 Tab（三选一） | `composite_appendix_numeric` = 附录 B 多个数值子项 |
| `survey.appendixBSurveyParts` | 赋分规则 Tab | 子项字段映射与 `tierBands` 均在赋分规则 Tab 配置 |
| `survey.compositePreflightGate` | 赋分规则 Tab · 复合配置 | 可选：内涝基本信息布尔字段为指定值时直接取 F，跳过数值子项 |
| `survey.compositeAggregation` | 赋分规则 Tab | `max_f` = 各子项 F 取较大者；`min_f` = 取较小者（兼容存库 `worst_score` → `max_f`） |
| 主 `scoreRules`（复合模式） | 程序派生 | 由子项 `tierBands` 的 score 去重生成，供定级 `pickRule` 与列表展示 |
| 子项分档 | 赋分规则 Tab | `CompositeAppendixRulesPanel` + `CompositePartTierBandsEditor`；打开弹窗时 `normalizeIndicatorForEdit` 规范化；用户可点「恢复默认复合配置」 |
| 标准分档模板 | `guidelineTierBandTemplates.ts` | 按 `appendixBFieldKey` 索引（出入口高程、历史灾情四项等）；绑定对应字段时可「填入模板」 |
| 运行时 | `compositeAppendixScoring.ts` | 读 `tierBands` + `matchNumericCondition`（含 `between`、`eq` 零值表「无」） |

导则示例（如出入口高程）在种子 `deqing-waterlogging-risk-indicators.ts` 中带好 `tierBands`。

## 修改自检

```bash
npm run check:deqing-indicators
```

脚本会拦截：专用函数名、`FM_LL_COLLECT*` 出现在非白名单 TS 文件、运行时引用 `initialRiskIndicators` 等。

## 场景模板与配置就绪（通用）

| 模块 | 文件 | 说明 |
|------|------|------|
| 场景模板 | `indicatorConfigTemplates.ts` | `applyIndicatorConfigTemplate`：下拉/数值/是·否/辅助条件/复合五类默认配置 |
| 辅助条件单一入口 | `auxiliaryIndicatorDefaults.ts` | `resolveAuxiliaryDefaults`、`buildAuxiliaryConditionalPackage`、`syncAuxiliaryConditionalToForm` |
| 就绪校验 | `indicatorConfigReadiness.ts` | `validateIndicatorConfig`：保存/试算前 blocker 与 warning |
| 统一规范化 | `indicatorNormalize.ts` | `normalizeIndicatorRow` / `normalizeIndicatorForEdit`：加载、编辑唯一管线 |
| 持久化 | `indicatorPersistence.ts`、`workspacePersistence.ts` | 指标 v2、普查点、防灾减灾、变更记录、一级权重等见 `spec.md`「本地持久化」；加载时不自动清空已有 v2 |
| 一体面板 | `IndicatorSurveyScoringPanel.tsx` | 编辑弹窗「赋分规则」Tab |
| 新建向导 | `IndicatorCreateWizard.tsx` | 分步新建 |

新增能力须走模板 + readiness，禁止为单指标写 UI 分支。

## 相关实现入口（通用）

- 配置表单：`IndicatorSurveyConfigFields.tsx`（高级项：辅助条件等）
- 条件字段选项：`conditionalScoring.ts` → `getSurveyBasicInfoConditionFieldOptions`
- 附录 B 专用信息：`appendixBSurveyFields.tsx` → `listAppendixAuxiliarySurveyFields`
- 城市低洼路段固定专用项：`appendixBConditionFields.ts` → `roadLongitudinalSlope`（道路纵坡度 S，表 5.3.11；存于 `surveyPayload.appendixB`，与是否配置风险指标无关）
- 历史灾情共用项：`appendixBConditionFields.ts` → `COMMON_APPENDIX_CONDITION_FIELDS`（人员死亡/重伤/被困、直接经济损失；基本信息填报，可作复合子项/条件赋分来源；分档模板见 `guidelineTierBandTemplates.ts` 表 5.4.3 项）
- 辅助条件控件：`RainwaterCollectCapacityInput.tsx`（导出 `CompositeConditionalSurveyInput`，按 `survey` 驱动）
