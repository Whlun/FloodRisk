#!/usr/bin/env python3
"""生成 src/prototypes/huzhou-lifecycle-shared/parcelFieldSchema.ts"""
import re
import zipfile
import xml.etree.ElementTree as ET
from pathlib import Path

XLSX = Path('/Volumes/公司/项目/2026/湖州工业用地项目/湖州全生命周期场景-已梳理表格(3).xlsx')
OUT = Path(__file__).resolve().parent.parent / 'src/prototypes/huzhou-lifecycle-shared/parcelFieldSchema.ts'


def classify_group(label, code):
    t = label + code
    if re.search(r'主键|编号|代码|标识|guid', t, re.I) or re.search(r'编号|代码|主键|标识', label):
        return '标识关联'
    if re.search(r'面积|用地|地块|容积率|建筑|规模|亩|平方米|公顷', t):
        return '规模指标'
    if re.search(r'时间|日期|年限', t):
        return '时间'
    if re.search(r'金额|价款|费用|价格|出让金', t):
        return '价款费用'
    if re.search(r'单位|名称|地址|位置|坐落|申请人', t):
        return '主体信息'
    return '其他'


def is_summary(label, code, group):
    t = label + code
    if group == '标识关联':
        return bool(re.search(r'项目代码|xmdm|project_code|编号|文号|合同|划拨|监管号', t))
    if group == '规模指标':
        return bool(re.search(r'面积|用地|容积率|建筑|规模|亩', t))
    if group == '时间':
        return bool(re.search(r'时间|日期|办结', t))
    if group == '主体信息':
        return bool(re.search(r'名称|地址|位置|单位|坐落', t))
    return False


def esc(s):
    return s.replace('\\', '\\\\').replace("'", "\\'").replace('\n', ' ')


def main():
    z = zipfile.ZipFile(XLSX)
    ss = []
    root = ET.fromstring(z.read('xl/sharedStrings.xml'))
    ns = '{http://schemas.openxmlformats.org/spreadsheetml/2006/main}'
    for si in root.findall(f'{ns}si'):
        texts = []
        for t in si.iter(f'{ns}t'):
            if t.text:
                texts.append(t.text)
        ss.append(''.join(texts))
    root = ET.fromstring(z.read('xl/worksheets/sheet1.xml'))
    rows = []
    for row in root.findall(f'.//{ns}sheetData/{ns}row'):
        cells = {}
        for c in row.findall(f'{ns}c'):
            ref = c.get('r', '')
            col = ''.join(ch for ch in ref if ch.isalpha())
            col_idx = sum((ord(ch) - 64) * (26**i) for i, ch in enumerate(reversed(col))) - 1
            t = c.get('t')
            v = c.find(f'{ns}v')
            if v is None:
                val = ''
            elif t == 's':
                val = ss[int(v.text)]
            else:
                val = v.text
            cells[col_idx] = val
        maxc = max(cells) if cells else -1
        rows.append([cells.get(i, '') for i in range(maxc + 1)])

    tables = {}
    cur = None
    for r in rows[1:]:
        if len(r) < 5:
            continue
        table = (r[1] or '').strip()
        comment = (r[2] or '').strip()
        label = (r[3] or '').strip()
        code = (r[4] or '').strip()
        remark = (r[5] or '').strip()
        if table:
            cur = table
            if cur not in tables:
                tables[cur] = {'comment': comment, 'fields': []}
            if comment:
                tables[cur]['comment'] = comment
        if not cur or not label:
            continue
        group = classify_group(label, code)
        summary = is_summary(label, code, group)
        tables[cur]['fields'].append(
            {'label': label, 'code': code, 'remark': remark[:200], 'group': group, 'summary': summary}
        )

    lines = [
        '/**',
        ' * 地块全生命周期字段 schema（由 scripts/parse-huzhou-parcel-schema.py 生成）',
        ' */',
        "import type { MatterStageKey } from './parcelMatterStages';",
        "import { MATTER_STAGE_BY_KEY } from './parcelMatterStages';",
        '',
        "export type FieldGroup = '标识关联' | '主体信息' | '规模指标' | '时间' | '价款费用' | '其他';",
        '',
        'export type ParcelFieldDef = {',
        '  label: string;',
        '  code: string;',
        '  remark?: string;',
        '  group: FieldGroup;',
        '  summary?: boolean;',
        '};',
        '',
        'export type ParcelTableSchema = {',
        '  tableName: string;',
        '  comment: string;',
        '  fields: ParcelFieldDef[];',
        '};',
        '',
        'export const PARCEL_TABLE_SCHEMAS: Record<string, ParcelTableSchema> = {',
    ]
    for table_name, info in tables.items():
        lines.append(f"  '{esc(table_name)}': {{")
        lines.append(f"    tableName: '{esc(table_name)}',")
        lines.append(f"    comment: '{esc(info.get('comment', ''))}',")
        lines.append('    fields: [')
        for f in info['fields']:
            parts = [f"label: '{esc(f['label'])}'", f"code: '{esc(f['code'])}'", f"group: '{f['group']}'"]
            if f.get('remark'):
                parts.append(f"remark: '{esc(f['remark'])}'")
            if f.get('summary'):
                parts.append('summary: true')
            lines.append(f"      {{ {', '.join(parts)} }},")
        lines.append('    ],')
        lines.append('  },')
    lines.extend(
        [
            '};',
            '',
            'export function getTableSchemaForMatter(stageKey: MatterStageKey): ParcelTableSchema | undefined {',
            '  const matter = MATTER_STAGE_BY_KEY[stageKey];',
            '  if (!matter) return undefined;',
            '  return PARCEL_TABLE_SCHEMAS[matter.tableName];',
            '}',
            '',
            'export function getFieldsByGroup(schema: ParcelTableSchema): Record<FieldGroup, ParcelFieldDef[]> {',
            '  const out: Record<FieldGroup, ParcelFieldDef[]> = {',
            "    '标识关联': [], '主体信息': [], '规模指标': [], '时间': [], '价款费用': [], '其他': [],",
            '  };',
            '  for (const f of schema.fields) {',
            '    out[f.group].push(f);',
            '  }',
            '  return out;',
            '}',
            '',
            'const GROUP_ORDER: FieldGroup[] = [',
            "  '标识关联', '主体信息', '规模指标', '时间', '价款费用', '其他',",
            '];',
            '',
            'export function orderedFieldGroups(schema: ParcelTableSchema): FieldGroup[] {',
            '  const byGroup = getFieldsByGroup(schema);',
            '  return GROUP_ORDER.filter(g => byGroup[g].length > 0);',
            '}',
            '',
        ]
    )
    OUT.write_text('\n'.join(lines), encoding='utf-8')
    print('wrote', OUT, len(tables), 'tables')


if __name__ == '__main__':
    main()
