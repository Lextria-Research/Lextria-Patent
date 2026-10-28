// frontend/src/utils/feeSchedule.js
// Official First Schedule of Fees (The Patents Rules, 2003 as amended up to 2024)
// Indian Patent Office (IPO) Statutory Government Fee Schedule

export const ENTITY_TYPES = {
  NATURAL_PERSON: 'Natural Person',
  STARTUP: 'Startup',
  SMALL_ENTITY: 'Small Entity',
  EDUCATIONAL: 'Educational Institution',
  OTHER: 'Other(s) / Large Entity'
};

export function isReducedFeeEntity(entityType) {
  if (!entityType) return false;
  const normalized = String(entityType).toUpperCase().trim();
  return (
    normalized.includes('NATURAL') ||
    normalized.includes('INDIVIDUAL') ||
    normalized.includes('PERSON') ||
    normalized.includes('STARTUP') ||
    normalized.includes('SMALL') ||
    normalized.includes('EDUCATION') ||
    normalized.includes('INSTITUTE') ||
    normalized.includes('UNIVERSITY')
  );
}

/**
 * Form definitions with statutory e-filing and physical filing fees per the First Schedule.
 * E-filing fees are the standard and 10% lower than physical fees.
 */
export const STATUTORY_FORM_FEES = {
  F1: {
    form: 'Form 1',
    name: 'Application for Patent (Sec 7, 54, 135 & Rule 20(1))',
    eFiling: {
      reduced: 1600,
      others: 8000
    },
    physicalFiling: {
      reduced: 1750,
      others: 8800
    },
    pageFeeAfter30: { reduced: 160, others: 800 },
    claimFeeAfter10: { reduced: 320, others: 1600 },
    description: 'Basic filing fee up to 30 pages and 10 claims. Additional sheet: ₹160/₹800, additional claim: ₹320/₹1,600.'
  },
  F2: {
    form: 'Form 2',
    name: 'Provisional / Complete Specification (Sec 10 & Rule 13)',
    eFiling: {
      reduced: 0,
      others: 0
    },
    physicalFiling: {
      reduced: 0,
      others: 0
    },
    pageFeeAfter30: { reduced: 160, others: 800 },
    claimFeeAfter10: { reduced: 320, others: 1600 },
    description: 'No fee up to 30 pages and 10 claims. Excess pages: ₹160/₹800, excess claims: ₹320/₹1,600.'
  },
  F3: {
    form: 'Form 3',
    name: 'Statement and Undertaking regarding Foreign Applications (Sec 8 & Rule 12)',
    eFiling: {
      reduced: 0,
      others: 0
    },
    physicalFiling: {
      reduced: 0,
      others: 0
    },
    description: 'No official fee. Must be filed within 6 months of filing / 3 months of FER.'
  },
  F4_FER: {
    form: 'Form 4 (FER Extension)',
    name: 'Extension of Time to File FER Reply (Rule 24B(6))',
    eFiling: {
      reduced: 1000, // per month up to 3 months
      others: 4000
    },
    physicalFiling: {
      reduced: 1100,
      others: 4400
    },
    description: '₹1,000 / ₹4,000 per month for up to 3 months extension before expiry of 6 months.'
  },
  F4_RULE138: {
    form: 'Form 4 (Rule 138)',
    name: 'Extension of Time under Rule 138 (General Extension, 1 month)',
    eFiling: {
      reduced: 10000,
      others: 50000
    },
    physicalFiling: {
      reduced: 11000,
      others: 55000
    },
    description: 'Statutory extension of 1 month under Controller discretion.'
  },
  F5: {
    form: 'Form 5',
    name: 'Declaration as to Inventorship (Rule 13(6))',
    eFiling: {
      reduced: 0,
      others: 0
    },
    physicalFiling: {
      reduced: 0,
      others: 0
    },
    description: 'No official fee. Filed with Complete Specification or within 1 month.'
  },
  F6: {
    form: 'Form 6',
    name: 'Claim regarding entitlement / Change of Applicant (Sec 20(1), 20(4), 20(5))',
    eFiling: {
      reduced: 800,
      others: 4000
    },
    physicalFiling: {
      reduced: 880,
      others: 4400
    },
    description: 'Application for change or substitution of applicants.'
  },
  F7: {
    form: 'Form 7',
    name: 'Notice of Post-Grant Opposition (Sec 25(2) & Rule 55A)',
    eFiling: {
      reduced: 8000,
      others: 40000
    },
    physicalFiling: {
      reduced: 8800,
      others: 44000
    },
    description: 'Oppose granted patent within 12 months of publication.'
  },
  F7A: {
    form: 'Form 7A',
    name: 'Pre-Grant Opposition / Representation (Sec 25(1) & Rule 55)',
    eFiling: {
      reduced: 0,
      others: 0
    },
    physicalFiling: {
      reduced: 0,
      others: 0
    },
    description: 'Representation against grant of patent. Free of statutory fee.'
  },
  F8: {
    form: 'Form 8',
    name: 'Request for mention of inventor (Sec 28(2), 28(3))',
    eFiling: {
      reduced: 800,
      others: 4000
    },
    physicalFiling: {
      reduced: 880,
      others: 4400
    },
    description: 'Sec 28(2) free; Sec 28(3) ₹800/₹4,000.'
  },
  F9: {
    form: 'Form 9',
    name: 'Request for Early Publication (Sec 11A(2) & Rule 24A)',
    eFiling: {
      reduced: 2500,
      others: 12500
    },
    physicalFiling: {
      reduced: 2750,
      others: 13750
    },
    description: 'Published in Patent Office Journal within 1 month of request.'
  },
  F13: {
    form: 'Form 13',
    name: 'Application for Amendment of Application/Specification (Sec 57 & Rule 81(1))',
    eFiling: {
      reduced: 800, // Pre-grant: 800, Post-grant: 1600
      others: 4000  // Pre-grant: 4000, Post-grant: 8000
    },
    physicalFiling: {
      reduced: 880,
      others: 4400
    },
    description: 'Pre-grant amendment: ₹800/₹4,000; Post-grant amendment: ₹1,600/₹8,000.'
  },
  F18: {
    form: 'Form 18',
    name: 'Request for Examination (Sec 11B & Rule 24B(1)(i))',
    eFiling: {
      reduced: 4000,
      others: 20000
    },
    physicalFiling: {
      reduced: 4400,
      others: 22000
    },
    description: 'To be filed within 31/48 months from priority/filing date.'
  },
  F18A: {
    form: 'Form 18A',
    name: 'Request for Expedited Examination (Rule 24C)',
    eFiling: {
      reduced: 8000,
      others: 60000
    },
    physicalFiling: {
      reduced: 8800,
      others: 66000
    },
    description: 'Expedited processing for Startups, Small entities, Female inventors, Govt depts.'
  },
  F26: {
    form: 'Form 26',
    name: 'Form of Authorization of a Patent Agent / Power of Attorney (Rule 135)',
    eFiling: {
      reduced: 0,
      others: 0
    },
    physicalFiling: {
      reduced: 0,
      others: 0
    },
    description: 'No statutory fee payable to Patent Office (Subject to applicable Stamp Duty).'
  },
  F27: {
    form: 'Form 27',
    name: 'Statement regarding the working of a patented invention on a commercial scale (Sec 146(2) & Rule 131(1))',
    eFiling: {
      reduced: 0,
      others: 0
    },
    physicalFiling: {
      reduced: 0,
      others: 0
    },
    description: 'Annual commercial working statement. Free of statutory fee.'
  },
  F30: {
    form: 'Form 30',
    name: 'To be used when no other form is provided / Hearing Attendance Notice (Rule 62(2))',
    eFiling: {
      reduced: 1500,
      others: 7500
    },
    physicalFiling: {
      reduced: 1650,
      others: 8250
    },
    description: 'Written arguments, hearing confirmation (filed at least 3 days before hearing).'
  },
  SEC17: {
    form: 'Section 17',
    name: 'Request for Postdating of Application (Sec 17 & Rule 13)',
    eFiling: {
      reduced: 800,
      others: 4000
    },
    physicalFiling: {
      reduced: 880,
      others: 4400
    },
    description: 'Postdate application up to 6 months from original filing date.'
  }
};

/**
 * Section 53 Renewal Annuity Fees (Rule 80)
 * Payable before the expiration of the second year from the date of patent,
 * and in respect of the 3rd to 20th year.
 */
export const STATUTORY_RENEWAL_FEES = {
  Y3: { year: 3, reduced: 800, others: 4000 },
  Y4: { year: 4, reduced: 800, others: 4000 },
  Y5: { year: 5, reduced: 800, others: 4000 },
  Y6: { year: 6, reduced: 800, others: 4000 },
  Y7: { year: 7, reduced: 2400, others: 12000 },
  Y8: { year: 8, reduced: 2400, others: 12000 },
  Y9: { year: 9, reduced: 2400, others: 12000 },
  Y10: { year: 10, reduced: 2400, others: 12000 },
  Y11: { year: 11, reduced: 4800, others: 24000 },
  Y12: { year: 12, reduced: 4800, others: 24000 },
  Y13: { year: 13, reduced: 4800, others: 24000 },
  Y14: { year: 14, reduced: 4800, others: 24000 },
  Y15: { year: 15, reduced: 4800, others: 24000 },
  Y16: { year: 16, reduced: 8000, others: 40000 },
  Y17: { year: 17, reduced: 8000, others: 40000 },
  Y18: { year: 18, reduced: 8000, others: 40000 },
  Y19: { year: 19, reduced: 8000, others: 40000 },
  Y20: { year: 20, reduced: 8000, others: 40000 }
};

/**
 * Helper to get fee for a specific form key and entity type
 */
export function getFormFee(formKey, entityType = 'OTHER') {
  const normKey = (formKey || '').toUpperCase().replace(/[\s-_]/g, '');
  let feeItem = null;

  if (normKey.includes('F1') || normKey === 'FORM1' || normKey === 'PROVISIONAL' || normKey === 'COMPLETE') {
    feeItem = STATUTORY_FORM_FEES.F1;
  } else if (normKey.includes('F2') || normKey === 'FORM2') {
    feeItem = STATUTORY_FORM_FEES.F2;
  } else if (normKey.includes('F3') || normKey === 'FORM3') {
    feeItem = STATUTORY_FORM_FEES.F3;
  } else if (normKey.includes('F4') || normKey === 'FORM4') {
    feeItem = STATUTORY_FORM_FEES.F4_FER;
  } else if (normKey.includes('F5') || normKey === 'FORM5') {
    feeItem = STATUTORY_FORM_FEES.F5;
  } else if (normKey.includes('F6') || normKey === 'FORM6') {
    feeItem = STATUTORY_FORM_FEES.F6;
  } else if (normKey.includes('F7A') || normKey === 'FORM7A') {
    feeItem = STATUTORY_FORM_FEES.F7A;
  } else if (normKey.includes('F7') || normKey === 'FORM7') {
    feeItem = STATUTORY_FORM_FEES.F7;
  } else if (normKey.includes('F8') || normKey === 'FORM8') {
    feeItem = STATUTORY_FORM_FEES.F8;
  } else if (normKey.includes('F9') || normKey === 'FORM9') {
    feeItem = STATUTORY_FORM_FEES.F9;
  } else if (normKey.includes('F13') || normKey === 'FORM13') {
    feeItem = STATUTORY_FORM_FEES.F13;
  } else if (normKey.includes('F18A') || normKey === 'FORM18A') {
    feeItem = STATUTORY_FORM_FEES.F18A;
  } else if (normKey.includes('F18') || normKey === 'FORM18') {
    feeItem = STATUTORY_FORM_FEES.F18;
  } else if (normKey.includes('F26') || normKey === 'FORM26') {
    feeItem = STATUTORY_FORM_FEES.F26;
  } else if (normKey.includes('F27') || normKey === 'FORM27') {
    feeItem = STATUTORY_FORM_FEES.F27;
  } else if (normKey.includes('F30') || normKey === 'FORM30') {
    feeItem = STATUTORY_FORM_FEES.F30;
  } else if (normKey.includes('SEC17') || normKey.includes('POSTDATE')) {
    feeItem = STATUTORY_FORM_FEES.SEC17;
  }

  if (!feeItem) {
    return {
      name: formKey,
      reduced: 0,
      others: 0,
      applicableFee: 0,
      label: 'Free / ₹0',
      description: 'Standard filing'
    };
  }

  const isReduced = isReducedFeeEntity(entityType);
  const applicableFee = isReduced ? feeItem.eFiling.reduced : feeItem.eFiling.others;

  return {
    ...feeItem,
    reduced: feeItem.eFiling.reduced,
    others: feeItem.eFiling.others,
    applicableFee,
    isReduced,
    label: applicableFee === 0 
      ? '₹0 (Free)' 
      : `₹${applicableFee.toLocaleString('en-IN')}`,
    comparisonLabel: feeItem.eFiling.reduced === 0 && feeItem.eFiling.others === 0
      ? 'No fee (₹0)'
      : `₹${feeItem.eFiling.reduced.toLocaleString('en-IN')} (Small/Nat/Edu) / ₹${feeItem.eFiling.others.toLocaleString('en-IN')} (Others)`
  };
}

/**
 * Helper to get Section 53 Renewal Fee for a specific year
 * @param {number} year 3 to 20
 * @param {string} entityType
 * @param {boolean} inAdvance 10% discount for 4+ years e-filed in advance
 */
export function getRenewalFee(year, entityType = 'OTHER', inAdvance = false) {
  const yKey = `Y${year}`;
  const renewal = STATUTORY_RENEWAL_FEES[yKey] || { year, reduced: 8000, others: 40000 };
  const isReduced = isReducedFeeEntity(entityType);
  let baseFee = isReduced ? renewal.reduced : renewal.others;

  if (inAdvance) {
    baseFee = Math.round(baseFee * 0.9); // 10% discount
  }

  return {
    year,
    reduced: renewal.reduced,
    others: renewal.others,
    applicableFee: baseFee,
    isReduced,
    label: `₹${baseFee.toLocaleString('en-IN')}`,
    fullLabel: `Year ${year}: ₹${renewal.reduced.toLocaleString('en-IN')} (Small/Nat/Edu) / ₹${renewal.others.toLocaleString('en-IN')} (Others)`
  };
}

/**
 * Format currency in Indian Rupees
 */
export function formatINR(val) {
  if (val === undefined || val === null) return '₹0';
  if (val === 0) return '₹0 (Free)';
  return `₹${Number(val).toLocaleString('en-IN')}`;
}

