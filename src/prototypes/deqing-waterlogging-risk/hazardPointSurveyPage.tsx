import React, { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Col,
  DatePicker,
  Form,
  Input,
  InputNumber,
  Modal,
  Row,
  Select,
  Space,
  Table,
  Tag,
  Tabs,
  Tooltip,
  Typography,
  message,
  Progress,
  Divider,
} from 'antd';
import {
  PlusOutlined,
  SearchOutlined,
  EditOutlined,
  EyeOutlined,
  QuestionCircleOutlined,
  StarFilled,
  StarOutlined,
  TableOutlined,
} from '@ant-design/icons';
import dayjs, { type Dayjs } from 'dayjs';
import type { ColumnsType } from 'antd/es/table';
import {
  HAZARD_POINT_TYPE_LABEL,
  emptyAssessmentPayload,
  emptySurveyPayload,
  type IndicatorRiskLevelRow,
  type IndicatorArchitectureRecord,
  type Level1Weights,
  type RegionalPreventionConfig,
  type RegionalPreventionRecord,
  type RiskIndicatorRow,
  type RiskLevelVersionRecord,
  type SurveyPointType,
  type RiskChangeLogEntry,
  type WaterloggingPointRegistryRow,
  type WaterloggingPointRow,
} from './types';
import { createRiskChangeLogEntry } from './riskChangeLogUtils';
import { getActiveRegionalPreventionRecord } from './regionalPreventionUtils';
import {
  buildRatingContextForPoint,
  computeSurveyRatingPreview,
  type SurveyRatingContext,
  type SurveyRatingPreview,
} from './surveyRatingUtils';
import { SurveyRatingPreviewPanel } from './SurveyRatingPreviewPanel';
import { DynamicSurveyFields } from './dynamicSurveyFields';
import { AppendixBSurveyFields } from './appendixBSurveyFields';
import {
  hydrateAppendixBFromIndicatorValues,
  pushBasicInfoToSiblingSurveys,
  syncAppendixBToIndicatorValues,
} from './appendixBSync';
import {
  calcSurveyCoverage,
  getArchitectureScopedSurveyIndicatorsForFill,
  getPointSurveyIndicatorsForFill,
  getPointSurveyIndicatorsForPoint,
  isPointSurveyComplete,
  validateSurveyRequired,
} from './indicatorSurveyUtils';
import { collectNumericRangeErrors, getNumericRangeError } from './numericIndicatorConstraints';
import { listAppendixBConditionFieldsForPointType } from './appendixBConditionFields';
import { collectDesignPeriodErrors } from './designReturnPeriod';
import { nowSurveyCollectedAt } from './surveyCollectedAt';
import { SURVEY_FIELD_GRID_CLASS, SURVEY_MODAL_FORM_CLASS, surveyFieldGridRow } from './surveyFormLayout';
import {
  CREATE_SURVEY_DIVISION_OPTIONS,
  DEQING_COUNTY_CODE,
} from '../../database/deqing-waterlogging-risk-indicators';
import { waterloggingPointRegistry } from '../../database/deqing-waterlogging-point-registry';
import {
  getActiveSurveySibling,
  normalizeSurveyActiveRefs,
  resolveSurveyAt,
  setActiveSurveyRecord,
  sortSurveyRecords,
} from './waterloggingSurveyUtils';
import {
  mergeIndicatorsForArchitectureRecord,
  resolveSurveyArchitectureRecord,
} from './indicatorArchitectureUtils';
import {
  ArchitectureVersionSelect,
  resolveSelectedArchitectureRecord,
} from './ArchitectureVersionSelect';
import { ArchitectureVersionRefTag } from './ArchitectureVersionRefTag';
import { ArchitectureVersionTag } from './ArchitectureVersionTag';
import { RiskLevelVersionTag } from './RiskLevelVersionTag';
import { ArchitectureVersionRefAlert } from './ArchitectureVersionRefAlert';
import { RiskLevelVersionRefAlert } from './RiskLevelVersionRefAlert';
import { SurveyTablePreviewModal } from './SurveyTablePreviewModal';
import { SurveyPdfAttachmentField } from './SurveyPdfAttachmentField';

const { Text } = Typography;
const { RangePicker } = DatePicker;

function pointToFormValues(row: WaterloggingPointRow, indicators: RiskIndicatorRow[]) {
  const at = resolveSurveyAt(row);
  const surveyPayload = hydrateAppendixBFromIndicatorValues(
    row.surveyPayload,
    row.pointType,
    indicators,
  );
  return {
    registryId: row.registryId,
    pointCode: row.pointCode,
    name: row.name,
    pointType: row.pointType,
    townCode: row.townCode,
    address: row.address,
    lng: row.lng,
    lat: row.lat,
    surveyAt: at ? dayjs(at) : dayjs(),
    label: row.label ?? '',
    surveyPayload,
  };
}

interface Props {
  points: WaterloggingPointRow[];
  onChange: (rows: WaterloggingPointRow[]) => void;
  /** 指标定义层 */
  baseIndicators: RiskIndicatorRow[];
  architectureRecords: IndicatorArchitectureRecord[];
  /** 当前定级引用架构（新增普查绑定此方案） */
  ratingArchitectureRecord: IndicatorArchitectureRecord | null;
  /** 定级计分用指标（merge 当前定级引用架构） */
  ratingIndicators: RiskIndicatorRow[];
  pointRegistry: WaterloggingPointRegistryRow[];
  indicatorLevels: IndicatorRiskLevelRow[];
  /** 定级用一级权重（来自定级引用架构） */
  ratingLevel1Weights: Level1Weights;
  regionalPrevention: RegionalPreventionConfig | null;
  regionalPreventionRecords?: RegionalPreventionRecord[];
  activeArchitectureRecord?: IndicatorArchitectureRecord | null;
  activeRiskLevelRecord?: RiskLevelVersionRecord | null;
  riskLevelRecords?: RiskLevelVersionRecord[];
  riskChangeLogs?: RiskChangeLogEntry[];
  /** 定级确认后追加风险变更日志 */
  onAppendRiskChangeLog?: (entry: RiskChangeLogEntry) => void;
  onViewArchitectureDetail?: (record: IndicatorArchitectureRecord) => void;
  onViewRiskLevelDetail?: (record: RiskLevelVersionRecord) => void;
}

function applyRegistryToForm(
  form: ReturnType<typeof Form.useForm>[0],
  registry: WaterloggingPointRegistryRow,
) {
  form.setFieldsValue({
    registryId: registry.id,
    pointCode: registry.pointCode,
    name: registry.name,
    pointType: registry.pointType,
    townCode: registry.townCode,
    address: registry.address,
    lng: registry.lng,
    lat: registry.lat,
  });
}

export const HazardPointSurveyPage: React.FC<Props> = ({
  points,
  onChange,
  baseIndicators,
  architectureRecords,
  ratingArchitectureRecord,
  ratingIndicators,
  pointRegistry,
  indicatorLevels,
  ratingLevel1Weights,
  regionalPrevention,
  regionalPreventionRecords = [],
  activeArchitectureRecord = null,
  activeRiskLevelRecord = null,
  riskLevelRecords = [],
  riskChangeLogs = [],
  onAppendRiskChangeLog,
  onViewArchitectureDetail,
  onViewRiskLevelDetail,
}) => {
  const surveyArchScope = { architectureScoped: true } as const;

  const resolveSurveyIndicators = useCallback(
    (row: Pick<WaterloggingPointRow, 'surveyArchitectureRefId'> | null) => {
      const arch = resolveSurveyArchitectureRecord(
        architectureRecords,
        row?.surveyArchitectureRefId,
        ratingArchitectureRecord,
      );
      return mergeIndicatorsForArchitectureRecord(baseIndicators, arch);
    },
    [architectureRecords, baseIndicators, ratingArchitectureRecord],
  );

  const activePreventionRecord = useMemo(
    () => getActiveRegionalPreventionRecord(regionalPreventionRecords, ratingArchitectureRecord),
    [regionalPreventionRecords, ratingArchitectureRecord],
  );

  const buildRatingCtx = useCallback(
    (row: WaterloggingPointRow): SurveyRatingContext =>
      buildRatingContextForPoint({
        pt: row,
        baseIndicators,
        architectureRecords,
        riskLevelRecords,
        regionalPreventionRecords,
        riskChangeLogs,
        currentArchitectureRecord: activeArchitectureRecord,
        currentRiskLevelRecord: activeRiskLevelRecord,
      }),
    [
      baseIndicators,
      architectureRecords,
      riskLevelRecords,
      regionalPreventionRecords,
      riskChangeLogs,
      activeArchitectureRecord,
      activeRiskLevelRecord,
    ],
  );

  const [registryFilter, setRegistryFilter] = useState('');
  const [selectedArchitectureId, setSelectedArchitectureId] = useState('');
  const [surveyDateRange, setSurveyDateRange] = useState<[Dayjs | null, Dayjs | null] | null>(null);
  const [typeFilter, setTypeFilter] = useState<SurveyPointType | ''>('');
  const [statusFilter, setStatusFilter] = useState<'' | 'completed' | 'draft'>('');
  const [modalOpen, setModalOpen] = useState(false);
  const [tablePreviewOpen, setTablePreviewOpen] = useState(false);
  const [detailOnly, setDetailOnly] = useState(false);
  const [editing, setEditing] = useState<WaterloggingPointRow | null>(null);
  const [ratingModalOpen, setRatingModalOpen] = useState(false);
  const [ratingPreview, setRatingPreview] = useState<SurveyRatingPreview | null>(null);
  const [ratingPendingPoints, setRatingPendingPoints] = useState<WaterloggingPointRow[] | null>(null);
  /** 打开定级确认时是否已是「数据引用」版本（用于确认后推送内涝基本信息） */
  const [ratingWasDataRef, setRatingWasDataRef] = useState(false);
  const [ratingCtxForModal, setRatingCtxForModal] = useState<SurveyRatingContext | null>(null);
  const [form] = Form.useForm();

  const modalSurveyIndicators = useMemo(
    () => resolveSurveyIndicators(editing),
    [editing, resolveSurveyIndicators],
  );

  const tablePreviewArchitectureRecord = useMemo(
    () =>
      resolveSelectedArchitectureRecord(
        architectureRecords,
        selectedArchitectureId,
        ratingArchitectureRecord,
      ),
    [architectureRecords, selectedArchitectureId, ratingArchitectureRecord],
  );

  const tablePreviewIndicators = useMemo(
    () => mergeIndicatorsForArchitectureRecord(baseIndicators, tablePreviewArchitectureRecord),
    [baseIndicators, tablePreviewArchitectureRecord],
  );

  const modalArchitectureRecord = useMemo(() => {
    if (editing) {
      return resolveSurveyArchitectureRecord(
        architectureRecords,
        editing.surveyArchitectureRefId,
        ratingArchitectureRecord,
      );
    }
    return tablePreviewArchitectureRecord;
  }, [editing, architectureRecords, ratingArchitectureRecord, tablePreviewArchitectureRecord]);

  const sorted = useMemo(() => sortSurveyRecords(points), [points]);

  const surveyCountByRegistry = useMemo(() => {
    const map = new Map<string, number>();
    for (const p of points) {
      map.set(p.registryId, (map.get(p.registryId) ?? 0) + 1);
    }
    return map;
  }, [points]);

  const registryOptions = useMemo(() => {
    const ids = new Set(points.map(p => p.registryId));
    return waterloggingPointRegistry
      .filter(r => ids.has(r.id))
      .sort((a, b) => a.pointCode.localeCompare(b.pointCode))
      .map(r => ({
        value: r.id,
        label: `${r.pointCode} · ${r.name}`,
      }));
  }, [points]);

  const filtered = useMemo(() => {
    const from = surveyDateRange?.[0]?.startOf('day').format('YYYY-MM-DD HH:mm:ss');
    const to = surveyDateRange?.[1]?.endOf('day').format('YYYY-MM-DD HH:mm:ss');
    return sorted.filter(p => {
      if (statusFilter && p.surveyStatus !== statusFilter) return false;
      if (typeFilter && p.pointType !== typeFilter) return false;
      if (registryFilter && p.registryId !== registryFilter) return false;
      const at = resolveSurveyAt(p);
      if (from && at < from) return false;
      if (to && at > to) return false;
      if (selectedArchitectureId && p.surveyArchitectureRefId !== selectedArchitectureId) {
        return false;
      }
      return true;
    });
  }, [sorted, registryFilter, surveyDateRange, typeFilter, statusFilter, selectedArchitectureId]);

  const registryOptionsForCreate = useMemo(() => {
    return pointRegistry.map(r => {
      const count = surveyCountByRegistry.get(r.id) ?? 0;
      const suffix = count > 0 ? ` · 已有 ${count} 条普查` : '';
      return {
        value: r.id,
        label: `${r.pointCode} · ${r.name}（${HAZARD_POINT_TYPE_LABEL[r.pointType]}）${suffix}`,
      };
    });
  }, [pointRegistry, surveyCountByRegistry]);

  const openCreate = () => {
    const selectedArch = resolveSelectedArchitectureRecord(
      architectureRecords,
      selectedArchitectureId,
      ratingArchitectureRecord,
    );
    if (!selectedArch || selectedArch.config.status !== 'completed') {
      message.warning('请先在下拉中选择一条已完成的评价版本，再新增普查');
      return;
    }
    setEditing(null);
    setDetailOnly(false);
    form.resetFields();
    const now = nowSurveyCollectedAt();
    const empty = emptySurveyPayload();
    form.setFieldsValue({
      surveyAt: dayjs(),
      label: '',
      surveyPayload: {
        ...empty,
        appendixB: { ...empty.appendixB, collectedAt: now },
      },
    });
    setModalOpen(true);
  };

  const patchPoints = (next: WaterloggingPointRow[]) => {
    onChange(normalizeSurveyActiveRefs(next, baseIndicators));
  };

  const handleSetActive = (row: WaterloggingPointRow) => {
    if (row.surveyStatus !== 'completed') {
      message.warning('仅已完成的普查记录可设为数据引用');
      return;
    }
    if (row.ratingStatus !== 'completed') {
      message.warning('没有定级不可引用');
      return;
    }
    const replaced = getActiveSurveySibling(points, row);
    const withActive = setActiveSurveyRecord(points, row.id);
    const target = withActive.find(p => p.id === row.id)!;
    const synced = syncAppendixBToIndicatorValues(
      target.surveyPayload,
      target.pointType,
      resolveSurveyIndicators(target),
    );
    patchPoints(
      pushBasicInfoToSiblingSurveys(withActive, { ...target, surveyPayload: synced }, resolveSurveyIndicators(target)),
    );
    message.success(
      replaced
        ? `已替换数据引用并同步内涝基本信息（原：${resolveSurveyAt(replaced)}${replaced.label ? ` · ${replaced.label}` : ''}）`
        : '已设为数据引用，并已同步推送至内涝基本信息',
    );
  };

  const applySurveyToPoints = (list: WaterloggingPointRow[], row: WaterloggingPointRow) => {
    if (editing) return list.map(p => (p.id === editing.id ? row : p));
    return [...list, row];
  };

  const openRatingConfirm = (row: WaterloggingPointRow, baseList?: WaterloggingPointRow[]) => {
    const list = baseList ?? points;
    setRatingWasDataRef(row.activeForRating);
    const withActive = setActiveSurveyRecord(list, row.id);
    const target = withActive.find(p => p.id === row.id) ?? row;
    const ctx = buildRatingCtx(target);
    const preview = computeSurveyRatingPreview({ ...target, activeForRating: true }, ctx);
    setRatingCtxForModal(ctx);
    setRatingPendingPoints(withActive);
    setRatingPreview(preview);
    setRatingModalOpen(true);
  };

  const handleConfirmRating = () => {
    if (!ratingPreview?.ok || !ratingPreview.ratedRow || !ratingPendingPoints) {
      message.warning('请先解决试算提示中的问题');
      return;
    }
    const prevRow = points.find(p => p.id === ratingPreview.ratedRow!.id);
    const prevRating = prevRow?.ratingResult ?? null;
    const syncedPayload = syncAppendixBToIndicatorValues(
      ratingPreview.ratedRow.surveyPayload,
      ratingPreview.ratedRow.pointType,
      resolveSurveyIndicators(ratingPreview.ratedRow),
    );
    const finalRow = {
      ...ratingPreview.ratedRow,
      activeForRating: true,
      surveyPayload: syncedPayload,
    };
    let merged = ratingPendingPoints.map(p => (p.id === finalRow.id ? finalRow : p));
    merged = setActiveSurveyRecord(merged, finalRow.id);
    const shouldPushBasicInfo = ratingWasDataRef;
    if (shouldPushBasicInfo) {
      merged = pushBasicInfoToSiblingSurveys(merged, finalRow, resolveSurveyIndicators(finalRow));
    }
    const ctx = ratingCtxForModal;
    const logEntry = createRiskChangeLogEntry(finalRow, {
      prev: prevRating,
      basicInfoSynced: shouldPushBasicInfo,
      preventionRefAt: ctx?.preventionRefAt ?? ctx?.activePreventionRecord?.configAt,
      preventionVersionNo:
        ctx?.preventionVersionNo ?? ctx?.activePreventionRecord?.versionNo,
      architectureRefAt: ctx?.activeArchitectureRecord?.configAt,
      riskLevelVersionNo: ctx?.activeRiskLevelRecord?.versionNo,
      operator: finalRow.collector,
      indicatorLevels: ctx?.indicatorLevels ?? indicatorLevels,
    });
    if (logEntry && onAppendRiskChangeLog) {
      onAppendRiskChangeLog(logEntry);
    }
    patchPoints(merged);
    setRatingModalOpen(false);
    setRatingPreview(null);
    setRatingPendingPoints(null);
    setRatingWasDataRef(false);
    setRatingCtxForModal(null);
    message.success(
      `已确认定级：${finalRow.ratingResult!.levelName}（V=${finalRow.ratingResult!.v.toFixed(4)}${
        finalRow.ratingResult!.partial ? '，部分指标参与' : ''
      }${shouldPushBasicInfo ? '；已同步推送至内涝基本信息（同易涝点各普查记录）' : ''}`,
    );
  };

  const handleRate = (row: WaterloggingPointRow) => {
    openRatingConfirm(row);
  };

  const openDetail = (row: WaterloggingPointRow) => {
    setEditing(row);
    setDetailOnly(true);
    form.setFieldsValue(pointToFormValues(row, resolveSurveyIndicators(row)));
    setModalOpen(true);
  };

  const openEdit = (row: WaterloggingPointRow) => {
    setEditing(row);
    setDetailOnly(false);
    form.setFieldsValue(pointToFormValues(row, resolveSurveyIndicators(row)));
    setModalOpen(true);
  };

  const handleRegistrySelect = (registryId: string) => {
    const registry = pointRegistry.find(r => r.id === registryId);
    if (!registry) return;
    applyRegistryToForm(form, registry);
  };

  const clearRegistrySelection = () => {
    form.setFieldsValue({
      registryId: undefined,
      pointCode: undefined,
      name: undefined,
      pointType: undefined,
      townCode: undefined,
      address: undefined,
      lng: undefined,
      lat: undefined,
    });
  };

  const handleCreateTownChange = () => {
    clearRegistrySelection();
  };

  const handleSave = async () => {
    const values = await form.validateFields();
    const registry = pointRegistry.find(r => r.id === values.registryId);
    if (!registry) {
      message.error('请选择易涝点');
      return;
    }

    const pointType = registry.pointType;
    const payload = syncAppendixBToIndicatorValues(
      values.surveyPayload ?? emptySurveyPayload(),
      pointType,
      modalSurveyIndicators,
    );
    const pointIndicators = getPointSurveyIndicatorsForPoint(modalSurveyIndicators, pointType, surveyArchScope);
    const coverageIndicators = getArchitectureScopedSurveyIndicatorsForFill(modalSurveyIndicators, pointType);
    const indicatorValues = payload.indicatorValues ?? {};
    const numericErrors = collectNumericRangeErrors(coverageIndicators, indicatorValues);
    for (const field of listAppendixBConditionFieldsForPointType(pointType, modalSurveyIndicators)) {
      if (field.kind !== 'numeric') continue;
      const raw = payload.appendixB?.[field.key as keyof typeof payload.appendixB];
      const err = getNumericRangeError(field.key, raw as number | undefined);
      if (err) numericErrors.push(`${field.label}：${err}`);
    }
    const designErrors = collectDesignPeriodErrors(
      pointIndicators,
      indicatorValues,
      payload.appendixB?.areaImportance,
    );
    const validationErrors = [...numericErrors, ...designErrors];
    if (validationErrors.length > 0) {
      message.error(validationErrors[0]);
      return;
    }
    const indicatorValuesForSave = payload.indicatorValues ?? {};
    const { ok, missing } = validateSurveyRequired(
      modalSurveyIndicators,
      pointType,
      indicatorValuesForSave,
      surveyArchScope,
    );
    const coverage = calcSurveyCoverage(
      modalSurveyIndicators,
      pointType,
      indicatorValuesForSave,
      surveyArchScope,
    );
    const surveyComplete =
      ok &&
      isPointSurveyComplete(modalSurveyIndicators, pointType, indicatorValuesForSave, surveyArchScope);

    const surveyAt = (values.surveyAt as Dayjs).format('YYYY-MM-DD HH:mm:ss');
    const syncedPayload = {
      ...payload,
      appendixB: { ...payload.appendixB, collectedAt: surveyAt },
    };

    const pinnedArch = editing?.surveyArchitectureRefId
      ? resolveSurveyArchitectureRecord(
          architectureRecords,
          editing.surveyArchitectureRefId,
          ratingArchitectureRecord,
        )
      : resolveSelectedArchitectureRecord(
          architectureRecords,
          selectedArchitectureId,
          ratingArchitectureRecord,
        );

    const row: WaterloggingPointRow = {
      id: editing?.id ?? `pt-${Date.now()}`,
      registryId: registry.id,
      pointCode: registry.pointCode,
      name: registry.name,
      pointType: registry.pointType,
      townCode: registry.townCode,
      address: registry.address,
      lng: registry.lng,
      lat: registry.lat,
      surveyPayload: syncedPayload,
      surveyStatus: surveyComplete ? 'completed' : 'draft',
      assessmentStatus: editing?.assessmentStatus ?? 'none',
      assessmentPayload: editing?.assessmentPayload ?? emptyAssessmentPayload(),
      ratingStatus: editing?.ratingStatus ?? 'none',
      ratingResult: editing?.ratingResult,
      collector: syncedPayload.appendixB?.collectorName ?? editing?.collector,
      collectedAt: surveyAt,
      surveyAt,
      label: (values.label as string | undefined)?.trim() || undefined,
      activeForRating: editing?.activeForRating ?? false,
      surveyArchitectureRefId: pinnedArch?.id ?? editing?.surveyArchitectureRefId,
      surveyArchitectureRefAt: pinnedArch?.configAt ?? editing?.surveyArchitectureRefAt,
      surveyArchitectureVersionNo: pinnedArch?.versionNo ?? editing?.surveyArchitectureVersionNo,
    };

    const baseList = applySurveyToPoints(points, row);

    if (!surveyComplete) {
      if (!ok) {
        message.warning(
          `仍有必填指标未填写：${missing.slice(0, 3).join('、')}${missing.length > 3 ? '…' : ''}`,
        );
      } else {
        message.warning(
          `指标普查完整度 ${coverage.percent}%（${coverage.filled}/${coverage.applicable}），请补全全部纳入普查的指标后方可定级`,
        );
      }
      patchPoints(baseList);
      setModalOpen(false);
      return;
    }

    const withActive = setActiveSurveyRecord(baseList, row.id);
    const saved = withActive.find(p => p.id === row.id)!;
    patchPoints(withActive);
    setModalOpen(false);
    message.success('普查已保存');
    openRatingConfirm({ ...saved, activeForRating: true }, withActive);
  };

  const columns: ColumnsType<WaterloggingPointRow> = [
    {
      title: '普查时间',
      width: 168,
      render: (_, row) => (
        <Space direction="vertical" size={0}>
          <span>{resolveSurveyAt(row)}</span>
          {row.label ? (
            <Text type="secondary" style={{ fontSize: 12 }}>
              {row.label}
            </Text>
          ) : null}
        </Space>
      ),
    },
    {
      title: '易涝点',
      width: 200,
      ellipsis: true,
      render: (_, row) => (
        <Space direction="vertical" size={0}>
          <span>{row.name}</span>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {row.pointCode}
          </Text>
        </Space>
      ),
    },
    {
      title: '点位类型',
      dataIndex: 'pointType',
      width: 130,
      render: (t: SurveyPointType) => HAZARD_POINT_TYPE_LABEL[t],
    },
    {
      title: '评价版本',
      width: 96,
      render: (_, r) => {
        const versionNo =
          r.surveyArchitectureVersionNo ??
          architectureRecords.find(a => a.id === r.surveyArchitectureRefId)?.versionNo;
        return <ArchitectureVersionTag versionNo={versionNo} />;
      },
    },
    {
      title: '等级版本',
      width: 96,
      render: (_, r) => {
        const versionNo = r.ratingResult?.riskLevelVersionNo;
        return <RiskLevelVersionTag versionNo={versionNo} />;
      },
    },
    {
      title: '状态',
      width: 88,
      render: (_, r) => (
        <Tag color={r.surveyStatus === 'completed' ? 'success' : 'default'}>
          {r.surveyStatus === 'completed' ? '已完成' : '草稿'}
        </Tag>
      ),
    },
    {
      title: '数据完整度',
      width: 120,
      render: (_, r) => {
        const rowIndicators = resolveSurveyIndicators(r);
        const c = calcSurveyCoverage(
          rowIndicators,
          r.pointType,
          r.surveyPayload?.indicatorValues,
          surveyArchScope,
        );
        return <Progress percent={c.percent} size="small" />;
      },
    },
    {
      title: (
        <span>
          数据引用
          <Tooltip title="表示内涝基本信息的数据同步使用的是这份普查数据">
            <QuestionCircleOutlined
              style={{ marginLeft: 4, color: 'rgba(0,0,0,0.45)', fontSize: 13, cursor: 'help' }}
            />
          </Tooltip>
        </span>
      ),
      width: 108,
      render: (_, row) =>
        row.activeForRating ? (
          <Tag color="blue" icon={<StarFilled />}>
            当前引用
          </Tag>
        ) : (
          '—'
        ),
    },
    {
      title: '定级结果',
      width: 120,
      render: (_, r) =>
        r.ratingStatus === 'completed' && r.ratingResult ? (
          <Tooltip
            title={
              [
                r.ratingResult.architectureVersionNo
                  ? `评分方案：${r.ratingResult.architectureVersionNo}`
                  : r.ratingResult.architectureRefAt
                    ? `评分方案：${r.ratingResult.architectureRefAt}`
                    : null,
                r.ratingResult.riskLevelVersionNo
                  ? `等级方案：${r.ratingResult.riskLevelVersionNo}`
                  : r.ratingResult.riskLevelRefAt
                    ? `等级方案：${r.ratingResult.riskLevelRefAt}`
                    : null,
              ]
                .filter(Boolean)
                .join(' · ') || undefined
            }
          >
            <Space direction="vertical" size={0}>
              <Tag color={r.ratingResult.color}>{r.ratingResult.levelName}</Tag>
              <Text type="secondary" style={{ fontSize: 12 }}>
                V={r.ratingResult.v.toFixed(4)}
              </Text>
            </Space>
          </Tooltip>
        ) : (
          <Tag>未定级</Tag>
        ),
    },
    {
      title: '操作',
      width: 220,
      fixed: 'right',
      render: (_, row) => (
        <Space size={4} wrap={false}>
          <Button
            type="link"
            size="small"
            icon={<EyeOutlined />}
            className="action-btn"
            onClick={() => openDetail(row)}
          >
            详情
          </Button>
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            className="action-btn"
            onClick={() => openEdit(row)}
          >
            编辑
          </Button>
          {row.surveyStatus === 'completed' &&
          isPointSurveyComplete(
            resolveSurveyIndicators(row),
            row.pointType,
            row.surveyPayload?.indicatorValues,
            surveyArchScope,
          ) ? (
            <Tooltip
              title={
                row.ratingStatus === 'completed'
                  ? [
                      '沿用上次定级锁定的评价版本与等级版本重新计分（考核 KPI 不追溯换标），不随页顶当前定级引用变更；仅根据最新普查数据重算结果。',
                      row.ratingResult?.architectureVersionNo
                        ? `锁定评价版本：${row.ratingResult.architectureVersionNo}`
                        : null,
                      row.ratingResult?.riskLevelVersionNo
                        ? `锁定等级版本：${row.ratingResult.riskLevelVersionNo}`
                        : null,
                    ]
                      .filter(Boolean)
                      .join(' ')
                  : [
                      '按页顶当前定级引用的评价版本与等级版本，根据已完成的普查数据计算风险等级。',
                      ratingArchitectureRecord?.versionNo
                        ? `评价版本：${ratingArchitectureRecord.versionNo}`
                        : null,
                      activeRiskLevelRecord?.versionNo
                        ? `等级版本：${activeRiskLevelRecord.versionNo}`
                        : null,
                    ]
                      .filter(Boolean)
                      .join(' ')
              }
            >
              <Button type="link" size="small" className="action-btn" onClick={() => handleRate(row)}>
                {row.ratingStatus === 'completed' ? '更新定级' : '定级'}
              </Button>
            </Tooltip>
          ) : null}
          {!row.activeForRating && row.surveyStatus === 'completed' ? (
            <Tooltip
              title={
                row.ratingStatus !== 'completed'
                  ? '没有定级不可引用'
                  : getActiveSurveySibling(points, row)
                    ? `同易涝点仅可数据引用一条普查记录，将替换当前引用（${resolveSurveyAt(getActiveSurveySibling(points, row)!)}）`
                    : '设为该易涝点的数据引用版本（内涝基本信息将同步本份普查数据）'
              }
            >
              <Button
                type="link"
                size="small"
                icon={<StarOutlined />}
                className="action-btn"
                disabled={row.ratingStatus !== 'completed'}
                onClick={() => handleSetActive(row)}
              >
                引用
              </Button>
            </Tooltip>
          ) : null}
        </Space>
      ),
    },
  ];

  const pointTypeWatch = Form.useWatch('pointType', form) as SurveyPointType | undefined;
  const registryIdWatch = Form.useWatch('registryId', form) as string | undefined;
  const createTownCodeWatch = Form.useWatch('createTownCode', form) as string | undefined;
  const isCreate = !editing;

  const filteredRegistryOptionsForCreate = useMemo(() => {
    if (!createTownCodeWatch) return [];
    if (createTownCodeWatch === DEQING_COUNTY_CODE) return registryOptionsForCreate;
    return registryOptionsForCreate.filter(opt => {
      const row = pointRegistry.find(r => r.id === opt.value);
      return row?.townCode === createTownCodeWatch;
    });
  }, [registryOptionsForCreate, createTownCodeWatch, pointRegistry]);

  return (
    <div className="dq-risk-page dq-survey-timeline-page">
      {(!regionalPrevention || regionalPrevention.assessmentStatus !== 'completed') && (
        <Alert
          type="warning"
          showIcon
          style={{ marginBottom: 12 }}
          message="全县防灾减灾指标信息未完成"
          description={
            ratingArchitectureRecord
              ? `请先在「防灾减灾指标信息」中，于当前定级引用架构 ${ratingArchitectureRecord.versionNo} 下完成填报并「设为 V₄ 数据引用」，否则普查保存后无法自动定级。`
              : '请先在「防灾减灾指标信息」中完成一条记录并「设为 V₄ 数据引用」，否则普查保存后无法自动定级。'
          }
        />
      )}
      {!ratingArchitectureRecord ? (
        <Alert
          type="warning"
          showIcon
          style={{ marginBottom: 12 }}
          message="尚未配置定级引用考核方案"
          description="请先在「指标评价管理」中完成权重配置并设为定级引用；新增普查须先确定采用哪套评价版本，评价版本决定须填报哪些指标。"
        />
      ) : null}

      {!activeRiskLevelRecord || activeRiskLevelRecord.config.status !== 'completed' ? (
        <Alert
          type="warning"
          showIcon
          style={{ marginBottom: 12 }}
          message="尚未配置定级引用等级方案"
          description="请先在「风险等级管理」中完成等级区间配置并设为定级引用，否则无法完成定级。"
        />
      ) : null}

      <ArchitectureVersionRefAlert
        record={ratingArchitectureRecord}
        onViewDetail={onViewArchitectureDetail}
      />

      <RiskLevelVersionRefAlert
        record={activeRiskLevelRecord}
        onViewDetail={onViewRiskLevelDetail}
      />

      <Card bordered={false} className="filter-card">
        <Row gutter={[12, 12]} align="middle">
          <Col xs={24} md={6}>
            <ArchitectureVersionSelect
              records={architectureRecords}
              activeRecord={ratingArchitectureRecord}
              value={selectedArchitectureId}
              onChange={setSelectedArchitectureId}
              allowAll
            />
          </Col>
          <Col xs={24} sm={8} md={6}>
            <Select
              placeholder="选择易涝点"
              allowClear
              showSearch
              optionFilterProp="label"
              style={{ width: '100%' }}
              value={registryFilter || undefined}
              onChange={v => setRegistryFilter(v ?? '')}
              options={registryOptions}
            />
          </Col>
          <Col xs={24} sm={8} md={6}>
            <RangePicker
              style={{ width: '100%' }}
              value={surveyDateRange}
              onChange={vals => setSurveyDateRange(vals as [Dayjs | null, Dayjs | null] | null)}
              showTime={false}
              format="YYYY-MM-DD"
              placeholder={['普查时间起', '普查时间止']}
            />
          </Col>
          <Col xs={24} sm={5}>
            <Select
              style={{ width: '100%' }}
              placeholder="点位类型"
              allowClear
              value={typeFilter || undefined}
              onChange={v => setTypeFilter(v ?? '')}
              options={(['SUNKEN', 'TUNNEL', 'UNDERGROUND', 'LOW_LYING'] as SurveyPointType[]).map(t => ({
                value: t,
                label: HAZARD_POINT_TYPE_LABEL[t],
              }))}
            />
          </Col>
          <Col xs={24} sm={5}>
            <Select
              style={{ width: '100%' }}
              placeholder="普查状态"
              allowClear
              value={statusFilter || undefined}
              onChange={v => setStatusFilter(v ?? '')}
              options={[
                { value: 'completed', label: '已完成' },
                { value: 'draft', label: '草稿' },
              ]}
            />
          </Col>
          <Col flex="auto" style={{ textAlign: 'right' }}>
            <Space wrap>
              <Button type="primary" icon={<SearchOutlined />} className="search-btn">
                查询
              </Button>
              <Button
                onClick={() => {
                  setRegistryFilter('');
                  setSelectedArchitectureId('');
                  setSurveyDateRange(null);
                  setTypeFilter('');
                  setStatusFilter('');
                }}
              >
                重置
              </Button>
              <Button type="primary" icon={<PlusOutlined />} className="add-btn" onClick={openCreate}>
                新增普查
              </Button>
              <Button
                icon={<TableOutlined />}
                disabled={!tablePreviewArchitectureRecord}
                onClick={() => setTablePreviewOpen(true)}
              >
                表格下载
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      <Card bordered={false} style={{ marginTop: 12 }}>
        <Table
          rowKey="id"
          size="small"
          columns={columns}
          dataSource={filtered}
          pagination={{ pageSize: 8, showSizeChanger: false }}
          scroll={{ x: 1200 }}
        />
      </Card>

      <Modal
        title={
          <Space align="center" size="small">
            <span>
              {detailOnly ? '内涝普查定级详情' : editing ? '编辑内涝普查定级' : '新增内涝普查定级'}
            </span>
            <ArchitectureVersionRefTag record={modalArchitectureRecord} />
          </Space>
        }
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        width={900}
        onOk={detailOnly ? undefined : handleSave}
        okText="保存"
        footer={
          detailOnly
            ? [<Button key="close" onClick={() => setModalOpen(false)}>关闭</Button>]
            : undefined
        }
        destroyOnClose
      >
        <Form
          form={form}
          layout="vertical"
          disabled={detailOnly}
          className={`${SURVEY_MODAL_FORM_CLASS}${detailOnly ? ' dq-form-detail-view' : ''}`}
        >
          {editing ? (
            <Space style={{ marginBottom: 12 }} wrap>
              {editing.activeForRating ? <Tag color="blue">数据引用版本</Tag> : null}
              <Tag color={editing.surveyStatus === 'completed' ? 'success' : 'default'}>
                {editing.surveyStatus === 'completed' ? '已完成' : '草稿'}
              </Tag>
              <Text type="secondary">
                {editing.pointCode} · {editing.name}
              </Text>
            </Space>
          ) : null}

          <Tabs
            items={[
              {
                key: 'base',
                label: '基本信息',
                children: (
                  <>
                    {isCreate ? (
                      <Row
                        {...surveyFieldGridRow}
                        className={`${SURVEY_FIELD_GRID_CLASS} dq-survey-picker-stack`}
                      >
                        <Col span={24}>
                          <Form.Item
                            name="createTownCode"
                            label="所属区划"
                            rules={[{ required: true, message: '请选择所属区划' }]}
                          >
                            <Select
                              showSearch
                              placeholder="德清县或乡镇（街道）"
                              options={CREATE_SURVEY_DIVISION_OPTIONS}
                              optionFilterProp="label"
                              onChange={handleCreateTownChange}
                            />
                          </Form.Item>
                        </Col>
                        <Col span={24}>
                          <Form.Item
                            name="registryId"
                            label={
                              <span>
                                选择易涝点（主数据）
                                <Tooltip title="基础信息来自原有系统台账，此处仅建立内涝普查定级记录；名称、类型、地址等不再重复填写。">
                                  <QuestionCircleOutlined
                                    style={{ marginLeft: 6, color: 'rgba(0,0,0,0.45)', fontSize: 13, cursor: 'help' }}
                                  />
                                </Tooltip>
                              </span>
                            }
                            rules={[{ required: true, message: '请从原有系统台账中选择易涝点' }]}
                          >
                            <Select
                              showSearch
                              disabled={!createTownCodeWatch}
                              placeholder={
                                createTownCodeWatch ? '搜索编号或名称' : '请先选择所属区划'
                              }
                              options={filteredRegistryOptionsForCreate}
                              onChange={handleRegistrySelect}
                              filterOption={(input, option) =>
                                (option?.label ?? '').toString().toLowerCase().includes(input.toLowerCase())
                              }
                              notFoundContent={createTownCodeWatch ? '未找到易涝点' : '请先选择所属区划'}
                            />
                          </Form.Item>
                        </Col>
                      </Row>
                    ) : (
                      <>
                        <Form.Item name="registryId" hidden>
                          <Input />
                        </Form.Item>
                        <Text type="secondary" style={{ display: 'block', marginBottom: 12 }}>
                          台账易涝点：{editing?.name}（{editing ? HAZARD_POINT_TYPE_LABEL[editing.pointType] : ''}）
                        </Text>
                      </>
                    )}
                    <Form.Item name="name" hidden>
                      <Input />
                    </Form.Item>
                    <Form.Item name="pointType" hidden>
                      <Input />
                    </Form.Item>
                    <Form.Item name="pointCode" hidden>
                      <Input />
                    </Form.Item>
                    <Form.Item name="townCode" hidden>
                      <Input />
                    </Form.Item>
                    <Form.Item name="address" hidden>
                      <Input />
                    </Form.Item>
                    <Form.Item name="lng" hidden>
                      <InputNumber />
                    </Form.Item>
                    <Form.Item name="lat" hidden>
                      <InputNumber />
                    </Form.Item>

                    {isCreate ? null : <Divider style={{ margin: '16px 0' }} />}
                    <AppendixBSurveyFields
                      form={form}
                      pointType={registryIdWatch && pointTypeWatch ? pointTypeWatch : undefined}
                      indicators={modalSurveyIndicators}
                    />
                  </>
                ),
              },
              {
                key: 'indicators',
                label: '指标普查',
                disabled: isCreate && !registryIdWatch,
                children:
                  pointTypeWatch ? (
                    <DynamicSurveyFields
                      pointType={pointTypeWatch}
                      indicators={modalSurveyIndicators}
                      readOnly={detailOnly}
                    />
                  ) : (
                    <Text type="secondary">请先选择易涝点</Text>
                  ),
              },
            ]}
          />

          <Divider className="dq-survey-meta-divider" />
          <Row {...surveyFieldGridRow} className={`${SURVEY_FIELD_GRID_CLASS} dq-survey-meta-fields`}>
            <Col xs={24} sm={12}>
              <Form.Item
                name="surveyAt"
                label="普查时间"
                rules={[{ required: true, message: '请选择普查时间' }]}
              >
                <DatePicker showTime style={{ width: '100%' }} format="YYYY-MM-DD HH:mm:ss" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name="label" label="批次说明">
                <Input placeholder="可选，如：汛前普查、汛后复核" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name={['surveyPayload', 'appendixB', 'collectorName']} label="采集人姓名">
                <Input />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name={['surveyPayload', 'appendixB', 'collectorUnit']} label="单位">
                <Input />
              </Form.Item>
            </Col>
            <Col span={24}>
              <Form.Item
                name={['surveyPayload', 'appendixB', 'attachments']}
                label="附件"
                extra="支持上传 PDF，用于现场资料、评估表扫描件等；保存后随本条普查记录一并留存。"
              >
                <SurveyPdfAttachmentField disabled={detailOnly} />
              </Form.Item>
            </Col>
            <Col span={24}>
              <Form.Item name={['surveyPayload', 'appendixB', 'remark']} label="备注">
                <Input.TextArea rows={2} disabled={detailOnly} />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>

      <Modal
        title={
          <Space size={8} align="center" wrap>
            <span>{ratingCtxForModal?.mode === 'update' ? '更新定级确认' : '定级确认'}</span>
            <ArchitectureVersionTag
              versionNo={ratingCtxForModal?.activeArchitectureRecord?.versionNo}
              style={{ margin: 0 }}
            />
            <RiskLevelVersionTag
              versionNo={ratingCtxForModal?.activeRiskLevelRecord?.versionNo}
              style={{ margin: 0 }}
            />
          </Space>
        }
        className="dq-rating-confirm-modal"
        open={ratingModalOpen}
        width={1400}
        centered
        style={{ maxWidth: '94vw' }}
        onCancel={() => {
          setRatingModalOpen(false);
          setRatingPreview(null);
          setRatingPendingPoints(null);
          setRatingWasDataRef(false);
          setRatingCtxForModal(null);
        }}
        footer={
          <Space>
            <Button
              onClick={() => {
                setRatingModalOpen(false);
                setRatingPreview(null);
                setRatingPendingPoints(null);
                setRatingWasDataRef(false);
                setRatingCtxForModal(null);
              }}
            >
              取消
            </Button>
            <Button type="primary" disabled={!ratingPreview?.ok} onClick={handleConfirmRating}>
              {ratingCtxForModal?.mode === 'update' ? '确认更新' : '确认定级'}
            </Button>
          </Space>
        }
        destroyOnClose
      >
        {ratingPreview && ratingCtxForModal ? (
          <SurveyRatingPreviewPanel
            preview={ratingPreview}
            level1Weights={ratingCtxForModal.level1Weights}
            indicators={ratingCtxForModal.indicators}
            ratingMode={ratingCtxForModal.mode}
            activeArchitectureRecord={ratingCtxForModal.activeArchitectureRecord}
            activePreventionRecord={ratingCtxForModal.activePreventionRecord}
            activeRiskLevelRecord={ratingCtxForModal.activeRiskLevelRecord}
            currentRatingArchitectureRecord={ratingArchitectureRecord}
            currentRiskLevelRecord={activeRiskLevelRecord}
            pointLabel={
              ratingPreview.ratedRow
                ? `${ratingPreview.ratedRow.name}（${ratingPreview.ratedRow.pointCode}）· ${resolveSurveyAt(ratingPreview.ratedRow)}`
                : undefined
            }
          />
        ) : null}
      </Modal>

      <SurveyTablePreviewModal
        key={tablePreviewArchitectureRecord?.id ?? 'none'}
        open={tablePreviewOpen}
        onClose={() => setTablePreviewOpen(false)}
        indicators={tablePreviewIndicators}
        architectureRecord={tablePreviewArchitectureRecord}
      />
    </div>
  );
};
