import type { PreviewTableRow, SurveyTablePreviewModel } from './surveyTablePreviewModel';

function esc(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function blankLine(width = '100%'): string {
  return `<span class="dq-survey-preview-blank" style="width:${esc(width)}">&nbsp;</span>`;
}

function yesNoBoxes(): string {
  return `<span class="dq-survey-preview-checks"><span>□ 是</span><span>□ 否</span></span>`;
}

function indicatorHintLines(lines: string[]): string {
  return `<div class="dq-survey-preview-label-hints">${lines
    .map(line => `<div class="dq-survey-preview-label-hint">${esc(line)}</div>`)
    .join('')}</div>`;
}

function renderLabelCell(row: PreviewTableRow): string {
  const main = row.no
    ? `<span class="dq-survey-preview-no">${esc(row.no)}</span>${esc(row.label)}`
    : esc(row.label);
  const hints = row.indicatorHintLines?.length
    ? indicatorHintLines(row.indicatorHintLines)
    : '';
  return `<td class="dq-survey-preview-label"><div class="dq-survey-preview-label-main">${main}</div>${hints}</td>`;
}

function renderValueCell(row: PreviewTableRow): string {
  switch (row.kind) {
    case 'text':
      return blankLine();
    case 'address':
      return `<span class="dq-survey-preview-address">${blankLine('4em')}<span>区县</span>${blankLine('4em')}<span>街道</span>${blankLine('4em')}<span>社区</span>${blankLine('6em')}<span>路</span></span>`;
    case 'number':
      return `<span class="dq-survey-preview-number">${blankLine('6em')}${row.unit ? `<span class="dq-survey-preview-unit">${esc(row.unit)}</span>` : ''}</span>`;
    case 'yesno':
      return yesNoBoxes();
    case 'yesno_with_extra':
      return `<span class="dq-survey-preview-yesno-extra">${yesNoBoxes()}<span class="dq-survey-preview-extra">${esc(row.extraLabel ?? '')}：${blankLine('4em')}${row.extraUnit ? `<span class="dq-survey-preview-unit">${esc(row.extraUnit)}</span>` : ''}</span></span>`;
    case 'enum_checkboxes':
      return `<div class="dq-survey-preview-enum-list">${(row.options ?? [])
        .map(opt => `<div class="dq-survey-preview-enum-item">□ ${esc(opt)}</div>`)
        .join('')}</div>`;
    case 'indicator':
      return `<span class="dq-survey-preview-number">${blankLine('8em')}${row.unit ? `<span class="dq-survey-preview-unit">${esc(row.unit)}</span>` : ''}</span>`;
    case 'note':
      return `<span class="dq-survey-preview-note-text">${esc(row.label)}</span>`;
    case 'blank':
    default:
      return blankLine();
  }
}

function renderSection(model: SurveyTablePreviewModel, section: SurveyTablePreviewModel['sections'][number]): string {
  const rows = section.rows
    .map((row, ri) => {
      if (row.kind === 'note' && row.colspan === 2) {
        return `<tr class="dq-survey-preview-note-row"><td colspan="2">${renderValueCell(row)}</td></tr>`;
      }
      return `<tr>${renderLabelCell(row)}<td class="dq-survey-preview-value">${renderValueCell(row)}</td></tr>`;
    })
    .join('');

  return `<section class="dq-survey-preview-section"><table class="dq-survey-preview-table" cellpadding="0" cellspacing="0"><tbody><tr class="dq-survey-preview-section-row"><th colspan="2">${section.sectionNo} ${esc(section.title)}</th></tr>${rows}</tbody></table></section>`;
}

function renderSurveyTablePreviewArticle(
  model: SurveyTablePreviewModel,
  generatedAt?: string,
): string {
  const metaLine = generatedAt
    ? `<span class="dq-survey-preview-meta-line">预览生成：${esc(generatedAt)} · 纳入指标 ${model.indicatorCount} 项</span>`
    : '';

  const sections = model.sections.map(section => renderSection(model, section)).join('');

  return `<article class="dq-survey-preview-doc" data-point-type="${esc(model.pointType)}">
    <header class="dq-survey-preview-doc-head">
      <h1 class="dq-survey-preview-title">内涝隐患点普查信息采集表</h1>
      <p class="dq-survey-preview-subtitle">（资料性附录）</p>
      <div class="dq-survey-preview-head-row">
        <span class="dq-survey-preview-type-head">${esc(model.typeLabel)}</span>
        ${metaLine}
      </div>
    </header>
    ${sections}
    <footer class="dq-survey-preview-footer">
      <table class="dq-survey-preview-table dq-survey-preview-footer-table">
        <tbody>
          <tr>
            <td class="dq-survey-preview-label">采集人姓名</td>
            <td></td>
            <td class="dq-survey-preview-label">单位</td>
            <td></td>
            <td class="dq-survey-preview-label">日期</td>
            <td></td>
          </tr>
        </tbody>
      </table>
    </footer>
  </article>`;
}

function wrapSurveyTablePreviewHtmlDocument(title: string, styles: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <title>${esc(title)}</title>
  <style>${styles}</style>
</head>
<body>
  ${body}
</body>
</html>`;
}

/** 将预览模型渲染为完整 HTML 文档（供后端 Playwright 转 PDF） */
export function renderSurveyTablePreviewDocumentHtml(
  model: SurveyTablePreviewModel,
  styles: string,
  generatedAt?: string,
): string {
  return wrapSurveyTablePreviewHtmlDocument(
    `内涝隐患点普查信息采集表 · ${model.typeLabel}`,
    styles,
    renderSurveyTablePreviewArticle(model, generatedAt),
  );
}

/** 将多份预览模型合并为单一 HTML 文档（各类型之间分页） */
export function renderSurveyTablePreviewDocumentsHtml(
  models: { model: SurveyTablePreviewModel; generatedAt?: string }[],
  styles: string,
): string {
  const articles = models
    .map(({ model, generatedAt }) => renderSurveyTablePreviewArticle(model, generatedAt))
    .join('');
  return wrapSurveyTablePreviewHtmlDocument('内涝隐患点普查信息采集表', styles, articles);
}
