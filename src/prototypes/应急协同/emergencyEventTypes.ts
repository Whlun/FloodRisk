/**
 * 应急事件与事件评估行类型（与 DB/原型字段一致），从 `index` 抽出供 `emergencyEventInitialData` 等复用
 */
export interface EmergencyEventDisposal {
  contactPhone: string;
  disposalDescribe: string;
  completedTime: string;
  images: string[];
}

export interface EmergencyEventRow {
  id: string;
  eventCode: string;
  eventTitle: string;
  sectionCode: string;
  problemType: string;
  problemSource: string;
  occurTime: string;
  reportTime: string;
  addvcd: string;
  region: string;
  location: string;
  longitude: string;
  latitude: string;
  situationDescribe: string;
  pollutionType: string;
  impactScope: string;
  cause: string;
  pollutionLevel: string;
  warningLevel: string;
  reporterName: string;
  reporterPhone: string;
  inchargePerson: string;
  responsibleParty: string;
  nativeProcessing: string;
  disposalStatus: string;
  disposalProgress: string;
  measuresTaken: string;
  teamsUsage: string;
  materialsUsage: string;
  waterRecovery: string;
  eventResult: string;
  endDate: string;
  /** 基本信息-事件现场/佐证图（data URL） */
  eventImages: string[];
  eventDisposal: EmergencyEventDisposal;
}

export interface EventAssessmentRow {
  id: string;
  linkedEventId: string;
  assessmentCode: string;
  assessTime: string;
  assessOrg: string;
  overallAssessment: string;
  personnelDamage: string;
  propertyDamage: string;
  pollutionDamageAssessment: string;
  ecoDamageAssessment: string;
  pdfUrl: string | null;
  attachmentFileName: string;
}
