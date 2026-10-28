// frontend/src/constants/miscFormsConstants.js
/**
 * Miscellaneous Statutory Forms (Form 13 & Form 30)
 * Includes official First Schedule entries, fee options, and 4-step prosecution flow:
 * 1. Need confirmation/requirement by the client
 * 2. Sent for filing
 * 3. Filed
 * 4. Updated by the Patent Office
 */

export const MISC_FORM_STATUSES = [
  {
    id: 'NEED_CONFIRMATION',
    label: 'Need confirmation/requirement by the client',
    shortLabel: 'Need Client Confirmation',
    colorKey: 'ORANGE',
    color: '#EA580C',
    bg: 'rgba(234, 88, 12, 0.12)',
    border: 'rgba(234, 88, 12, 0.35)',
    step: 1,
    tip: 'Awaiting client requirements, signed consent deed, or approval to proceed.'
  },
  {
    id: 'SENT_FOR_FILING',
    label: 'Sent for filing',
    shortLabel: 'Sent for Filing',
    colorKey: 'YELLOW',
    color: '#D97706',
    bg: 'rgba(217, 119, 6, 0.12)',
    border: 'rgba(217, 119, 6, 0.35)',
    step: 2,
    tip: 'Vetted and queued in paralegal docket for IPO submission (triggers 3-day inventor ack).'
  },
  {
    id: 'FILED',
    label: 'Filed',
    shortLabel: 'Filed',
    colorKey: 'GREEN',
    color: '#10B981',
    bg: 'rgba(16, 185, 129, 0.12)',
    border: 'rgba(16, 185, 129, 0.35)',
    step: 3,
    tip: 'E-filed with Indian Patent Office. CBR receipt and transaction recorded.'
  },
  {
    id: 'UPDATED_BY_IPO',
    label: 'Updated by the Patent Office',
    shortLabel: 'Updated by Patent Office',
    colorKey: 'BLUE',
    color: '#2563EB',
    bg: 'rgba(37, 99, 235, 0.12)',
    border: 'rgba(37, 99, 235, 0.35)',
    step: 4,
    tip: 'Patent Office order passed / official register updated / request completed.'
  }
];

export const FORM_13_SUBTYPES = [
  {
    id: 'FORM_13_ADD_INVENTOR',
    label: 'Form 13: Addition of Inventor',
    description: 'Add a new co-inventor post-filing under Section 57 / Rule 81',
    rule: 'Section 57 & Rule 81(1)',
    defaultFeeMode: 'WITH_FEE'
  },
  {
    id: 'FORM_13_DEL_INVENTOR',
    label: 'Form 13: Deletion of Inventor',
    description: 'Remove an inventor with consent deed / statement under Section 57',
    rule: 'Section 57 & Rule 81(1)',
    defaultFeeMode: 'WITH_FEE'
  },
  {
    id: 'FORM_13_CORRECTION',
    label: 'Form 13: Correction of Details',
    description: 'Clerical corrections, applicant/inventor name, address, or specification amendment',
    rule: 'Section 57 & Rule 81(1)',
    defaultFeeMode: 'WITH_FEE'
  }
];

export const FORM_30_ENTRIES = [
  {
    id: 'ENTRY_52_ADJOURNMENT',
    code: 'Schedule_1_Entry_Number 52=>Request for adjournment of hearing under rule 129A (for each adjournment)',
    shortLabel: 'Entry 52: Adjournment of hearing under Rule 129A',
    description: 'Request for adjournment of hearing under rule 129A (for each adjournment)',
    numberField: 'application_number',
    numberFieldLabel: 'Application Number',
    rule: 'Rule 129A',
    defaultFeeMode: 'WITH_FEE'
  },
  {
    id: 'ENTRY_46_PETITION',
    code: 'Schedule_1_Entry_Number 46=>On petition not otherwise provided for',
    shortLabel: 'Entry 46: Petition not otherwise provided for (Rule 137)',
    description: 'On petition not otherwise provided for (Rule 137 / general condonation / miscellaneous petition)',
    numberField: 'application_number',
    numberFieldLabel: 'Application Number',
    rule: 'Rule 137 / Schedule 1 Entry 46',
    defaultFeeMode: 'WITH_FEE'
  },
  {
    id: 'ENTRY_41_1_CERTIFIED_COPY',
    code: 'Schedule_1_Entry_Number 41 (1)=>(i) On request for certified copies under section 72 or for certificate under section 147 and rule 133(1)',
    shortLabel: 'Entry 41(1): Certified copies under Section 72 / Rule 133(1)',
    description: 'On request for certified copies under section 72 or for certificate under section 147 and rule 133(1)',
    numberField: 'application_number',
    numberFieldLabel: 'Application Number',
    rule: 'Section 72 & Rule 133(1)',
    defaultFeeMode: 'WITH_FEE'
  },
  {
    id: 'ENTRY_41_2_CERTIFIED_COPY',
    code: 'Schedule_1_Entry_Number 41 (2)=>(ii) On request for certified copies under section 72 or for certificate under section 147 and rule 133(2)',
    shortLabel: 'Entry 41(2): Certified copies under Section 72 / Rule 133(2)',
    description: 'On request for certified copies under section 72 or for certificate under section 147 and rule 133(2)',
    numberField: 'application_number',
    numberFieldLabel: 'Application Number',
    rule: 'Section 72 & Rule 133(2)',
    defaultFeeMode: 'WITH_FEE'
  },
  {
    id: 'ENTRY_19_23_RESTORATION',
    code: 'Schedule_1_Entry_Number 19,23=>Additional fee for restoration under section 60, 61(3) and rule 86(1)',
    shortLabel: 'Entry 19, 23: Additional fee for restoration (Sec 60, 61(3))',
    description: 'Additional fee for restoration under section 60, 61(3) and rule 86(1)',
    numberField: 'patent_number',
    numberFieldLabel: 'Patent Number',
    rule: 'Section 60, 61(3) & Rule 86(1)',
    defaultFeeMode: 'WITH_FEE'
  },
  {
    id: 'ENTRY_OTHER',
    code: 'Other Form 30 Miscellaneous Petition',
    shortLabel: 'Form 30: Other Miscellaneous Petition',
    description: 'Custom petition or intimation filed under Form 30',
    numberField: 'application_number',
    numberFieldLabel: 'Application Number',
    rule: 'First Schedule, Patent Rules 2003',
    defaultFeeMode: 'WITH_FEE'
  }
];

export function getMiscFormStatusInfo(statusId) {
  const norm = String(statusId || '').toUpperCase().replace(/[\s\-_]+/g, '_');
  if (norm.includes('CONFIRM') || norm.includes('NEED')) {
    return MISC_FORM_STATUSES[0];
  }
  if (norm.includes('SENT') || norm.includes('FILING')) {
    return MISC_FORM_STATUSES[1];
  }
  if (norm.includes('UPDATED') || norm.includes('OFFICE') || norm.includes('DISPOSED')) {
    return MISC_FORM_STATUSES[3];
  }
  if (norm.includes('FILED')) {
    return MISC_FORM_STATUSES[2];
  }
  return MISC_FORM_STATUSES[0];
}
