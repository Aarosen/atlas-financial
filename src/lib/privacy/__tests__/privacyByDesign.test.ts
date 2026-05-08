import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  createPrivacyImpactAssessment,
  addDataFlow,
  addPrivacyRisk,
  addRiskMitigation,
  getAssessment,
  getAllAssessments,
  approveAssessment,
  createThreatModel,
  addAsset,
  addThreat,
  addTrustBoundary,
  getThreatModel,
  generatePrivacyByDesignReport,
  clearPrivacyByDesignData,
} from '../privacyByDesign';

describe('Privacy by Design (T2.6)', () => {
  beforeEach(() => {
    clearPrivacyByDesignData();
  });

  afterEach(() => {
    clearPrivacyByDesignData();
  });

  describe('createPrivacyImpactAssessment', () => {
    it('creates privacy impact assessment', () => {
      const pia = createPrivacyImpactAssessment(
        'User Data Collection',
        'Assessment for new user data collection feature'
      );

      expect(pia.name).toBe('User Data Collection');
      expect(pia.status).toBe('draft');
      expect(pia.overallRiskLevel).toBe('low');
      expect(pia.dataFlows).toEqual([]);
      expect(pia.risks).toEqual([]);
    });

    it('generates unique assessment IDs', () => {
      const pia1 = createPrivacyImpactAssessment('Assessment 1', 'Description 1');
      const pia2 = createPrivacyImpactAssessment('Assessment 2', 'Description 2');

      expect(pia1.id).not.toBe(pia2.id);
    });
  });

  describe('addDataFlow', () => {
    it('adds data flow to assessment', () => {
      const pia = createPrivacyImpactAssessment('Test', 'Test');

      const updated = addDataFlow(pia.id, {
        name: 'User Registration',
        description: 'Collects user data during registration',
        dataCategories: ['email', 'name', 'phone'],
        sources: ['user_input'],
        destinations: ['database', 'email_service'],
        purposes: ['account_creation', 'communication'],
        retention: '5 years',
      });

      expect(updated?.dataFlows).toHaveLength(1);
      expect(updated?.dataFlows[0].name).toBe('User Registration');
    });

    it('returns null for non-existent assessment', () => {
      const updated = addDataFlow('non_existent', {
        name: 'Flow',
        description: 'Test',
        dataCategories: [],
        sources: [],
        destinations: [],
        purposes: [],
        retention: '1 year',
      });

      expect(updated).toBeNull();
    });
  });

  describe('addPrivacyRisk', () => {
    it('adds privacy risk to assessment', () => {
      const pia = createPrivacyImpactAssessment('Test', 'Test');
      addDataFlow(pia.id, {
        name: 'Flow',
        description: 'Test',
        dataCategories: ['email'],
        sources: ['user'],
        destinations: ['db'],
        purposes: ['storage'],
        retention: '1 year',
      });

      const updated = addPrivacyRisk(pia.id, {
        title: 'Data Breach',
        description: 'Unauthorized access to user data',
        dataFlowId: pia.dataFlows[0].id,
        likelihood: 'medium',
        impact: 'high',
        threatActor: 'External attacker',
        threatVector: 'SQL injection',
      });

      expect(updated?.risks).toHaveLength(1);
      expect(updated?.risks[0].title).toBe('Data Breach');
      expect(updated?.risks[0].riskLevel).toBe('high');
    });

    it('calculates risk level from likelihood and impact', () => {
      const pia = createPrivacyImpactAssessment('Test', 'Test');

      // Low likelihood, low impact = low risk
      addPrivacyRisk(pia.id, {
        title: 'Risk 1',
        description: 'Test',
        dataFlowId: 'flow_1',
        likelihood: 'low',
        impact: 'low',
        threatActor: 'Actor',
        threatVector: 'Vector',
      });

      // High likelihood, critical impact = critical risk
      addPrivacyRisk(pia.id, {
        title: 'Risk 2',
        description: 'Test',
        dataFlowId: 'flow_1',
        likelihood: 'high',
        impact: 'critical',
        threatActor: 'Actor',
        threatVector: 'Vector',
      });

      const assessment = getAssessment(pia.id);
      expect(assessment?.risks[0].riskLevel).toBe('low');
      expect(assessment?.risks[1].riskLevel).toBe('critical');
    });

    it('updates overall risk level', () => {
      const pia = createPrivacyImpactAssessment('Test', 'Test');

      expect(pia.overallRiskLevel).toBe('low');

      addPrivacyRisk(pia.id, {
        title: 'Critical Risk',
        description: 'Test',
        dataFlowId: 'flow_1',
        likelihood: 'high',
        impact: 'critical',
        threatActor: 'Actor',
        threatVector: 'Vector',
      });

      const updated = getAssessment(pia.id);
      expect(updated?.overallRiskLevel).toBe('critical');
    });
  });

  describe('addRiskMitigation', () => {
    it('adds risk mitigation', () => {
      const pia = createPrivacyImpactAssessment('Test', 'Test');
      addPrivacyRisk(pia.id, {
        title: 'Risk',
        description: 'Test',
        dataFlowId: 'flow_1',
        likelihood: 'high',
        impact: 'high',
        threatActor: 'Actor',
        threatVector: 'Vector',
      });

      const updated = addRiskMitigation(pia.id, {
        riskId: pia.risks[0].id,
        description: 'Implement encryption',
        status: 'planned',
        owner: 'security_team',
        deadline: Date.now() + 30 * 24 * 60 * 60 * 1000,
      });

      expect(updated?.mitigations).toHaveLength(1);
      expect(updated?.mitigations[0].description).toBe('Implement encryption');
    });
  });

  describe('getAssessment', () => {
    it('retrieves assessment by ID', () => {
      const pia = createPrivacyImpactAssessment('Test', 'Test');

      const retrieved = getAssessment(pia.id);

      expect(retrieved).toEqual(pia);
    });

    it('returns undefined for non-existent assessment', () => {
      const retrieved = getAssessment('non_existent');

      expect(retrieved).toBeUndefined();
    });
  });

  describe('getAllAssessments', () => {
    it('returns all assessments', () => {
      createPrivacyImpactAssessment('Assessment 1', 'Test');
      createPrivacyImpactAssessment('Assessment 2', 'Test');

      const assessments = getAllAssessments();

      expect(assessments).toHaveLength(2);
    });
  });

  describe('approveAssessment', () => {
    it('approves assessment', () => {
      const pia = createPrivacyImpactAssessment('Test', 'Test');

      const approved = approveAssessment(pia.id, 'privacy_officer');

      expect(approved?.status).toBe('approved');
      expect(approved?.approvedBy).toBe('privacy_officer');
      expect(approved?.approvalDate).toBeTruthy();
    });

    it('returns null for non-existent assessment', () => {
      const approved = approveAssessment('non_existent', 'officer');

      expect(approved).toBeNull();
    });
  });

  describe('createThreatModel', () => {
    it('creates threat model', () => {
      const pia = createPrivacyImpactAssessment('Test', 'Test');

      const tm = createThreatModel(pia.id);

      expect(tm.piaId).toBe(pia.id);
      expect(tm.threats).toEqual([]);
      expect(tm.assets).toEqual([]);
      expect(tm.trustBoundaries).toEqual([]);
    });
  });

  describe('addAsset', () => {
    it('adds asset to threat model', () => {
      const pia = createPrivacyImpactAssessment('Test', 'Test');
      const tm = createThreatModel(pia.id);

      const updated = addAsset(tm.id, {
        name: 'User Database',
        type: 'data',
        sensitivity: 'confidential',
        owner: 'database_team',
      });

      expect(updated?.assets).toHaveLength(1);
      expect(updated?.assets[0].name).toBe('User Database');
    });
  });

  describe('addThreat', () => {
    it('adds threat to threat model', () => {
      const pia = createPrivacyImpactAssessment('Test', 'Test');
      const tm = createThreatModel(pia.id);
      addAsset(tm.id, {
        name: 'Database',
        type: 'data',
        sensitivity: 'confidential',
        owner: 'team',
      });

      const updated = addThreat(tm.id, {
        title: 'SQL Injection',
        description: 'Attacker injects SQL code',
        assetId: tm.assets[0].id,
        threatActor: 'External attacker',
        attackVector: 'Web form input',
        likelihood: 'medium',
        impact: 'critical',
        mitigation: 'Use parameterized queries',
      });

      expect(updated?.threats).toHaveLength(1);
      expect(updated?.threats[0].title).toBe('SQL Injection');
    });
  });

  describe('addTrustBoundary', () => {
    it('adds trust boundary', () => {
      const pia = createPrivacyImpactAssessment('Test', 'Test');
      const tm = createThreatModel(pia.id);

      const updated = addTrustBoundary(tm.id, {
        name: 'Internal Network',
        components: ['database', 'application_server'],
        description: 'Internal network boundary',
      });

      expect(updated?.trustBoundaries).toHaveLength(1);
      expect(updated?.trustBoundaries[0].name).toBe('Internal Network');
    });
  });

  describe('getThreatModel', () => {
    it('retrieves threat model by ID', () => {
      const pia = createPrivacyImpactAssessment('Test', 'Test');
      const tm = createThreatModel(pia.id);

      const retrieved = getThreatModel(tm.id);

      expect(retrieved).toEqual(tm);
    });
  });

  describe('generatePrivacyByDesignReport', () => {
    it('generates report with assessments', () => {
      createPrivacyImpactAssessment('Assessment 1', 'Test');
      createPrivacyImpactAssessment('Assessment 2', 'Test');

      const report = generatePrivacyByDesignReport();

      expect(report.assessments).toHaveLength(2);
      expect(report.summary.totalAssessments).toBe(2);
    });

    it('counts critical and high risks', () => {
      const pia = createPrivacyImpactAssessment('Test', 'Test');

      addPrivacyRisk(pia.id, {
        title: 'Critical Risk',
        description: 'Test',
        dataFlowId: 'flow_1',
        likelihood: 'high',
        impact: 'critical',
        threatActor: 'Actor',
        threatVector: 'Vector',
      });

      addPrivacyRisk(pia.id, {
        title: 'High Risk',
        description: 'Test',
        dataFlowId: 'flow_1',
        likelihood: 'high',
        impact: 'high',
        threatActor: 'Actor',
        threatVector: 'Vector',
      });

      const report = generatePrivacyByDesignReport();

      expect(report.summary.criticalRisks).toBe(1);
      expect(report.summary.highRisks).toBe(1);
    });

    it('provides recommendations', () => {
      const pia = createPrivacyImpactAssessment('Test', 'Test');

      addPrivacyRisk(pia.id, {
        title: 'Critical Risk',
        description: 'Test',
        dataFlowId: 'flow_1',
        likelihood: 'high',
        impact: 'critical',
        threatActor: 'Actor',
        threatVector: 'Vector',
      });

      const report = generatePrivacyByDesignReport();

      expect(report.summary.recommendations.length).toBeGreaterThan(0);
      expect(report.summary.recommendations.some(r => r.includes('critical'))).toBe(true);
    });
  });

  describe('T2.6 Integration Tests', () => {
    it('complete privacy impact assessment workflow', () => {
      // 1. Create assessment
      const pia = createPrivacyImpactAssessment(
        'New Feature Launch',
        'Privacy assessment for new feature'
      );

      // 2. Add data flows
      addDataFlow(pia.id, {
        name: 'User Data Collection',
        description: 'Collects user information',
        dataCategories: ['email', 'name'],
        sources: ['user_input'],
        destinations: ['database'],
        purposes: ['account_creation'],
        retention: '5 years',
      });

      // 3. Identify risks
      const flowId = pia.dataFlows[0].id;
      addPrivacyRisk(pia.id, {
        title: 'Data Breach',
        description: 'Unauthorized access',
        dataFlowId: flowId,
        likelihood: 'medium',
        impact: 'high',
        threatActor: 'Attacker',
        threatVector: 'SQL injection',
      });

      // 4. Add mitigations
      const riskId = pia.risks[0].id;
      addRiskMitigation(pia.id, {
        riskId,
        description: 'Implement encryption',
        status: 'planned',
        owner: 'security_team',
      });

      // 5. Approve assessment
      approveAssessment(pia.id, 'privacy_officer');

      // 6. Verify
      const updated = getAssessment(pia.id);
      expect(updated?.status).toBe('approved');
      expect(updated?.dataFlows).toHaveLength(1);
      expect(updated?.risks).toHaveLength(1);
      expect(updated?.mitigations).toHaveLength(1);
    });

    it('complete threat modeling workflow', () => {
      // 1. Create assessment and threat model
      const pia = createPrivacyImpactAssessment('Test', 'Test');
      const tm = createThreatModel(pia.id);

      // 2. Add assets
      addAsset(tm.id, {
        name: 'User Database',
        type: 'data',
        sensitivity: 'confidential',
        owner: 'database_team',
      });

      addAsset(tm.id, {
        name: 'Web Application',
        type: 'system',
        sensitivity: 'internal',
        owner: 'dev_team',
      });

      // 3. Add trust boundaries
      addTrustBoundary(tm.id, {
        name: 'Internal Network',
        components: ['database', 'app_server'],
        description: 'Internal boundary',
      });

      // 4. Add threats
      addThreat(tm.id, {
        title: 'SQL Injection',
        description: 'Attacker injects SQL',
        assetId: tm.assets[0].id,
        threatActor: 'External attacker',
        attackVector: 'Web form',
        likelihood: 'medium',
        impact: 'critical',
        mitigation: 'Parameterized queries',
      });

      // 5. Verify
      const retrieved = getThreatModel(tm.id);
      expect(retrieved?.assets).toHaveLength(2);
      expect(retrieved?.trustBoundaries).toHaveLength(1);
      expect(retrieved?.threats).toHaveLength(1);
    });

    it('generates comprehensive privacy by design report', () => {
      // Create multiple assessments
      const pia1 = createPrivacyImpactAssessment('Assessment 1', 'Test');
      const pia2 = createPrivacyImpactAssessment('Assessment 2', 'Test');

      // Add risks to first assessment
      addPrivacyRisk(pia1.id, {
        title: 'Critical Risk',
        description: 'Test',
        dataFlowId: 'flow_1',
        likelihood: 'high',
        impact: 'critical',
        threatActor: 'Actor',
        threatVector: 'Vector',
      });

      // Approve second assessment
      approveAssessment(pia2.id, 'officer');

      // Generate report
      const report = generatePrivacyByDesignReport();

      expect(report.assessments).toHaveLength(2);
      expect(report.summary.totalAssessments).toBe(2);
      expect(report.summary.approvedAssessments).toBe(1);
      expect(report.summary.criticalRisks).toBe(1);
      expect(report.summary.recommendations.length).toBeGreaterThan(0);
    });
  });
});
