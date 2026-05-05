/**
 * Estate Planning Guidance
 * Provides estate planning triggers and recommendations for high-net-worth users
 */

export interface EstatePlanningAssessment {
  netWorth: number;
  federalExemption: number;
  exemptionUsage: number; // percentage
  needsEstatePlanning: boolean;
  recommendations: EstatePlanningRecommendation[];
  guidance: string;
}

export interface EstatePlanningRecommendation {
  name: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  description: string;
  costEstimate: string;
  timelineToImplement: string;
  requiresProfessional: 'attorney' | 'cpa' | 'both' | 'none';
}

// 2024 Federal estate tax exemption (adjusted annually for inflation)
const FEDERAL_ESTATE_TAX_EXEMPTION = 13610000; // 2024 limit
const EXEMPTION_WARNING_THRESHOLD = 0.5; // Warn at 50% of exemption

/**
 * Assess estate planning needs based on net worth
 */
export function assessEstatePlanningNeeds(netWorth: number): EstatePlanningAssessment {
  const exemptionUsage = netWorth / FEDERAL_ESTATE_TAX_EXEMPTION;
  const needsEstatePlanning = exemptionUsage >= EXEMPTION_WARNING_THRESHOLD;

  const recommendations = getEstatePlanningRecommendations(netWorth, exemptionUsage);
  const guidance = buildEstatePlanningGuidance(netWorth, exemptionUsage, recommendations);

  return {
    netWorth,
    federalExemption: FEDERAL_ESTATE_TAX_EXEMPTION,
    exemptionUsage: Math.round(exemptionUsage * 100),
    needsEstatePlanning,
    recommendations,
    guidance,
  };
}

/**
 * Get estate planning recommendations based on net worth
 */
function getEstatePlanningRecommendations(
  netWorth: number,
  exemptionUsage: number
): EstatePlanningRecommendation[] {
  const recommendations: EstatePlanningRecommendation[] = [];

  // Basic estate planning (everyone should have)
  recommendations.push({
    name: 'Will & Testament',
    priority: 'critical',
    description: 'Specifies how your assets are distributed and who manages your estate',
    costEstimate: '$500-$2,000',
    timelineToImplement: '1-2 weeks',
    requiresProfessional: 'attorney',
  });

  recommendations.push({
    name: 'Durable Power of Attorney',
    priority: 'critical',
    description: 'Designates someone to manage financial decisions if you become incapacitated',
    costEstimate: '$300-$1,000',
    timelineToImplement: '1-2 weeks',
    requiresProfessional: 'attorney',
  });

  recommendations.push({
    name: 'Healthcare Directive / Living Will',
    priority: 'critical',
    description: 'Specifies your healthcare wishes and designates a healthcare proxy',
    costEstimate: '$200-$500',
    timelineToImplement: '1 week',
    requiresProfessional: 'attorney',
  });

  // Moderate net worth ($1M-$5M)
  if (netWorth >= 1000000) {
    recommendations.push({
      name: 'Revocable Living Trust',
      priority: 'high',
      description: 'Avoids probate, maintains privacy, provides incapacity management',
      costEstimate: '$1,500-$3,000',
      timelineToImplement: '2-4 weeks',
      requiresProfessional: 'attorney',
    });

    recommendations.push({
      name: 'Beneficiary Designation Review',
      priority: 'high',
      description: 'Ensure retirement accounts, insurance, and TOD accounts align with estate plan',
      costEstimate: 'Free-$500',
      timelineToImplement: '1-2 weeks',
      requiresProfessional: 'none',
    });
  }

  // High net worth ($5M-$13.6M)
  if (netWorth >= 5000000) {
    recommendations.push({
      name: 'Irrevocable Life Insurance Trust (ILIT)',
      priority: 'high',
      description: 'Removes life insurance from taxable estate, provides liquidity for estate taxes',
      costEstimate: '$2,000-$5,000',
      timelineToImplement: '4-8 weeks',
      requiresProfessional: 'both',
    });

    recommendations.push({
      name: 'Charitable Remainder Trust (CRT)',
      priority: 'medium',
      description: 'Provides income stream while reducing estate taxes and supporting charity',
      costEstimate: '$3,000-$7,000',
      timelineToImplement: '6-12 weeks',
      requiresProfessional: 'both',
    });

    recommendations.push({
      name: 'Grantor Retained Annuity Trust (GRAT)',
      priority: 'medium',
      description: 'Transfers appreciation to heirs while retaining income stream',
      costEstimate: '$3,000-$6,000',
      timelineToImplement: '4-8 weeks',
      requiresProfessional: 'both',
    });
  }

  // Ultra-high net worth ($13.6M+)
  if (netWorth >= FEDERAL_ESTATE_TAX_EXEMPTION) {
    recommendations.push({
      name: 'Family Limited Partnership (FLP)',
      priority: 'critical',
      description: 'Consolidates family assets, provides valuation discounts, facilitates wealth transfer',
      costEstimate: '$5,000-$15,000',
      timelineToImplement: '8-12 weeks',
      requiresProfessional: 'both',
    });

    recommendations.push({
      name: 'Qualified Personal Residence Trust (QPRT)',
      priority: 'high',
      description: 'Transfers home to heirs at discounted value while retaining use',
      costEstimate: '$3,000-$8,000',
      timelineToImplement: '6-10 weeks',
      requiresProfessional: 'both',
    });

    recommendations.push({
      name: 'Dynasty Trust',
      priority: 'high',
      description: 'Provides multi-generational wealth transfer with tax benefits',
      costEstimate: '$5,000-$20,000',
      timelineToImplement: '8-16 weeks',
      requiresProfessional: 'both',
    });

    recommendations.push({
      name: 'Generation-Skipping Transfer Tax (GSTT) Planning',
      priority: 'critical',
      description: 'Optimizes transfers to grandchildren and beyond',
      costEstimate: '$3,000-$10,000',
      timelineToImplement: '4-8 weeks',
      requiresProfessional: 'both',
    });
  }

  return recommendations;
}

/**
 * Build estate planning guidance text
 */
function buildEstatePlanningGuidance(
  netWorth: number,
  exemptionUsage: number,
  recommendations: EstatePlanningRecommendation[]
): string {
  let guidance = `ESTATE PLANNING ASSESSMENT FOR $${netWorth.toLocaleString()} NET WORTH:

Federal Estate Tax Exemption: $${FEDERAL_ESTATE_TAX_EXEMPTION.toLocaleString()} (2024)
Your Net Worth: $${netWorth.toLocaleString()}
Exemption Usage: ${Math.round(exemptionUsage * 100)}%`;

  if (exemptionUsage >= 1) {
    guidance += `\n\n⚠️ CRITICAL: Your net worth EXCEEDS the federal estate tax exemption. Without proper planning, your heirs could face significant estate taxes (up to 40% of assets over the exemption).`;
  } else if (exemptionUsage >= 0.75) {
    guidance += `\n\n⚠️ WARNING: Your net worth is approaching the federal estate tax exemption. Estate planning is essential to minimize tax exposure.`;
  } else if (exemptionUsage >= 0.5) {
    guidance += `\n\n📋 RECOMMENDED: Your net worth warrants comprehensive estate planning to protect your family and minimize taxes.`;
  } else {
    guidance += `\n\n✓ BASIC PLANNING: While your net worth is below the federal exemption, you should still have basic estate planning documents.`;
  }

  // Group recommendations by priority
  const critical = recommendations.filter(r => r.priority === 'critical');
  const high = recommendations.filter(r => r.priority === 'high');
  const medium = recommendations.filter(r => r.priority === 'medium');
  const low = recommendations.filter(r => r.priority === 'low');

  if (critical.length > 0) {
    guidance += `\n\nCRITICAL (implement immediately):`;
    critical.forEach(r => {
      guidance += `\n- ${r.name} (${r.costEstimate}, ${r.timelineToImplement}): ${r.description}`;
    });
  }

  if (high.length > 0) {
    guidance += `\n\nHIGH PRIORITY (implement within 6 months):`;
    high.forEach(r => {
      guidance += `\n- ${r.name} (${r.costEstimate}, ${r.timelineToImplement}): ${r.description}`;
    });
  }

  if (medium.length > 0) {
    guidance += `\n\nMEDIUM PRIORITY (implement within 1 year):`;
    medium.forEach(r => {
      guidance += `\n- ${r.name} (${r.costEstimate}, ${r.timelineToImplement}): ${r.description}`;
    });
  }

  guidance += `\n\nNEXT STEP: Consult with an estate planning attorney and CPA to develop a comprehensive plan tailored to your situation. The cost of proper planning is far less than the tax burden without it.`;

  return guidance;
}

/**
 * Build system prompt context for estate planning
 */
export function buildEstatePlanningContext(assessment: EstatePlanningAssessment): string {
  const criticalItems = assessment.recommendations.filter(r => r.priority === 'critical').map(r => r.name);

  return `[ESTATE_PLANNING_CONTEXT]
Net Worth: $${assessment.netWorth.toLocaleString()}
Federal Estate Tax Exemption: $${assessment.federalExemption.toLocaleString()}
Exemption Usage: ${assessment.exemptionUsage}%
Needs Estate Planning: ${assessment.needsEstatePlanning}
Critical Items: ${criticalItems.join(', ') || 'None'}
Guidance: ${assessment.guidance}
[END_ESTATE_PLANNING_CONTEXT]`;
}
