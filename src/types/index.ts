// Domain types shared across the app. These mirror the database schema.

export type UserRole = 'partner' | 'employee';

export type EntityType = 'Proprietorship' | 'Partnership' | 'Pvt Ltd' | 'Public Ltd' | 'NGO';
export type IndustryType = 'Manufacturing' | 'Trading' | 'Service';
export type TaxType = 'PAN' | 'VAT';

export type ComplianceCategory = 'TAX' | 'CORPORATE' | 'AUDIT' | 'OTHER';
export type ComplianceStatus = 'Pending' | 'In Progress' | 'Completed';

export type AuditType = 'Statutory Audit' | 'Internal Audit' | 'Other Audit';
export type AuditStage =
  | 'Not Started'
  | 'Planning'
  | 'Documents Requested'
  | 'Documents Received'
  | 'Field Work'
  | 'Review'
  | 'Partner Approval'
  | 'Report Issued'
  | 'Closed';

export type DocumentStatus = 'Requested' | 'Received' | 'Pending' | 'Not Applicable';
export type AssignmentStatus = 'Pending' | 'Completed';
export type AssignmentRef = 'compliance' | 'engagement';
export type ChecklistStatus = 'Pending' | 'Completed' | 'Reviewed';
export type CommunicationType = 'Meeting' | 'Call' | 'Email' | 'Other';

export const CLIENT_SERVICES = [
  'Audit',
  'Accounting',
  'Internal Audit',
  'Advisory',
  'DDA',
  'Others',
] as const;
export type ClientService = (typeof CLIENT_SERVICES)[number];

// --- Row interfaces ----------------------------------------------------------

export interface AppUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  designation: string;
  active: boolean;
  created_at: string;
}

export interface Client {
  id: string;
  client_name: string;
  entity_type: EntityType;
  industry: IndustryType | null;
  registration_details: string;
  tax_type: TaxType | null;
  tax_number: string;
  location: string;
  contact_person: string;
  contact_number: string;
  services: string[];
  other_service: string;
  history_notes: string;
  created_by: string | null;
  created_at: string;
}

export interface Compliance {
  id: string;
  client_id: string;
  category: ComplianceCategory;
  subcategory: string;
  due_date: string | null;
  status: ComplianceStatus;
  remarks: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface AuditEngagement {
  id: string;
  client_id: string;
  audit_type: AuditType;
  stage: AuditStage;
  assigned_employee: string | null;
  start_date: string | null;
  deadline: string | null;
  delay_reason: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface Assignment {
  id: string;
  reference_type: AssignmentRef;
  reference_id: string;
  employee_id: string;
  status: AssignmentStatus;
  completed_date: string | null;
  created_at: string;
}

export interface DocumentRequest {
  id: string;
  client_id: string;
  audit_id: string | null;
  document_name: string;
  requested_date: string | null;
  deadline: string | null;
  status: DocumentStatus;
  remarks: string;
  created_at: string;
}

export interface ChecklistTemplate {
  id: string;
  name: string;
  audit_type: AuditType;
  created_at: string;
}

export interface ChecklistItem {
  id: string;
  template_id: string;
  item_name: string;
  sort_order: number;
}

export interface ChecklistProgress {
  id: string;
  engagement_id: string;
  item_id: string | null;
  item_name: string;
  assigned_employee: string | null;
  status: ChecklistStatus;
  review_comment: string;
  created_at: string;
  updated_at: string;
}

export interface CommunicationLog {
  id: string;
  client_id: string;
  date: string;
  type: CommunicationType;
  discussion_notes: string;
  decision_taken: string;
  next_action: string;
  responsible_person: string | null;
  created_by: string | null;
  created_at: string;
}

export interface AppNotification {
  id: string;
  user_id: string;
  message: string;
  link: string | null;
  category: string;
  read_status: boolean;
  created_at: string;
}

export interface AppSettings {
  id: number;
  firm_name: string;
  reminder_days: number[];
  designations: string[];
  notify_overdue: boolean;
  updated_at: string;
}

// --- Option lists & display metadata ----------------------------------------

export const ENTITY_TYPES: EntityType[] = [
  'Proprietorship',
  'Partnership',
  'Pvt Ltd',
  'Public Ltd',
  'NGO',
];
export const INDUSTRIES: IndustryType[] = ['Manufacturing', 'Trading', 'Service'];
export const TAX_TYPES: TaxType[] = ['PAN', 'VAT'];

export const ROLE_LABELS: Record<UserRole, string> = {
  partner: 'Partner',
  employee: 'Employee',
};

export const COMPLIANCE_CATEGORIES: Record<ComplianceCategory, string> = {
  TAX: 'Tax',
  CORPORATE: 'Corporate Compliance',
  AUDIT: 'Audit',
  OTHER: 'Other',
};

/** Predefined subcategories per category (manual entry allowed under OTHER). */
export const COMPLIANCE_SUBCATEGORIES: Record<ComplianceCategory, string[]> = {
  TAX: [
    'VAT Returns',
    'Income Tax Returns',
    'Advance Tax',
    'TDS',
    'Luxury Tax',
    'Education Tax',
    'Health Tax',
    'SPF',
    'Other Tax',
  ],
  CORPORATE: [
    'OCR Annual Documents',
    'Banijya Renewal',
    'Wada Renewal',
    'DOI Renewal',
    'Tourism Renewal',
    'Tourism Documents Filing',
    'DOI Documents Filing',
    'Others',
  ],
  AUDIT: ['Internal Audit', 'Statutory Audit', 'Other Audit'],
  OTHER: [],
};

export const COMPLIANCE_STATUSES: ComplianceStatus[] = ['Pending', 'In Progress', 'Completed'];

export const AUDIT_TYPES: AuditType[] = ['Statutory Audit', 'Internal Audit', 'Other Audit'];

export const AUDIT_STAGES: AuditStage[] = [
  'Not Started',
  'Planning',
  'Documents Requested',
  'Documents Received',
  'Field Work',
  'Review',
  'Partner Approval',
  'Report Issued',
  'Closed',
];

export const DOCUMENT_STATUSES: DocumentStatus[] = [
  'Requested',
  'Received',
  'Pending',
  'Not Applicable',
];

export const CHECKLIST_STATUSES: ChecklistStatus[] = ['Pending', 'Completed', 'Reviewed'];

export const COMMUNICATION_TYPES: CommunicationType[] = ['Meeting', 'Call', 'Email', 'Other'];

/** Calendar/heat colour for a compliance, derived from status + due date. */
export type DueState = 'completed' | 'upcoming' | 'overdue' | 'none';
