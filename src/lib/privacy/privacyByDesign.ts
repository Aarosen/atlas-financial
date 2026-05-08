/**
 * T2.6: Privacy by Design
 *
 * Implements privacy impact assessments and threat modeling
 * to ensure privacy is built into systems from the start.
 */

export interface PrivacyImpactAssessment {
  id: string;
  name: string;
  description: string;
  createdAt: number;
  updatedAt: number;
  status: 'draft' | 'in_review' | 'approved' | 'archived';
  dataFlows: DataFlow[];
  risks: PrivacyRisk[];
  mitigations: RiskMitigation[];
  overallRiskLevel: 'low' | 'medium' | 'high' | 'critical';
  approvedBy?: string;
  approvalDate?: number;
}

export interface DataFlow {
  id: string;
  name: string;
  description: string;
  dataCategories: string[];
  sources: string[];
  destinations: string[];
  purposes: string[];
  retention: string;
}

export interface PrivacyRisk {
  id: string;
  title: string;
  description: string;
  dataFlowId: string;
  likelihood: 'low' | 'medium' | 'high';
  impact: 'low' | 'medium' | 'high' | 'critical';
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  threatActor: string;
  threatVector: string;
}

export interface RiskMitigation {
  id: string;
  riskId: string;
  description: string;
  status: 'planned' | 'in_progress' | 'implemented' | 'verified';
  implementedAt?: number;
  verifiedAt?: number;
  owner: string;
  deadline?: number;
}

export interface ThreatModel {
  id: string;
  piaId: string;
  createdAt: number;
  threats: Threat[];
  assets: Asset[];
  trustBoundaries: TrustBoundary[];
}

export interface Threat {
  id: string;
  title: string;
  description: string;
  assetId: string;
  threatActor: string;
  attackVector: string;
  likelihood: 'low' | 'medium' | 'high';
  impact: 'low' | 'medium' | 'high' | 'critical';
  mitigation: string;
}

export interface Asset {
  id: string;
  name: string;
  type: 'data' | 'system' | 'process';
  sensitivity: 'public' | 'internal' | 'confidential' | 'restricted';
  owner: string;
}

export interface TrustBoundary {
  id: string;
  name: string;
  components: string[];
  description: string;
}

const assessments: Map<string, PrivacyImpactAssessment> = new Map();
const threatModels: Map<string, ThreatModel> = new Map();

/**
 * Create privacy impact assessment
 */
export function createPrivacyImpactAssessment(
  name: string,
  description: string
): PrivacyImpactAssessment {
  const id = `pia_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const now = Date.now();

  const assessment: PrivacyImpactAssessment = {
    id,
    name,
    description,
    createdAt: now,
    updatedAt: now,
    status: 'draft',
    dataFlows: [],
    risks: [],
    mitigations: [],
    overallRiskLevel: 'low',
  };

  assessments.set(id, assessment);
  return assessment;
}

/**
 * Add data flow to assessment
 */
export function addDataFlow(
  piaId: string,
  dataFlow: Omit<DataFlow, 'id'>
): PrivacyImpactAssessment | null {
  const assessment = assessments.get(piaId);
  if (!assessment) return null;

  const flow: DataFlow = {
    ...dataFlow,
    id: `flow_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
  };

  assessment.dataFlows.push(flow);
  assessment.updatedAt = Date.now();

  return assessment;
}

/**
 * Add privacy risk
 */
export function addPrivacyRisk(
  piaId: string,
  risk: Omit<PrivacyRisk, 'id' | 'riskLevel'>
): PrivacyImpactAssessment | null {
  const assessment = assessments.get(piaId);
  if (!assessment) return null;

  const riskLevel = calculateRiskLevel(risk.likelihood, risk.impact);

  const fullRisk: PrivacyRisk = {
    ...risk,
    id: `risk_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    riskLevel,
  };

  assessment.risks.push(fullRisk);
  assessment.updatedAt = Date.now();
  updateOverallRiskLevel(assessment);

  return assessment;
}

/**
 * Add risk mitigation
 */
export function addRiskMitigation(
  piaId: string,
  mitigation: Omit<RiskMitigation, 'id'>
): PrivacyImpactAssessment | null {
  const assessment = assessments.get(piaId);
  if (!assessment) return null;

  const fullMitigation: RiskMitigation = {
    ...mitigation,
    id: `mitigation_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
  };

  assessment.mitigations.push(fullMitigation);
  assessment.updatedAt = Date.now();

  return assessment;
}

/**
 * Calculate risk level from likelihood and impact
 */
function calculateRiskLevel(
  likelihood: 'low' | 'medium' | 'high',
  impact: 'low' | 'medium' | 'high' | 'critical'
): 'low' | 'medium' | 'high' | 'critical' {
  const likelihoodScore = { low: 1, medium: 2, high: 3 }[likelihood];
  const impactScore = { low: 1, medium: 2, high: 3, critical: 4 }[impact];
  const score = likelihoodScore * impactScore;

  if (score >= 10) return 'critical'; // high(3) × critical(4) = 12, or medium(2) × critical(4) = 8 (not critical)
  if (score >= 8) return 'high'; // high(3) × high(3) = 9, or medium(2) × critical(4) = 8
  if (score >= 4) return 'medium'; // medium(2) × medium(2) = 4
  return 'low';
}

/**
 * Update overall risk level
 */
function updateOverallRiskLevel(assessment: PrivacyImpactAssessment): void {
  if (assessment.risks.length === 0) {
    assessment.overallRiskLevel = 'low';
    return;
  }

  const riskLevels = { low: 1, medium: 2, high: 3, critical: 4 };
  const maxRiskScore = Math.max(...assessment.risks.map(r => riskLevels[r.riskLevel]));

  const riskLevelMap = { 1: 'low', 2: 'medium', 3: 'high', 4: 'critical' } as const;
  assessment.overallRiskLevel = riskLevelMap[maxRiskScore as keyof typeof riskLevelMap];
}

/**
 * Get assessment
 */
export function getAssessment(piaId: string): PrivacyImpactAssessment | undefined {
  return assessments.get(piaId);
}

/**
 * Get all assessments
 */
export function getAllAssessments(): PrivacyImpactAssessment[] {
  return Array.from(assessments.values());
}

/**
 * Approve assessment
 */
export function approveAssessment(piaId: string, approvedBy: string): PrivacyImpactAssessment | null {
  const assessment = assessments.get(piaId);
  if (!assessment) return null;

  assessment.status = 'approved';
  assessment.approvedBy = approvedBy;
  assessment.approvalDate = Date.now();
  assessment.updatedAt = Date.now();

  return assessment;
}

/**
 * Create threat model
 */
export function createThreatModel(piaId: string): ThreatModel {
  const id = `tm_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  const model: ThreatModel = {
    id,
    piaId,
    createdAt: Date.now(),
    threats: [],
    assets: [],
    trustBoundaries: [],
  };

  threatModels.set(id, model);
  return model;
}

/**
 * Add asset to threat model
 */
export function addAsset(
  tmId: string,
  asset: Omit<Asset, 'id'>
): ThreatModel | null {
  const model = threatModels.get(tmId);
  if (!model) return null;

  const fullAsset: Asset = {
    ...asset,
    id: `asset_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
  };

  model.assets.push(fullAsset);
  return model;
}

/**
 * Add threat to threat model
 */
export function addThreat(
  tmId: string,
  threat: Omit<Threat, 'id'>
): ThreatModel | null {
  const model = threatModels.get(tmId);
  if (!model) return null;

  const fullThreat: Threat = {
    ...threat,
    id: `threat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
  };

  model.threats.push(fullThreat);
  return model;
}

/**
 * Add trust boundary
 */
export function addTrustBoundary(
  tmId: string,
  boundary: Omit<TrustBoundary, 'id'>
): ThreatModel | null {
  const model = threatModels.get(tmId);
  if (!model) return null;

  const fullBoundary: TrustBoundary = {
    ...boundary,
    id: `boundary_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
  };

  model.trustBoundaries.push(fullBoundary);
  return model;
}

/**
 * Get threat model
 */
export function getThreatModel(tmId: string): ThreatModel | undefined {
  return threatModels.get(tmId);
}

/**
 * Generate privacy by design report
 */
export function generatePrivacyByDesignReport(): {
  assessments: PrivacyImpactAssessment[];
  threatModels: ThreatModel[];
  summary: {
    totalAssessments: number;
    approvedAssessments: number;
    criticalRisks: number;
    highRisks: number;
    recommendations: string[];
  };
} {
  const allAssessments = getAllAssessments();
  const allThreatModels = Array.from(threatModels.values());

  const criticalRisks = allAssessments.reduce((sum, a) => sum + a.risks.filter(r => r.riskLevel === 'critical').length, 0);
  const highRisks = allAssessments.reduce((sum, a) => sum + a.risks.filter(r => r.riskLevel === 'high').length, 0);

  const recommendations: string[] = [];

  if (criticalRisks > 0) {
    recommendations.push(`Address ${criticalRisks} critical risks immediately`);
  }

  if (highRisks > 0) {
    recommendations.push(`Mitigate ${highRisks} high-risk vulnerabilities`);
  }

  const unapprovedAssessments = allAssessments.filter(a => a.status !== 'approved');
  if (unapprovedAssessments.length > 0) {
    recommendations.push(`Approve ${unapprovedAssessments.length} pending assessments`);
  }

  return {
    assessments: allAssessments,
    threatModels: allThreatModels,
    summary: {
      totalAssessments: allAssessments.length,
      approvedAssessments: allAssessments.filter(a => a.status === 'approved').length,
      criticalRisks,
      highRisks,
      recommendations,
    },
  };
}

/**
 * Clear for testing
 */
export function clearPrivacyByDesignData(): void {
  assessments.clear();
  threatModels.clear();
}
