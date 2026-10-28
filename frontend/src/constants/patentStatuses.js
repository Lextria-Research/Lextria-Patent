// frontend/src/constants/patentStatuses.js
// Statutory prosecution statuses with phased organization and strict color coding per Lextria standards:
// Green: Filed
// Yellow: Under drafting (by team)
// Grey: Under review (by team)
// Orange: Waiting confirmation (by client)
// Purple: Waiting information / data (by client)
// Blue: Official Office Action / Published / Milestones

export const STATUS_COLORS = {
  GREEN: {
    bg: 'var(--badge-green-bg, rgba(16, 185, 129, 0.15))',
    text: 'var(--badge-green-text, #10B981)',
    border: 'var(--badge-green-border, rgba(16, 185, 129, 0.35))',
    dot: '#10B981',
    badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-700',
    meaning: 'Filed (Official Registry Action Complete)'
  },
  YELLOW: {
    bg: 'var(--badge-yellow-bg, rgba(245, 158, 11, 0.15))',
    text: 'var(--badge-yellow-text, #F59E0B)',
    border: 'var(--badge-yellow-border, rgba(245, 158, 11, 0.35))',
    dot: '#EAB308',
    badgeClass: 'bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-700',
    meaning: 'Under drafting (by internal legal/tech team)'
  },
  GREY: {
    bg: 'var(--badge-grey-bg, rgba(148, 163, 184, 0.15))',
    text: 'var(--badge-grey-text, #94A3B8)',
    border: 'var(--badge-grey-border, rgba(148, 163, 184, 0.35))',
    dot: '#94A3B8',
    badgeClass: 'bg-slate-100 text-slate-800 border-slate-300 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700',
    meaning: 'Under review (by senior attorney / QA team)'
  },
  ORANGE: {
    bg: 'var(--badge-orange-bg, rgba(249, 115, 22, 0.15))',
    text: 'var(--badge-orange-text, #F97316)',
    border: 'var(--badge-orange-border, rgba(249, 115, 22, 0.35))',
    dot: '#F97316',
    badgeClass: 'bg-orange-50 text-orange-800 border-orange-300 dark:bg-orange-950/60 dark:text-orange-300 dark:border-orange-700',
    meaning: 'Waiting confirmation (by client)'
  },
  PURPLE: {
    bg: 'var(--badge-purple-bg, rgba(139, 92, 246, 0.15))',
    text: 'var(--badge-purple-text, #A78BFA)',
    border: 'var(--badge-purple-border, rgba(139, 92, 246, 0.35))',
    dot: '#8B5CF6',
    badgeClass: 'bg-purple-50 text-purple-800 border-purple-300 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-700',
    meaning: 'Waiting information / data (from client)'
  },
  BLUE: {
    bg: 'var(--badge-blue-bg, rgba(59, 130, 246, 0.15))',
    text: 'var(--badge-blue-text, #60A5FA)',
    border: 'var(--badge-blue-border, rgba(59, 130, 246, 0.35))',
    dot: '#3B82F6',
    badgeClass: 'bg-blue-50 text-blue-800 border-blue-300 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-700',
    meaning: 'Official Publication / Notice / Court Milestone'
  }
};

/**
 * 7 Statutory Prosecution Phases
 */
export const PROSECUTION_PHASES = [
  {
    id: 'PHASE_1_PS',
    label: '1. Provisional Spec',
    shortLabel: 'Provisional',
    description: 'Initial drafting, IDF gathering, review, filing, and Section 17 postdating'
  },
  {
    id: 'PHASE_2_CS',
    label: '2. Complete Spec',
    shortLabel: 'Complete Spec',
    description: 'Checklist, Complete Specification drafting (PS-follow-up & Direct CS), and client approvals'
  },
  {
    id: 'PHASE_3_PUB_EXAM',
    label: '3. Publication & Exam',
    shortLabel: 'Pub & Exam',
    description: 'Early publication (Form 9), Examination requests (Form 18/18A), and Gazette publication'
  },
  {
    id: 'PHASE_4_FER',
    label: '4. Office Action (FER)',
    shortLabel: 'FER & Ext',
    description: 'First Examination Report, Form 3 foreign compliance, Rule 24B(6) Form 4 extension, and reply'
  },
  {
    id: 'PHASE_5_HEARING',
    label: '5. Hearing & WS',
    shortLabel: 'Hearing & WS',
    description: 'Rule 62 Hearing notice, Form 30 hearing attendance, and 15-day Written Submissions'
  },
  {
    id: 'PHASE_6_GRANT_RENEWAL',
    label: '6. Grant & Renewals',
    shortLabel: 'Grant & Renewals',
    description: 'Patent Certificate grant and Section 53 maintenance renewals (Years 3 through 20)'
  },
  {
    id: 'PHASE_7_APPEAL',
    label: '7. Appeals & Litigation',
    shortLabel: 'Appeals',
    description: 'Refusal challenges, Section 117A High Court / Controller appeals, hearings, and judgments'
  }
];

/**
 * Master List of 33 Statutory Statuses grouped by Phase
 */
export const STATUTORY_STATUSES = [
  // --- Phase 1: Provisional Specification (PS) ---
  {
    id: 'STATUS_1',
    name: 'Idf sent, awaiting data',
    phase: 'PHASE_1_PS',
    colorKey: 'PURPLE',
    colorName: 'purple',
    tip: 'Invention Disclosure Form (IDF) dispatched to client, awaiting initial technical input.'
  },
  {
    id: 'STATUS_2',
    name: 'PS Underdrafting',
    phase: 'PHASE_1_PS',
    colorKey: 'YELLOW',
    colorName: 'yellow',
    tip: 'Provisional Specification is actively being drafted by the assigned technical patent attorney.'
  },
  {
    id: 'STATUS_3',
    name: 'PS under review',
    phase: 'PHASE_1_PS',
    colorKey: 'GREY',
    colorName: 'grey',
    tip: 'Provisional draft submitted for internal review by Senior Partner / QA team.'
  },
  {
    id: 'STATUS_4',
    name: 'PS Draft Sent, waiting for confirmation',
    phase: 'PHASE_1_PS',
    colorKey: 'ORANGE',
    colorName: 'orange',
    tip: 'Vetted PS draft dispatched to client for review and sign-off.'
  },
  {
    id: 'STATUS_5',
    name: 'PS Sent for filing',
    phase: 'PHASE_1_PS',
    colorKey: 'YELLOW',
    colorName: 'yellow',
    tip: 'Approved PS specification submitted to paralegal docket for e-filing on IPO Portal.'
  },
  {
    id: 'STATUS_6',
    name: 'PS Filed',
    phase: 'PHASE_1_PS',
    colorKey: 'GREEN',
    colorName: 'green',
    tip: 'Form 1 & 2 e-filed with Patent Office. CBR receipt and application number generated.'
  },
  {
    id: 'STATUS_7',
    name: 'PS Postdated',
    phase: 'PHASE_1_PS',
    colorKey: 'GREEN',
    colorName: 'green',
    tip: 'Section 17 request allowed. Priority post-dated by up to 6 months from original filing.'
  },

  // --- Phase 2: Complete Specification (CS & Direct CS) ---
  {
    id: 'STATUS_8',
    name: 'Checklist sent for CS, awaiting Data',
    phase: 'PHASE_2_CS',
    colorKey: 'PURPLE',
    colorName: 'purple',
    tip: 'Complete Specification technical checklist & claims questionnaire sent to client.'
  },
  {
    id: 'STATUS_9',
    name: 'CS underdrafting',
    phase: 'PHASE_2_CS',
    colorKey: 'YELLOW',
    colorName: 'yellow',
    tip: 'Complete Specification (including 150-word abstract, description, and claims) is being drafted.'
  },
  {
    id: 'STATUS_10',
    name: 'CS under review',
    phase: 'PHASE_2_CS',
    colorKey: 'GREY',
    colorName: 'grey',
    tip: 'CS draft, claim breadth, and compliance being scrutinized by Senior Partner / Lead Patent Attorney.'
  },
  {
    id: 'STATUS_11',
    name: 'CS Draft Sent, Waiting Confirmation',
    phase: 'PHASE_2_CS',
    colorKey: 'ORANGE',
    colorName: 'orange',
    tip: 'Complete Specification sent to client for final approval and Form 2 sign-off.'
  },

  // --- Phase 3: Publication & Examination ---
  {
    id: 'STATUS_12',
    name: 'F9 filed, F18 not filed',
    phase: 'PHASE_3_PUB_EXAM',
    colorKey: 'GREEN',
    colorName: 'green',
    tip: 'Early publication requested under Form 9 (Sec 11A(2)). Form 18 RFE remains to be filed.'
  },
  {
    id: 'STATUS_13',
    name: 'F9 & F18 filed',
    phase: 'PHASE_3_PUB_EXAM',
    colorKey: 'GREEN',
    colorName: 'green',
    tip: 'Both Form 9 (Early Pub) and Form 18 (Request for Examination) successfully submitted.'
  },
  {
    id: 'STATUS_14',
    name: 'F9 not filed, F18 filed',
    phase: 'PHASE_3_PUB_EXAM',
    colorKey: 'YELLOW',
    colorName: 'yellow',
    tip: 'Published automatically after 18 months without Form 9; Form 18 filed, pending examination.'
  },
  {
    id: 'STATUS_15',
    name: 'Patent Published',
    phase: 'PHASE_3_PUB_EXAM',
    colorKey: 'BLUE',
    colorName: 'blue',
    tip: 'Published in the Official Patent Office Journal (Section 11A). Opens pre-grant opposition window.'
  },

  // --- Phase 4: Office Actions (FER & Form 4) ---
  {
    id: 'STATUS_16',
    name: 'FER Received',
    phase: 'PHASE_4_FER',
    colorKey: 'BLUE',
    colorName: 'blue',
    tip: 'First Examination Report issued by Patent Office. 6-month statutory countdown initiated.'
  },
  {
    id: 'STATUS_17',
    name: 'Form-3 filed',
    phase: 'PHASE_4_FER',
    colorKey: 'GREEN',
    colorName: 'green',
    tip: 'Form 3 Section 8 statement and undertaking filed within 3 months of FER receipt.'
  },
  {
    id: 'STATUS_18',
    name: 'FER reply under drafting',
    phase: 'PHASE_4_FER',
    colorKey: 'YELLOW',
    colorName: 'yellow',
    tip: 'Response to FER technical objections, citations, and claim amendments being prepared.'
  },
  {
    id: 'STATUS_19',
    name: 'FER Reply sent for confirmation',
    phase: 'PHASE_4_FER',
    colorKey: 'ORANGE',
    colorName: 'orange',
    tip: 'Draft FER response and claim amendments dispatched to client for formal confirmation.'
  },
  {
    id: 'STATUS_20',
    name: 'Extension of date of reply filing under F4',
    phase: 'PHASE_4_FER',
    colorKey: 'ORANGE',
    colorName: 'orange',
    tip: 'Form 4 extension requested under Rule 24B(6) (allowed up to 3 calendar months maximum).'
  },
  {
    id: 'STATUS_21',
    name: 'FER Reply filed, awaiting hearing',
    phase: 'PHASE_4_FER',
    colorKey: 'GREEN',
    colorName: 'green',
    tip: 'Comprehensive FER response e-filed. Awaiting Controller disposal or hearing notice.'
  },

  // --- Phase 5: Hearing & Written Submissions ---
  {
    id: 'STATUS_22',
    name: 'Hearing notice received',
    phase: 'PHASE_5_HEARING',
    colorKey: 'BLUE',
    colorName: 'blue',
    tip: 'Official Hearing Notice issued under Rule 129 / Rule 28(2) specifying hearing date.'
  },
  {
    id: 'STATUS_23',
    name: 'Form-30 Hearing Interest Filed',
    phase: 'PHASE_5_HEARING',
    colorKey: 'GREEN',
    colorName: 'green',
    tip: 'Form 30 notice of intention to attend hearing e-filed (must be at least 3 days before hearing).'
  },
  {
    id: 'STATUS_24',
    name: 'Hearing attended, WS underdrafting',
    phase: 'PHASE_5_HEARING',
    colorKey: 'YELLOW',
    colorName: 'yellow',
    tip: 'Hearing successfully argued before Controller. Written Submissions (WS) being prepared (15-day limit).'
  },
  {
    id: 'STATUS_25',
    name: 'WS filed, waiting for Decision',
    phase: 'PHASE_5_HEARING',
    colorKey: 'GREEN',
    colorName: 'green',
    tip: 'Written Submissions along with amended claims e-filed. Awaiting final order from Controller.'
  },

  // --- Phase 6: Disposal, Grant & Renewals ---
  {
    id: 'STATUS_26',
    name: 'Patent Granted, awaiting instructions for renewal',
    phase: 'PHASE_6_GRANT_RENEWAL',
    colorKey: 'GREEN',
    colorName: 'green',
    tip: 'Patent Certificate issued under Section 43! Awaiting client instructions for Section 53 renewals.'
  },
  // Dynamic Renewals (Statuses for all years 3 to 20)
  ...Array.from({ length: 18 }, (_, i) => {
    const yr = i + 3;
    return {
      id: `STATUS_RENEWAL_Y${yr}`,
      name: `Patent Renewed for ${yr} years`,
      renewalYear: yr,
      phase: 'PHASE_6_GRANT_RENEWAL',
      colorKey: 'GREEN',
      colorName: 'green',
      tip: `Section 53 maintenance annuity paid for Year ${yr}. Patent maintained in force.`
    };
  }),

  // --- Phase 7: Appeals & Litigation ---
  {
    id: 'STATUS_27',
    name: 'Patent Refused awaiting instruction for appeal with controller',
    phase: 'PHASE_7_APPEAL',
    colorKey: 'ORANGE',
    colorName: 'orange',
    tip: 'Controller issued refusal order under Section 15. Awaiting instructions for review/appeal.'
  },
  {
    id: 'STATUS_28',
    name: 'Patent Refused awaiting instructions for High court appeal',
    phase: 'PHASE_7_APPEAL',
    colorKey: 'ORANGE',
    colorName: 'orange',
    tip: 'Refusal order received. Evaluating Section 117A appeal before the High Court (IPD).'
  },
  {
    id: 'STATUS_30',
    name: 'Appeal with controller filed, waiting for hearing',
    phase: 'PHASE_7_APPEAL',
    colorKey: 'GREEN',
    colorName: 'green',
    tip: 'Review petition / appeal before Controller filed. Awaiting appointment of hearing date.'
  },
  {
    id: 'STATUS_31',
    name: 'Appeal with high court filed waiting for date',
    phase: 'PHASE_7_APPEAL',
    colorKey: 'GREEN',
    colorName: 'green',
    tip: 'Statutory Section 117A appeal filed before High Court IP Division. Awaiting listing date.'
  },
  {
    id: 'STATUS_32',
    name: 'Appeal with Controller heard, WS to be filed by deadline',
    phase: 'PHASE_7_APPEAL',
    colorKey: 'YELLOW',
    colorName: 'yellow',
    tip: 'Controller appeal heard. Written submissions to be filed within the Controller-stipulated deadline.'
  },
  {
    id: 'STATUS_33',
    name: 'Appeal with high court heard, awaiting judgement',
    phase: 'PHASE_7_APPEAL',
    colorKey: 'BLUE',
    colorName: 'blue',
    tip: 'High Court arguments concluded. Reserved for final judgment / remand order.'
  }
];

/**
 * Get color object for any status string (including legacy ones)
 */
export function getStatusColor(statusName) {
  if (!statusName) return STATUS_COLORS.GREY;
  const norm = String(statusName).trim().toLowerCase();

  // Find exact or partial match in statutory list
  const found = STATUTORY_STATUSES.find((s) => s.name.toLowerCase() === norm);
  if (found && STATUS_COLORS[found.colorKey]) {
    return STATUS_COLORS[found.colorKey];
  }

  // Renewal dynamic matching e.g. "Patent Renewed for 5 years" or "Patent Renewed for ___ years"
  if (norm.includes('renewed')) {
    return STATUS_COLORS.GREEN;
  }

  // Fallback by keyword semantics
  if (
    norm.includes('awaiting data') || 
    norm.includes('awaiting information') || 
    norm.includes('idf sent') ||
    norm.includes('checklist sent')
  ) {
    return STATUS_COLORS.PURPLE;
  }

  if (
    norm.includes('underdrafting') || 
    norm.includes('under drafting') || 
    norm.includes('under-drafting') ||
    norm.includes('ws to be filed') ||
    norm.includes('sent for filing')
  ) {
    return STATUS_COLORS.YELLOW;
  }

  if (
    norm.includes('under review') || 
    norm.includes('under-review') || 
    norm.includes('qa')
  ) {
    return STATUS_COLORS.GREY;
  }

  if (
    norm.includes('waiting confirmation') || 
    norm.includes('waiting for confirmation') || 
    norm.includes('draft sent') ||
    norm.includes('awaiting instruction') ||
    norm.includes('awaiting instructions') ||
    norm.includes('extension of date')
  ) {
    return STATUS_COLORS.ORANGE;
  }

  if (
    norm.includes('filed') || 
    norm.includes('postdated') || 
    norm.includes('granted')
  ) {
    return STATUS_COLORS.GREEN;
  }

  if (
    norm.includes('published') || 
    norm.includes('received') || 
    norm.includes('heard') || 
    norm.includes('judgement')
  ) {
    return STATUS_COLORS.BLUE;
  }

  return STATUS_COLORS.GREY;
}

/**
 * Get Phase ID for a given status
 */
export function getStatusPhase(statusName) {
  if (!statusName) return 'PHASE_1_PS';
  const norm = String(statusName).trim().toLowerCase();
  const found = STATUTORY_STATUSES.find((s) => s.name.toLowerCase() === norm);
  if (found) return found.phase;

  if (norm.includes('ps ') || norm.includes('idf ') || norm.includes('provisional')) return 'PHASE_1_PS';
  if (norm.includes('cs ') || norm.includes('complete')) return 'PHASE_2_CS';
  if (norm.includes('f9') || norm.includes('f18') || norm.includes('published')) return 'PHASE_3_PUB_EXAM';
  if (norm.includes('fer') || norm.includes('form-3')) return 'PHASE_4_FER';
  if (norm.includes('hearing') || norm.includes('ws ') || norm.includes('form-30')) return 'PHASE_5_HEARING';
  if (norm.includes('grant') || norm.includes('renew')) return 'PHASE_6_GRANT_RENEWAL';
  if (norm.includes('appeal') || norm.includes('court') || norm.includes('refused')) return 'PHASE_7_APPEAL';

  return 'PHASE_1_PS';
}


/**
 * Normalize any legacy status string to an official statutory status
 */
export function normalizeStatus(status, specType = 'PROVISIONAL') {
  if (!status) return 'Idf sent, awaiting data';
  const s = String(status).trim();
  const lower = s.toLowerCase();

  // If already an official statutory status name
  const exact = STATUTORY_STATUSES.find((st) => st.name.toLowerCase() === lower);
  if (exact) return exact.name;

  if (lower.includes('renewed')) return s;

  // Legacy string mappings
  const isCs = (specType && String(specType).toUpperCase().includes('CS')) || lower.includes('cs');

  if (lower.includes('purple')) {
    return isCs ? 'Checklist sent for CS, awaiting Data' : 'Idf sent, awaiting data';
  }
  if (lower.includes('yellow')) {
    return isCs ? 'CS underdrafting' : 'PS Underdrafting';
  }
  if (lower.includes('grey')) {
    return isCs ? 'CS under review' : 'PS under review';
  }
  if (lower.includes('orange')) {
    return isCs ? 'CS Draft Sent, Waiting Confirmation' : 'PS Draft Sent, waiting for confirmation';
  }
  if (lower === 'not started') {
    return 'Idf sent, awaiting data';
  }
  if (lower === 'ps filed - cs not filed') {
    return 'Checklist sent for CS, awaiting Data';
  }
  if (lower === 'published') {
    return 'Patent Published';
  }
  if (lower.includes('fer received') || lower.includes('reply not filed')) {
    return 'FER reply under drafting';
  }
  if (lower === 'ps filed' || lower === 'idf - green') {
    return 'PS Filed';
  }

  return 'Idf sent, awaiting data';
}
