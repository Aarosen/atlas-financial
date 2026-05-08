/**
 * T2.5: Compliance Certifications
 *
 * Tracks compliance certifications and readiness:
 * - SOC 2 Type II
 * - HIPAA (Health Insurance Portability and Accountability Act)
 * - PCI-DSS (Payment Card Industry Data Security Standard)
 * - GDPR
 * - CCPA (California Consumer Privacy Act)
 * - ISO 27001
 */

export interface ComplianceCertification {
  id: string;
  name: string;
  type: 'certification' | 'readiness';
  status: 'not_started' | 'in_progress' | 'completed' | 'expired';
  certificationDate?: number;
  expirationDate?: number;
  auditDate?: number;
  auditor?: string;
  scope: string[];
  requirements: ComplianceRequirement[];
  score: number; // 0-100
}

export interface ComplianceRequirement {
  id: string;
  name: string;
  description: string;
  status: 'not_started' | 'in_progress' | 'completed';
  completedAt?: number;
  evidence: string[];
}

export interface ComplianceReport {
  generatedAt: number;
  certifications: ComplianceCertification[];
  overallScore: number;
  issues: string[];
  recommendations: string[];
}

/**
 * Standard compliance certifications
 */
export const COMPLIANCE_CERTIFICATIONS: Record<string, Omit<ComplianceCertification, 'id'>> = {
  soc2: {
    name: 'SOC 2 Type II',
    type: 'certification',
    status: 'not_started',
    scope: ['security', 'availability', 'processing_integrity', 'confidentiality', 'privacy'],
    requirements: [
      {
        id: 'soc2_1',
        name: 'Access Controls',
        description: 'Implement and maintain access controls',
        status: 'not_started',
        evidence: [],
      },
      {
        id: 'soc2_2',
        name: 'Encryption',
        description: 'Encrypt data in transit and at rest',
        status: 'not_started',
        evidence: [],
      },
      {
        id: 'soc2_3',
        name: 'Incident Response',
        description: 'Maintain incident response procedures',
        status: 'not_started',
        evidence: [],
      },
      {
        id: 'soc2_4',
        name: 'Audit Logging',
        description: 'Maintain comprehensive audit logs',
        status: 'not_started',
        evidence: [],
      },
    ],
    score: 0,
  },
  hipaa: {
    name: 'HIPAA',
    type: 'readiness',
    status: 'not_started',
    scope: ['healthcare_data', 'privacy', 'security', 'breach_notification'],
    requirements: [
      {
        id: 'hipaa_1',
        name: 'Privacy Rule',
        description: 'Comply with HIPAA Privacy Rule',
        status: 'not_started',
        evidence: [],
      },
      {
        id: 'hipaa_2',
        name: 'Security Rule',
        description: 'Implement HIPAA Security Rule',
        status: 'not_started',
        evidence: [],
      },
      {
        id: 'hipaa_3',
        name: 'Breach Notification',
        description: 'Implement breach notification procedures',
        status: 'not_started',
        evidence: [],
      },
    ],
    score: 0,
  },
  pci_dss: {
    name: 'PCI-DSS',
    type: 'certification',
    status: 'not_started',
    scope: ['payment_data', 'cardholder_data', 'security'],
    requirements: [
      {
        id: 'pci_1',
        name: 'Network Security',
        description: 'Install and maintain firewall configuration',
        status: 'not_started',
        evidence: [],
      },
      {
        id: 'pci_2',
        name: 'Encryption',
        description: 'Protect cardholder data with encryption',
        status: 'not_started',
        evidence: [],
      },
      {
        id: 'pci_3',
        name: 'Vulnerability Management',
        description: 'Maintain vulnerability management program',
        status: 'not_started',
        evidence: [],
      },
    ],
    score: 0,
  },
  gdpr: {
    name: 'GDPR',
    type: 'readiness',
    status: 'not_started',
    scope: ['data_protection', 'privacy_rights', 'consent', 'data_processing'],
    requirements: [
      {
        id: 'gdpr_1',
        name: 'Data Subject Rights',
        description: 'Implement data subject rights (access, deletion, portability)',
        status: 'not_started',
        evidence: [],
      },
      {
        id: 'gdpr_2',
        name: 'Consent Management',
        description: 'Implement granular consent management',
        status: 'not_started',
        evidence: [],
      },
      {
        id: 'gdpr_3',
        name: 'Data Processing Agreements',
        description: 'Maintain DPAs with all processors',
        status: 'not_started',
        evidence: [],
      },
      {
        id: 'gdpr_4',
        name: 'Privacy Impact Assessments',
        description: 'Conduct privacy impact assessments',
        status: 'not_started',
        evidence: [],
      },
    ],
    score: 0,
  },
  ccpa: {
    name: 'CCPA',
    type: 'readiness',
    status: 'not_started',
    scope: ['consumer_privacy', 'data_rights', 'opt_out'],
    requirements: [
      {
        id: 'ccpa_1',
        name: 'Privacy Notice',
        description: 'Provide comprehensive privacy notice',
        status: 'not_started',
        evidence: [],
      },
      {
        id: 'ccpa_2',
        name: 'Consumer Rights',
        description: 'Implement consumer rights (access, deletion, opt-out)',
        status: 'not_started',
        evidence: [],
      },
      {
        id: 'ccpa_3',
        name: 'Opt-Out Mechanism',
        description: 'Implement "Do Not Sell" opt-out',
        status: 'not_started',
        evidence: [],
      },
    ],
    score: 0,
  },
  iso27001: {
    name: 'ISO 27001',
    type: 'certification',
    status: 'not_started',
    scope: ['information_security', 'risk_management', 'controls'],
    requirements: [
      {
        id: 'iso_1',
        name: 'Information Security Policy',
        description: 'Establish information security policy',
        status: 'not_started',
        evidence: [],
      },
      {
        id: 'iso_2',
        name: 'Risk Assessment',
        description: 'Conduct information security risk assessment',
        status: 'not_started',
        evidence: [],
      },
      {
        id: 'iso_3',
        name: 'Access Control',
        description: 'Implement access control measures',
        status: 'not_started',
        evidence: [],
      },
    ],
    score: 0,
  },
};

const certifications: Map<string, ComplianceCertification> = new Map();

/**
 * Initialize compliance certification
 */
export function initializeCertification(certificationKey: string): ComplianceCertification {
  const template = COMPLIANCE_CERTIFICATIONS[certificationKey];
  if (!template) {
    throw new Error(`Unknown certification: ${certificationKey}`);
  }

  const cert: ComplianceCertification = {
    ...template,
    id: `cert_${certificationKey}_${Date.now()}`,
  };

  certifications.set(cert.id, cert);
  return cert;
}

/**
 * Get certification by ID
 */
export function getCertification(certId: string): ComplianceCertification | undefined {
  return certifications.get(certId);
}

/**
 * Get all certifications
 */
export function getAllCertifications(): ComplianceCertification[] {
  return Array.from(certifications.values());
}

/**
 * Update requirement status
 */
export function updateRequirementStatus(
  certId: string,
  requirementId: string,
  status: 'not_started' | 'in_progress' | 'completed',
  evidence?: string[]
): ComplianceCertification | null {
  const cert = certifications.get(certId);
  if (!cert) return null;

  const requirement = cert.requirements.find(r => r.id === requirementId);
  if (!requirement) return null;

  requirement.status = status;
  if (status === 'completed') {
    requirement.completedAt = Date.now();
  }
  if (evidence) {
    requirement.evidence = evidence;
  }

  // Recalculate score
  updateCertificationScore(cert);

  return cert;
}

/**
 * Update certification status
 */
export function updateCertificationStatus(
  certId: string,
  status: 'not_started' | 'in_progress' | 'completed' | 'expired'
): ComplianceCertification | null {
  const cert = certifications.get(certId);
  if (!cert) return null;

  cert.status = status;

  if (status === 'completed') {
    cert.certificationDate = Date.now();
    cert.expirationDate = Date.now() + 365 * 24 * 60 * 60 * 1000; // 1 year
  }

  return cert;
}

/**
 * Calculate certification score
 */
function updateCertificationScore(cert: ComplianceCertification): void {
  const completed = cert.requirements.filter(r => r.status === 'completed').length;
  const total = cert.requirements.length;
  cert.score = total > 0 ? Math.round((completed / total) * 100) : 0;
}

/**
 * Generate compliance report
 */
export function generateComplianceReport(): ComplianceReport {
  const certs = getAllCertifications();
  const issues: string[] = [];
  const recommendations: string[] = [];

  certs.forEach(cert => {
    if (cert.status === 'expired') {
      issues.push(`${cert.name} certification has expired`);
      recommendations.push(`Renew ${cert.name} certification`);
    }

    if (cert.status === 'not_started') {
      recommendations.push(`Start ${cert.name} implementation`);
    }

    const incompleteRequirements = cert.requirements.filter(r => r.status !== 'completed');
    if (incompleteRequirements.length > 0) {
      recommendations.push(
        `Complete ${incompleteRequirements.length} requirements for ${cert.name}`
      );
    }
  });

  const overallScore = certs.length > 0 ? Math.round(certs.reduce((sum, c) => sum + c.score, 0) / certs.length) : 0;

  return {
    generatedAt: Date.now(),
    certifications: certs,
    overallScore,
    issues,
    recommendations,
  };
}

/**
 * Clear certifications (for testing)
 */
export function clearCertifications(): void {
  certifications.clear();
}
