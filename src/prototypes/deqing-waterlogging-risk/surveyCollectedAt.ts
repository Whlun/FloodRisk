import dayjs, { type Dayjs } from 'dayjs';

export const SURVEY_COLLECTED_AT_FORMAT = 'YYYY-MM-DD HH:mm:ss';

/** 当前时刻（普查时间默认值） */
export function nowSurveyCollectedAt(): string {
  return dayjs().format(SURVEY_COLLECTED_AT_FORMAT);
}

/** 表单 DatePicker ↔ 台账字符串 */
export function surveyCollectedAtToDayjs(value?: string): Dayjs | undefined {
  if (!value) return undefined;
  const d = dayjs(value, SURVEY_COLLECTED_AT_FORMAT);
  return d.isValid() ? d : undefined;
}

export function surveyCollectedAtFromPicker(value: Dayjs | string | null | undefined): string | undefined {
  if (value == null || value === '') return undefined;
  if (dayjs.isDayjs(value)) return value.format(SURVEY_COLLECTED_AT_FORMAT);
  const d = dayjs(value);
  return d.isValid() ? d.format(SURVEY_COLLECTED_AT_FORMAT) : undefined;
}
