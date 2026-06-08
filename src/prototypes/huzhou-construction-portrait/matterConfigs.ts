import type { MatterKey } from './types';

export type MatterTableColumn = { key: string; title: string; width?: number };

export type MatterConfig = {
  key: MatterKey;
  label: string;
  caseCount: number;
  areaHa: number;
  districtBars: { name: string; value: number }[];
  searchFields: { key: string; placeholder: string }[];
  columns: MatterTableColumn[];
};

const DISTRICTS = ['市本级', '吴兴区', '南浔区', '南太湖新区', '德清县', '长兴县', '安吉县'];

function defaultBars(seed: number) {
  return DISTRICTS.map((name, i) => ({ name, value: Math.round(seed * (0.3 + (i % 5) * 0.15)) }));
}

export const MATTER_CONFIGS: MatterConfig[] = [
  {
    key: 'pre-review',
    label: '预审与选址',
    caseCount: 720,
    areaHa: 13947.72,
    districtBars: defaultBars(120),
    searchFields: [
      { key: 'code', placeholder: '项目代码' },
      { key: 'name', placeholder: '项目名称' },
      { key: 'cert', placeholder: '证书编号' },
    ],
    columns: [
      { key: 'no', title: '序号', width: 56 },
      { key: 'code', title: '项目代码', width: 160 },
      { key: 'matter', title: '事项名称', width: 200 },
      { key: 'type', title: '项目类型', width: 100 },
      { key: 'addr', title: '地址', width: 180 },
    ],
  },
  {
    key: 'farmland-conversion',
    label: '农转用报批',
    caseCount: 26555,
    areaHa: 6653.54,
    districtBars: defaultBars(680),
    searchFields: [
      { key: 'batch', placeholder: '农转批次' },
      { key: 'plot', placeholder: '地块名称' },
    ],
    columns: [
      { key: 'no', title: '序号', width: 56 },
      { key: 'batch', title: '农转批次', width: 140 },
      { key: 'type', title: '项目类型', width: 120 },
      { key: 'plot', title: '地块名称', width: 160 },
      { key: 'area', title: '地块面积(m²)', width: 110 },
    ],
  },
  {
    key: 'planning-conditions',
    label: '规划设计条件',
    caseCount: 82,
    areaHa: 203.66,
    districtBars: defaultBars(40),
    searchFields: [
      { key: 'code', placeholder: '项目代码' },
      { key: 'name', placeholder: '项目名称' },
      { key: 'book', placeholder: '规划条件书编号' },
    ],
    columns: [
      { key: 'no', title: '序号', width: 56 },
      { key: 'code', title: '项目代码', width: 160 },
      { key: 'matter', title: '事项名称', width: 180 },
      { key: 'loc', title: '项目位置', width: 200 },
    ],
  },
  {
    key: 'land-supply',
    label: '土地供应',
    caseCount: 22202,
    areaHa: 49165.98,
    districtBars: defaultBars(520),
    searchFields: [
      { key: 'name', placeholder: '项目名称' },
      { key: 'parcel', placeholder: '宗地编号' },
      { key: 'user', placeholder: '土地使用者' },
    ],
    columns: [
      { key: 'no', title: '序号', width: 56 },
      { key: 'name', title: '项目名称', width: 200 },
      { key: 'user', title: '土地使用者', width: 140 },
      { key: 'method', title: '供应方式', width: 100 },
    ],
  },
  {
    key: 'first-registration',
    label: '土地首次登记',
    caseCount: 1734,
    areaHa: 8200.5,
    districtBars: defaultBars(280),
    searchFields: [{ key: 'name', placeholder: '项目名称' }],
    columns: [
      { key: 'no', title: '序号', width: 56 },
      { key: 'name', title: '项目名称', width: 200 },
      { key: 'cert', title: '不动产权证号', width: 160 },
    ],
  },
  {
    key: 'land-use-permit',
    label: '用地规划许可',
    caseCount: 3824,
    areaHa: 3776.43,
    districtBars: defaultBars(360),
    searchFields: [{ key: 'name', placeholder: '项目名称' }],
    columns: [
      { key: 'no', title: '序号', width: 56 },
      { key: 'name', title: '项目名称', width: 200 },
      { key: 'permit', title: '许可证号', width: 140 },
    ],
  },
  {
    key: 'design-review',
    label: '设计方案审查',
    caseCount: 1934,
    areaHa: 4289.0,
    districtBars: defaultBars(200),
    searchFields: [{ key: 'name', placeholder: '项目名称' }],
    columns: [
      { key: 'no', title: '序号', width: 56 },
      { key: 'name', title: '项目名称', width: 200 },
      { key: 'scheme', title: '方案名称', width: 160 },
    ],
  },
  {
    key: 'engineering-permit',
    label: '工程规划许可',
    caseCount: 3824,
    areaHa: 5123.0,
    districtBars: defaultBars(400),
    searchFields: [{ key: 'name', placeholder: '项目名称' }],
    columns: [
      { key: 'no', title: '序号', width: 56 },
      { key: 'name', title: '项目名称', width: 200 },
      { key: 'permit', title: '许可证号', width: 140 },
    ],
  },
  {
    key: 'land-review',
    label: '用地复核验收',
    caseCount: 341,
    areaHa: 886.0,
    districtBars: defaultBars(80),
    searchFields: [{ key: 'name', placeholder: '项目名称' }],
    columns: [
      { key: 'no', title: '序号', width: 56 },
      { key: 'name', title: '项目名称', width: 200 },
      { key: 'result', title: '验收结论', width: 100 },
    ],
  },
  {
    key: 'planning-verification',
    label: '规划核实',
    caseCount: 2555,
    areaHa: 2455.0,
    districtBars: defaultBars(240),
    searchFields: [{ key: 'name', placeholder: '项目名称' }],
    columns: [
      { key: 'no', title: '序号', width: 56 },
      { key: 'name', title: '项目名称', width: 200 },
      { key: 'result', title: '核实结论', width: 100 },
    ],
  },
  {
    key: 'estate-certificate',
    label: '不动产权证',
    caseCount: 3510,
    areaHa: 4682.0,
    districtBars: defaultBars(320),
    searchFields: [
      { key: 'name', placeholder: '项目名称' },
      { key: 'cert', placeholder: '不动产权证号' },
    ],
    columns: [
      { key: 'no', title: '序号', width: 56 },
      { key: 'name', title: '项目名称', width: 200 },
      { key: 'cert', title: '不动产权证号', width: 160 },
    ],
  },
];

export function getMatterConfig(key: MatterKey): MatterConfig {
  return MATTER_CONFIGS.find(m => m.key === key) ?? MATTER_CONFIGS[0];
}

export function buildMatterTableRows(config: MatterConfig, count = 10) {
  return Array.from({ length: count }, (_, i) => {
    const row: Record<string, string | number> = { no: i + 1, key: `${config.key}-${i}` };
    for (const col of config.columns) {
      if (col.key === 'no') continue;
      row[col.key] = `演示${config.label}-${i + 1}`;
    }
    return row;
  });
}
