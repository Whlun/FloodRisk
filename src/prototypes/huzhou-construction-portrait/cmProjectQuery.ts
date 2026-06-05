import { projectCurrentPhaseTimeInRange } from './cmProjectPhaseTime';
import type { ConstructionProject } from './types';
import type { CmProjectQuerySnapshot } from './useCmProjectListPanelState';

export function applyProjectQuery(
  rows: ConstructionProject[],
  snapshot: CmProjectQuerySnapshot,
): ConstructionProject[] {
  let out = rows;

  const nk = snapshot.nameKw.toLowerCase();
  if (nk) {
    out = out.filter(
      p =>
        p.name.toLowerCase().includes(nk) ||
        p.region.toLowerCase().includes(nk) ||
        (p.unifiedCode?.toLowerCase().includes(nk) ?? false) ||
        (p.address?.toLowerCase().includes(nk) ?? false),
    );
  }

  if (snapshot.dateFrom || snapshot.dateTo) {
    out = out.filter(p =>
      projectCurrentPhaseTimeInRange(p, snapshot.dateFrom, snapshot.dateTo),
    );
  }

  return out;
}
