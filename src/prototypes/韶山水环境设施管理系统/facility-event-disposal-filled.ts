/**
 * 事件台账「处置信息」是否已有实质内容，用于操作列「处置填报」/「填报信息」分支。
 * 不以「状态」单独判定，与详情 Tab「处置信息」展示字段对齐。
 * （本文件不 import 各列表视图模块，避免循环依赖。）
 */

/** 非空字符串（trim 后） */
export function hasDisposalText(v: unknown): boolean {
  return String(v ?? '').trim().length > 0;
}

/** 泵站台账 · 处置信息 Tab 对应字段 */
export type PumpEventDisposalPick = {
  处置责任人: string;
  联系电话: string;
  处置描述?: string;
  处理过程: string;
  处理结果: string;
  处置完成图片: string[];
  处置完成时间: string;
};

/** 污水厂台账 · 处置信息 Tab 对应字段 */
export type PlantEventDisposalPick = {
  处置责任人: string;
  联系电话: string;
  处置描述?: string;
  处置完成图片: string[];
  处置完成时间: string;
};

/** 统一列表行（仅处置判定所需字段） */
export type UnifiedFacilityEventDisposalPick = {
  设施类型: '泵站' | '污水厂';
  处置责任人: string;
  联系电话: string;
  处置描述?: string;
  处理过程?: string;
  处理结果?: string;
  处置完成图片: string[];
  处置完成时间: string;
};

/** 泵站 · 处置信息 Tab 字段 */
export function hasPumpEventDisposalFilled(r: PumpEventDisposalPick): boolean {
  if (
    hasDisposalText(r.处置责任人) ||
    hasDisposalText(r.联系电话) ||
    hasDisposalText(r.处置描述) ||
    hasDisposalText(r.处理过程) ||
    hasDisposalText(r.处理结果) ||
    hasDisposalText(r.处置完成时间)
  ) {
    return true;
  }
  return (r.处置完成图片 || []).length > 0;
}

/** 污水厂 · 处置信息 Tab 字段 */
export function hasPlantEventDisposalFilled(r: PlantEventDisposalPick): boolean {
  if (
    hasDisposalText(r.处置责任人) ||
    hasDisposalText(r.联系电话) ||
    hasDisposalText(r.处置描述) ||
    hasDisposalText(r.处置完成时间)
  ) {
    return true;
  }
  return (r.处置完成图片 || []).length > 0;
}

/** 统一列表：泵站行与泵站台账一致（含处理过程/处理结果）；污水厂行与污水厂台账一致 */
export function hasUnifiedFacilityEventDisposalFilled(r: UnifiedFacilityEventDisposalPick): boolean {
  if (r.设施类型 === '泵站') {
    return hasPumpEventDisposalFilled({
      处置责任人: r.处置责任人,
      联系电话: r.联系电话,
      处置描述: r.处置描述,
      处理过程: r.处理过程 ?? '',
      处理结果: r.处理结果 ?? '',
      处置完成图片: r.处置完成图片,
      处置完成时间: r.处置完成时间,
    });
  }
  return hasPlantEventDisposalFilled({
    处置责任人: r.处置责任人,
    联系电话: r.联系电话,
    处置描述: r.处置描述,
    处置完成图片: r.处置完成图片,
    处置完成时间: r.处置完成时间,
  });
}
