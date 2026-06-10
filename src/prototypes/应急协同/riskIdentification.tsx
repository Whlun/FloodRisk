/**
 * 风险识别 — 六类台账（与生态整治设施管理交互一致：查询、字段管理、导入导出、增删改查、详情）
 */
import React, { useCallback, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import {
  Card,
  Row,
  Col,
  Table,
  Tag,
  Button,
  Input,
  Select,
  Space,
  Typography,
  Modal,
  Form,
  message,
  Popconfirm,
  Descriptions,
  DatePicker,
  Tabs,
  InputNumber,
  Checkbox,
  Divider,
  Dropdown,
  Tooltip,
  Upload,
} from 'antd';
import type { UploadFile } from 'antd/es/upload';
import type { ColumnsType } from 'antd/es/table';
import {
  ColumnHeightOutlined,
  SearchOutlined,
  PlusOutlined,
  DownloadOutlined,
  UploadOutlined,
  EditOutlined,
  EyeOutlined,
} from '@ant-design/icons';
import {
  AddrWgs84MapPicker,
  AddrWgs84DetailMap,
  ADDR_MAP_FORM_ITEM_EXTRA,
  ADDR_MAP_INPUT_PLACEHOLDER,
} from '../shared/addrWgs84MapFormBridge';
import { downloadTableFullExcel, getExportFieldLabel } from '../shared/facilityTableXlsxExport';

const { Text } = Typography;
const { TextArea } = Input;

/** 与应急事件信息编辑表单一致：双列 `xs={24} sm={12}`，整行 `xs={24} sm={24}`；Row gutter 纵向间距由 `.risk-ident-edit-form` 表单项下边距承担 */
const RISK_EDIT_FORM_ROW_GUTTER: [number, number] = [16, 0];

const DEMO_PLAN_PDF = 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf';

/** 应急预案附件：与事件评估一致，原型存浏览器 data URL（刷新可能丢失） */
const PLAN_ATTACH_MAX_MB = 20;
const PLAN_ATTACH_ACCEPT =
  '.pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document';

// —— 与 index 中一致的字段管理类型（避免循环依赖，局部复制）——
export interface EcoColumnConfig {
  key: string;
  title: React.ReactNode;
  columnManagerLabel?: string;
  dataIndex?: string;
  width?: number;
  fixed?: 'left' | 'right';
  render?: (value: unknown, record: unknown) => React.ReactNode;
  defaultVisible?: boolean;
}

interface EcoColumnManagerProps {
  columns: EcoColumnConfig[];
  visibleColumns: string[];
  onChange: (visibleColumns: string[]) => void;
}

/** 与生态整治一致的表格字段管理（供事件复盘等模块复用） */
export const RiskEcoColumnManager: React.FC<EcoColumnManagerProps> = ({ columns, visibleColumns, onChange }) => {
  const [open, setOpen] = useState(false);
  const [isSortMode, setIsSortMode] = useState(false);

  const handleToggleColumn = (key: string, checked: boolean) => {
    if (checked) onChange([...visibleColumns, key]);
    else {
      if (key === 'operation') {
        message.warning('操作列不可隐藏');
        return;
      }
      onChange(visibleColumns.filter(k => k !== key));
    }
  };

  const handleReset = () => {
    onChange(columns.filter(c => c.key !== 'operation' && c.defaultVisible !== false).map(c => c.key));
    message.success('已重置为默认显示');
  };

  const sortableColumns = visibleColumns.filter(key => key !== 'operation');
  const handleMoveUp = (index: number) => {
    if (index <= 0) return;
    const newOrder = [...visibleColumns];
    [newOrder[index], newOrder[index - 1]] = [newOrder[index - 1], newOrder[index]];
    onChange(newOrder);
  };
  const handleMoveDown = (index: number) => {
    if (index >= sortableColumns.length - 1) return;
    const newOrder = [...visibleColumns];
    [newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]];
    onChange(newOrder);
  };

  const dropdownContent = (
    <Card
      title={
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>字段管理</span>
          <Button type="link" size="small" onClick={() => setIsSortMode(!isSortMode)}>
            {isSortMode ? '完成排序' : '排序'}
          </Button>
        </div>
      }
      style={{ width: isSortMode ? 360 : 320 }}
      size="small"
    >
      <div style={{ maxHeight: 400, overflow: 'auto' }}>
        {isSortMode ? (
          <>
            {sortableColumns.map((key, index) => {
              const col = columns.find(c => c.key === key);
              const sortLabel =
                col?.columnManagerLabel ?? (typeof col?.title === 'string' ? col.title : col?.key ?? key);
              return (
                <div
                  key={key}
                  style={{ display: 'flex', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #f0f0f0' }}
                >
                  <span style={{ flex: 1 }}>{sortLabel}</span>
                  <Space>
                    <Button type="text" size="small" disabled={index === 0} onClick={() => handleMoveUp(index)}>
                      ↑
                    </Button>
                    <Button
                      type="text"
                      size="small"
                      disabled={index === sortableColumns.length - 1}
                      onClick={() => handleMoveDown(index)}
                    >
                      ↓
                    </Button>
                  </Space>
                </div>
              );
            })}
          </>
        ) : (
          columns.map(col => (
            <div key={col.key} style={{ marginBottom: 8 }}>
              <Checkbox
                checked={col.key === 'operation' || visibleColumns.includes(col.key)}
                onChange={e => handleToggleColumn(col.key, e.target.checked)}
                disabled={col.key === 'operation'}
              >
                <Space>
                  {col.columnManagerLabel ?? (typeof col.title === 'string' ? col.title : col.key)}
                  {col.key === 'operation' && (
                    <Tag color="blue" style={{ fontSize: 10 }}>
                      固定
                    </Tag>
                  )}
                </Space>
              </Checkbox>
            </div>
          ))
        )}
      </div>
      {!isSortMode && (
        <>
          <Divider style={{ margin: '12px 0' }} />
          <Button type="link" onClick={handleReset} size="small">
            恢复默认
          </Button>
        </>
      )}
    </Card>
  );

  return (
    <Dropdown
      open={open}
      popupRender={() => dropdownContent}
      placement="bottomRight"
      onOpenChange={visible => {
        setOpen(visible);
        if (!visible) setIsSortMode(false);
      }}
    >
      <Tooltip title="字段管理">
        <Button icon={<ColumnHeightOutlined />}>字段</Button>
      </Tooltip>
    </Dropdown>
  );
};

export const getEcoDefaultVisibleColumnKeys = (cols: EcoColumnConfig[]): string[] =>
  cols.filter(c => c.key !== 'operation' && c.defaultVisible !== false).map(c => c.key);

const ECO_DEFAULT_COL_WIDTH = 120;
export function getEcoTableScrollX(cols: { width?: number }[]): number {
  const total = cols.reduce(
    (sum, c) => sum + (typeof c.width === 'number' ? c.width : ECO_DEFAULT_COL_WIDTH),
    0,
  );
  return Math.max(total, 100);
}

export function buildTableColumnsFromEcoConfig(
  allCols: EcoColumnConfig[],
  visibleKeys: string[],
  operationRender: (record: unknown) => React.ReactNode,
): ColumnsType<unknown> {
  return allCols
    .filter(col => visibleKeys.includes(col.key) || col.key === 'operation')
    .sort((a, b) => {
      if (a.key === 'operation') return 1;
      if (b.key === 'operation') return -1;
      return visibleKeys.indexOf(a.key) - visibleKeys.indexOf(b.key);
    })
    .map(col => {
      if (col.key === 'operation') {
        const { defaultVisible: _d, ...opRest } = col;
        return {
          ...opRest,
          fixed: 'right' as const,
          render: (_: unknown, record: unknown) => operationRender(record),
        };
      }
      const { defaultVisible: _dv, ...rest } = col;
      return { ...rest };
    }) as ColumnsType<unknown>;
}

const EcoProtoExportBtn = ({ onClick }: { onClick?: () => void }) => (
  <Button icon={<DownloadOutlined />} className="export-btn" onClick={onClick ?? (() => message.success('已导出'))}>
    导出Excel
  </Button>
);

function exportRiskTableExcel(
  rows: Record<string, unknown>[],
  columns: EcoColumnConfig[],
  filePrefix: string,
  sheetName: string,
) {
  if (!rows.length) {
    message.warning('当前筛选条件下无数据可导出');
    return;
  }
  const baseCols = columns
    .filter(c => c.key !== 'operation')
    .map(c => ({ key: c.key, title: String(c.title), dataIndex: String(c.dataIndex ?? c.key) }));
  const EXCLUDE_KEYS = new Set(['key']);
  const allRowKeys = Array.from(new Set(rows.flatMap(row => Object.keys(row))));
  const missingKeys = allRowKeys.filter(
    k => !EXCLUDE_KEYS.has(k) && !baseCols.some(c => c.dataIndex === k || c.key === k),
  );
  const exportCols = [
    ...baseCols,
    ...missingKeys.map(k => ({ key: k, title: getExportFieldLabel(k), dataIndex: k })),
  ];
  downloadTableFullExcel(rows, exportCols, filePrefix, sheetName);
  message.success('已导出 Excel（全量字段）');
}

const EcoProtoImportBtn = () => (
  <Upload
    beforeUpload={() => {
      message.success('已导入');
      return false;
    }}
    showUploadList={false}
  >
    <Button icon={<UploadOutlined />} className="secondary-btn">导入</Button>
  </Upload>
);

const formModalStyles = {
  body: {
    maxHeight: 'calc(100vh - 240px)',
    overflowY: 'auto' as const,
    overflowX: 'hidden' as const,
    minWidth: 0,
  },
};

/** 只读详情弹窗：与生态整治大型详情一致，内容区可滚动高度略增 */
const detailModalStyles = {
  ...formModalStyles,
  body: { ...formModalStyles.body, maxHeight: 'min(85vh, 900px)', overflowY: 'auto' as const },
};

// ========== 数据类型 ==========
export interface RiskEnterpriseRow {
  id: string;
  enterpriseName: string;
  address: string;
  /** 经度（度），与应急事件/项目档案地图同源 */
  longitude?: string;
  /** 纬度（度） */
  latitude?: string;
  industryType: string;
  mainPollutants: string;
  dischargeScale: string;
  riskLevel: string;
  contactName: string;
  contactPhone: string;
  region: string;
  updatedAt: string;
}

/** 社会物资点 · 存储性质（台账下拉，可扩展） */
export const SOCIAL_POINT_STORAGE_NATURE_OPTIONS = ['政府储备', '社会代储', '企业自有', '协议代管', '其他'] as const;

export interface SocialSupplyPointRow {
  id: string;
  name: string;
  /** 所属区划（韶山市乡镇/街道） */
  region: string;
  /** 所属单位（如主管或托管单位） */
  affiliatedUnit: string;
  /** 存储性质 */
  storageNature: string;
  address: string;
  materialTypesQty: string;
  contactPhone: string;
  callProcess: string;
  /** 备注（长文本） */
  remark: string;
  /** 地图/统一点位用（度，与应急事件表单一致；可选） */
  longitude?: string;
  latitude?: string;
}

/** 应急物资储备数量常用计量单位（与表单下拉一致） */
export const EMERGENCY_SUPPLY_QUANTITY_UNIT_OPTIONS = [
  '件',
  '张',
  '套',
  '台',
  '米',
  '吨',
  '个',
  '箱',
  '桶',
  'kg',
  'L',
  '㎡',
  'm³',
] as const;

/** 应急物资 · 管理方式 */
export const EMERGENCY_SUPPLY_MANAGEMENT_MODE_OPTIONS = [
  '定点集中管理',
  '分散代管',
  '协议储备',
  '企业自管',
  '其他',
] as const;

export interface EmergencySupplyRow {
  id: string;
  name: string;
  materialType: string;
  specModel: string;
  /** 储备数量计量单位 */
  quantityUnit: string;
  quantity: number;
  socialPointId: string;
  /** 所属单位 */
  affiliatedUnit: string;
  brand: string;
  /** 单价（元，演示为数值） */
  unitPrice: number;
  /** 管理方式 */
  managementMode: string;
  /** 存储性质（与社会物资点下拉口径一致时可复用选项） */
  storageNature: string;
  /** 生产日期 YYYY-MM-DD */
  productionDate: string;
  /** 保质期（如 24 个月、见包装） */
  shelfLife: string;
  /** 生产厂家 */
  manufacturer: string;
  manager: string;
  replenishCycle: string;
  usageNote: string;
}

export interface EmergencyPlanRow {
  id: string;
  name: string;
  planType: string;
  publishTime: string;
  compileOrg: string;
  orgSystem: string;
  responseFlow: string;
  measures: string;
  dutyDivision: string;
  attachmentName: string;
  pdfUrl: string;
}

export interface TeamMemberRow {
  id: string;
  name: string;
  role: string;
  phone: string;
  skill: string;
}

/** 韶山市乡镇（街道）名称列表，与「应急事件信息」所属区划下拉口径一致（展示名） */
export const SHAOSHAN_SUB_REGION_OPTIONS = ['清溪镇', '银田镇', '韶山乡', '杨林乡'] as const;

export interface EmergencyTeamRow {
  id: string;
  name: string;
  /** 所属区划（韶山市乡镇/街道） */
  region: string;
  /** 主管部门 */
  competentDept: string;
  specialty: string;
  /** 专长描述（长文本，可与「专业技能」摘要配合使用） */
  expertiseDescription: string;
  equipment: string;
  /** 队伍负责人 */
  leaderName: string;
  contactPhone: string;
  /** 值班电话 */
  dutyPhone: string;
  /** 队伍地址（与经纬度、地图选点一致） */
  teamAddress: string;
  longitude: string;
  latitude: string;
  dutyDivision: string;
  members: TeamMemberRow[];
}

export interface ExpertRow {
  id: string;
  name: string;
  background: string;
  expertise: string;
  org: string;
  title: string;
  phone: string;
  /** 抽屉头像等可选展示 */
  avatarUrl?: string;
}

export interface RiskDataBundle {
  enterprises: RiskEnterpriseRow[];
  socialPoints: SocialSupplyPointRow[];
  supplies: EmergencySupplyRow[];
  plans: EmergencyPlanRow[];
  teams: EmergencyTeamRow[];
  experts: ExpertRow[];
}

const riskLevelColor: Record<string, string> = { 高: 'red', 中: 'orange', 低: 'blue', 一般: 'default' };

export const initialRiskData: RiskDataBundle = {
  socialPoints: [
    {
      id: 'ss-1',
      name: '清溪镇防汛物资互助点',
      region: '清溪镇',
      affiliatedUnit: '清溪镇人民政府',
      storageNature: '社会代储',
      address: '韶山市清溪镇××路18 号',
      materialTypesQty: '沙袋约 2000 个、抽水泵 6 台',
      contactPhone: '0732-55×××××',
      callProcess: '向乡镇应急办报备后2 小时内可启运',
      remark:
        '与周边村组签订互助协议，汛期前开展物资盘点与转运演练；大体积装备需提前协调装卸通道。非应急调用须乡镇应急办书面或电话确认后启用。',
      longitude: '112.529800',
      latitude: '27.914600',
    },
  ],
  enterprises: [
    {
      id: 're-1',
      enterpriseName: '韶山市清溪某表面涂装厂',
      address: '韶山市清溪镇工业集中区××路6 号',
      longitude: '112.526400',
      latitude: '27.911800',
      industryType: '金属表面处理及热处理',
      mainPollutants: '总镍、总铬、化学需氧量',
      dischargeScale: '生产废水约 35 吨/日，间歇排放',
      riskLevel: '较大',
      contactName: '何某',
      contactPhone: '0732-55××××1',
      region: '清溪镇',
      updatedAt: '2026-02-18',
    },
    {
      id: 're-2',
      enterpriseName: '银田某农副食品加工企业',
      address: '韶山市银田镇××村农副产品加工园',
      longitude: '112.501200',
      latitude: '27.888500',
      industryType: '屠宰及肉类加工',
      mainPollutants: '氨氮、动植物油、悬浮物',
      dischargeScale: '生产废水约 80 吨/日',
      riskLevel: '中',
      contactName: '赵某',
      contactPhone: '0732-55××××2',
      region: '银田镇',
      updatedAt: '2025-12-10',
    },
    {
      id: 're-3',
      enterpriseName: '韶山某危废经营单位（省厅核发）',
      address: '韶山市××乡循环经济产业园危废区',
      longitude: '112.538100',
      latitude: '27.920300',
      industryType: '危险废物治理',
      mainPollutants: '重金属浸出液、石油类、危险废物存贮',
      dischargeScale: '物化/蒸发冷凝水约 15 吨/日，经自有设施达标外排',
      riskLevel: '高',
      contactName: '孙某',
      contactPhone: '0731-52×××××',
      region: '韶山市',
      updatedAt: '2026-01-05',
    },
    {
      id: 're-4',
      enterpriseName: '杨林乡某加油（气）站',
      address: '韶山市杨林乡省道××线东侧',
      longitude: '112.512600',
      latitude: '27.901200',
      industryType: '机动车燃料零售',
      mainPollutants: '石油类（场地雨水）、挥发泄漏风险',
      dischargeScale: '场地初期雨水经隔油后纳管，峰值约 8 吨/次',
      riskLevel: '中',
      contactName: '周某',
      contactPhone: '0732-55××××3',
      region: '杨林乡',
      updatedAt: '2025-11-28',
    },
    {
      id: 're-5',
      enterpriseName: '韶山某电镀（配套）企业',
      address: '韶山市清溪镇××五金电镀小区',
      longitude: '112.528900',
      latitude: '27.915600',
      industryType: '电镀及配套加工',
      mainPollutants: '总铜、总锌、总氰（工艺段）、化学需氧量',
      dischargeScale: '分质处理后综合排放约 45 吨/日',
      riskLevel: '较大',
      contactName: '郑某',
      contactPhone: '0732-55××××5',
      region: '清溪镇',
      updatedAt: '2026-03-01',
    },
  ],
  supplies: [
    {
      id: 'es-1',
      name: '吸油毡',
      materialType: '吸附类',
      specModel: '1m×2m',
      quantityUnit: '张',
      quantity: 120,
      socialPointId: 'ss-1',
      affiliatedUnit: '清溪镇应急物资管理办公室',
      brand: '安捷滤材',
      unitPrice: 12.5,
      managementMode: '定点集中管理',
      storageNature: '社会代储',
      productionDate: '2024-08-15',
      shelfLife: '36 个月',
      manufacturer: '江苏××环保科技有限公司',
      manager: '张某',
      replenishCycle: '每季度盘点补充',
      usageNote: '围控后铺设于油膜集中区域',
    },
    {
      id: 'es-2',
      name: '围油栏',
      materialType: '围控类',
      specModel: 'PVC 浮体',
      quantityUnit: '米',
      quantity: 50,
      socialPointId: 'ss-1',
      affiliatedUnit: '清溪镇应急物资管理办公室',
      brand: '海环应急',
      unitPrice: 86,
      managementMode: '协议储备',
      storageNature: '社会代储',
      productionDate: '2023-12-01',
      shelfLife: '60 个月',
      manufacturer: '青岛××围油设备厂',
      manager: '张某',
      replenishCycle: '每季度盘点补充',
      usageNote: '布设于水面围控油污',
    },
  ],
  plans: [
    {
      id: 'ep-1',
      name: '湘潭市突发水环境污染事件应急预案',
      planType: '总体应急预案',
      publishTime: '2024-11-01',
      compileOrg: '湘潭市人民政府',
      orgSystem: '市指挥部—专项组—现场组三级体系',
      responseFlow: '接报核实→响应启动→现场处置→终止与调查',
      measures: '监测加密、溯源管控、饮用水保障',
      dutyDivision: '生态环境牵头，水利、卫健、海事协同',
      attachmentName: '湘潭市水环境应急预案（发布稿）.pdf',
      pdfUrl: DEMO_PLAN_PDF,
    },
  ],
  teams: [
    {
      id: 'et-1',
      name: '市生态环境应急救援一队',
      region: '清溪镇',
      competentDept: '韶山市生态环境分局',
      specialty: '水质应急监测、围控与吸附',
      expertiseDescription:
        '队伍长期承担市域内河湖水环境突发事件现场勘查、水质加密监测与围油栏布设等任务，具备多参数水质仪快速筛查、油污类污染物吸附与危废临时贮存协同能力。常态化与属地乡镇、水利部门开展联合拉练，熟悉辖区重点水源地与工业园区排水路径。',
      equipment: '便携式多参数仪4 台、应急车辆 2 辆',
      leaderName: '周某',
      contactPhone: '0731-12369',
      dutyPhone: '0732-55××××（24 小时）',
      teamAddress: '韶山市清溪镇××路应急物资装备库北侧集结点',
      longitude: '112.530200',
      latitude: '27.915100',
      dutyDivision: '现场监测与污染跟踪',
      members: [
        { id: 'tm-1', name: '周某', role: '现场指挥', phone: '138****1001', skill: '应急调度' },
        { id: 'tm-2', name: '吴某', role: '监测组长', phone: '138****1002', skill: '水质快检' },
      ],
    },
  ],
  experts: [
    {
      id: 'ex-1',
      name: '陈某',
      background: '环境工程硕士，从事水环境应急 15 年',
      expertise: '水环境应急监测、油污应急处置',
      org: '省环科院水环境所',
      title: '高级工程师',
      phone: '138****0001',
    },
  ],
};

// ========== 1风险源企业 ==========
export const RiskEnterprisePage: React.FC<{
  rows: RiskEnterpriseRow[];
  onChange: React.Dispatch<React.SetStateAction<RiskEnterpriseRow[]>>;
}> = ({ rows, onChange }) => {
  const [filterForm] = Form.useForm();
  const [editForm] = Form.useForm();
  const [query, setQuery] = useState<Record<string, unknown>>({});
  const [detail, setDetail] = useState<RiskEnterpriseRow | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<RiskEnterpriseRow | null>(null);

  const filtered = useMemo(() => {
    const enterpriseName = String(query.enterpriseName ?? '').trim();
    const address = String(query.address ?? '').trim();
    const industryType = String(query.industryType ?? '').trim();
    const mainPollutants = String(query.mainPollutants ?? '').trim();
    const contactName = String(query.contactName ?? '').trim();
    const region = query.region as string | undefined;
    const riskLevel = query.riskLevel as string | undefined;
    return rows.filter(r => {
      if (region && r.region !== region) return false;
      if (riskLevel && r.riskLevel !== riskLevel) return false;
      if (enterpriseName && !r.enterpriseName.includes(enterpriseName)) return false;
      if (address && !r.address.includes(address)) return false;
      if (industryType && !r.industryType.includes(industryType)) return false;
      if (mainPollutants && !r.mainPollutants.includes(mainPollutants)) return false;
      if (contactName && !r.contactName.includes(contactName)) return false;
      return true;
    });
  }, [rows, query]);

  const allCols: EcoColumnConfig[] = useMemo(
    () => [
      { key: 'enterpriseName', title: '企业名称', dataIndex: 'enterpriseName', width: 200, fixed: 'left' },
      { key: 'region', title: '所属区划', dataIndex: 'region', width: 100 },
      { key: 'address', title: '地理位置', dataIndex: 'address', width: 200, ellipsis: true },
      { key: 'industryType', title: '行业类型', dataIndex: 'industryType', width: 130 },
      { key: 'mainPollutants', title: '主要污染物', dataIndex: 'mainPollutants', width: 160, ellipsis: true },
      { key: 'dischargeScale', title: '排放规模', dataIndex: 'dischargeScale', width: 120 },
      {
        key: 'riskLevel',
        title: '风险等级',
        dataIndex: 'riskLevel',
        width: 100,
        render: (v: unknown) => <Tag color={riskLevelColor[String(v)] ?? 'default'}>{String(v)}</Tag>,
      },
      { key: 'contactName', title: '应急联系人', dataIndex: 'contactName', width: 100 },
      { key: 'contactPhone', title: '联系方式', dataIndex: 'contactPhone', width: 130 },
      { key: 'updatedAt', title: '更新日期', dataIndex: 'updatedAt', width: 120 },
      { key: 'operation', title: '操作', width: 148, defaultVisible: true },
    ],
    [],
  );
  const [visibleCols, setVisibleCols] = useState(() => getEcoDefaultVisibleColumnKeys(allCols));
  const columns = useMemo(
    () =>
      buildTableColumnsFromEcoConfig(allCols, visibleCols, record => {
        const row = record as RiskEnterpriseRow;
        return (
          <Space size="small">
            <Button type="link" size="small" className="action-btn detail" icon={<EyeOutlined />} onClick={() => { setDetail(row); setDetailOpen(true); }}>
              详情
            </Button>
            <Button
              type="link"
              size="small"
              className="action-btn edit"
              icon={<EditOutlined />}
              onClick={() => {
                setEditing(row);
                editForm.setFieldsValue(row);
                setEditOpen(true);
              }}
            >
              编辑
            </Button>
          </Space>
        );
      }),
    [allCols, visibleCols, editForm],
  );

  const save = async () => {
    const v = await editForm.validateFields();
    const payload: RiskEnterpriseRow = {
      id: editing?.id ?? `re-${Date.now()}`,
      ...v,
      updatedAt: dayjs().format('YYYY-MM-DD'),
    };
    if (editing) onChange(prev => prev.map(r => (r.id === editing.id ? payload : r)));
    else onChange(prev => [...prev, payload]);
    message.success(editing ? '已保存' : '已新增');
    setEditOpen(false);
    setEditing(null);
    editForm.resetFields();
  };

  const closeEdit = () => {
    setEditOpen(false);
    setEditing(null);
    editForm.resetFields();
  };

  /** 编辑弹窗删除整行，与应急事件等编辑弹窗一致 */
  const del = () => {
    if (!editing) return;
    onChange(prev => prev.filter(r => r.id !== editing.id));
    message.success('已删除');
    closeEdit();
  };

  return (
    <div className="facility-view">
      <Card
        title="风险源企业信息"
        extra={
          <Space wrap>
            <EcoProtoExportBtn onClick={() => exportRiskTableExcel(filtered as unknown as Record<string, unknown>[], allCols, '应急协同_风险源企业信息', '风险源企业')} />
            <EcoProtoImportBtn />
            <RiskEcoColumnManager columns={allCols} visibleColumns={visibleCols} onChange={setVisibleCols} />
            <Button type="primary" icon={<PlusOutlined />} className="add-btn" onClick={() => { setEditing(null); editForm.resetFields(); setEditOpen(true); }}>
              新增
            </Button>
          </Space>
        }
      >
        <Form form={filterForm} style={{ marginBottom: 12 }}>
          <Row gutter={[12, 12]} align="middle">
            <Col xs={24} sm={12} md={8} lg={4}>
              <Form.Item name="region" style={{ marginBottom: 0 }}>
                <Select allowClear placeholder="所属区划" options={['湘潭市', '韶山市', '湘潭县', '湘乡市', '雨湖区', '岳塘市'].map(x => ({ label: x, value: x }))} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={8} lg={4}>
              <Form.Item name="riskLevel" style={{ marginBottom: 0 }}>
                <Select allowClear placeholder="风险等级" options={['高', '较大', '中', '低', '一般'].map(x => ({ label: x, value: x }))} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={8} lg={4}>
              <Form.Item name="enterpriseName" style={{ marginBottom: 0 }}>
                <Input allowClear placeholder="企业名称" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={8} lg={4}>
              <Form.Item name="address" style={{ marginBottom: 0 }}>
                <Input allowClear placeholder="地理位置" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={8} lg={4}>
              <Form.Item name="industryType" style={{ marginBottom: 0 }}>
                <Input allowClear placeholder="行业类型" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={8} lg={4}>
              <Form.Item name="mainPollutants" style={{ marginBottom: 0 }}>
                <Input allowClear placeholder="主要污染物" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={8} lg={4}>
              <Form.Item name="contactName" style={{ marginBottom: 0 }}>
                <Input allowClear placeholder="应急联系人" />
              </Form.Item>
            </Col>
            <Col xs={24} style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <Space>
                <Button
                  type="primary"
                  className="search-btn"
                  icon={<SearchOutlined />}
                  onClick={() => {
                    setQuery(filterForm.getFieldsValue());
                    message.success('已查询');
                  }}
                >
                  查询
                </Button>
                <Button className="secondary-btn" onClick={() => { filterForm.resetFields(); setQuery({}); message.info('已重置'); }}>重置</Button>
              </Space>
            </Col>
          </Row>
        </Form>
        <div className="facility-table-wrap">
          <Table
            rowKey="id"
            size="small"
            scroll={{ x: getEcoTableScrollX(allCols.filter(c => visibleCols.includes(c.key) || c.key === 'operation')) }}
            pagination={{ defaultPageSize: 10, showTotal: t => `共 ${t} 条` }}
            columns={columns}
            dataSource={filtered}
          />
        </div>
      </Card>
      <Modal title="企业详情" open={detailOpen} onCancel={() => { setDetailOpen(false); setDetail(null); }} footer={null} width={880} destroyOnClose styles={detailModalStyles}>
        {detail && (
          <Descriptions bordered column={2} size="small" style={{ marginTop: 8 }}>
            <Descriptions.Item label="企业名称" span={2}><Text strong>{detail.enterpriseName}</Text></Descriptions.Item>
            <Descriptions.Item label="所属区划">{detail.region}</Descriptions.Item>
            <Descriptions.Item label="更新日期">{detail.updatedAt}</Descriptions.Item>
            <Descriptions.Item label="地理位置" span={2}>{detail.address}</Descriptions.Item>
            {detail.longitude && detail.latitude ? (
              <>
                <Descriptions.Item label="经度（度）">{detail.longitude}</Descriptions.Item>
                <Descriptions.Item label="纬度（度）">{detail.latitude}</Descriptions.Item>
              </>
            ) : (
              <>
                <Descriptions.Item label="经度（度）">—</Descriptions.Item>
                <Descriptions.Item label="纬度（度）">—</Descriptions.Item>
              </>
            )}
            <Descriptions.Item label="企业位置地图" span={2}>
              <AddrWgs84DetailMap
                title={detail.enterpriseName}
                location={detail.address}
                lng={detail.longitude}
                lat={detail.latitude}
                mapAriaLabel="风险源企业位置地图"
              />
            </Descriptions.Item>
            <Descriptions.Item label="行业类型">{detail.industryType}</Descriptions.Item>
            <Descriptions.Item label="风险等级"><Tag color={riskLevelColor[detail.riskLevel]}>{detail.riskLevel}</Tag></Descriptions.Item>
            <Descriptions.Item label="主要污染物" span={2}>{detail.mainPollutants}</Descriptions.Item>
            <Descriptions.Item label="排放规模" span={2}>{detail.dischargeScale}</Descriptions.Item>
            <Descriptions.Item label="应急联系人">{detail.contactName}</Descriptions.Item>
            <Descriptions.Item label="联系方式">{detail.contactPhone}</Descriptions.Item>
          </Descriptions>
        )}
      </Modal>
      <Modal
        title={editing ? '编辑企业' : '新增企业'}
        open={editOpen}
        onCancel={closeEdit}
        width={920}
        destroyOnClose
        styles={formModalStyles}
        footer={
          <Space>
            {editing ? (
              <Popconfirm title="确认删除？" onConfirm={del}>
                <Button danger>删除</Button>
              </Popconfirm>
            ) : null}
            <Button className="secondary-btn" onClick={closeEdit}>取消</Button>
            <Button type="primary" onClick={() => void save()}>保存</Button>
          </Space>
        }
      >
        <Form form={editForm} layout="vertical" preserve={false} className="risk-ident-edit-form">
          <Row gutter={RISK_EDIT_FORM_ROW_GUTTER}>
            <Col xs={24} sm={12}>
              <Form.Item name="enterpriseName" label="企业名称" rules={[{ required: true }]}>
                <Input />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name="region" label="所属区划" rules={[{ required: true }]}>
                <Input />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name="riskLevel" label="风险等级" rules={[{ required: true }]}>
                <Select style={{ width: '100%' }} options={['高', '较大', '中', '低', '一般'].map(x => ({ value: x, label: x }))} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name="industryType" label="行业类型" rules={[{ required: true }]}>
                <Input />
              </Form.Item>
            </Col>
            <Col xs={24} sm={24}>
              <Form.Item
                name="address"
                label="地理位置"
                rules={[{ required: true, message: '请输入地理位置' }]}
                extra={ADDR_MAP_FORM_ITEM_EXTRA}
              >
                <Input placeholder={ADDR_MAP_INPUT_PLACEHOLDER} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={24}>
              <Form.Item label="企业位置地图" colon={false}>
                <AddrWgs84MapPicker
                  form={editForm}
                  addrField="address"
                  lngField="longitude"
                  latField="latitude"
                  mapAriaLabel="风险源企业位置地图"
                  hintAddressLabel="地理位置"
                  lngLatValueMode="string"
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name="longitude" label="经度（度）" tooltip="可与地图选点同步">
                <Input placeholder="选填，地图选点后自动回填" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name="latitude" label="纬度（度）" tooltip="可与地图选点同步">
                <Input placeholder="选填，地图选点后自动回填" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={24}>
              <Form.Item name="mainPollutants" label="主要污染物" rules={[{ required: true }]}>
                <TextArea rows={2} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name="dischargeScale" label="排放规模" rules={[{ required: true }]}>
                <Input />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name="contactName" label="应急联系人" rules={[{ required: true }]}>
                <Input />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name="contactPhone" label="联系方式" rules={[{ required: true }]}>
                <Input />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>
    </div>
  );
};

// ========== 2 应急物资（依赖社会物资点选项）==========
export const EmergencySupplyPage: React.FC<{
  rows: EmergencySupplyRow[];
  socialPoints: SocialSupplyPointRow[];
  onChange: React.Dispatch<React.SetStateAction<EmergencySupplyRow[]>>;
}> = ({ rows, socialPoints, onChange }) => {
  const [filterForm] = Form.useForm();
  const [editForm] = Form.useForm();
  const [query, setQuery] = useState<Record<string, unknown>>({});
  const [detail, setDetail] = useState<EmergencySupplyRow | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<EmergencySupplyRow | null>(null);

  const pointOptions = useMemo(() => socialPoints.map(s => ({ value: s.id, label: s.name })), [socialPoints]);

  const filtered = useMemo(() => {
    const name = String(query.name ?? '').trim();
    const specModel = String(query.specModel ?? '').trim();
    const brand = String(query.brand ?? '').trim();
    const affiliatedUnit = String(query.affiliatedUnit ?? '').trim();
    const manufacturer = String(query.manufacturer ?? '').trim();
    const manager = String(query.manager ?? '').trim();
    const type = query.materialType as string | undefined;
    return rows.filter(r => {
      if (type && r.materialType !== type) return false;
      if (name && !r.name.includes(name)) return false;
      if (specModel && !r.specModel.includes(specModel)) return false;
      if (brand && !String(r.brand ?? '').includes(brand)) return false;
      if (affiliatedUnit && !String(r.affiliatedUnit ?? '').includes(affiliatedUnit)) return false;
      if (manufacturer && !String(r.manufacturer ?? '').includes(manufacturer)) return false;
      if (manager && !String(r.manager ?? '').includes(manager)) return false;
      return true;
    });
  }, [rows, query]);

  const allCols: EcoColumnConfig[] = useMemo(
    () => [
      { key: 'name', title: '物资名称', dataIndex: 'name', width: 130, ellipsis: true },
      { key: 'materialType', title: '类型', dataIndex: 'materialType', width: 90 },
      { key: 'specModel', title: '规格型号', dataIndex: 'specModel', width: 110, ellipsis: true },
      {
        key: 'quantity',
        title: '储备数量',
        dataIndex: 'quantity',
        width: 110,
        render: (_: unknown, record: unknown) => {
          const r = record as EmergencySupplyRow;
          const u = r.quantityUnit?.trim() || '—';
          return `${r.quantity} ${u}`;
        },
      },
      { key: 'affiliatedUnit', title: '所属单位', dataIndex: 'affiliatedUnit', width: 150, ellipsis: true },
      { key: 'brand', title: '品牌', dataIndex: 'brand', width: 100, ellipsis: true },
      {
        key: 'unitPrice',
        title: '单价（元）',
        dataIndex: 'unitPrice',
        width: 96,
        render: (p: unknown) => (p != null && p !== '' ? `¥${Number(p).toFixed(2)}` : '—'),
      },
      { key: 'managementMode', title: '管理方式', dataIndex: 'managementMode', width: 120, ellipsis: true },
      { key: 'storageNature', title: '存储性质', dataIndex: 'storageNature', width: 100 },
      { key: 'productionDate', title: '生产日期', dataIndex: 'productionDate', width: 110 },
      { key: 'shelfLife', title: '保质期', dataIndex: 'shelfLife', width: 100, ellipsis: true },
      { key: 'manufacturer', title: '生产厂家', dataIndex: 'manufacturer', width: 150, ellipsis: true },
      {
        key: 'socialPointId',
        title: '关联社会物资点',
        dataIndex: 'socialPointId',
        width: 160,
        ellipsis: true,
        render: (id: unknown) => socialPoints.find(s => s.id === id)?.name ?? String(id),
      },
      { key: 'manager', title: '管理责任人', dataIndex: 'manager', width: 100 },
      { key: 'replenishCycle', title: '补充周期', dataIndex: 'replenishCycle', width: 120, defaultVisible: false },
      { key: 'operation', title: '操作', width: 148, defaultVisible: true },
    ],
    [socialPoints],
  );
  const [visibleCols, setVisibleCols] = useState(() => getEcoDefaultVisibleColumnKeys(allCols));
  const columns = useMemo(
    () =>
      buildTableColumnsFromEcoConfig(allCols, visibleCols, record => {
        const row = record as EmergencySupplyRow;
        return (
          <Space size="small">
            <Button type="link" size="small" className="action-btn detail" icon={<EyeOutlined />} onClick={() => { setDetail(row); setDetailOpen(true); }}>详情</Button>
            <Button
              type="link"
              size="small"
              className="action-btn edit"
              icon={<EditOutlined />}
              onClick={() => {
                setEditing(row);
                editForm.setFieldsValue({
                  ...row,
                  productionDate: row.productionDate ? dayjs(row.productionDate) : undefined,
                });
                setEditOpen(true);
              }}
            >
              编辑
            </Button>
          </Space>
        );
      }),
    [allCols, visibleCols, editForm],
  );

  const save = async () => {
    const v = await editForm.validateFields();
    const unit =
      typeof v.quantityUnit === 'string' ? v.quantityUnit.trim() : String(v.quantityUnit ?? '');
    const rawPd = v.productionDate;
    const d = rawPd != null ? dayjs(rawPd) : null;
    const productionDateStr = d && d.isValid() ? d.format('YYYY-MM-DD') : '';
    const payload: EmergencySupplyRow = {
      id: editing?.id ?? `es-${Date.now()}`,
      name: v.name,
      materialType: v.materialType,
      specModel: v.specModel,
      quantityUnit: unit || '件',
      quantity: Number(v.quantity) || 0,
      socialPointId: v.socialPointId,
      affiliatedUnit: String(v.affiliatedUnit ?? '').trim(),
      brand: String(v.brand ?? '').trim(),
      unitPrice: v.unitPrice != null && v.unitPrice !== '' ? Number(v.unitPrice) : 0,
      managementMode: String(v.managementMode ?? '').trim(),
      storageNature: String(v.storageNature ?? '').trim(),
      productionDate: productionDateStr,
      shelfLife: String(v.shelfLife ?? '').trim(),
      manufacturer: String(v.manufacturer ?? '').trim(),
      manager: v.manager,
      replenishCycle: v.replenishCycle,
      usageNote: v.usageNote,
    };
    if (editing) onChange(prev => prev.map(r => (r.id === editing.id ? payload : r)));
    else onChange(prev => [...prev, payload]);
    message.success(editing ? '已保存' : '已新增');
    setEditOpen(false);
    setEditing(null);
    editForm.resetFields();
  };

  const closeEdit = () => {
    setEditOpen(false);
    setEditing(null);
    editForm.resetFields();
  };

  const del = () => {
    if (!editing) return;
    onChange(prev => prev.filter(r => r.id !== editing.id));
    message.success('已删除');
    closeEdit();
  };

  return (
    <div className="facility-view">
      <Card
        title="应急物资"
        extra={
          <Space wrap>
            <EcoProtoExportBtn onClick={() => exportRiskTableExcel(filtered as unknown as Record<string, unknown>[], allCols, '应急协同_应急物资', '应急物资')} />
            <EcoProtoImportBtn />
            <RiskEcoColumnManager columns={allCols} visibleColumns={visibleCols} onChange={setVisibleCols} />
            <Button
              type="primary"
              icon={<PlusOutlined />}
              className="add-btn"
              onClick={() => {
                setEditing(null);
                editForm.resetFields();
                editForm.setFieldsValue({
                  quantityUnit: '件',
                  unitPrice: 0,
                  managementMode: '定点集中管理',
                  storageNature: '社会代储',
                });
                setEditOpen(true);
              }}
            >
              新增
            </Button>
          </Space>
        }
      >
        <Form form={filterForm} style={{ marginBottom: 12 }}>
          <Row gutter={[12, 12]} align="middle">
            <Col xs={24} sm={12} md={8} lg={4}>
              <Form.Item name="materialType" style={{ marginBottom: 0 }}>
                <Select allowClear placeholder="物资类型" options={['吸附类', '围控类', '监测类', '通用'].map(x => ({ label: x, value: x }))} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={8} lg={4}>
              <Form.Item name="name" style={{ marginBottom: 0 }}>
                <Input allowClear placeholder="物资名称" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={8} lg={4}>
              <Form.Item name="specModel" style={{ marginBottom: 0 }}>
                <Input allowClear placeholder="规格型号" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={8} lg={4}>
              <Form.Item name="brand" style={{ marginBottom: 0 }}>
                <Input allowClear placeholder="品牌" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={8} lg={4}>
              <Form.Item name="affiliatedUnit" style={{ marginBottom: 0 }}>
                <Input allowClear placeholder="所属单位" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={8} lg={4}>
              <Form.Item name="manufacturer" style={{ marginBottom: 0 }}>
                <Input allowClear placeholder="生产厂家" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={8} lg={4}>
              <Form.Item name="manager" style={{ marginBottom: 0 }}>
                <Input allowClear placeholder="管理责任人" />
              </Form.Item>
            </Col>
            <Col xs={24} style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <Space>
                <Button type="primary" className="search-btn" icon={<SearchOutlined />} onClick={() => { setQuery(filterForm.getFieldsValue()); message.success('已查询'); }}>查询</Button>
                <Button className="secondary-btn" onClick={() => { filterForm.resetFields(); setQuery({}); }}>重置</Button>
              </Space>
            </Col>
          </Row>
        </Form>
        <div className="facility-table-wrap">
          <Table
            rowKey="id"
            size="small"
            scroll={{ x: getEcoTableScrollX(allCols.filter(c => visibleCols.includes(c.key) || c.key === 'operation')) }}
            pagination={{ defaultPageSize: 10, showTotal: t => `共 ${t} 条` }}
            columns={columns}
            dataSource={filtered}
          />
        </div>
      </Card>
      <Modal title="物资详情" open={detailOpen} onCancel={() => { setDetailOpen(false); setDetail(null); }} footer={null} width={920} destroyOnClose styles={detailModalStyles}>
        {detail && (
          <Descriptions bordered column={2} size="small" style={{ marginTop: 8 }}>
            <Descriptions.Item label="物资名称" span={2}><Text strong>{detail.name}</Text></Descriptions.Item>
            <Descriptions.Item label="类型">{detail.materialType}</Descriptions.Item>
            <Descriptions.Item label="储备数量">
              {detail.quantity} {detail.quantityUnit?.trim() || '—'}
            </Descriptions.Item>
            <Descriptions.Item label="规格型号" span={2}>{detail.specModel}</Descriptions.Item>
            <Descriptions.Item label="关联社会物资点" span={2}>{socialPoints.find(s => s.id === detail.socialPointId)?.name ?? '—'}</Descriptions.Item>
            <Descriptions.Item label="所属单位" span={2}>{detail.affiliatedUnit?.trim() || '—'}</Descriptions.Item>
            <Descriptions.Item label="品牌">{detail.brand?.trim() || '—'}</Descriptions.Item>
            <Descriptions.Item label="单价（元）">{Number.isFinite(detail.unitPrice) ? `¥${detail.unitPrice.toFixed(2)}` : '—'}</Descriptions.Item>
            <Descriptions.Item label="管理方式">{detail.managementMode?.trim() || '—'}</Descriptions.Item>
            <Descriptions.Item label="存储性质">{detail.storageNature?.trim() || '—'}</Descriptions.Item>
            <Descriptions.Item label="生产日期">{detail.productionDate?.trim() || '—'}</Descriptions.Item>
            <Descriptions.Item label="保质期">{detail.shelfLife?.trim() || '—'}</Descriptions.Item>
            <Descriptions.Item label="生产厂家" span={2}>{detail.manufacturer?.trim() || '—'}</Descriptions.Item>
            <Descriptions.Item label="管理责任人">{detail.manager}</Descriptions.Item>
            <Descriptions.Item label="补充周期">{detail.replenishCycle}</Descriptions.Item>
            <Descriptions.Item label="使用说明" span={2}>{detail.usageNote}</Descriptions.Item>
          </Descriptions>
        )}
      </Modal>
      <Modal
        title={editing ? '编辑物资' : '新增物资'}
        open={editOpen}
        onCancel={closeEdit}
        width={920}
        destroyOnClose
        styles={formModalStyles}
        footer={
          <Space>
            {editing ? (
              <Popconfirm title="确认删除？" onConfirm={del}>
                <Button danger>删除</Button>
              </Popconfirm>
            ) : null}
            <Button className="secondary-btn" onClick={closeEdit}>取消</Button>
            <Button type="primary" onClick={() => void save()}>保存</Button>
          </Space>
        }
      >
        <Form form={editForm} layout="vertical" preserve={false} className="risk-ident-edit-form">
          <Row gutter={RISK_EDIT_FORM_ROW_GUTTER}>
            <Col xs={24} sm={12}>
              <Form.Item name="name" label="物资名称" rules={[{ required: true }]}>
                <Input />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name="materialType" label="物资类型" rules={[{ required: true }]}>
                <Input />
              </Form.Item>
            </Col>
            <Col xs={24} sm={24}>
              <Form.Item name="specModel" label="规格型号" rules={[{ required: true }]}>
                <Input />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name="quantityUnit" label="单位" rules={[{ required: true, message: '请选择单位' }]}>
                <Select
                  style={{ width: '100%' }}
                  placeholder="计量单位"
                  options={[...EMERGENCY_SUPPLY_QUANTITY_UNIT_OPTIONS].map(x => ({ value: x, label: x }))}
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name="quantity" label="储备数量" rules={[{ required: true }]}>
                <InputNumber min={0} style={{ width: '100%' }} placeholder="数量" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={24}>
              <Form.Item name="socialPointId" label="所属社会物资点" rules={[{ required: true, message: '请选择社会物资点' }]}>
                <Select style={{ width: '100%' }} options={pointOptions} placeholder="下拉单选" showSearch optionFilterProp="label" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name="affiliatedUnit" label="所属单位" rules={[{ required: true, message: '请输入所属单位' }]}>
                <Input placeholder="主管或代储单位" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name="brand" label="品牌" rules={[{ required: true, message: '请输入品牌' }]}>
                <Input />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name="unitPrice" label="单价（元）" rules={[{ required: true, message: '请输入单价' }]}>
                <InputNumber min={0} precision={2} style={{ width: '100%' }} placeholder="0.00" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name="managementMode" label="管理方式" rules={[{ required: true, message: '请选择管理方式' }]}>
                <Select
                  style={{ width: '100%' }}
                  showSearch
                  optionFilterProp="label"
                  placeholder="请选择"
                  options={[...EMERGENCY_SUPPLY_MANAGEMENT_MODE_OPTIONS].map(x => ({ value: x, label: x }))}
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name="storageNature" label="存储性质" rules={[{ required: true, message: '请选择存储性质' }]}>
                <Select
                  style={{ width: '100%' }}
                  showSearch
                  optionFilterProp="label"
                  placeholder="请选择"
                  options={[...SOCIAL_POINT_STORAGE_NATURE_OPTIONS].map(x => ({ value: x, label: x }))}
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name="productionDate" label="生产日期">
                <DatePicker style={{ width: '100%' }} format="YYYY-MM-DD" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name="shelfLife" label="保质期" rules={[{ required: true, message: '请输入保质期' }]}>
                <Input placeholder="如 24 个月、见包装" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={24}>
              <Form.Item name="manufacturer" label="生产厂家" rules={[{ required: true, message: '请输入生产厂家' }]}>
                <Input />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name="manager" label="管理责任人" rules={[{ required: true }]}>
                <Input />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name="replenishCycle" label="补充周期" rules={[{ required: true }]}>
                <Input />
              </Form.Item>
            </Col>
            <Col xs={24} sm={24}>
              <Form.Item name="usageNote" label="使用说明" rules={[{ required: true }]}>
                <TextArea rows={3} />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>
    </div>
  );
};

/**
 * 与「应急物资」主表列一致（只读、无操作列），供社会物资点详情内「关联应急物资」等复用
 */
export function getEmergencySupplyReadonlyTableColumns(
  resolveSocialPointName: (socialPointId: string) => string,
): ColumnsType<EmergencySupplyRow> {
  return [
    { title: '物资名称', dataIndex: 'name', key: 'name', width: 130, ellipsis: true },
    { title: '类型', dataIndex: 'materialType', key: 'materialType', width: 90 },
    { title: '规格型号', dataIndex: 'specModel', key: 'specModel', width: 110, ellipsis: true },
    {
      title: '储备数量',
      key: 'quantity',
      width: 110,
      render: (_: unknown, r) => {
        const row = r as EmergencySupplyRow;
        const u = row.quantityUnit?.trim() || '—';
        return `${row.quantity} ${u}`;
      },
    },
    { title: '所属单位', dataIndex: 'affiliatedUnit', key: 'affiliatedUnit', width: 150, ellipsis: true },
    { title: '品牌', dataIndex: 'brand', key: 'brand', width: 100, ellipsis: true },
    {
      title: '单价（元）',
      dataIndex: 'unitPrice',
      key: 'unitPrice',
      width: 96,
      render: (p: unknown) => (p != null && p !== '' ? `¥${Number(p).toFixed(2)}` : '—'),
    },
    { title: '管理方式', dataIndex: 'managementMode', key: 'managementMode', width: 120, ellipsis: true },
    { title: '存储性质', dataIndex: 'storageNature', key: 'storageNature', width: 100 },
    { title: '生产日期', dataIndex: 'productionDate', key: 'productionDate', width: 110 },
    { title: '保质期', dataIndex: 'shelfLife', key: 'shelfLife', width: 100, ellipsis: true },
    { title: '生产厂家', dataIndex: 'manufacturer', key: 'manufacturer', width: 150, ellipsis: true },
    {
      title: '关联社会物资点',
      key: 'socialPointId',
      width: 160,
      ellipsis: true,
      render: (_: unknown, r) => resolveSocialPointName((r as EmergencySupplyRow).socialPointId),
    },
    { title: '管理责任人', dataIndex: 'manager', key: 'manager', width: 100 },
    { title: '补充周期', dataIndex: 'replenishCycle', key: 'replenishCycle', width: 120, ellipsis: true },
  ];
}

// ========== 3 社会物资点 ==========
export const SocialSupplyPointPage: React.FC<{
  rows: SocialSupplyPointRow[];
  supplies: EmergencySupplyRow[];
  onChange: React.Dispatch<React.SetStateAction<SocialSupplyPointRow[]>>;
}> = ({ rows, supplies, onChange }) => {
  const [filterForm] = Form.useForm();
  const [editForm] = Form.useForm();
  const [query, setQuery] = useState<Record<string, unknown>>({});
  const [detail, setDetail] = useState<SocialSupplyPointRow | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<SocialSupplyPointRow | null>(null);

  const filtered = useMemo(() => {
    const name = String(query.name ?? '').trim();
    const affiliatedUnit = String(query.affiliatedUnit ?? '').trim();
    const address = String(query.address ?? '').trim();
    const contactPhone = String(query.contactPhone ?? '').trim();
    const remark = String(query.remark ?? '').trim();
    const region = query.region as string | undefined;
    return rows.filter(r => {
      if (region && r.region !== region) return false;
      if (name && !r.name.includes(name)) return false;
      if (affiliatedUnit && !String(r.affiliatedUnit ?? '').includes(affiliatedUnit)) return false;
      if (address && !r.address.includes(address)) return false;
      if (contactPhone && !r.contactPhone.includes(contactPhone)) return false;
      if (remark && !String(r.remark ?? '').includes(remark)) return false;
      return true;
    });
  }, [rows, query]);

  const linkedForDetail = useMemo(
    () => (detail ? supplies.filter(s => s.socialPointId === detail.id) : []),
    [detail, supplies],
  );

  /** 与「应急物资」主表列一致，用于详情内关联表 */
  const linkedEmergencySupplyColumns = useMemo(
    () => getEmergencySupplyReadonlyTableColumns(id => rows.find(s => s.id === id)?.name ?? id),
    [rows],
  );
  const linkedSupplyScrollX = useMemo(
    () =>
      getEcoTableScrollX(
        linkedEmergencySupplyColumns.map(c => ({ width: typeof c.width === 'number' ? c.width : 120 })),
      ),
    [linkedEmergencySupplyColumns],
  );

  const allCols: EcoColumnConfig[] = useMemo(
    () => [
      { key: 'name', title: '物资点名称', dataIndex: 'name', width: 200, ellipsis: true },
      { key: 'region', title: '所属区划', dataIndex: 'region', width: 100 },
      { key: 'affiliatedUnit', title: '所属单位', dataIndex: 'affiliatedUnit', width: 160, ellipsis: true },
      { key: 'storageNature', title: '存储性质', dataIndex: 'storageNature', width: 100 },
      { key: 'address', title: '位置', dataIndex: 'address', width: 220, ellipsis: true },
      { key: 'materialTypesQty', title: '可提供物资类型及数量', dataIndex: 'materialTypesQty', ellipsis: true },
      {
        key: 'remark',
        title: '备注',
        dataIndex: 'remark',
        width: 200,
        ellipsis: true,
        defaultVisible: true,
      },
      { key: 'contactPhone', title: '联络方式', dataIndex: 'contactPhone', width: 130 },
      {
        key: 'linkedCount',
        title: '关联应急物资数',
        width: 130,
        render: (_: unknown, record: unknown) => supplies.filter(s => s.socialPointId === (record as SocialSupplyPointRow).id).length,
      },
      { key: 'operation', title: '操作', width: 148, defaultVisible: true },
    ],
    [supplies],
  );
  const [visibleCols, setVisibleCols] = useState(() => getEcoDefaultVisibleColumnKeys(allCols));
  const columns = useMemo(
    () =>
      buildTableColumnsFromEcoConfig(allCols, visibleCols, record => {
        const row = record as SocialSupplyPointRow;
        return (
          <Space size="small">
            <Button type="link" size="small" className="action-btn detail" icon={<EyeOutlined />} onClick={() => { setDetail(row); setDetailOpen(true); }}>详情</Button>
            <Button type="link" size="small" className="action-btn edit" icon={<EditOutlined />} onClick={() => { setEditing(row); editForm.setFieldsValue(row); setEditOpen(true); }}>编辑</Button>
          </Space>
        );
      }),
    [allCols, visibleCols, editForm],
  );

  const save = async () => {
    const v = await editForm.validateFields();
    const payload: SocialSupplyPointRow = {
      id: editing?.id ?? `ss-${Date.now()}`,
      ...v,
      region: typeof v.region === 'string' ? v.region : String(v.region ?? ''),
      affiliatedUnit: typeof v.affiliatedUnit === 'string' ? v.affiliatedUnit.trim() : String(v.affiliatedUnit ?? ''),
      storageNature: typeof v.storageNature === 'string' ? v.storageNature : String(v.storageNature ?? ''),
      remark: typeof v.remark === 'string' ? v.remark : String(v.remark ?? ''),
      longitude: v.longitude != null && v.longitude !== '' ? String(v.longitude).trim() : undefined,
      latitude: v.latitude != null && v.latitude !== '' ? String(v.latitude).trim() : undefined,
    };
    if (editing) onChange(prev => prev.map(r => (r.id === editing.id ? payload : r)));
    else onChange(prev => [...prev, payload]);
    message.success(editing ? '已保存' : '已新增');
    setEditOpen(false);
    setEditing(null);
    editForm.resetFields();
  };

  const closeEdit = () => {
    setEditOpen(false);
    setEditing(null);
    editForm.resetFields();
  };

  const del = () => {
    if (!editing) return;
    onChange(prev => prev.filter(r => r.id !== editing.id));
    message.success('已删除');
    closeEdit();
  };

  return (
    <div className="facility-view">
      <Card
        title="社会物资点"
        extra={
          <Space wrap>
            <EcoProtoExportBtn onClick={() => exportRiskTableExcel(filtered as unknown as Record<string, unknown>[], allCols, '应急协同_社会物资点', '社会物资点')} />
            <EcoProtoImportBtn />
            <RiskEcoColumnManager columns={allCols} visibleColumns={visibleCols} onChange={setVisibleCols} />
            <Button type="primary" icon={<PlusOutlined />} className="add-btn" onClick={() => { setEditing(null); editForm.resetFields(); setEditOpen(true); }}>新增</Button>
          </Space>
        }
      >
        <Form form={filterForm} style={{ marginBottom: 12 }}>
          <Row gutter={[12, 12]} align="middle">
            <Col xs={24} sm={12} md={8} lg={4}>
              <Form.Item name="region" style={{ marginBottom: 0 }}>
                <Select
                  allowClear
                  placeholder="所属区划"
                  optionFilterProp="label"
                  showSearch
                  style={{ width: '100%' }}
                  options={[...SHAOSHAN_SUB_REGION_OPTIONS].map(x => ({ value: x, label: x }))}
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={8} lg={4}>
              <Form.Item name="name" style={{ marginBottom: 0 }}>
                <Input allowClear placeholder="物资点名称" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={8} lg={4}>
              <Form.Item name="affiliatedUnit" style={{ marginBottom: 0 }}>
                <Input allowClear placeholder="所属单位" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={8} lg={4}>
              <Form.Item name="address" style={{ marginBottom: 0 }}>
                <Input allowClear placeholder="位置" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={8} lg={4}>
              <Form.Item name="contactPhone" style={{ marginBottom: 0 }}>
                <Input allowClear placeholder="联络方式" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={8} lg={4}>
              <Form.Item name="remark" style={{ marginBottom: 0 }}>
                <Input allowClear placeholder="备注" />
              </Form.Item>
            </Col>
            <Col xs={24} style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <Space>
                <Button type="primary" className="search-btn" icon={<SearchOutlined />} onClick={() => { setQuery(filterForm.getFieldsValue()); message.success('已查询'); }}>查询</Button>
                <Button className="secondary-btn" onClick={() => { filterForm.resetFields(); setQuery({}); }}>重置</Button>
              </Space>
            </Col>
          </Row>
        </Form>
        <div className="facility-table-wrap">
          <Table
            rowKey="id"
            size="small"
            scroll={{ x: getEcoTableScrollX(allCols.filter(c => visibleCols.includes(c.key) || c.key === 'operation')) }}
            pagination={{ defaultPageSize: 10, showTotal: t => `共 ${t} 条` }}
            columns={columns}
            dataSource={filtered}
          />
        </div>
      </Card>
      <Modal title="物资点详情" open={detailOpen} onCancel={() => { setDetailOpen(false); setDetail(null); }} footer={null} width={1100} destroyOnClose styles={detailModalStyles}>
        {detail && (
          <Tabs
            size="small"
            className="facility-detail-tabs facility-event-edit-tabs"
            items={[
              {
                key: 'base',
                label: '基础信息',
                children: (
                  <Descriptions bordered column={2} size="small" style={{ marginTop: 8 }}>
                    <Descriptions.Item label="物资点名称" span={2}><Text strong>{detail.name}</Text></Descriptions.Item>
                    <Descriptions.Item label="所属区划" span={2}>{detail.region || '—'}</Descriptions.Item>
                    <Descriptions.Item label="所属单位">{detail.affiliatedUnit?.trim() || '—'}</Descriptions.Item>
                    <Descriptions.Item label="存储性质">{detail.storageNature?.trim() || '—'}</Descriptions.Item>
                    <Descriptions.Item label="位置" span={2}>{detail.address}</Descriptions.Item>
                    {detail.longitude && detail.latitude ? (
                      <>
                        <Descriptions.Item label="经度（度）">{detail.longitude}</Descriptions.Item>
                        <Descriptions.Item label="纬度（度）">{detail.latitude}</Descriptions.Item>
                      </>
                    ) : (
                      <>
                        <Descriptions.Item label="经度（度）">—</Descriptions.Item>
                        <Descriptions.Item label="纬度（度）">—</Descriptions.Item>
                      </>
                    )}
                    <Descriptions.Item label="物资点位置地图" span={2}>
                      <AddrWgs84DetailMap
                        title={detail.name}
                        location={detail.address}
                        lng={detail.longitude}
                        lat={detail.latitude}
                        mapAriaLabel="社会物资点位置地图"
                      />
                    </Descriptions.Item>
                    <Descriptions.Item label="可提供物资类型及数量" span={2}>{detail.materialTypesQty}</Descriptions.Item>
                    <Descriptions.Item label="联络方式">{detail.contactPhone}</Descriptions.Item>
                    <Descriptions.Item label="调用流程" span={2}>{detail.callProcess}</Descriptions.Item>
                    <Descriptions.Item label="备注" span={2} style={{ whiteSpace: 'pre-wrap' }}>{detail.remark?.trim() || '—'}</Descriptions.Item>
                  </Descriptions>
                ),
              },
              {
                key: 'supplies',
                label: `关联应急物资（${linkedForDetail.length}）`,
                children: (
                  <div className="facility-table-wrap" style={{ marginTop: 8 }}>
                    <Table
                      rowKey="id"
                      size="small"
                      scroll={{ x: linkedSupplyScrollX }}
                      pagination={linkedForDetail.length > 10 ? { defaultPageSize: 10, showTotal: t => `共 ${t} 条` } : false}
                      dataSource={linkedForDetail}
                      columns={linkedEmergencySupplyColumns}
                    />
                  </div>
                ),
              },
            ]}
          />
        )}
      </Modal>
      <Modal
        title={editing ? '编辑物资点' : '新增物资点'}
        open={editOpen}
        onCancel={closeEdit}
        width={920}
        destroyOnClose
        styles={formModalStyles}
        footer={
          <Space>
            {editing ? (
              <Popconfirm title="确认删除？" onConfirm={del}>
                <Button danger>删除</Button>
              </Popconfirm>
            ) : null}
            <Button className="secondary-btn" onClick={closeEdit}>取消</Button>
            <Button type="primary" onClick={() => void save()}>保存</Button>
          </Space>
        }
      >
        <Form form={editForm} layout="vertical" preserve={false} className="risk-ident-edit-form">
          <Row gutter={RISK_EDIT_FORM_ROW_GUTTER}>
            <Col xs={24} sm={12}>
              <Form.Item name="name" label="名称" rules={[{ required: true }]}>
                <Input placeholder="企业、商超、物流站点等" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name="region" label="所属区划" rules={[{ required: true, message: '请选择所属区划' }]}>
                <Select
                  style={{ width: '100%' }}
                  showSearch
                  optionFilterProp="label"
                  placeholder="韶山市下辖乡镇（街道）"
                  options={[...SHAOSHAN_SUB_REGION_OPTIONS].map(x => ({ value: x, label: x }))}
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name="affiliatedUnit" label="所属单位" rules={[{ required: true, message: '请输入所属单位' }]}>
                <Input placeholder="主管、托管或产权单位" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name="storageNature" label="存储性质" rules={[{ required: true, message: '请选择存储性质' }]}>
                <Select
                  style={{ width: '100%' }}
                  showSearch
                  optionFilterProp="label"
                  placeholder="请选择"
                  options={[...SOCIAL_POINT_STORAGE_NATURE_OPTIONS].map(x => ({ value: x, label: x }))}
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={24}>
              <Form.Item name="address" label="位置" rules={[{ required: true, message: '请输入位置' }]} extra={ADDR_MAP_FORM_ITEM_EXTRA}>
                <Input placeholder={ADDR_MAP_INPUT_PLACEHOLDER} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={24}>
              <Form.Item label="物资点位置地图" colon={false}>
                <AddrWgs84MapPicker
                  form={editForm}
                  addrField="address"
                  lngField="longitude"
                  latField="latitude"
                  mapAriaLabel="社会物资点位置地图"
                  hintAddressLabel="位置"
                  lngLatValueMode="string"
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name="longitude" label="经度（度）" tooltip="可与地图选点同步">
                <Input placeholder="选填，地图选点后自动回填" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name="latitude" label="纬度（度）" tooltip="可与地图选点同步">
                <Input placeholder="选填，地图选点后自动回填" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={24}>
              <Form.Item name="materialTypesQty" label="可提供物资类型及数量" rules={[{ required: true }]}>
                <TextArea rows={2} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name="contactPhone" label="联络方式" rules={[{ required: true }]}>
                <Input />
              </Form.Item>
            </Col>
            <Col xs={24} sm={24}>
              <Form.Item name="callProcess" label="调用流程" rules={[{ required: true }]}>
                <TextArea rows={3} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={24}>
              <Form.Item name="remark" label="备注">
                <TextArea rows={4} showCount maxLength={2000} placeholder="登记补充说明、接口人变更、使用限制等" />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>
    </div>
  );
};

// ========== 4 应急预案 ==========
export const EmergencyPlanPage: React.FC<{
  rows: EmergencyPlanRow[];
  onChange: React.Dispatch<React.SetStateAction<EmergencyPlanRow[]>>;
}> = ({ rows, onChange }) => {
  const [filterForm] = Form.useForm();
  const [editForm] = Form.useForm();
  const [query, setQuery] = useState<Record<string, unknown>>({});
  const [detail, setDetail] = useState<EmergencyPlanRow | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<EmergencyPlanRow | null>(null);
  /** 预案附件：文件名 + data URL / 远程 URL，与表单其它字段分离避免超大字符串进 Form store */
  const [planAttach, setPlanAttach] = useState<{ url: string | null; name: string }>({ url: null, name: '' });

  const planAttachFileList: UploadFile[] = useMemo(
    () =>
      planAttach.name ? [{ uid: 'plan-attach', name: planAttach.name, status: 'done' as const }] : [],
    [planAttach.name],
  );

  const filtered = useMemo(() => {
    const name = String(query.name ?? '').trim();
    const compileOrg = String(query.compileOrg ?? '').trim();
    const pt = query.planType as string | undefined;
    const t0 = query.publishTimeStart as string | undefined;
    const t1 = query.publishTimeEnd as string | undefined;
    return rows.filter(r => {
      if (pt && r.planType !== pt) return false;
      if (name && !r.name.includes(name)) return false;
      if (compileOrg && !r.compileOrg.includes(compileOrg)) return false;
      if (t0 && dayjs(r.publishTime).isBefore(dayjs(t0))) return false;
      if (t1 && dayjs(r.publishTime).isAfter(dayjs(t1))) return false;
      return true;
    });
  }, [rows, query]);

  const allCols: EcoColumnConfig[] = useMemo(
    () => [
      { key: 'name', title: '预案名称', dataIndex: 'name', width: 220, ellipsis: true },
      { key: 'planType', title: '预案类型', dataIndex: 'planType', width: 120 },
      { key: 'publishTime', title: '发布时间', dataIndex: 'publishTime', width: 120 },
      { key: 'compileOrg', title: '编制单位', dataIndex: 'compileOrg', width: 160, ellipsis: true },
      {
        key: 'attachmentName',
        title: '附件',
        dataIndex: 'attachmentName',
        width: 200,
        ellipsis: true,
        render: (text: unknown, record: unknown) => {
          const r = record as EmergencyPlanRow;
          return r.pdfUrl ? (
            <Button type="link" size="small" className="action-btn detail" href={r.pdfUrl} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}>
              {String(text)}
            </Button>
          ) : (
            String(text ?? '—')
          );
        },
      },
      { key: 'operation', title: '操作', width: 148, defaultVisible: true },
    ],
    [],
  );
  const [visibleCols, setVisibleCols] = useState(() => getEcoDefaultVisibleColumnKeys(allCols));
  const columns = useMemo(
    () =>
      buildTableColumnsFromEcoConfig(allCols, visibleCols, record => {
        const row = record as EmergencyPlanRow;
        return (
          <Space size="small">
            <Button type="link" size="small" className="action-btn detail" icon={<EyeOutlined />} onClick={() => { setDetail(row); setDetailOpen(true); }}>详情</Button>
            <Button
              type="link"
              size="small"
              className="action-btn edit"
              icon={<EditOutlined />}
              onClick={() => {
                setEditing(row);
                setPlanAttach({ url: row.pdfUrl || null, name: row.attachmentName || '' });
                const { attachmentName: _a, pdfUrl: _p, ...rest } = row;
                editForm.setFieldsValue({ ...rest, publishTime: row.publishTime ? dayjs(row.publishTime) : undefined });
                setEditOpen(true);
              }}
            >
              编辑
            </Button>
          </Space>
        );
      }),
    [allCols, visibleCols, editForm],
  );

  const save = async () => {
    const v = await editForm.validateFields();
    if (!planAttach.url?.trim()) {
      message.error('请上传预案附件');
      return;
    }
    const nameTrim = planAttach.name.trim();
    if (!nameTrim) {
      message.error('请上传文件以生成附件名称，或检查文件是否读取成功');
      return;
    }
    const pt = v.publishTime;
    const publishTimeStr = pt && dayjs.isDayjs(pt) ? (pt as dayjs.Dayjs).format('YYYY-MM-DD') : String(pt ?? '');
    const payload: EmergencyPlanRow = {
      id: editing?.id ?? `ep-${Date.now()}`,
      name: v.name,
      planType: v.planType,
      publishTime: publishTimeStr,
      compileOrg: v.compileOrg,
      orgSystem: v.orgSystem,
      responseFlow: v.responseFlow,
      measures: v.measures,
      dutyDivision: v.dutyDivision,
      attachmentName: nameTrim,
      pdfUrl: planAttach.url.trim(),
    };
    if (editing) onChange(prev => prev.map(r => (r.id === editing.id ? payload : r)));
    else onChange(prev => [...prev, payload]);
    message.success(editing ? '已保存' : '已新增');
    setEditOpen(false);
    setEditing(null);
    editForm.resetFields();
    setPlanAttach({ url: null, name: '' });
  };

  const closeEdit = () => {
    setEditOpen(false);
    setEditing(null);
    editForm.resetFields();
    setPlanAttach({ url: null, name: '' });
  };

  const del = () => {
    if (!editing) return;
    onChange(prev => prev.filter(r => r.id !== editing.id));
    message.success('已删除');
    closeEdit();
  };

  return (
    <div className="facility-view">
      <Card
        title="应急预案信息"
        extra={
          <Space wrap>
            <EcoProtoExportBtn onClick={() => exportRiskTableExcel(filtered as unknown as Record<string, unknown>[], allCols, '应急协同_应急预案信息', '应急预案')} />
            <EcoProtoImportBtn />
            <RiskEcoColumnManager columns={allCols} visibleColumns={visibleCols} onChange={setVisibleCols} />
            <Button
              type="primary"
              icon={<PlusOutlined />}
              className="add-btn"
              onClick={() => {
                setEditing(null);
                editForm.resetFields();
                setPlanAttach({ url: null, name: '' });
                setEditOpen(true);
              }}
            >
              新增
            </Button>
          </Space>
        }
      >
        <Form form={filterForm} style={{ marginBottom: 12 }}>
          <Row gutter={[12, 12]} align="middle">
            <Col xs={24} sm={12} md={8} lg={4}>
              <Form.Item name="planType" style={{ marginBottom: 0 }}>
                <Select allowClear placeholder="预案类型" options={['总体应急预案', '专项应急预案', '现场处置方案'].map(x => ({ label: x, value: x }))} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={8} lg={4}>
              <Form.Item name="name" style={{ marginBottom: 0 }}>
                <Input allowClear placeholder="预案名称" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={8} lg={4}>
              <Form.Item name="compileOrg" style={{ marginBottom: 0 }}>
                <Input allowClear placeholder="编制单位" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={12} lg={8}>
              <Form.Item name="publishTimeRange" style={{ marginBottom: 0 }}>
                <DatePicker.RangePicker style={{ width: '100%' }} placeholder={['发布时间起', '发布时间止']} />
              </Form.Item>
            </Col>
            <Col xs={24} style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <Space>
                <Button
                  type="primary"
                  className="search-btn"
                  icon={<SearchOutlined />}
                  onClick={() => {
                    const v = filterForm.getFieldsValue() as {
                      planType?: string;
                      name?: string;
                      compileOrg?: string;
                      publishTimeRange?: [dayjs.Dayjs, dayjs.Dayjs] | null;
                    };
                    const range = v.publishTimeRange;
                    setQuery({
                      planType: v.planType,
                      name: (v.name ?? '').trim(),
                      compileOrg: (v.compileOrg ?? '').trim(),
                      publishTimeStart: range?.[0]?.format('YYYY-MM-DD'),
                      publishTimeEnd: range?.[1]?.format('YYYY-MM-DD'),
                    });
                    message.success('已查询');
                  }}
                >
                  查询
                </Button>
                <Button className="secondary-btn" onClick={() => { filterForm.resetFields(); setQuery({}); }}>重置</Button>
              </Space>
            </Col>
          </Row>
        </Form>
        <div className="facility-table-wrap">
          <Table rowKey="id" size="small" scroll={{ x: getEcoTableScrollX(allCols.filter(c => visibleCols.includes(c.key) || c.key === 'operation')) }} pagination={{ defaultPageSize: 10, showTotal: t => `共 ${t} 条` }} columns={columns} dataSource={filtered} />
        </div>
      </Card>
      <Modal title="预案详情" open={detailOpen} onCancel={() => { setDetailOpen(false); setDetail(null); }} footer={null} width={920} destroyOnClose styles={detailModalStyles}>
        {detail && (
          <Descriptions bordered column={2} size="small" style={{ marginTop: 8 }}>
            <Descriptions.Item label="预案名称" span={2}><Text strong>{detail.name}</Text></Descriptions.Item>
            <Descriptions.Item label="预案类型">{detail.planType}</Descriptions.Item>
            <Descriptions.Item label="发布时间">{detail.publishTime}</Descriptions.Item>
            <Descriptions.Item label="编制单位" span={2}>{detail.compileOrg}</Descriptions.Item>
            <Descriptions.Item label="应急组织体系" span={2}>{detail.orgSystem}</Descriptions.Item>
            <Descriptions.Item label="响应流程" span={2}>{detail.responseFlow}</Descriptions.Item>
            <Descriptions.Item label="处置措施" span={2}>{detail.measures}</Descriptions.Item>
            <Descriptions.Item label="责任分工" span={2}>{detail.dutyDivision}</Descriptions.Item>
            <Descriptions.Item label="附件" span={2}>
              <Space>
                <Text>{detail.attachmentName}</Text>
                {detail.pdfUrl ? (
                  <>
                    <Button type="link" className="action-btn detail" href={detail.pdfUrl} target="_blank" rel="noopener noreferrer">查看</Button>
                    <Button type="link" className="action-btn detail" href={detail.pdfUrl} download={detail.attachmentName}>下载</Button>
                  </>
                ) : null}
              </Space>
            </Descriptions.Item>
          </Descriptions>
        )}
      </Modal>
      <Modal
        title={editing ? '编辑预案' : '新增预案'}
        open={editOpen}
        onCancel={closeEdit}
        width={920}
        destroyOnClose
        styles={formModalStyles}
        footer={
          <Space>
            {editing ? (
              <Popconfirm title="确认删除？" onConfirm={del}>
                <Button danger>删除</Button>
              </Popconfirm>
            ) : null}
            <Button className="secondary-btn" onClick={closeEdit}>取消</Button>
            <Button type="primary" onClick={() => void save()}>保存</Button>
          </Space>
        }
      >
        <Form form={editForm} layout="vertical" preserve={false} className="risk-ident-edit-form">
          <Row gutter={RISK_EDIT_FORM_ROW_GUTTER}>
            <Col xs={24} sm={12}>
              <Form.Item name="name" label="预案名称" rules={[{ required: true }]}>
                <Input />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name="planType" label="预案类型" rules={[{ required: true }]}>
                <Select style={{ width: '100%' }} options={['总体应急预案', '专项应急预案', '现场处置方案'].map(x => ({ value: x, label: x }))} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name="publishTime" label="发布时间" rules={[{ required: true }]}>
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name="compileOrg" label="编制单位" rules={[{ required: true }]}>
                <Input />
              </Form.Item>
            </Col>
            <Col xs={24} sm={24}>
              <Form.Item name="orgSystem" label="应急组织体系" rules={[{ required: true }]}>
                <TextArea rows={2} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={24}>
              <Form.Item name="responseFlow" label="响应流程" rules={[{ required: true }]}>
                <TextArea rows={2} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={24}>
              <Form.Item name="measures" label="处置措施" rules={[{ required: true }]}>
                <TextArea rows={2} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={24}>
              <Form.Item name="dutyDivision" label="责任分工" rules={[{ required: true }]}>
                <TextArea rows={2} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={24}>
              <Form.Item
                label="预案附件"
                required
                extra={`支持 PDF、Word；单文件不超过 ${PLAN_ATTACH_MAX_MB}MB。上传后在列表与详情中可「查看 / 下载」；原型为浏览器本地 data URL，刷新页面可能丢失。`}
              >
                <Upload
                  fileList={planAttachFileList}
                  maxCount={1}
                  accept={PLAN_ATTACH_ACCEPT}
                  beforeUpload={file => {
                    const mb = file.size / 1024 / 1024;
                    if (mb > PLAN_ATTACH_MAX_MB) {
                      message.error(`附件不超过 ${PLAN_ATTACH_MAX_MB}MB`);
                      return Upload.LIST_IGNORE;
                    }
                    const reader = new FileReader();
                    reader.onload = () => {
                      const dataUrl = reader.result as string;
                      setPlanAttach({ url: dataUrl, name: file.name });
                    };
                    reader.onerror = () => message.error('读取文件失败');
                    reader.readAsDataURL(file);
                    return false;
                  }}
                  onRemove={() => {
                    setPlanAttach({ url: null, name: '' });
                    return true;
                  }}
                >
                  <Button icon={<UploadOutlined />}>上传本地文件</Button>
                </Upload>
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>
    </div>
  );
};

// ========== 5 应急队伍（Tab：基本信息 / 人员列表）==========
export const EmergencyTeamPage: React.FC<{
  rows: EmergencyTeamRow[];
  onChange: React.Dispatch<React.SetStateAction<EmergencyTeamRow[]>>;
}> = ({ rows, onChange }) => {
  const [filterForm] = Form.useForm();
  const [editForm] = Form.useForm();
  const [memberForm] = Form.useForm();
  const [query, setQuery] = useState<Record<string, unknown>>({});
  const [detail, setDetail] = useState<EmergencyTeamRow | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<EmergencyTeamRow | null>(null);
  const [editTab, setEditTab] = useState('base');
  const [membersDraft, setMembersDraft] = useState<TeamMemberRow[]>([]);
  const [memberModalOpen, setMemberModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<TeamMemberRow | null>(null);

  const filtered = useMemo(() => {
    const name = String(query.name ?? '').trim();
    const specialty = String(query.specialty ?? '').trim();
    const competentDept = String(query.competentDept ?? '').trim();
    const teamAddress = String(query.teamAddress ?? '').trim();
    const leaderName = String(query.leaderName ?? '').trim();
    const contactPhone = String(query.contactPhone ?? '').trim();
    const region = query.region as string | undefined;
    return rows.filter(r => {
      if (region && r.region !== region) return false;
      if (name && !r.name.includes(name)) return false;
      if (specialty && !r.specialty.includes(specialty)) return false;
      if (competentDept && !String(r.competentDept ?? '').includes(competentDept)) return false;
      if (teamAddress && !String(r.teamAddress ?? '').includes(teamAddress)) return false;
      if (leaderName && !String(r.leaderName ?? '').includes(leaderName)) return false;
      if (contactPhone && !r.contactPhone.includes(contactPhone)) return false;
      return true;
    });
  }, [rows, query]);

  const openEdit = (row: EmergencyTeamRow | null) => {
    setEditing(row);
    setMembersDraft(row ? [...row.members] : []);
    setEditTab('base');
    if (row) {
      editForm.setFieldsValue({
        name: row.name,
        region: row.region,
        competentDept: row.competentDept ?? '',
        specialty: row.specialty,
        expertiseDescription: row.expertiseDescription ?? '',
        equipment: row.equipment,
        leaderName: row.leaderName ?? '',
        contactPhone: row.contactPhone,
        dutyPhone: row.dutyPhone ?? '',
        teamAddress: row.teamAddress ?? '',
        longitude: row.longitude ?? '',
        latitude: row.latitude ?? '',
        dutyDivision: row.dutyDivision,
      });
    } else editForm.resetFields();
    setEditOpen(true);
  };

  const saveTeam = async () => {
    const v = await editForm.validateFields();
    const payload: EmergencyTeamRow = {
      id: editing?.id ?? `et-${Date.now()}`,
      name: v.name,
      region: typeof v.region === 'string' ? v.region : String(v.region ?? ''),
      competentDept: typeof v.competentDept === 'string' ? v.competentDept.trim() : String(v.competentDept ?? ''),
      specialty: v.specialty,
      expertiseDescription:
        typeof v.expertiseDescription === 'string' ? v.expertiseDescription : String(v.expertiseDescription ?? ''),
      equipment: v.equipment,
      leaderName: typeof v.leaderName === 'string' ? v.leaderName.trim() : String(v.leaderName ?? ''),
      contactPhone: v.contactPhone,
      dutyPhone: typeof v.dutyPhone === 'string' ? v.dutyPhone.trim() : String(v.dutyPhone ?? ''),
      teamAddress: typeof v.teamAddress === 'string' ? v.teamAddress.trim() : String(v.teamAddress ?? ''),
      longitude: v.longitude != null && v.longitude !== '' ? String(v.longitude).trim() : '',
      latitude: v.latitude != null && v.latitude !== '' ? String(v.latitude).trim() : '',
      dutyDivision: v.dutyDivision,
      members: membersDraft,
    };
    if (editing) onChange(prev => prev.map(r => (r.id === editing.id ? payload : r)));
    else onChange(prev => [...prev, payload]);
    message.success(editing ? '已保存' : '已新增');
    setEditOpen(false);
    setEditing(null);
    editForm.resetFields();
    setMembersDraft([]);
  };

  const closeTeamEdit = () => {
    setEditOpen(false);
    setEditing(null);
    editForm.resetFields();
    setMembersDraft([]);
  };

  const delTeam = () => {
    if (!editing) return;
    onChange(prev => prev.filter(r => r.id !== editing.id));
    message.success('已删除');
    closeTeamEdit();
  };

  const saveMember = async () => {
    const v = await memberForm.validateFields();
    const m: TeamMemberRow = { id: editingMember?.id ?? `tm-${Date.now()}`, ...v };
    if (editingMember) setMembersDraft(prev => prev.map(x => (x.id === editingMember.id ? m : x)));
    else setMembersDraft(prev => [...prev, m]);
    setMemberModalOpen(false);
    setEditingMember(null);
    memberForm.resetFields();
  };

  const allCols: EcoColumnConfig[] = useMemo(
    () => [
      { key: 'name', title: '队伍名称', dataIndex: 'name', width: 220, ellipsis: true },
      { key: 'region', title: '所属区划', dataIndex: 'region', width: 100 },
      { key: 'competentDept', title: '主管部门', dataIndex: 'competentDept', width: 160, ellipsis: true },
      {
        key: 'memberCount',
        title: '队伍人数',
        width: 96,
        render: (_: unknown, r: unknown) => (r as EmergencyTeamRow).members.length,
      },
      { key: 'specialty', title: '专业技能', dataIndex: 'specialty', ellipsis: true },
      {
        key: 'expertiseDescription',
        title: '专长描述',
        dataIndex: 'expertiseDescription',
        width: 200,
        ellipsis: true,
        defaultVisible: true,
      },
      { key: 'equipment', title: '装备配置', dataIndex: 'equipment', width: 160, ellipsis: true },
      { key: 'leaderName', title: '队伍负责人', dataIndex: 'leaderName', width: 110 },
      { key: 'contactPhone', title: '联络方式', dataIndex: 'contactPhone', width: 130 },
      { key: 'dutyPhone', title: '值班电话', dataIndex: 'dutyPhone', width: 130 },
      { key: 'teamAddress', title: '队伍地址', dataIndex: 'teamAddress', width: 200, ellipsis: true },
      { key: 'dutyDivision', title: '职责分工', dataIndex: 'dutyDivision', ellipsis: true, defaultVisible: false },
      { key: 'operation', title: '操作', width: 148, defaultVisible: true },
    ],
    [],
  );
  const [visibleCols, setVisibleCols] = useState(() => getEcoDefaultVisibleColumnKeys(allCols));
  const columns = useMemo(
    () =>
      buildTableColumnsFromEcoConfig(allCols, visibleCols, record => {
        const row = record as EmergencyTeamRow;
        return (
          <Space size="small">
            <Button type="link" size="small" className="action-btn detail" icon={<EyeOutlined />} onClick={() => { setDetail(row); setDetailOpen(true); }}>详情</Button>
            <Button type="link" size="small" className="action-btn edit" icon={<EditOutlined />} onClick={() => openEdit(row)}>编辑</Button>
          </Space>
        );
      }),
    [allCols, visibleCols],
  );

  return (
    <div className="facility-view">
      <Card
        title="应急队伍信息"
        extra={
          <Space wrap>
            <EcoProtoExportBtn onClick={() => exportRiskTableExcel(filtered as unknown as Record<string, unknown>[], allCols, '应急协同_应急队伍信息', '应急队伍')} />
            <EcoProtoImportBtn />
            <RiskEcoColumnManager columns={allCols} visibleColumns={visibleCols} onChange={setVisibleCols} />
            <Button type="primary" icon={<PlusOutlined />} className="add-btn" onClick={() => openEdit(null)}>新增</Button>
          </Space>
        }
      >
        <Form form={filterForm} style={{ marginBottom: 12 }}>
          <Row gutter={[12, 12]} align="middle">
            <Col xs={24} sm={12} md={8} lg={4}>
              <Form.Item name="region" style={{ marginBottom: 0 }}>
                <Select
                  allowClear
                  placeholder="所属区划"
                  optionFilterProp="label"
                  showSearch
                  style={{ width: '100%' }}
                  options={[...SHAOSHAN_SUB_REGION_OPTIONS].map(x => ({ value: x, label: x }))}
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={8} lg={4}>
              <Form.Item name="name" style={{ marginBottom: 0 }}>
                <Input allowClear placeholder="队伍名称" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={8} lg={4}>
              <Form.Item name="specialty" style={{ marginBottom: 0 }}>
                <Input allowClear placeholder="专业技能" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={8} lg={4}>
              <Form.Item name="competentDept" style={{ marginBottom: 0 }}>
                <Input allowClear placeholder="主管部门" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={8} lg={4}>
              <Form.Item name="teamAddress" style={{ marginBottom: 0 }}>
                <Input allowClear placeholder="队伍地址" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={8} lg={4}>
              <Form.Item name="leaderName" style={{ marginBottom: 0 }}>
                <Input allowClear placeholder="队伍负责人" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={8} lg={4}>
              <Form.Item name="contactPhone" style={{ marginBottom: 0 }}>
                <Input allowClear placeholder="联络方式" />
              </Form.Item>
            </Col>
            <Col xs={24} style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <Space>
                <Button type="primary" className="search-btn" icon={<SearchOutlined />} onClick={() => { setQuery(filterForm.getFieldsValue()); message.success('已查询'); }}>查询</Button>
                <Button className="secondary-btn" onClick={() => { filterForm.resetFields(); setQuery({}); }}>重置</Button>
              </Space>
            </Col>
          </Row>
        </Form>
        <div className="facility-table-wrap">
          <Table rowKey="id" size="small" scroll={{ x: getEcoTableScrollX(allCols.filter(c => visibleCols.includes(c.key) || c.key === 'operation')) }} pagination={{ defaultPageSize: 10, showTotal: t => `共 ${t} 条` }} columns={columns} dataSource={filtered} />
        </div>
      </Card>
      <Modal title="队伍详情" open={detailOpen} onCancel={() => { setDetailOpen(false); setDetail(null); }} footer={null} width={920} destroyOnClose styles={detailModalStyles}>
        {detail && (
          <>
            <Descriptions bordered column={2} size="small" style={{ marginTop: 8, marginBottom: 16 }}>
              <Descriptions.Item label="队伍名称" span={2}><Text strong>{detail.name}</Text></Descriptions.Item>
              <Descriptions.Item label="所属区划">{detail.region || '—'}</Descriptions.Item>
              <Descriptions.Item label="队伍人数">{detail.members.length} 人</Descriptions.Item>
              <Descriptions.Item label="主管部门" span={2}>{detail.competentDept?.trim() || '—'}</Descriptions.Item>
              <Descriptions.Item label="值班电话">{detail.dutyPhone?.trim() || '—'}</Descriptions.Item>
              <Descriptions.Item label="联络方式">{detail.contactPhone}</Descriptions.Item>
              <Descriptions.Item label="专业技能" span={2}>{detail.specialty}</Descriptions.Item>
              <Descriptions.Item label="专长描述" span={2} style={{ whiteSpace: 'pre-wrap' }}>{detail.expertiseDescription?.trim() || '—'}</Descriptions.Item>
              <Descriptions.Item label="装备配置" span={2}>{detail.equipment}</Descriptions.Item>
              <Descriptions.Item label="队伍负责人" span={2}>{detail.leaderName || '—'}</Descriptions.Item>
              <Descriptions.Item label="职责分工" span={2}>{detail.dutyDivision}</Descriptions.Item>
              <Descriptions.Item label="队伍地址" span={2}>{detail.teamAddress?.trim() || '—'}</Descriptions.Item>
              {detail.longitude && detail.latitude ? (
                <>
                  <Descriptions.Item label="经度（度）">{detail.longitude}</Descriptions.Item>
                  <Descriptions.Item label="纬度（度）">{detail.latitude}</Descriptions.Item>
                </>
              ) : (
                <>
                  <Descriptions.Item label="经度（度）">—</Descriptions.Item>
                  <Descriptions.Item label="纬度（度）">—</Descriptions.Item>
                </>
              )}
              <Descriptions.Item label="队伍位置地图" span={2}>
                <AddrWgs84DetailMap
                  title={detail.name}
                  location={detail.teamAddress}
                  lng={detail.longitude}
                  lat={detail.latitude}
                  mapAriaLabel="应急队伍位置地图"
                />
              </Descriptions.Item>
            </Descriptions>
            <Card size="small" title={`人员列表（共 ${detail.members.length} 人）`}>
              <Table
                rowKey="id"
                size="small"
                pagination={false}
                dataSource={detail.members}
                columns={[
                  { title: '姓名', dataIndex: 'name' },
                  { title: '岗位/角色', dataIndex: 'role' },
                  { title: '联系电话', dataIndex: 'phone' },
                  { title: '专业技能', dataIndex: 'skill' },
                ]}
              />
            </Card>
          </>
        )}
      </Modal>
      <Modal
        title={editing ? '编辑队伍' : '新增队伍'}
        open={editOpen}
        onCancel={closeTeamEdit}
        width={920}
        destroyOnClose
        styles={formModalStyles}
        footer={
          <Space>
            {editing ? (
              <Popconfirm title="确认删除？" onConfirm={delTeam}>
                <Button danger>删除</Button>
              </Popconfirm>
            ) : null}
            <Button className="secondary-btn" onClick={closeTeamEdit}>取消</Button>
            <Button type="primary" onClick={() => void saveTeam()}>保存</Button>
          </Space>
        }
      >
        <Tabs activeKey={editTab} onChange={setEditTab} size="small" className="facility-detail-tabs facility-event-edit-tabs" items={[
          {
            key: 'base',
            label: '基本信息',
            children: (
              <Form form={editForm} layout="vertical" preserve={false} className="risk-ident-edit-form">
                <Row gutter={RISK_EDIT_FORM_ROW_GUTTER}>
                  <Col xs={24} sm={12}>
                    <Form.Item name="name" label="队伍名称" rules={[{ required: true }]}>
                      <Input />
                    </Form.Item>
                  </Col>
                  <Col xs={24} sm={12}>
                    <Form.Item name="region" label="所属区划" rules={[{ required: true, message: '请选择所属区划' }]}>
                      <Select
                        style={{ width: '100%' }}
                        showSearch
                        optionFilterProp="label"
                        placeholder="韶山市下辖乡镇（街道）"
                        options={[...SHAOSHAN_SUB_REGION_OPTIONS].map(x => ({ value: x, label: x }))}
                      />
                    </Form.Item>
                  </Col>
                  <Col xs={24} sm={12}>
                    <Form.Item name="competentDept" label="主管部门" rules={[{ required: true, message: '请输入主管部门' }]}>
                      <Input placeholder="如市、县局或委办" />
                    </Form.Item>
                  </Col>
                  <Col xs={24} sm={12}>
                    <Form.Item name="dutyPhone" label="值班电话" rules={[{ required: true, message: '请输入值班电话' }]}>
                      <Input placeholder="含区号" />
                    </Form.Item>
                  </Col>
                  <Col xs={24} sm={24}>
                    <Form.Item label="队伍人数">
                      <Text type="secondary">{membersDraft.length} 人（与「人员列表」人数一致，保存时自动按列表统计）</Text>
                    </Form.Item>
                  </Col>
                  <Col xs={24} sm={24}>
                    <Form.Item
                      name="teamAddress"
                      label="队伍地址"
                      rules={[{ required: true, message: '请输入队伍地址或点击地图选点' }]}
                      extra={ADDR_MAP_FORM_ITEM_EXTRA}
                    >
                      <Input placeholder={ADDR_MAP_INPUT_PLACEHOLDER} />
                    </Form.Item>
                  </Col>
                  <Col xs={24} sm={24}>
                    <Form.Item label="队伍位置地图" colon={false}>
                      <AddrWgs84MapPicker
                        form={editForm}
                        addrField="teamAddress"
                        lngField="longitude"
                        latField="latitude"
                        mapAriaLabel="应急队伍位置地图"
                        hintAddressLabel="队伍地址"
                        lngLatValueMode="string"
                      />
                    </Form.Item>
                  </Col>
                  <Col xs={24} sm={12}>
                    <Form.Item name="longitude" label="经度（度）" tooltip="可与地图选点同步">
                      <Input placeholder="选填，地图选点后自动回填" />
                    </Form.Item>
                  </Col>
                  <Col xs={24} sm={12}>
                    <Form.Item name="latitude" label="纬度（度）" tooltip="可与地图选点同步">
                      <Input placeholder="选填，地图选点后自动回填" />
                    </Form.Item>
                  </Col>
                  <Col xs={24} sm={24}>
                    <Form.Item name="specialty" label="专业技能" rules={[{ required: true }]}>
                      <TextArea rows={2} />
                    </Form.Item>
                  </Col>
                  <Col xs={24} sm={24}>
                    <Form.Item
                      name="expertiseDescription"
                      label="专长描述"
                      rules={[{ required: true, message: '请填写专长描述' }]}
                    >
                      <TextArea rows={5} showCount maxLength={2000} />
                    </Form.Item>
                  </Col>
                  <Col xs={24} sm={24}>
                    <Form.Item name="equipment" label="装备配置" rules={[{ required: true }]}>
                      <TextArea rows={2} />
                    </Form.Item>
                  </Col>
                  <Col xs={24} sm={12}>
                    <Form.Item name="leaderName" label="队伍负责人" rules={[{ required: true, message: '请输入队伍负责人' }]}>
                      <Input placeholder="姓名" />
                    </Form.Item>
                  </Col>
                  <Col xs={24} sm={12}>
                    <Form.Item name="contactPhone" label="联络方式" rules={[{ required: true }]}>
                      <Input />
                    </Form.Item>
                  </Col>
                  <Col xs={24} sm={24}>
                    <Form.Item name="dutyDivision" label="职责分工" rules={[{ required: true }]}>
                      <TextArea rows={2} />
                    </Form.Item>
                  </Col>
                </Row>
              </Form>
            ),
          },
          {
            key: 'members',
            label: `人员列表（${membersDraft.length} 人）`,
            children: (
              <div style={{ marginTop: 8 }}>
                <Space style={{ marginBottom: 12 }}>
                  <Button type="primary" icon={<PlusOutlined />} className="add-btn" onClick={() => { setEditingMember(null); memberForm.resetFields(); setMemberModalOpen(true); }}>添加人员</Button>
                  <Text type="secondary">队伍人数随列表增减自动变化</Text>
                </Space>
                <Table
                  rowKey="id"
                  size="small"
                  dataSource={membersDraft}
                  columns={[
                    { title: '姓名', dataIndex: 'name' },
                    { title: '岗位/角色', dataIndex: 'role' },
                    { title: '联系电话', dataIndex: 'phone' },
                    { title: '专业技能', dataIndex: 'skill' },
                    {
                      title: '操作',
                      width: 120,
                      render: (_: unknown, r: TeamMemberRow) => (
                        <Space>
                          <Button type="link" size="small" className="action-btn edit" onClick={() => { setEditingMember(r); memberForm.setFieldsValue(r); setMemberModalOpen(true); }}>编辑</Button>
                          <Popconfirm title="删除该人员？" onConfirm={() => setMembersDraft(prev => prev.filter(x => x.id !== r.id))}>
                            <Button type="link" size="small" className="action-btn delete" danger>删除</Button>
                          </Popconfirm>
                        </Space>
                      ),
                    },
                  ]}
                />
              </div>
            ),
          },
        ]}
        />
      </Modal>
      <Modal
        title={editingMember ? '编辑人员' : '添加人员'}
        open={memberModalOpen}
        onCancel={() => { setMemberModalOpen(false); setEditingMember(null); memberForm.resetFields(); }}
        width={720}
        destroyOnClose
        styles={formModalStyles}
        footer={
          <Space>
            {editingMember ? (
              <Popconfirm
                title="确认删除该人员？"
                onConfirm={() => {
                  setMembersDraft(prev => prev.filter(x => x.id !== editingMember.id));
                  setMemberModalOpen(false);
                  setEditingMember(null);
                  memberForm.resetFields();
                  message.success('已删除');
                }}
              >
                <Button danger>删除</Button>
              </Popconfirm>
            ) : null}
            <Button className="secondary-btn" onClick={() => { setMemberModalOpen(false); setEditingMember(null); memberForm.resetFields(); }}>取消</Button>
            <Button type="primary" onClick={() => void saveMember()}>保存</Button>
          </Space>
        }
      >
        <Form form={memberForm} layout="vertical" preserve={false} className="risk-ident-edit-form">
          <Row gutter={RISK_EDIT_FORM_ROW_GUTTER}>
            <Col xs={24} sm={12}>
              <Form.Item name="name" label="姓名" rules={[{ required: true }]}>
                <Input />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name="role" label="岗位/角色" rules={[{ required: true }]}>
                <Input />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name="phone" label="联系电话" rules={[{ required: true }]}>
                <Input />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name="skill" label="专业技能" rules={[{ required: true }]}>
                <Input />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>
    </div>
  );
};

// ========== 6 专家库 ==========
export const ExpertPage: React.FC<{
  rows: ExpertRow[];
  onChange: React.Dispatch<React.SetStateAction<ExpertRow[]>>;
}> = ({ rows, onChange }) => {
  const [filterForm] = Form.useForm();
  const [editForm] = Form.useForm();
  const [query, setQuery] = useState<Record<string, unknown>>({});
  const [detail, setDetail] = useState<ExpertRow | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<ExpertRow | null>(null);

  const filtered = useMemo(() => {
    const name = String(query.name ?? '').trim();
    const expertise = String(query.expertise ?? '').trim();
    const org = String(query.org ?? '').trim();
    return rows.filter(r => {
      if (name && !r.name.includes(name)) return false;
      if (expertise && !r.expertise.includes(expertise)) return false;
      if (org && !r.org.includes(org)) return false;
      return true;
    });
  }, [rows, query]);

  const allCols: EcoColumnConfig[] = useMemo(
    () => [
      { key: 'name', title: '姓名', dataIndex: 'name', width: 100 },
      { key: 'expertise', title: '擅长方向', dataIndex: 'expertise', ellipsis: true },
      { key: 'background', title: '专业背景', dataIndex: 'background', ellipsis: true, defaultVisible: false },
      { key: 'org', title: '单位', dataIndex: 'org', ellipsis: true },
      { key: 'title', title: '职称', dataIndex: 'title', width: 100 },
      { key: 'phone', title: '联系方式', dataIndex: 'phone', width: 130 },
      { key: 'operation', title: '操作', width: 148, defaultVisible: true },
    ],
    [],
  );
  const [visibleCols, setVisibleCols] = useState(() => getEcoDefaultVisibleColumnKeys(allCols));
  const columns = useMemo(
    () =>
      buildTableColumnsFromEcoConfig(allCols, visibleCols, record => {
        const row = record as ExpertRow;
        return (
          <Space size="small">
            <Button type="link" size="small" className="action-btn detail" icon={<EyeOutlined />} onClick={() => { setDetail(row); setDetailOpen(true); }}>详情</Button>
            <Button type="link" size="small" className="action-btn edit" icon={<EditOutlined />} onClick={() => { setEditing(row); editForm.setFieldsValue(row); setEditOpen(true); }}>编辑</Button>
          </Space>
        );
      }),
    [allCols, visibleCols, editForm],
  );

  const save = async () => {
    const v = await editForm.validateFields();
    const payload: ExpertRow = { id: editing?.id ?? `ex-${Date.now()}`, ...v };
    if (editing) onChange(prev => prev.map(r => (r.id === editing.id ? payload : r)));
    else onChange(prev => [...prev, payload]);
    message.success(editing ? '已保存' : '已新增');
    setEditOpen(false);
    setEditing(null);
    editForm.resetFields();
  };

  const closeEdit = () => {
    setEditOpen(false);
    setEditing(null);
    editForm.resetFields();
  };

  const del = () => {
    if (!editing) return;
    onChange(prev => prev.filter(r => r.id !== editing.id));
    message.success('已删除');
    closeEdit();
  };

  return (
    <div className="facility-view">
      <Card
        title="应急专家库"
        extra={
          <Space wrap>
            <EcoProtoExportBtn onClick={() => exportRiskTableExcel(filtered as unknown as Record<string, unknown>[], allCols, '应急协同_应急专家库', '应急专家')} />
            <EcoProtoImportBtn />
            <RiskEcoColumnManager columns={allCols} visibleColumns={visibleCols} onChange={setVisibleCols} />
            <Button type="primary" icon={<PlusOutlined />} className="add-btn" onClick={() => { setEditing(null); editForm.resetFields(); setEditOpen(true); }}>新增</Button>
          </Space>
        }
      >
        <Form form={filterForm} style={{ marginBottom: 12 }}>
          <Row gutter={[12, 12]} align="middle">
            <Col xs={24} sm={12} md={8} lg={6}>
              <Form.Item name="name" style={{ marginBottom: 0 }}>
                <Input allowClear placeholder="姓名" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={8} lg={6}>
              <Form.Item name="expertise" style={{ marginBottom: 0 }}>
                <Input allowClear placeholder="擅长方向" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={8} lg={6}>
              <Form.Item name="org" style={{ marginBottom: 0 }}>
                <Input allowClear placeholder="单位" />
              </Form.Item>
            </Col>
            <Col xs={24} style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <Space>
                <Button type="primary" className="search-btn" icon={<SearchOutlined />} onClick={() => { setQuery(filterForm.getFieldsValue()); message.success('已查询'); }}>查询</Button>
                <Button className="secondary-btn" onClick={() => { filterForm.resetFields(); setQuery({}); }}>重置</Button>
              </Space>
            </Col>
          </Row>
        </Form>
        <div className="facility-table-wrap">
          <Table rowKey="id" size="small" scroll={{ x: getEcoTableScrollX(allCols.filter(c => visibleCols.includes(c.key) || c.key === 'operation')) }} pagination={{ defaultPageSize: 10, showTotal: t => `共 ${t} 条` }} columns={columns} dataSource={filtered} />
        </div>
      </Card>
      <Modal title="专家详情" open={detailOpen} onCancel={() => { setDetailOpen(false); setDetail(null); }} footer={null} width={720} destroyOnClose styles={detailModalStyles}>
        {detail && (
          <Descriptions bordered column={2} size="small" style={{ marginTop: 8 }}>
            <Descriptions.Item label="姓名" span={2}><Text strong>{detail.name}</Text></Descriptions.Item>
            <Descriptions.Item label="单位">{detail.org}</Descriptions.Item>
            <Descriptions.Item label="职称">{detail.title}</Descriptions.Item>
            <Descriptions.Item label="擅长方向" span={2}>{detail.expertise}</Descriptions.Item>
            <Descriptions.Item label="专业背景" span={2}>{detail.background}</Descriptions.Item>
            <Descriptions.Item label="联系方式">{detail.phone}</Descriptions.Item>
          </Descriptions>
        )}
      </Modal>
      <Modal
        title={editing ? '编辑专家' : '新增专家'}
        open={editOpen}
        onCancel={closeEdit}
        width={920}
        destroyOnClose
        styles={formModalStyles}
        footer={
          <Space>
            {editing ? (
              <Popconfirm title="确认删除？" onConfirm={del}>
                <Button danger>删除</Button>
              </Popconfirm>
            ) : null}
            <Button className="secondary-btn" onClick={closeEdit}>取消</Button>
            <Button type="primary" onClick={() => void save()}>保存</Button>
          </Space>
        }
      >
        <Form form={editForm} layout="vertical" preserve={false} className="risk-ident-edit-form">
          <Row gutter={RISK_EDIT_FORM_ROW_GUTTER}>
            <Col xs={24} sm={12}>
              <Form.Item name="name" label="姓名" rules={[{ required: true }]}>
                <Input />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name="org" label="单位" rules={[{ required: true }]}>
                <Input />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name="title" label="职称" rules={[{ required: true }]}>
                <Input />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name="phone" label="联系方式" rules={[{ required: true }]}>
                <Input />
              </Form.Item>
            </Col>
            <Col xs={24} sm={24}>
              <Form.Item name="expertise" label="擅长方向" rules={[{ required: true }]}>
                <TextArea rows={2} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={24}>
              <Form.Item name="background" label="专业背景" rules={[{ required: true }]}>
                <TextArea rows={3} />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>
    </div>
  );
};

// ========== 路由 ==========
export type RiskMenuKey =
  | 'risk-enterprise'
  | 'emergency-supply'
  | 'social-supply'
  | 'emergency-plan'
  | 'emergency-team'
  | 'expert';

export const RiskIdentificationRouter: React.FC<{
  activeSubMenu: RiskMenuKey;
  data: RiskDataBundle;
  setData: React.Dispatch<React.SetStateAction<RiskDataBundle>>;
}> = ({ activeSubMenu, data, setData }) => {
  const setEnterprises = useCallback((u: React.SetStateAction<RiskEnterpriseRow[]>) => {
    setData(d => ({ ...d, enterprises: typeof u === 'function' ? u(d.enterprises) : u }));
  }, [setData]);
  const setSocial = useCallback((u: React.SetStateAction<SocialSupplyPointRow[]>) => {
    setData(d => ({ ...d, socialPoints: typeof u === 'function' ? u(d.socialPoints) : u }));
  }, [setData]);
  const setSupplies = useCallback((u: React.SetStateAction<EmergencySupplyRow[]>) => {
    setData(d => ({ ...d, supplies: typeof u === 'function' ? u(d.supplies) : u }));
  }, [setData]);
  const setPlans = useCallback((u: React.SetStateAction<EmergencyPlanRow[]>) => {
    setData(d => ({ ...d, plans: typeof u === 'function' ? u(d.plans) : u }));
  }, [setData]);
  const setTeams = useCallback((u: React.SetStateAction<EmergencyTeamRow[]>) => {
    setData(d => ({ ...d, teams: typeof u === 'function' ? u(d.teams) : u }));
  }, [setData]);
  const setExperts = useCallback((u: React.SetStateAction<ExpertRow[]>) => {
    setData(d => ({ ...d, experts: typeof u === 'function' ? u(d.experts) : u }));
  }, [setData]);

  switch (activeSubMenu) {
    case 'risk-enterprise':
      return <RiskEnterprisePage rows={data.enterprises} onChange={setEnterprises} />;
    case 'emergency-supply':
      return <EmergencySupplyPage rows={data.supplies} socialPoints={data.socialPoints} onChange={setSupplies} />;
    case 'social-supply':
      return <SocialSupplyPointPage rows={data.socialPoints} supplies={data.supplies} onChange={setSocial} />;
    case 'emergency-plan':
      return <EmergencyPlanPage rows={data.plans} onChange={setPlans} />;
    case 'emergency-team':
      return <EmergencyTeamPage rows={data.teams} onChange={setTeams} />;
    case 'expert':
      return <ExpertPage rows={data.experts} onChange={setExperts} />;
    default:
      return null;
  }
};
