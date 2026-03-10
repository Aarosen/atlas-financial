# Atlas Eval Operating Model

This document defines the weekly and monthly operating rhythm for Atlas's evaluation system. It transforms the eval infrastructure into sustainable, repeatable practice.

---

## Daily Workflow (5–10 minutes)

**Goal:** Catch emerging issues quickly without heavy process.

### 1. Review Production Failure Signals

**Time:** 2–3 minutes

Check:
- Production failure logs (last 24 hours)
- Critical failures count
- High failures count
- New failure clusters

Look for:
- Any Critical failures (zero tolerance)
- Spike in High failures
- New root-cause patterns
- Unusual severity concentration

**Action:**
- If Critical: escalate immediately (see Escalation Paths)
- If High spike: flag for weekly review
- If new pattern: note for cluster analysis

### 2. Check Release Readiness Dashboard

**Time:** 2–3 minutes

Review:
- `atlas-release-readiness.md` (current state)
- Release decision status (🔴 BLOCK / ⚠️ REVIEW / ⚡ WARN / ✅ PASS)
- Core-path group status (financial_reasoning, safety, missing_data_discipline, followup_context)
- Governance alerts

Look for:
- Any BLOCK status (release cannot proceed)
- REVIEW status requiring human decision
- Core-path group regressions

**Action:**
- If BLOCK: escalate to AI System Owner
- If REVIEW: schedule decision meeting
- If WARN: add to weekly review agenda

### 3. Triage Urgent Failures

**Time:** 1–2 minutes

Identify urgent issues:
- Safety regressions
- Financial reasoning errors in core flows
- Missing-data discipline breaks
- Memory context failures in critical paths

**Action:**
- Assign to engineering for immediate fix
- Update failure triage log
- Escalate if governance threshold at risk

### Daily Artifacts

- Production failure logs
- Release readiness dashboard
- Failure triage log (append-only)

---

## Weekly Workflow (20–40 minutes)

**Cadence:** Once per week (suggested: Monday morning)

**Owner:** Eval Maintainer + Product Owner

### 1. Review Failure Clusters (5–10 minutes)

**Artifact:** `atlas-failure-clusters.md`

Review:
- Failure clusters by root cause
- Severity distribution (Critical, High, Medium, Low)
- Top root causes (model_capability, prompt_issue, missing_data_issue, tool_calculation_issue, memory_context_issue)
- Representative examples per cluster

Decide:
- Which clusters represent meaningful product issues
- Which should become eval candidates
- Which are noise or one-off issues

**Outcome:**
- Approve clusters for eval candidate generation
- Reject clusters with insufficient signal
- Revise cluster definitions if needed

### 2. Review Generated Draft Evals (5–10 minutes)

**Artifact:** `atlas-generated-eval-drafts.md`

Review:
- Draft evals generated from approved clusters
- Provenance metadata (which cluster, which failure)
- Group assignment
- Expected traits and failure conditions

Decide:
- Approve drafts for promotion
- Request revisions
- Reject drafts with weak signal

**Outcome:**
- Approved drafts move to promotion workflow
- Rejected drafts archived with rationale

### 3. Run Promotion Workflow (5–10 minutes)

**Artifacts:** 
- `atlas-promotion-report.json`
- `atlas-promotion-report.md`
- `promotion-history.jsonl`

Execute:
```bash
cd src/evals
npm run eval:promote:drafts
npm run eval:atlas-v1:validate
npm run eval:atlas-v1:tags
```

Validate:
- Suite count correct (120 cases)
- No duplicate IDs
- Distribution targets met
- Tag coverage maintained

**Outcome:**
- Updated live suite
- Promotion report with validation results
- Audit history entry

### 4. Review Retirement Candidates (5–10 minutes)

**Artifact:** `atlas-retirement-candidates.md`

Review:
- Candidates flagged for retirement (weak, redundant, stale)
- Evidence for each candidate
- Tag impact analysis
- Protected case warnings

Decide:
- Approve candidates for retirement
- Defer candidates needing more observation
- Reject candidates with strategic value

**Outcome:**
- Approved candidates move to retirement workflow
- Deferred candidates tracked for future review

### 5. Execute Retirement Workflow (if candidates approved)

**Artifacts:**
- `atlas-retirement-report.json`
- `atlas-retirement-report.md`
- `retirement-history.jsonl`

Execute:
```bash
cd src/evals
npm run eval:retire:evals
npm run eval:atlas-v1:validate
npm run eval:atlas-v1:tags
```

Validate:
- Suite count correct
- Distribution targets met
- Critical tag coverage maintained
- No unintended removals

**Outcome:**
- Updated live suite
- Retirement report with validation
- Audit history entry

### 6. Review Suite Health + Portfolio Balance (5–10 minutes)

**Artifacts:**
- `atlas-eval-health-report.md`
- `atlas-portfolio-balance-report.md`

Review:
- Weak cases (health_band = weak)
- Redundancy clusters (avg redundancy risk > 60)
- Undercovered tags (count ≤ 3)
- Protected capacity warnings (≥ 60% in any group)
- Group balance (underweight/overweight)

Look for:
- Emerging quality drift
- Tag coverage gaps
- Redundancy concentration
- Group imbalances

**Outcome:**
- Targeted promotion/retirement decisions for next week
- Notes on strategic adjustments needed

### Weekly Checklist

- [ ] Production failures reviewed
- [ ] Failure clusters evaluated
- [ ] Draft evals approved/rejected
- [ ] Promotion workflow executed
- [ ] Retirement candidates reviewed
- [ ] Retirement workflow executed (if needed)
- [ ] Suite health reviewed
- [ ] Portfolio balance reviewed
- [ ] Audit history updated

---

## Monthly Workflow (30–60 minutes)

**Cadence:** Once per month (suggested: first Monday)

**Owner:** AI System Owner + Product Owner

### 1. Review Policy Recommendations (10–15 minutes)

**Artifact:** `atlas-policy-report.md`

Review:
- Policy recommendations (advisory)
- Governance threshold trends
- Weighting adjustments suggested
- Critical tag coverage policy

Analyze:
- Are thresholds still appropriate?
- Should weights shift based on production patterns?
- Are critical tags still well-covered?
- Is policy drift needed?

**Outcome:**
- Identify policy changes worth considering
- Prepare proposals for approval

### 2. Approve Policy Updates (if needed) (10–15 minutes)

**Artifact:** `atlas-policy.json` + `policy-history.jsonl`

If changes are accepted:

Execute:
```bash
cd src/evals
npm run eval:tune:policies
```

Validate:
- Policy simulation results
- Guardrail compliance
- Historical impact analysis

Approve:
- Update policy version
- Record approval in history
- Document rationale

**Outcome:**
- New policy version active
- Audit trail entry
- Release readiness recalculated

### 3. Portfolio Health Review (10–15 minutes)

**Artifacts:**
- `atlas-portfolio-balance-report.md`
- `atlas-adaptive-weighting-report.md`

Analyze:
- Group balance trends (over-/underweight)
- Tag coverage evolution
- Redundancy trends
- Production failure alignment

Look for:
- Strategic adjustments needed
- Groups drifting away from targets
- Rare tags at risk
- Redundancy creeping up

**Outcome:**
- Strategic promotion/retirement plan for next month
- Policy adjustment recommendations
- Portfolio rebalancing strategy

### 4. Generate Monthly Summary Report

Create summary:
- Key metrics (health, balance, governance)
- Changes made (promotions, retirements, policy)
- Upcoming risks
- Recommendations

**Outcome:**
- Monthly report for stakeholders
- Visibility into system health

### Monthly Checklist

- [ ] Policy recommendations reviewed
- [ ] Policy changes approved (if needed)
- [ ] Portfolio health analyzed
- [ ] Strategic adjustments planned
- [ ] Monthly summary generated
- [ ] Stakeholder communication sent

---

## Release Decision Process

Before any release to production:

### Pre-Release Checklist

1. **Run full eval suite**
   ```bash
   cd src/evals
   npm run eval:atlas-v1
   ```

2. **Score eval health**
   ```bash
   npm run eval:score:health
   ```

3. **Analyze portfolio balance**
   ```bash
   npm run eval:analyze:portfolio
   ```

4. **Calculate adaptive weighting**
   ```bash
   npm run eval:weighting
   ```

5. **Evaluate governance**
   ```bash
   npm run eval:evaluate:governance
   ```

6. **Build release readiness dashboard**
   ```bash
   npm run eval:dashboard
   ```

### Release Decision

Review `atlas-release-readiness.md`:

- **🔴 BLOCK:** Release cannot proceed
  - Fix all triggered block rules
  - Re-run governance evaluation
  - Get approval before release

- **⚠️ REVIEW:** Human judgment required
  - Review triggered rules
  - Make explicit decision
  - Document decision rationale
  - Proceed only with approval

- **⚡ WARN:** Quality drifting, but safe to ship
  - Acknowledge warnings
  - Schedule fixes for next sprint
  - Proceed with caution

- **✅ PASS:** All governance thresholds met
  - Proceed with release

### Release Approval

Required approvals:
- **BLOCK:** AI System Owner + Product Owner
- **REVIEW:** Product Owner + Engineering Lead
- **WARN:** Product Owner
- **PASS:** Product Owner (can be async)

---

## Escalation Paths

### Immediate Escalation (within 1 hour)

Escalate to **AI System Owner** + **Product Owner**:

- Critical production failures (any)
- Safety regressions detected
- Financial reasoning threshold violated (avg < 22)
- Missing-data discipline regression in core flows
- Release decision is BLOCK

**Action:**
- Assess severity
- Determine if hotfix needed
- Decide on release hold

### High Priority Escalation (within 24 hours)

Escalate to **Engineering Lead**:

- High severity failures clustering
- Redundancy spike in critical groups
- Protected capacity warning (≥60% in core group)
- Policy change needed urgently

**Action:**
- Investigate root cause
- Plan fix or mitigation
- Update failure triage log

### Standard Escalation (weekly review)

Escalate to **Eval Maintainer**:

- Medium severity clusters
- Undercovered critical tags
- Group imbalances
- Redundancy creeping up

**Action:**
- Add to weekly review agenda
- Plan promotion/retirement adjustments

---

## Ownership Roles

### AI System Owner

**Responsibilities:**
- Overall system health and governance
- Release decision approval (BLOCK/REVIEW)
- Policy tuning approval
- Escalation decisions
- Monthly strategic review

**Time commitment:** 5–10 hours/month

**Decision authority:**
- Can approve policy changes
- Can override governance decisions (with documentation)
- Can hold releases

### Eval Maintainer

**Responsibilities:**
- Weekly eval review and workflow execution
- Promotion and retirement workflows
- Suite validation and health monitoring
- Failure cluster analysis
- Daily signal checks

**Time commitment:** 3–5 hours/week

**Decision authority:**
- Can approve/reject draft evals
- Can approve/reject retirement candidates
- Can recommend policy changes

### Product Owner

**Responsibilities:**
- Release approval (all decisions)
- Risk tolerance decisions
- Policy change approval
- Escalation response
- Stakeholder communication

**Time commitment:** 2–3 hours/week

**Decision authority:**
- Final release decision
- Can override eval recommendations (with documentation)
- Approves policy changes

---

## Operating Artifacts

These are the core inputs to your operating cadence:

### Daily
- Production failure logs
- Release readiness dashboard

### Weekly
- Failure cluster report
- Generated draft evals
- Promotion report
- Retirement report
- Eval health report
- Portfolio balance report

### Monthly
- Policy report
- Adaptive weighting report
- Governance report
- Monthly summary

### Continuous (append-only)
- Failure triage log
- Promotion history
- Retirement history
- Policy history
- Release history

---

## Continuous Learning Loop

Once cadence is in place, Atlas operates as a true learning system:

```
Production behavior
       ↓
Daily failure detection
       ↓
Weekly cluster analysis
       ↓
Eval generation & promotion
       ↓
Suite evolution & retirement
       ↓
Health & portfolio analysis
       ↓
Governance decision
       ↓
Release readiness
       ↓
Production deployment
       ↓
(loop continues)
```

This creates a closed-loop system where:
- Real failures drive eval generation
- Evals evolve the suite continuously
- Suite quality is monitored automatically
- Governance decisions are data-driven
- Policies are tuned deliberately
- Releases are safe and informed

---

## Sustainability Notes

### For Small Teams (1–2 people)

One person can cover all roles, but responsibilities should be explicit:
- Dedicate 5–10 min/day to signal checks
- Dedicate 2–3 hours/week to eval review
- Dedicate 1 hour/month to policy tuning

### For Growing Teams (3–5 people)

Split roles:
- One AI System Owner (governance + policy)
- One Eval Maintainer (weekly workflows)
- One Product Owner (release decisions)

### For Mature Teams (5+ people)

Specialize:
- AI System Owner (full-time governance)
- Eval Maintainer (full-time suite evolution)
- Product Owner (release decisions)
- Additional engineers for failure investigation

---

## Getting Started

**Week 1:**
- Establish daily signal check habit (5 min/day)
- Run first weekly eval review
- Document current state

**Week 2–4:**
- Execute weekly workflows consistently
- Build team familiarity with artifacts
- Refine timing and process

**Month 2:**
- Run first monthly policy review
- Evaluate cadence effectiveness
- Adjust as needed

**Ongoing:**
- Maintain daily discipline
- Execute weekly workflows reliably
- Review cadence quarterly for improvements

---

## Questions & Support

If you have questions about:
- **Daily workflows:** Contact Eval Maintainer
- **Weekly workflows:** Contact Eval Maintainer
- **Monthly policy tuning:** Contact AI System Owner
- **Release decisions:** Contact Product Owner
- **Escalations:** Contact AI System Owner

---

**Document Version:** 1.0  
**Effective Date:** 2026-03-10  
**Last Updated:** 2026-03-10
