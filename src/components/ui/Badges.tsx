import type { ReactNode } from 'react';
import {
  cn,
  COMPLIANCE_STATUS_STYLES,
  STAGE_STYLES,
  DOC_STATUS_STYLES,
  CHECKLIST_STATUS_STYLES,
  ASSIGNMENT_STATUS_STYLES,
} from '@/lib/utils';
import {
  COMPLIANCE_CATEGORIES,
  type ComplianceStatus,
  type AuditStage,
  type DocumentStatus,
  type ChecklistStatus,
  type AssignmentStatus,
  type ComplianceCategory,
} from '@/types';

export function Pill({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold',
        className,
      )}
    >
      {children}
    </span>
  );
}

export const ComplianceStatusBadge = ({ status }: { status: ComplianceStatus }) => (
  <Pill className={COMPLIANCE_STATUS_STYLES[status]}>{status}</Pill>
);

export const StageBadge = ({ stage }: { stage: AuditStage }) => (
  <Pill className={STAGE_STYLES[stage]}>{stage}</Pill>
);

export const DocStatusBadge = ({ status }: { status: DocumentStatus }) => (
  <Pill className={DOC_STATUS_STYLES[status]}>{status}</Pill>
);

export const ChecklistStatusBadge = ({ status }: { status: ChecklistStatus }) => (
  <Pill className={CHECKLIST_STATUS_STYLES[status]}>{status}</Pill>
);

export const AssignmentStatusBadge = ({ status }: { status: AssignmentStatus }) => (
  <Pill className={ASSIGNMENT_STATUS_STYLES[status]}>{status}</Pill>
);

export const CategoryBadge = ({ category }: { category: ComplianceCategory }) => (
  <Pill className="bg-navy-100 text-navy-700">{COMPLIANCE_CATEGORIES[category]}</Pill>
);

export function OverdueBadge() {
  return <Pill className="bg-red-100 text-red-700">Overdue</Pill>;
}
