import React from 'react';
import type { PreviewTableRow, SurveyTablePreviewModel } from './surveyTablePreviewModel';

/** 表内填空下划线 */
function BlankLine({ width = '100%' }: { width?: string }) {
  return (
    <span className="dq-survey-preview-blank" style={{ width }}>
      &nbsp;
    </span>
  );
}

function YesNoBoxes() {
  return (
    <span className="dq-survey-preview-checks">
      <span>□ 是</span>
      <span>□ 否</span>
    </span>
  );
}

/** 赋分说明展示在左侧标题栏 */
function IndicatorHintLines({ lines }: { lines: string[] }) {
  return (
    <div className="dq-survey-preview-label-hints">
      {lines.map((line, i) => (
        <div key={i} className="dq-survey-preview-label-hint">
          {line}
        </div>
      ))}
    </div>
  );
}

function renderLabelCell(row: PreviewTableRow) {
  return (
    <td className="dq-survey-preview-label">
      <div className="dq-survey-preview-label-main">
        {row.no ? (
          <>
            <span className="dq-survey-preview-no">{row.no}</span>
            {row.label}
          </>
        ) : (
          row.label
        )}
        {row.required ? <span className="dq-survey-preview-req">*</span> : null}
      </div>
      {row.indicatorHintLines?.length ? (
        <IndicatorHintLines lines={row.indicatorHintLines} />
      ) : null}
    </td>
  );
}

function renderValueCell(row: PreviewTableRow) {
  switch (row.kind) {
    case 'text':
      return <BlankLine />;
    case 'address':
      return (
        <span className="dq-survey-preview-address">
          <BlankLine width="4em" />
          <span>区县</span>
          <BlankLine width="4em" />
          <span>街道</span>
          <BlankLine width="4em" />
          <span>社区</span>
          <BlankLine width="6em" />
          <span>路</span>
        </span>
      );
    case 'number':
      return (
        <span className="dq-survey-preview-number">
          <BlankLine width="6em" />
          {row.unit ? <span className="dq-survey-preview-unit">{row.unit}</span> : null}
        </span>
      );
    case 'yesno':
      return <YesNoBoxes />;
    case 'yesno_with_extra':
      return (
        <span className="dq-survey-preview-yesno-extra">
          <YesNoBoxes />
          <span className="dq-survey-preview-extra">
            {row.extraLabel}：<BlankLine width="4em" />
            {row.extraUnit ? <span className="dq-survey-preview-unit">{row.extraUnit}</span> : null}
          </span>
        </span>
      );
    case 'enum_checkboxes':
      return (
        <div className="dq-survey-preview-enum-list">
          {(row.options ?? []).map(opt => (
            <div key={opt} className="dq-survey-preview-enum-item">
              □ {opt}
            </div>
          ))}
        </div>
      );
    case 'indicator':
      return (
        <span className="dq-survey-preview-number">
          <BlankLine width="8em" />
          {row.unit ? <span className="dq-survey-preview-unit">{row.unit}</span> : null}
        </span>
      );
    case 'note':
      return <span className="dq-survey-preview-note-text">{row.label}</span>;
    case 'blank':
    default:
      return <BlankLine />;
  }
}

interface Props {
  model: SurveyTablePreviewModel;
  /** 打印/PDF 时显示生成时间 */
  generatedAt?: string;
}

/** 附录 B 样式纸质表格（只读预览） */
export const SurveyTablePreviewDocument: React.FC<Props> = ({ model, generatedAt }) => {
  const sectionRoman = ['一', '二', '三', '四'];

  return (
    <article className="dq-survey-preview-doc" data-point-type={model.pointType}>
      <header className="dq-survey-preview-doc-head">
        <h1 className="dq-survey-preview-title">附录 B 内涝隐患点普查信息采集表</h1>
        <p className="dq-survey-preview-subtitle">（资料性附录）</p>
        <div className="dq-survey-preview-head-row">
          <span className="dq-survey-preview-type-head">
            （{sectionRoman[0]}）{model.typeLabel}
          </span>
          {generatedAt ? (
            <span className="dq-survey-preview-meta-line">
              预览生成：{generatedAt} · 纳入指标 {model.indicatorCount} 项
            </span>
          ) : null}
        </div>
      </header>

      {model.sections.map((section, si) => (
        <section key={section.title} className="dq-survey-preview-section">
          <table className="dq-survey-preview-table" cellPadding={0} cellSpacing={0}>
            <tbody>
              <tr className="dq-survey-preview-section-row">
                <th colSpan={2}>
                  （{sectionRoman[si] ?? String(si + 1)}）{section.title}
                </th>
              </tr>
              {section.rows.map((row, ri) => {
                if (row.kind === 'note' && row.colspan === 2) {
                  return (
                    <tr key={`${section.title}-${ri}`} className="dq-survey-preview-note-row">
                      <td colSpan={2}>{renderValueCell(row)}</td>
                    </tr>
                  );
                }
                return (
                  <tr key={`${section.title}-${ri}-${row.no ?? row.label}`}>
                    {renderLabelCell(row)}
                    <td className="dq-survey-preview-value">{renderValueCell(row)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>
      ))}

      <footer className="dq-survey-preview-footer">
        <table className="dq-survey-preview-table dq-survey-preview-footer-table">
          <tbody>
            <tr>
              <td className="dq-survey-preview-label">采集人姓名</td>
              <td />
              <td className="dq-survey-preview-label">单位</td>
              <td />
              <td className="dq-survey-preview-label">日期</td>
              <td />
            </tr>
          </tbody>
        </table>
      </footer>
    </article>
  );
};
