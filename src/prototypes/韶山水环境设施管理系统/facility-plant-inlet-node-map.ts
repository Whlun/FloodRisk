/**
 * 污水厂进水接驳管点（演示）：与 pipe-network-demo-data 中 `nodeId` 同源。
 */
export const PLANT_SEWER_INLET_NODE_ID: Record<string, string> = {
  WWTP202504070001: 'N_INLET_WWTP001',
  WWTP202504070002: 'N_INLET_WWTP002',
};

export function getPlantSewerInletNodeId(plantCode: string): string | undefined {
  const k = String(plantCode || '').trim();
  return PLANT_SEWER_INLET_NODE_ID[k];
}
