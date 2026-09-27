export type BusinessType = 'small_business' | 'nonprofit';

export interface Business {
  id: string;
  name: string;
  type: BusinessType;
  ein?: string;
  industry?: string;
  ownerId: string;
  certified: boolean;
  address?: string;
  createdAt: any;
  // ProPublica / IRS nonprofit verification — populated at registration for
  // nonprofits when a high-confidence match is found (see lib/proPublica.ts).
  ppVerified?: boolean;
  ppName?: string;  // official IRS name of the matched org
  ppNtee?: string;  // NTEE classification code, e.g. "O50"
}

export type EngagementStage = 'initial_meeting' | 'budget_check' | 'data_ethics_committee' | 'scoping' | 'hackathon_ready' | 'membership';
export type EngagementStatus = 'pending' | 'in_progress' | 'completed';

export interface Engagement {
  id: string;
  businessId: string;
  ownerId: string;
  stage: EngagementStage;
  status: EngagementStatus;
  notes?: string;
  budget_amount?: number;
  hackathon_project?: string;
  updatedAt: any;
}

export interface UserProfile {
  id: string;
  email: string;
  displayName?: string;
  role: 'client' | 'admin';
  createdAt: any;
}

// --- Scout (intake & routing agent) ---

export const SCOUT_BUCKETS = [
  'Data Infrastructure',
  'Analytics & Insight',
  'ML / Predictive',
  'Tooling & Automation',
  'Advisory / Strategy',
] as const;
export type ScoutBucket = typeof SCOUT_BUCKETS[number];

export const PRIMARY_NEED_OPTIONS: { value: PrimaryNeed; label: string }[] = [
  { value: 'analyze_data', label: 'We have data and want help analyzing it' },
  { value: 'build_tool', label: 'We need help building a tool, dashboard, or workflow' },
  { value: 'ml_predictive', label: 'We want to build a predictive model or use machine learning' },
  { value: 'organize_data', label: "We have data but it's a mess and we need help organizing it" },
  { value: 'strategy_guidance', label: "We're not sure where to start — we need guidance on our data strategy" },
  { value: 'something_else', label: 'Something else' },
];

export type PrimaryNeed =
  | 'analyze_data'
  | 'build_tool'
  | 'ml_predictive'
  | 'organize_data'
  | 'strategy_guidance'
  | 'something_else';

export type ScoutConfidence = 'High' | 'Medium' | 'Low' | null;
export type ScoutCompositeSignal = 'Ready' | 'Conditional' | 'Not Ready';
export type ScoutHitlTier = 'L2' | 'L3';
export type ScoutReviewStatus = 'pending' | 'reviewed';
export type ScoutReviewAction = 'approved' | 'edited' | 'redirected';

export interface ScoutIntake {
  id: string;
  // intake fields (Tally-equivalent, public write-once)
  org_name: string;
  contact_name_role: string;
  contact_email: string;
  mission: string;
  scale: string;
  primary_need: PrimaryNeed;
  primary_need_other?: string;
  problem_description: string;
  current_systems: string;
  timeline: string;
  referral_source: string;
  submittedAt: any;
  // scout output fields (public write-once, computed at submit time)
  bucket: ScoutBucket | null;
  confidence: ScoutConfidence;
  rationale: string;
  poc_score: 1 | 2 | 3;
  clarity_score: 1 | 2 | 3;
  foothold_score: 1 | 2 | 3;
  composite_signal: ScoutCompositeSignal;
  flags: string[];
  hitlTier: ScoutHitlTier;
  // review fields (admin-only, written via update)
  reviewStatus: ScoutReviewStatus;
  reviewAction?: ScoutReviewAction;
  finalBucket?: ScoutBucket;
  reviewedBy?: string;
  reviewedByEmail?: string;
  reviewedAt?: any;
  reviewNotes?: string;
  onboardingKit?: string;
}

// --- Architect (Current-State Assessment & maturity model) ---

export type MaturityScore = 1 | 2 | 3;
export type CompositeLevel = 'Foundational' | 'Developing' | 'Established';
export type FlaggedDimension = 'data_infrastructure' | 'governance';

export type CollectionScope = 'systematic' | 'partial' | 'not_systematic';
export type SystemIntegration = 'own_island' | 'some_share' | 'most_share_auto';
export type IntegrationFamiliarity = 'not_familiar' | 'somewhat_familiar' | 'very_familiar';
export type QualityConfidence = 'not_confident' | 'mixed' | 'very_confident';
export type DecisionEmpowerment = 'not_from_data' | 'leadership_managers' | 'anyone_with_access';
export type ReportingAutomation = 'none_manual' | 'semi_automated' | 'mostly_automated';
export type StaffConfidence = 'low_comfort' | 'some_adhoc' | 'dedicated_staff';
export type BudgetSpeed = 'case_by_case' | 'requires_approval' | 'fast';
export type CsaTool = 'spreadsheets' | 'crm_case_tool' | 'reporting_analytics' | 'forms_surveys' | 'accounting' | 'other';

export const CSA_OPTIONS = {
  q4_collection_scope: [
    { value: 'systematic', label: 'We collect data systematically across programs' },
    { value: 'partial', label: 'Some programs collect data consistently, others don’t' },
    { value: 'not_systematic', label: 'Data collection isn’t systematic yet' },
  ],
  q6_system_integration: [
    { value: 'most_share_auto', label: 'Most of our systems share data automatically' },
    { value: 'some_share', label: 'Some systems connect, but most don’t' },
    { value: 'own_island', label: 'Every system is its own island' },
  ],
  q7_integration_familiarity: [
    { value: 'very_familiar', label: 'Very familiar — we’ve connected systems before' },
    { value: 'somewhat_familiar', label: 'Somewhat familiar — we know it’s possible' },
    { value: 'not_familiar', label: 'Not familiar with system integration at all' },
  ],
  q8_quality_confidence: [
    { value: 'very_confident', label: 'Very confident — our data is accurate and current' },
    { value: 'mixed', label: 'Mixed — some data is reliable, some isn’t' },
    { value: 'not_confident', label: 'Not very confident / we don’t track quality' },
  ],
  q11_decision_empowerment: [
    { value: 'anyone_with_access', label: 'Anyone with access to the data can act on it' },
    { value: 'leadership_managers', label: 'Leadership and program managers' },
    { value: 'not_from_data', label: 'Decisions don’t really get made from data' },
  ],
  q13_reporting_automation: [
    { value: 'mostly_automated', label: 'Mostly automated — reports pull from live data' },
    { value: 'semi_automated', label: 'Semi-automated — some templates, some manual work' },
    { value: 'none_manual', label: 'We don’t produce regular reports / mostly manual' },
  ],
  q15_staff_confidence: [
    { value: 'dedicated_staff', label: 'We have dedicated staff for data work' },
    { value: 'some_adhoc', label: 'Some comfort — data work happens ad hoc' },
    { value: 'low_comfort', label: 'Low comfort — data work intimidates the team' },
  ],
  q16_budget_speed: [
    { value: 'fast', label: 'Fast — we can approve a new tool within weeks' },
    { value: 'requires_approval', label: 'Requires board/leadership approval cycles' },
    { value: 'case_by_case', label: 'Case-by-case — no real budget process for tools' },
  ],
} as const;

export const CSA_TOOL_OPTIONS: { value: CsaTool; label: string }[] = [
  { value: 'spreadsheets', label: 'Spreadsheets (Excel / Google Sheets)' },
  { value: 'crm_case_tool', label: 'CRM or case-management tool (Salesforce, Apricot, etc.)' },
  { value: 'reporting_analytics', label: 'Dedicated reporting/analytics tool (Tableau, Power BI, Looker)' },
  { value: 'forms_surveys', label: 'Forms / survey tools (Google Forms, SurveyMonkey)' },
  { value: 'accounting', label: 'Accounting software (QuickBooks, etc.)' },
  { value: 'other', label: 'Other' },
];

export interface CharterWorkstream {
  name: string;
  required: boolean;
  description: string;
}

export interface ArchitectCharter {
  title: string;
  background: string;
  scopeStatement: string;
  objectives: string[];
  workstreams: CharterWorkstream[];
  risks: string[];
  successCriteria: string[];
  cadence: string;
}

export type NinetyDayPlanShape = 'build_basics' | 'ship_deliverable' | 'remediation_only' | 'accelerate';

export interface NinetyDayPhase {
  window: 'Days 1–30' | 'Days 31–60' | 'Days 61–90';
  title: string;
  milestones: string[];
}

export interface NinetyDayPlan {
  shape: NinetyDayPlanShape;
  headline: string;
  phases: NinetyDayPhase[];
  workstreams: CharterWorkstream[];
  phase2Note?: string;
}

export interface ArchitectAssessment {
  id: string;
  // handoff (denormalized from the scout intake at create time)
  scoutIntakeId: string;
  org_name: string;
  scoutBucket: ScoutBucket;
  scoutConfidence: ScoutConfidence;
  scoutReadiness: ScoutCompositeSignal;
  // CSA answers — Section 1 (narrative)
  q1_org_context: string;
  q2_org_size: string;
  q3_poc: string;
  // Section 2 — Data Infrastructure
  q4_collection_scope: CollectionScope;
  q5_data_locations: string;
  q6_system_integration: SystemIntegration;
  q7_integration_familiarity: IntegrationFamiliarity;
  q8_quality_confidence: QualityConfidence;
  // Section 3 — Decision Culture
  q9_current_decisions: string;
  q10_wished_decisions: string;
  q11_decision_empowerment: DecisionEmpowerment;
  // Section 4 — Governance
  q12_reporting_to: string;
  q13_reporting_automation: ReportingAutomation;
  // Section 5 — Tooling + Team Capacity
  q14_tools: CsaTool[];
  q15_staff_confidence: StaffConfidence;
  q16_budget_speed: BudgetSpeed;
  // Section 6 — Goals & readiness (narrative, risk-flagging only)
  q17a_wish_list: string;
  q17b_biggest_worry: string;
  q18_past_blockers: string;
  // maturity output
  di_score: MaturityScore;
  gov_score: MaturityScore;
  tooling_score: MaturityScore;
  dc_score: MaturityScore;
  tc_score: MaturityScore;
  points: number;
  compositeLevel: CompositeLevel;
  overrideApplied: boolean;
  flaggedDimensions: FlaggedDimension[];
  remediationOnly: boolean;
  crossCheckFlag: string | null;
  // generated documents
  charter: ArchitectCharter;
  ninetyDayPlan: NinetyDayPlan;
  // meta
  createdBy: string;
  createdByEmail: string;
  createdAt: any;
  updatedAt: any;
}
