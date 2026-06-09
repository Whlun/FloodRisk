import { describe, expect, it } from 'vitest';
import {
  collectCompositePartConditionKeysUsedByOtherParts,
  filterExclusiveCompositePartFieldOptions,
} from '../src/prototypes/deqing-waterlogging-risk/compositePartSource';
import type { IndicatorAppendixBSurveyPart } from '../src/prototypes/deqing-waterlogging-risk/types';

const parts: IndicatorAppendixBSurveyPart[] = [
  {
    label: '人行',
    appendixBFieldKey: 'pedestrianEntranceElevationDiffM',
    valueFieldKey: 'FM_UG_ENTRANCE_H_PED',
    tierBands: [],
  },
  {
    label: '车行',
    appendixBFieldKey: 'vehicleEntranceElevationDiffM',
    valueFieldKey: 'FM_UG_ENTRANCE_H_VEH',
    tierBands: [],
  },
];

describe('filterExclusiveCompositePartFieldOptions', () => {
  it('其它子项已选条件字段不出现在下拉中', () => {
    const options = [
      { value: 'pedestrianEntranceElevationDiffM', label: '人行' },
      { value: 'vehicleEntranceElevationDiffM', label: '车行' },
    ];
    const filtered = filterExclusiveCompositePartFieldOptions(
      options,
      parts,
      1,
      'appendix_b',
      'vehicleEntranceElevationDiffM',
    );
    expect(filtered.map(o => o.value)).toEqual(['vehicleEntranceElevationDiffM']);
  });

  it('收集其它子项占用键', () => {
    const used = collectCompositePartConditionKeysUsedByOtherParts(parts, 1);
    expect(used.has('appendix_b:pedestrianEntranceElevationDiffM')).toBe(true);
    expect(used.has('appendix_b:vehicleEntranceElevationDiffM')).toBe(false);
  });
});
