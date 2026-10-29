// frontend/src/constants/miscFormsConstants.js
/**
 * Miscellaneous Statutory Forms (Form 13, Form 6, Form 16, Form 30, Form 27 & Form 4)
 * Includes official First Schedule entries, fee options, and 4-step prosecution flow:
 * 1. Need confirmation/requirement by the client
 * 2. Sent for filing (triggers 3-day inventor/client ack deadline)
 * 3. Filed (CBR and filing date logged)
 * 4. Updated by the Patent Office (order passed / official register amended)
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
    tip: 'Awaiting client requirements, signed assignment/consent deed, or approval to proceed.'
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
    tip: 'Vetted and queued in paralegal docket for IPO submission (triggers 3-day acknowledgment clock).'
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
    tip: 'Patent Office order passed / official register updated / request disposed.'
  }
];

export const MISC_FORM_MAIN_TYPES = [
  {
    id: 'FORM_1',
    label: 'Form 1 (POR)',
    name: 'Form 1 - Proof of Right (POR)',
    shortTitle: 'Form 1 (POR)',
    badgeBg: 'rgba(14, 165, 233, 0.15)',
    badgeFg: '#0284C7',
    badgeBorder: 'rgba(14, 165, 233, 0.3)',
    tag: 'F1',
    timing: 'Within 6 Months of Filing',
    description: 'Proof of Right (POR) / Assignment Deed from inventor to applicant under Section 7(2) & Rule 10'
  },
  {
    id: 'FORM_26',
    label: 'Form 26 (POA)',
    name: 'Form 26 - Power of Authority (POA)',
    shortTitle: 'Form 26 (POA)',
    badgeBg: 'rgba(99, 102, 241, 0.15)',
    badgeFg: '#4F46E5',
    badgeBorder: 'rgba(99, 102, 241, 0.3)',
    tag: 'F26',
    timing: 'Within 3 Months of Filing',
    description: 'Authorization of patent agent or attorney on Form 26 under Section 127, 132 & Rule 135'
  },
  {
    id: 'FORM_13',
    label: 'Form 13',
    name: 'Form 13 (Amendments & Inventors)',
    shortTitle: 'Form 13',
    badgeBg: 'rgba(59, 130, 246, 0.15)',
    badgeFg: '#2563EB',
    badgeBorder: 'rgba(59, 130, 246, 0.3)',
    tag: 'F13',
    timing: 'Pre/Post Grant',
    description: 'Addition, deletion of inventor or clerical / specification corrections'
  },
  {
    id: 'FORM_6',
    label: 'Form 6',
    name: 'Form 6 (Applicant: Pre-Grant)',
    shortTitle: 'Form 6',
    badgeBg: 'rgba(16, 185, 129, 0.15)',
    badgeFg: '#059669',
    badgeBorder: 'rgba(16, 185, 129, 0.3)',
    tag: 'F6',
    timing: 'Pre-Grant Only',
    description: 'Transfer / substitution or addition of patent applicant pre-grant (Sec 20)'
  },
  {
    id: 'FORM_16',
    label: 'Form 16',
    name: 'Form 16 (Applicant: Post-Grant)',
    shortTitle: 'Form 16',
    badgeBg: 'rgba(217, 119, 6, 0.15)',
    badgeFg: '#D97706',
    badgeBorder: 'rgba(217, 119, 6, 0.3)',
    tag: 'F16',
    timing: 'Post-Grant Only',
    description: 'Transfer of title, assignment, transmission or addition of patentee post-grant (Sec 69)'
  },
  {
    id: 'FORM_30',
    label: 'Form 30',
    name: 'Form 30 (Omnibus Petitions)',
    shortTitle: 'Form 30',
    badgeBg: 'rgba(139, 92, 246, 0.15)',
    badgeFg: '#7C3AED',
    badgeBorder: 'rgba(139, 92, 246, 0.3)',
    tag: 'F30',
    timing: 'Any Stage',
    description: 'Adjournment, office action response, DAS codes, NBA approvals, certified copies, withdrawal'
  },
  {
    id: 'FORM_27',
    label: 'Form 27',
    name: 'Form 27 (Statement of Working)',
    shortTitle: 'Form 27',
    badgeBg: 'rgba(5, 150, 105, 0.15)',
    badgeFg: '#059669',
    badgeBorder: 'rgba(5, 150, 105, 0.3)',
    tag: 'F27',
    timing: 'Post-Grant / Triennial',
    description: 'Commercial working of invention under Section 146(2) & Rule 131; runs parallel with Section 53 renewals'
  },
  {
    id: 'FORM_4',
    label: 'Form 4',
    name: 'Form 4 (Extension of Time & Condonation of Delay)',
    shortTitle: 'Form 4',
    badgeBg: 'rgba(239, 68, 68, 0.15)',
    badgeFg: '#DC2626',
    badgeBorder: 'rgba(239, 68, 68, 0.3)',
    tag: 'F4',
    timing: 'Pre/Post Grant',
    description: 'Request for extension of time or condonation of delay (Section 53(2), 142(4), Rules 12(5), 13(6), 24B(6), 24C(11), 80(1A), 130, 131, 138)'
  }
];

export const FORM_1_SUBTYPES = [
  {
    id: 'FORM_1_POR_ASSIGNMENT',
    label: 'Form 1: Assignment Deed / Proof of Right u/s 7(2)',
    shortLabel: 'Form 1: Assignment Deed (Sec 7(2))',
    code: 'FORM 1 => PROOF OF RIGHT (ASSIGNMENT DEED)',
    description: 'Filing of Assignment Deed executed by inventor(s) in favor of the applicant under Section 7(2) & Rule 10',
    rule: 'Section 7(2) & Rule 10',
    numberField: 'application_number',
    numberFieldLabel: 'Application Number',
    defaultFeeMode: 'WITH_FEE'
  },
  {
    id: 'FORM_1_POR_ENDORSEMENT',
    label: 'Form 1: Inventor Endorsement in Paragraph 9(i)',
    shortLabel: 'Form 1: Inventor Endorsement',
    code: 'FORM 1 => INVENTOR ENDORSEMENT DECLARATION',
    description: 'Inventor declaration and endorsement signed directly on Form 1 (paragraph 9(i))',
    rule: 'Section 7(2) & Rule 10',
    numberField: 'application_number',
    numberFieldLabel: 'Application Number',
    defaultFeeMode: 'WITH_FEE'
  }
];

export const FORM_26_SUBTYPES = [
  {
    id: 'FORM_26_SPECIFIC_POA',
    label: 'Form 26: Specific Power of Authority (POA)',
    shortLabel: 'Form 26: Specific POA',
    code: 'FORM 26 => SPECIFIC POWER OF AUTHORITY',
    description: 'Executed Form 26 appointing patent agent/attorney for this specific patent application under Section 127, 132 & Rule 135',
    rule: 'Section 127, 132 & Rule 135',
    numberField: 'application_number',
    numberFieldLabel: 'Application Number',
    defaultFeeMode: 'WITHOUT_FEE'
  },
  {
    id: 'FORM_26_GENERAL_POA',
    label: 'Form 26: General Power of Authority (GPA Reference)',
    shortLabel: 'Form 26: General POA (GPA)',
    code: 'FORM 26 => GENERAL POWER OF AUTHORITY REFERENCE',
    description: 'Reference to registered General Power of Authority on record with IPO under Section 127, 132 & Rule 135',
    rule: 'Section 127, 132 & Rule 135',
    numberField: 'application_number',
    numberFieldLabel: 'Application Number',
    defaultFeeMode: 'WITHOUT_FEE'
  }
];

export const FORM_13_SUBTYPES = [
  {
    id: 'FORM_13_ADD_INVENTOR',
    label: 'Form 13: Addition of Inventor',
    shortLabel: 'Form 13: Addition of Inventor',
    code: 'FORM 13 => ADDITION OF INVENTOR',
    description: 'Add a new co-inventor post-filing under Section 57 / Rule 81',
    rule: 'Section 57 & Rule 81(1)',
    numberField: 'application_number',
    numberFieldLabel: 'Application Number',
    defaultFeeMode: 'WITH_FEE'
  },
  {
    id: 'FORM_13_DEL_INVENTOR',
    label: 'Form 13: Deletion of Inventor',
    shortLabel: 'Form 13: Deletion of Inventor',
    code: 'FORM 13 => DELETION OF INVENTOR',
    description: 'Remove an inventor with consent deed / statement under Section 57',
    rule: 'Section 57 & Rule 81(1)',
    numberField: 'application_number',
    numberFieldLabel: 'Application Number',
    defaultFeeMode: 'WITH_FEE'
  },
  {
    id: 'FORM_13_CORRECTION',
    label: 'Form 13: Correction of Details',
    shortLabel: 'Form 13: Correction of Details',
    code: 'FORM 13 => CORRECTION OF DETAILS / AMENDMENT',
    description: 'Clerical corrections, applicant/inventor name, address, or specification amendment',
    rule: 'Section 57 & Rule 81(1)',
    numberField: 'application_number',
    numberFieldLabel: 'Application Number',
    defaultFeeMode: 'WITH_FEE'
  }
];

export const FORM_6_SUBTYPES = [
  {
    id: 'FORM_6_TRANSFER',
    label: 'Form 6: Transfer of Patent Applicant (Pre-Grant)',
    shortLabel: 'Form 6: Transfer of Applicant (Pre-Grant)',
    code: 'FORM 6',
    description: 'SUBSTITUTION/CHANGE OF APPLICANT',
    subTitle: 'Claim regarding change of applicant (assignment / transmission / substitution) pre-grant under Section 20',
    rule: 'Section 20(1) & Rule 34',
    numberField: 'application_number',
    numberFieldLabel: 'Application Number',
    defaultFeeMode: 'WITH_FEE'
  },
  {
    id: 'FORM_6_ADDITION',
    label: 'Form 6: Addition of Patent Applicant (Pre-Grant)',
    shortLabel: 'Form 6: Addition of Applicant (Pre-Grant)',
    code: 'FORM 6',
    description: 'SUBSTITUTION/CHANGE OF APPLICANT (ADDITION)',
    subTitle: 'Addition of co-applicant pre-grant under Section 20(4) & Rule 34',
    rule: 'Section 20(4) & Rule 34',
    numberField: 'application_number',
    numberFieldLabel: 'Application Number',
    defaultFeeMode: 'WITH_FEE'
  }
];

export const FORM_16_SUBTYPES = [
  {
    id: 'FORM_16_TRANSFER',
    label: 'Form 16: Transfer of Patent / Assignment (Post-Grant)',
    shortLabel: 'Form 16: Transfer of Patent (Post-Grant)',
    code: 'FORM 16',
    description: 'APPLICATION FOR REGISTRATION OF TITLE / ASSIGNMENT / TRANSMISSION (POST-GRANT)',
    subTitle: 'Registration of title, assignment, transmission or mortgage post-grant under Section 68, 69 & Rule 90',
    rule: 'Section 68, 69(1) & Rule 90',
    numberField: 'patent_number',
    numberFieldLabel: 'Patent Number',
    defaultFeeMode: 'WITH_FEE'
  },
  {
    id: 'FORM_16_ADDITION',
    label: 'Form 16: Addition of Patentee / Co-Applicant (Post-Grant)',
    shortLabel: 'Form 16: Addition of Patentee (Post-Grant)',
    code: 'FORM 16',
    description: 'APPLICATION FOR REGISTRATION OF CO-PATENTEE / ADDITION (POST-GRANT)',
    subTitle: 'Registration of co-patentee / addition of patent applicant post-grant under Section 69(2) & Rule 90',
    rule: 'Section 69(2) & Rule 90',
    numberField: 'patent_number',
    numberFieldLabel: 'Patent Number',
    defaultFeeMode: 'WITH_FEE'
  }
];
export const FORM_27_SUBTYPES = [
  {
    id: 'FORM_27_TRIENNIAL',
    label: 'Form 27: Triennial Statement of Working',
    shortLabel: 'Form 27: Statement of Working (Rule 131)',
    code: 'FORM 27 => STATEMENT REGARDING THE WORKING OF PATENTED INVENTION',
    description: 'Statement regarding the working of a patented invention on a commercial scale in India filed once in respect of every period of 3 financial years (Section 146(2) & Rule 131). Runs parallel with patent renewals.',
    subTitle: 'Section 146(2) & Rule 131(2) (2024 Amendments)',
    rule: 'Section 146(2) & Rule 131',
    numberField: 'patent_number',
    numberFieldLabel: 'Patent Number',
    defaultFeeMode: 'WITHOUT_FEE'
  },
  {
    id: 'FORM_27_EXT_RULE131',
    label: 'Form 4: Extension of Time for Form 27 (Rule 131(2))',
    shortLabel: 'Form 4: Extension for Form 27 (+3 Months)',
    code: 'FORM 4 / RULE 131(2) => EXTENSION OF TIME FOR FORM 27',
    description: 'Petition on Form 4 to extend the Form-27 filing deadline by up to 3 months under amended Rule 131(2) & Rule 138',
    subTitle: 'Statutory extension petition under Rule 131(2) & Rule 138',
    rule: 'Rule 131(2) & Rule 138',
    numberField: 'patent_number',
    numberFieldLabel: 'Patent Number',
    defaultFeeMode: 'WITH_FEE'
  }
];


export const FORM_4_SUBTYPES = [
  {
    id: 'FORM_4_S53_2_R80_1A',
    label: 'Extension u/s 53(2) and u/r 80(1A) [Subsequent Renewals]',
    shortLabel: 'u/s 53(2) & u/r 80(1A) [Subsequent Renewals]',
    code: 'Extension u/s 53(2) and u/r 80(1A) [Subsequent Renewals]',
    rule: 'Section 53(2) & Rule 80(1A)',
    duration: 'Up to 6 Months',
    timing: 'Post-Grant (Year 3 to Year 20)',
    description: 'Extension of time for payment of annual maintenance renewal fee (annuities) for Year 3 onwards to prevent patent lapse under Section 53(2) and Rule 80(1A).',
    conditions: 'Request on Form 4 must be filed within the 6-month extension window from the annual anniversary date, accompanied by the annual renewal fee and monthly extension fee.',
    feeInfo: 'Statutory monthly extension fee: ₹1,000/mo (Natural person / Startup / Small entity / Edu) | ₹4,000/mo (Large entity)',
    numberField: 'patent_number',
    numberFieldLabel: 'Patent Number',
    defaultFeeMode: 'WITH_FEE'
  },
  {
    id: 'FORM_4_R24B_6',
    label: 'Extension u/r 24B(6)/24B(5)',
    shortLabel: 'u/r 24B(6)/24B(5) [FER Response - Ordinary]',
    code: 'Extension u/r 24B(6)/24B(5)',
    rule: 'Rule 24B(6) read with Rule 24B(5)',
    duration: 'Up to 3 Months',
    timing: 'Examination Stage (Ordinary Examination)',
    description: 'Extension of time for putting an application in order for grant or responding to the First Examination Report (FER) under ordinary examination (Section 21 & Rule 24B).',
    conditions: 'Form 4 must be filed prior to the expiry of the standard 6-month FER deadline. Extends response window up to total 9 months from the date of the FER.',
    feeInfo: 'Statutory monthly extension fee: ₹1,000/mo (Natural person / Startup / Small entity / Edu) | ₹4,000/mo (Large entity)',
    numberField: 'application_number',
    numberFieldLabel: 'Application Number',
    defaultFeeMode: 'WITH_FEE'
  },
  {
    id: 'FORM_4_R24C_11',
    label: 'Extension u/r 24C(11)',
    shortLabel: 'u/r 24C(11) [FER Response - Expedited]',
    code: 'Extension u/r 24C(11)',
    rule: 'Rule 24C(11) read with Rule 24C(10)',
    duration: 'Up to 3 Months',
    timing: 'Examination Stage (Expedited Route - Form 18A)',
    description: 'Extension of time to overcome objections and respond to the First Examination Report (FER) under the Expedited Examination procedure (Form 18A).',
    conditions: 'Form 4 must be filed before the initial 6-month expedited FER period expires. Extends the response window up to 9 months.',
    feeInfo: 'Statutory monthly extension fee: ₹1,000/mo (Natural person / Startup / Small entity / Edu) | ₹4,000/mo (Large entity)',
    numberField: 'application_number',
    numberFieldLabel: 'Application Number',
    defaultFeeMode: 'WITH_FEE'
  },
  {
    id: 'FORM_4_R130',
    label: 'Extension u/r 130',
    shortLabel: 'u/r 130 [Review of Controller Decision / Ex-Parte Order]',
    code: 'Extension u/r 130',
    rule: 'Rule 130 & Section 77(1)(f)/(g)',
    duration: 'Not exceeding 1 Month',
    timing: 'Post-Decision / Opposition / Hearing',
    description: 'Extension of time for filing an application for review of Controller decision or setting aside of ex-parte order on Form 24 beyond the standard 1-month window.',
    conditions: 'Form 4 petition must explain genuine grounds and reasons for delay to the Controller, accompanied by prescribed fee.',
    feeInfo: 'Statutory extension fee: ₹1,000 (Natural person / Startup / Small entity / Edu) | ₹4,000 (Large entity)',
    numberField: 'application_number',
    numberFieldLabel: 'Application Number',
    defaultFeeMode: 'WITH_FEE'
  },
  {
    id: 'FORM_4_S142_4_R80_1A',
    label: '142(4) and u/r 80(1A) [First Renewal upon Grant]',
    shortLabel: '142(4) & u/r 80(1A) [First Renewal upon Grant]',
    code: '142(4) and u/r 80(1A) [First Renewal upon Grant]',
    rule: 'Section 142(4) & Rule 80(1A)',
    duration: 'Up to 6 Months (Total 9 Months from date of recordal)',
    timing: 'Post-Grant (First Annuity Backlog)',
    description: 'Extension of time for payment of accumulated backlog renewal fees when patent is granted more than 2 years from filing date under Section 142(4) & Rule 80(1A).',
    conditions: 'Standard period is 3 months from the date of recordal in the Register of Patents; Form 4 allows extension up to 9 months from the date of recordal.',
    feeInfo: 'Statutory monthly extension fee: ₹1,000/mo (Natural person / Startup / Small entity / Edu) | ₹4,000/mo (Large entity)',
    numberField: 'patent_number',
    numberFieldLabel: 'Patent Number',
    defaultFeeMode: 'WITH_FEE'
  },
  {
    id: 'FORM_4_R13_6',
    label: 'Extension u/r 13(6)',
    shortLabel: 'u/r 13(6) [Declaration of Inventorship Form 5]',
    code: 'Extension u/r 13(6)',
    rule: 'Rule 13(6)',
    duration: 'Up to 1 Month (Extendable under Rule 138 up to 6 Months)',
    timing: 'Complete Specification Filing Stage',
    description: 'Extension of time for submitting Declaration as to Inventorship (Form 5) beyond 1 month from filing complete specification or Indian national phase entry.',
    conditions: 'Form 4 must be filed with the prescribed monthly extension fee before or during the extension window.',
    feeInfo: 'Statutory monthly extension fee: ₹1,000/mo (Natural person / Startup / Small entity / Edu) | ₹4,000/mo (Large entity)',
    numberField: 'application_number',
    numberFieldLabel: 'Application Number',
    defaultFeeMode: 'WITH_FEE'
  },
  {
    id: 'FORM_4_R12_5',
    label: 'Extension u/r 12(5) NEW',
    shortLabel: 'u/r 12(5) [Foreign Filings Form 3 / Section 8] NEW',
    code: 'Extension u/r 12(5)',
    isNew: true,
    rule: 'Rule 12(5) (Patents Amendment Rules 2024)',
    duration: 'Up to 3 Months',
    timing: 'Post-FER Examination Stage',
    description: 'Extension of time or condonation of delay for filing updated statement and undertaking regarding corresponding foreign patent applications (Form 3 / Section 8).',
    conditions: 'Introduced by 2024 Amendments: updated Form 3 details are due within 3 months of FER; extendable up to 3 months via Form 4 with prescribed monthly fee.',
    feeInfo: 'Statutory monthly extension fee: ₹1,000/mo (Natural person / Startup / Small entity / Edu) | ₹4,000/mo (Large entity)',
    numberField: 'application_number',
    numberFieldLabel: 'Application Number',
    defaultFeeMode: 'WITH_FEE'
  },
  {
    id: 'FORM_4_R131',
    label: 'Extension u/r 131 NEW',
    shortLabel: 'u/r 131 [Statement of Working Form 27] NEW',
    code: 'Extension u/r 131',
    isNew: true,
    rule: 'Rule 131(2) Proviso (Patents Amendment Rules 2024)',
    duration: 'Up to 3 Months',
    timing: 'Triennial Commercial Working Stage',
    description: 'Extension of time for submitting the triennial Statement of Working of Patent (Form 27) under amended Rule 131(2).',
    conditions: 'Form 4 petition to extend the September 30 filing deadline by up to 3 months for the relevant 3-year financial block.',
    feeInfo: 'Statutory monthly extension fee: ₹1,000/mo (Natural person / Startup / Small entity / Edu) | ₹4,000/mo (Large entity)',
    numberField: 'patent_number',
    numberFieldLabel: 'Patent Number',
    defaultFeeMode: 'WITH_FEE'
  },
  {
    id: 'FORM_4_R138',
    label: 'u/r 138 NEW',
    shortLabel: 'u/r 138 [Omnibus Extension / Condonation] NEW',
    code: 'u/r 138',
    isNew: true,
    rule: 'Rule 138 (Patents Amendment Rules 2024)',
    duration: 'Up to 6 Months (Cumulative)',
    timing: 'Any Stage under the Rules',
    description: 'Omnibus discretionary power of the Controller to extend time specified or condone delay for doing any act or taking any proceeding under the Patent Rules.',
    conditions: 'Substituted in 2024: Applicable to any procedural timeline under the Rules (except hard-coded statutory limits in the Act). May be requested multiple times sequentially within a cumulative 6-month limit on Form 4.',
    feeInfo: 'Statutory monthly extension fee: ₹1,000/mo (Natural person / Startup / Small entity / Edu) | ₹4,000/mo (Large entity)',
    numberField: 'application_number',
    numberFieldLabel: 'Application Number',
    defaultFeeMode: 'WITH_FEE'
  }
];

export const FORM_30_ENTRIES = [
  // --- WITH FEE OPTIONS (IPO First Schedule & Section 142) ---
  {
    id: 'ENTRY_S142_3_RESPONSE',
    code: 'S142(3)=>Response to office action',
    shortLabel: 'S142(3): Response to office action',
    description: 'S142(3)=>Response to office action',
    numberField: 'application_number',
    numberFieldLabel: 'Application Number',
    rule: 'Section 142(3)',
    feeCategory: 'WITH_FEE',
    defaultFeeMode: 'WITH_FEE'
  },
  {
    id: 'ENTRY_52_ADJOURNMENT',
    code: 'Schedule_1_Entry_Number 52=>Request for adjournment of hearing under rule 129A (for each adjournment)',
    shortLabel: 'Entry 52: Adjournment of hearing under Rule 129A',
    description: 'Schedule_1_Entry_Number 52=>Request for adjournment of hearing under rule 129A (for each adjournment)',
    numberField: 'application_number',
    numberFieldLabel: 'Application Number',
    rule: 'Rule 129A',
    feeCategory: 'WITH_FEE',
    defaultFeeMode: 'WITH_FEE'
  },
  {
    id: 'ENTRY_46_PETITION',
    code: 'Schedule_1_Entry_Number 46=>On petition not otherwise provided for',
    shortLabel: 'Entry 46: Petition not otherwise provided for (Rule 137)',
    description: 'Schedule_1_Entry_Number 46=>On petition not otherwise provided for',
    numberField: 'application_number',
    numberFieldLabel: 'Application Number',
    rule: 'Rule 137 / Schedule 1 Entry 46',
    feeCategory: 'WITH_FEE',
    defaultFeeMode: 'WITH_FEE'
  },
  {
    id: 'ENTRY_41_1_CERTIFIED_COPY',
    code: 'Schedule_1_Entry_Number 41 (1)=>(i) On request for certified copies under section 72 or for certificate under section 147 and rule 133(1)',
    shortLabel: 'Entry 41(1): Certified copies under Section 72 / Rule 133(1)',
    description: 'Schedule_1_Entry_Number 41 (1)=>(i) On request for certified copies under section 72 or for certificate under section 147 and rule 133(1)',
    numberField: 'application_number',
    numberFieldLabel: 'Application Number',
    rule: 'Section 72 & Rule 133(1)',
    feeCategory: 'WITH_FEE',
    defaultFeeMode: 'WITH_FEE'
  },
  {
    id: 'ENTRY_41_2_CERTIFIED_COPY',
    code: 'Schedule_1_Entry_Number 41 (2)=>(ii) On request for certified copies under section 72 or for certificate under section 147 and rule 133(2)',
    shortLabel: 'Entry 41(2): Certified copies under Section 72 / Rule 133(2)',
    description: 'Schedule_1_Entry_Number 41 (2)=>(ii) On request for certified copies under section 72 or for certificate under section 147 and rule 133(2).',
    numberField: 'application_number',
    numberFieldLabel: 'Application Number',
    rule: 'Section 72 & Rule 133(2)',
    feeCategory: 'WITH_FEE',
    defaultFeeMode: 'WITH_FEE'
  },
  {
    id: 'ENTRY_19_23_RESTORATION',
    code: 'Schedule_1_Entry_Number 19,23=>Additional fee for restoration under section 60, 61(3) and rule 86(1)',
    shortLabel: 'Entry 19, 23: Additional fee for restoration (Sec 60, 61(3))',
    description: 'Schedule_1_Entry_Number 19,23=>Additional fee for restoration under section 60, 61(3) and rule 86(1)',
    numberField: 'patent_number',
    numberFieldLabel: 'Patent Number',
    rule: 'Section 60, 61(3) & Rule 86(1)',
    feeCategory: 'WITH_FEE',
    defaultFeeMode: 'WITH_FEE'
  },

  // --- WITHOUT FEE OPTIONS (IPO Portal Submissions) ---
  {
    id: 'ENTRY_NA_NBA_APPROVAL',
    code: 'NA=>NBA Approval Submission',
    shortLabel: 'NA: NBA Approval Submission',
    description: 'NA=>NBA Approval Submission',
    numberField: 'application_number',
    numberFieldLabel: 'Application Number',
    rule: 'Biological Diversity Act, 2002 & Section 6',
    feeCategory: 'WITHOUT_FEE',
    defaultFeeMode: 'WITHOUT_FEE'
  },
  {
    id: 'ENTRY_NA_RESPONSE_OFFICE_ACTION',
    code: 'NA=>Response to office action',
    shortLabel: 'NA: Response to office action (Without Fee)',
    description: 'NA=>Response to office action',
    numberField: 'application_number',
    numberFieldLabel: 'Application Number',
    rule: 'Office Action Response / Intimation',
    feeCategory: 'WITHOUT_FEE',
    defaultFeeMode: 'WITHOUT_FEE'
  },
  {
    id: 'ENTRY_11A_3_C_WITHDRAWAL',
    code: '11A(3)(c)=>Request for Withdrawal',
    shortLabel: '11A(3)(c): Request for Withdrawal',
    description: '11A(3)(c)=>Request for Withdrawal',
    numberField: 'application_number',
    numberFieldLabel: 'Application Number',
    rule: 'Section 11A(3)(c) & Rule 26',
    feeCategory: 'WITHOUT_FEE',
    defaultFeeMode: 'WITHOUT_FEE'
  },
  {
    id: 'ENTRY_NA_SUBMISSION_DAS_CODE',
    code: 'NA=>Submission of DAS Code',
    shortLabel: 'NA: Submission of DAS Code',
    description: 'NA=>Submission of DAS Code',
    numberField: 'application_number',
    numberFieldLabel: 'Application Number',
    rule: 'WIPO DAS Code Intimation',
    feeCategory: 'WITHOUT_FEE',
    defaultFeeMode: 'WITHOUT_FEE'
  },
  {
    id: 'ENTRY_49A_WIPO_DAS',
    code: 'Schedule_1_Entry_Number 49A=>For preparation of certified copy of priority document and e-transmission through WIPO DAS',
    shortLabel: 'Entry 49A: Certified copy of priority doc & e-transmission through WIPO DAS',
    description: 'Schedule_1_Entry_Number 49A=>For preparation of certified copy of priority document and e-transmission through WIPO DAS',
    numberField: 'application_number',
    numberFieldLabel: 'Application Number',
    rule: 'First Schedule Entry 49A & WIPO DAS',
    feeCategory: 'WITHOUT_FEE',
    defaultFeeMode: 'WITHOUT_FEE'
  },
  {
    id: 'ENTRY_R21_PRIORITY_DOC',
    code: 'R21(1), R21(3)=>Submission of certified copy of priority document',
    shortLabel: 'R21(1), R21(3): Submission of certified copy of priority document',
    description: 'R21(1), R21(3)=>Submission of certified copy of priority document',
    numberField: 'application_number',
    numberFieldLabel: 'Application Number',
    rule: 'Rule 21(1) & 21(3)',
    feeCategory: 'WITHOUT_FEE',
    defaultFeeMode: 'WITHOUT_FEE'
  },
  {
    id: 'ENTRY_S25_1_R55_4_APPLICANT',
    code: 'S25(1)/ R55(4)=>Submission of documents by applicant in Pre-grant opposition',
    shortLabel: 'S25(1)/ R55(4): Submission of documents by applicant in Pre-grant opposition',
    description: 'S25(1)/ R55(4)=>Submission of documents by applicant in Pre-grant opposition',
    numberField: 'application_number',
    numberFieldLabel: 'Application Number',
    rule: 'Section 25(1) & Rule 55(4)',
    feeCategory: 'WITHOUT_FEE',
    defaultFeeMode: 'WITHOUT_FEE'
  },
  {
    id: 'ENTRY_S25_1_R55_1_OPPONENT',
    code: 'S25(1)/ R55(1)=>Submission of documents by opponent in Pre-grant opposition',
    shortLabel: 'S25(1)/ R55(1): Submission of documents by opponent in Pre-grant opposition',
    description: 'S25(1)/ R55(1)=>Submission of documents by opponent in Pre-grant opposition',
    numberField: 'application_number',
    numberFieldLabel: 'Application Number',
    rule: 'Section 25(1) & Rule 55(1)',
    feeCategory: 'WITHOUT_FEE',
    defaultFeeMode: 'WITHOUT_FEE'
  },

  // --- GENERAL / OTHER ---
  {
    id: 'ENTRY_OTHER',
    code: 'Other Form 30 Miscellaneous Petition',
    shortLabel: 'Form 30: Other Miscellaneous Petition',
    description: 'Custom petition or intimation filed under Form 30',
    numberField: 'application_number',
    numberFieldLabel: 'Application Number',
    rule: 'First Schedule, Patent Rules 2003',
    feeCategory: 'BOTH',
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

export function getMainFormTypeInfo(formType) {
  return MISC_FORM_MAIN_TYPES.find((m) => m.id === formType) || MISC_FORM_MAIN_TYPES[0];
}
