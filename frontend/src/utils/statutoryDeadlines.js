// frontend/src/utils/statutoryDeadlines.js
/**
 * Statutory deadline calculations under The Patents Act, 1970
 * and Patent Rules, 2003 (as amended by Patent (Amendment) Rules, 2024).
 */

export const AMENDMENT_2024_CUTOFF = new Date('2024-03-15');

/**
 * Format Date helper (YYYY-MM-DD)
 */
export function toIsoDate(d) {
  if (!d) return null;
  const dt = typeof d === 'string' ? new Date(d) : d;
  if (isNaN(dt.getTime())) return null;
  return dt.toISOString().split('T')[0];
}

/**
 * Add calendar months to a date
 */
export function addMonths(dateStr, months) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return null;
  d.setMonth(d.getMonth() + months);
  return toIsoDate(d);
}

/**
 * Add days to a date
 */
export function addDays(dateStr, days) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return null;
  d.setDate(d.getDate() + days);
  return toIsoDate(d);
}

/**
 * Validates Section 17 Post-Dating statutory limitation (max 6 months / approx 181 days)
 * and computes the exact remaining leeway (months and days) available for further post-dating.
 */
export function validateSection17PostDating(psFilingDate, postDatedDate) {
  if (!psFilingDate || !postDatedDate) return { isValid: true, remainingMonths: 0, remainingDays: 0, message: '' };
  const psDt = new Date(psFilingDate);
  const postDt = new Date(postDatedDate);
  if (isNaN(psDt.getTime()) || isNaN(postDt.getTime())) {
    return { isValid: false, message: 'Invalid date format' };
  }

  // Max 6 months statutory ceiling per Section 17
  const maxPostDt = new Date(psDt);
  maxPostDt.setMonth(maxPostDt.getMonth() + 6);

  if (postDt <= psDt) {
    return {
      isValid: false,
      message: 'Post-dated date must be strictly after the original Provisional (PS) filing date.',
      maxAllowedDate: toIsoDate(maxPostDt)
    };
  }

  if (postDt > maxPostDt) {
    const daysOver = Math.round((postDt.getTime() - maxPostDt.getTime()) / (1000 * 60 * 60 * 24));
    return {
      isValid: false,
      daysOver,
      message: `Statutory limit exceeded by ${daysOver} days! Section 17 strictly prohibits post-dating beyond 6 months (${toIsoDate(maxPostDt)}).`,
      maxAllowedDate: toIsoDate(maxPostDt)
    };
  }

  // Calculate remaining leeway between postDatedDate and maxPostDt
  let tempDate = new Date(postDt);
  let monthsRemaining = 0;
  while (true) {
    const nextMonth = new Date(tempDate);
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    if (nextMonth <= maxPostDt) {
      monthsRemaining++;
      tempDate = nextMonth;
    } else {
      break;
    }
  }

  const msDiff = maxPostDt.getTime() - tempDate.getTime();
  const daysRemaining = Math.max(0, Math.round(msDiff / (1000 * 60 * 60 * 24)));
  const totalDaysRemaining = Math.max(0, Math.round((maxPostDt.getTime() - postDt.getTime()) / (1000 * 60 * 60 * 24)));

  return {
    isValid: true,
    remainingMonths: monthsRemaining,
    remainingDays: daysRemaining,
    totalDaysRemaining,
    maxAllowedDate: toIsoDate(maxPostDt),
    message: `${monthsRemaining} month${monthsRemaining !== 1 ? 's' : ''}, ${daysRemaining} day${daysRemaining !== 1 ? 's' : ''} remaining for further post-dating (Max allowed: ${toIsoDate(maxPostDt)})`,
    detailedMessage: `Post-dated to ${toIsoDate(postDt)}. You can still post-date further by up to ${monthsRemaining} month(s) and ${daysRemaining} day(s) until ${toIsoDate(maxPostDt)}.`
  };
}

/**
 * Calculates all statutory form due dates and prosecution deadlines
 * automatically based on the filing date and post-dating.
 * Supports both camelCase and snake_case parameter properties.
 */
/**
 * Calculates the next upcoming bi-monthly (every 2 months) inventor update reminder
 * scheduled from the earlier of PS or CS filing date.
 */
export function getUpcomingInventorUpdateCycle(earliestFilingDate, completedCycles = []) {
  if (!earliestFilingDate) return null;
  const baseDt = new Date(earliestFilingDate);
  if (isNaN(baseDt.getTime())) return null;
  const now = new Date();

  // Schedule every 2 months up to 36 months (3 years)
  for (let cycle = 1; cycle <= 18; cycle++) {
    const cycleMonths = cycle * 2;
    const cycleId = 'CYCLE_' + cycleMonths + 'M';
    const dueDate = addMonths(earliestFilingDate, cycleMonths);
    if (!dueDate) continue;
    const dueDt = new Date(dueDate);
    const diffDays = Math.ceil((dueDt - now) / 86400000);

    const isCompleted = completedCycles.includes(cycleId);
    if (!isCompleted) {
      return {
        cycle,
        cycleMonths,
        cycleId,
        dueDate,
        diffDays,
        actionText: 'Send Bi-Monthly Prosecution Update to Inventors (' + cycleMonths + '-Month Post-Filing Milestone)',
        statutoryRef: 'Firm SOP: Bi-Monthly Status Update to Inventors (Every 2 Months)'
      };
    }
  }
  return null;
}

/**
 * Calculates Form-27 Working of Patent Statement Deadlines & Cycles
 * under Section 146(2) of The Patents Act, 1970 and Rule 131 of Patent Rules, 2003
 * (as amended by Patent (Amendment) Rules, 2024).
 *
 * Rules:
 * 1. Form-27 must be filed once in respect of every period of 3 financial years,
 *    starting from the financial year commencing immediately after the FY in which the patent was granted.
 *    (Financial Year runs from 1st April to 31st March).
 * 2. Filing window: Within six months from expiry of such period: 1st April to 30th September.
 *    Statutory due date: 30th September.
 * 3. Extensions:
 *    - Up to 3 months via Form 4 under Rule 131(2) -> 31st December.
 *    - Up to 6 months via Form 4 under Rule 138 -> 30th June (or 31st March if Rule 131(2) not availed).
 * 4. Cutoff / Transitional Provisions:
 *    - Patents granted on or before 31-03-2024:
 *      First 3-year block is FY 2024-25, FY 2025-26, FY 2026-27.
 *      First due date: 30th September 2027 (Window: 1 April 2027 to 30 September 2027).
 *      (For patents granted in FY 2022-23 or earlier, block was FY 2023-24 to 2025-26, due 30-Sep-2026).
 *    - Patents granted in FY 2024-25 (1 Apr 2024 - 31 Mar 2025):
 *      First 3-year block is FY 2025-26, FY 2026-27, FY 2027-28.
 *      First due date: 30th September 2028 (Window: 1 April 2028 to 30 September 2028).
 * 5. General Term (20 years):
 *    3 + 3 + 3 + 3 + 3 + 3 + 2 = 20 years.
 *    Cycles 1 to 6 (Years 1 to 18): Every 3 financial years.
 *    Final Cycle 7: Remaining 2 financial years filed together (at Year 20).
 * 6. Option to file annually is also retained (Window: 1 April to 30 September each year).
 */
export function calculateForm27Deadlines(grantDateStr, filingMode = 'TRIENNIAL', completedFilings = []) {
  if (!grantDateStr) return null;
  const grantDate = new Date(grantDateStr);
  if (isNaN(grantDate.getTime())) return null;

  const now = new Date();
  const grantYear = grantDate.getFullYear();
  const grantMonth = grantDate.getMonth(); // 0-indexed: 0=Jan, 2=Mar, 3=Apr, 11=Dec

  // Financial year of grant (FY runs 1 Apr to 31 Mar)
  const grantFyStart = grantMonth < 3 ? grantYear - 1 : grantYear;
  const grantFyEnd = grantFyStart + 1;

  // Determine cycles
  const cycles = [];
  let blockStartYear = 0;

  // As per Notice 2 (Item 2) and Notice 1 (FAQ Q7):
  if (grantFyEnd <= 2023) {
    // Granted before FY 2023-24 (e.g. 2022-23 or earlier):
    // FAQ Page 2: block is FY 2023-24 to FY 2025-26, due 30-Sep-2026
    blockStartYear = 2023;
  } else if (grantFyEnd === 2024) {
    // Granted in FY 2023-24 (1 Apr 2023 - 31 Mar 2024):
    // Notice 2 Page 3 & FAQ Page 3: block is FY 2024-25, 2025-26, 2026-27, due 30-Sep-2027
    blockStartYear = 2024;
  } else {
    // Granted in FY 2024-25 or later:
    // Counting starts from FY commencing immediately after FY of grant
    blockStartYear = grantFyEnd;
  }

  // Generate 20-year schedule (6 x 3 years + 1 x 2 years)
  let currentStartYear = blockStartYear;
  for (let c = 1; c <= 7; c++) {
    const isFinalTwoYears = c === 7;
    const blockDuration = isFinalTwoYears ? 2 : 3;
    const blockEndYear = currentStartYear + blockDuration;
    
    // Financial years included in this block
    const fyYears = [];
    for (let y = currentStartYear; y < blockEndYear; y++) {
      fyYears.push(`FY ${y}-${String(y + 1).slice(2)}`);
    }

    const blockLabel = `${fyYears[0]} to ${fyYears[fyYears.length - 1]}`;
    const windowStart = `${blockEndYear}-04-01`;
    const statutoryDueDate = `${blockEndYear}-09-30`;
    const extRule131 = `${blockEndYear}-12-31`; // +3 months
    const extRule138 = `${blockEndYear + 1}-06-30`; // +6 months

    const dueDateObj = new Date(statutoryDueDate);
    const windowStartObj = new Date(windowStart);
    const diffDays = Math.ceil((dueDateObj - now) / (1000 * 60 * 60 * 24));
    const isWindowOpen = now >= windowStartObj && now <= dueDateObj;
    const isOverdue = now > dueDateObj;

    const cycleId = `CYCLE_${c}_${blockEndYear}`;
    const isCompleted = Array.isArray(completedFilings) && (
      completedFilings.includes(cycleId) ||
      completedFilings.some((f) => (typeof f === 'string' ? f === cycleId : f.cycleId === cycleId || f.blockEndYear === blockEndYear))
    );

    cycles.push({
      cycleIndex: c,
      cycleId,
      isFinalTwoYears,
      blockDuration,
      blockYears: fyYears,
      blockLabel,
      windowStart,
      statutoryDueDate,
      extRule131,
      extRule138,
      diffDays,
      isWindowOpen,
      isOverdue,
      isCompleted,
    });

    currentStartYear = blockEndYear;
  }

  // Find the active/current upcoming cycle
  const activeCycle = cycles.find((c) => !c.isCompleted) || cycles[cycles.length - 1];

  return {
    grantDate: toIsoDate(grantDate),
    grantFyLabel: `FY ${grantFyStart}-${String(grantFyEnd).slice(2)}`,
    activeCycle,
    allCycles: cycles,
    currentBlock: activeCycle?.blockLabel,
    windowStart: activeCycle?.windowStart,
    statutoryDueDate: activeCycle?.statutoryDueDate,
    extRule131: activeCycle?.extRule131,
    extRule138: activeCycle?.extRule138,
    diffDays: activeCycle?.diffDays,
    isWindowOpen: activeCycle?.isWindowOpen,
    isOverdue: activeCycle?.isOverdue,
    isCompleted: activeCycle?.isCompleted,
    filingMode, // 'TRIENNIAL' or 'ANNUAL'
  };
}

export { calculateAllStatutoryDeadlines as calculateStatutoryDeadlines };

export function calculateAllStatutoryDeadlines(params = {}) {
  const psFilingDate = params.psFilingDate || params.ps_filing_date;
  const csFilingDate = params.csFilingDate || params.cs_filing_date;
  const postDatedDate = params.postDatedDate || params.post_dated_date;
  const ferNoticeDate = params.ferNoticeDate || params.fer_notice_date;
  const ferExtensionMonths = params.ferExtensionMonths || params.fer_extension_months || 0;
  const hearingDate = params.hearingDate || params.hearing_date;
  const grantDate = params.grantDate || params.grant_date;

  const baseFilingDate = postDatedDate || psFilingDate || csFilingDate;
  if (!baseFilingDate) return {};

  const filingDt = new Date(baseFilingDate);
  const now = new Date();

  // 1. Complete Specification (CS) Deadline - Section 9(1)
  // 12 months from original PS filing date, OR 12 months from post-dated date (Section 17)
  const csRefDate = postDatedDate || psFilingDate;
  const csDeadline = csRefDate ? addMonths(csRefDate, 12) : null;

  // 2. Form 1 (Proof of Right) Deadline - Rule 10
  // 6 months from the date of filing of application
  const form1Deadline = addMonths(baseFilingDate, 6);

  // 3. Form 26 (Power of Attorney) Deadline - Rule 135(1)
  // 3 months from filing of application
  const form26Deadline = addMonths(baseFilingDate, 3);

  // 4. Form 3 (Statement & Undertaking under Section 8) - Rule 12(1) & 12(2)
  // 6 months from filing date or 3 months from Controller intimation
  const form3Deadline = addMonths(baseFilingDate, 6);

  // 5. Standard Publication under Section 11A(2)
  // 18 months from priority/filing date
  const publicationDeadline = addMonths(baseFilingDate, 18);

  // 6. Request for Examination (Form 18 / 18A) - Rule 24B(1)
  // - Applications filed on or after 15-Mar-2024: 31 months from priority/filing date
  // - Applications filed prior to 15-Mar-2024: 48 months from priority/filing date
  const isPost2024 = filingDt >= AMENDMENT_2024_CUTOFF;
  const rfeMonths = isPost2024 ? 31 : 48;
  const rfeDeadline = addMonths(baseFilingDate, rfeMonths);

  // 7. FER Reply Deadline - Section 21(1) & Rule 24B(5)
  // 6 months from the date on which FER is issued to applicant
  let ferReplyDeadline = null;
  if (ferNoticeDate) {
    const totalFerMonths = 6 + Math.min(3, Math.max(0, ferExtensionMonths));
    ferReplyDeadline = addMonths(ferNoticeDate, totalFerMonths);
  }

  // 8. Hearing Written Submissions - Rule 28(7)
  // 15 days from the date of the Controller hearing
  let wsDeadline = null;
  if (hearingDate) {
    wsDeadline = addDays(hearingDate, 15);
  }

  // 9. Section 17 Post-Dating Feasibility & Simulator
  let postDateFeasibility = {
    isEligible: false,
    maxPostDate: null,
    remainingDays: 0,
    statusText: 'No Provisional Filing Found',
  };

  let postDateLeeway = null;
  if (psFilingDate && postDatedDate) {
    postDateLeeway = validateSection17PostDating(psFilingDate, postDatedDate);
  }

  if (psFilingDate && !csFilingDate) {
    const originalPsDt = new Date(psFilingDate);
    const maxPostDt = new Date(originalPsDt);
    maxPostDt.setMonth(maxPostDt.getMonth() + 6); // Max 6 months statutory ceiling
    const maxPostDateStr = toIsoDate(maxPostDt);

    const diffDays = Math.ceil((maxPostDt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    const isEligible = diffDays > 0 && !postDatedDate;

    postDateFeasibility = {
      isEligible,
      maxPostDate: maxPostDateStr,
      remainingDays: Math.max(0, diffDays),
      statusText: postDatedDate
        ? (postDateLeeway?.isValid 
            ? `Post-dated to ${postDatedDate}. ${postDateLeeway.message} (CS Deadline: ${csDeadline})`
            : `Post-dated to ${postDatedDate}. ⚠️ ${postDateLeeway?.message}`)
        : isEligible
        ? `Feasible: ${diffDays} days remaining to invoke Section 17`
        : 'Section 17 window expired (must file CS immediately)',
      postDateLeeway
    };
  }

  // 10. Post-Grant Annual Renewal Annuities (Section 142)
  let nextRenewalDate = null;
  let currentAnnuityYear = null;
  if (grantDate && baseFilingDate) {
    const filingYear = filingDt.getFullYear();
    const currentYear = now.getFullYear();
    const yearsElapsed = currentYear - filingYear + 1;
    currentAnnuityYear = Math.min(20, Math.max(3, yearsElapsed));

    const renewalDt = new Date(filingDt);
    renewalDt.setFullYear(currentYear);
    if (renewalDt < now) {
      renewalDt.setFullYear(currentYear + 1);
    }
    nextRenewalDate = toIsoDate(renewalDt);
  }



  // 11. 3-Day Filing Acknowledgment to Inventor (Requirement 5)
  // Triggered when status is 'sent for filing' for PS, CS, PS-CS, FER reply, WS
  const currentStatusStr = String(params.current_status || params.currentStatus || params.status || '').toLowerCase();
  const isSentForFiling = currentStatusStr.includes('sent for filing');
  let filingAckDeadline = null;
  if (isSentForFiling) {
    const sentDate = params.sent_for_filing_date || params.sentForFilingDate || params.status_date || params.updated_at || toIsoDate(now);
    filingAckDeadline = addDays(sentDate, 3);
  }

  // 12. 6-Day FER Reply Draft Confirmation to Inventor (Requirement 6)
  // Triggered once status is 'FER received'
  const isFerReceived = currentStatusStr.includes('fer received') || currentStatusStr.includes('fer_received') || (Boolean(ferNoticeDate) && !currentStatusStr.includes('filed'));
  let ferDraftConfirmationDeadline = null;
  if (isFerReceived && ferNoticeDate) {
    ferDraftConfirmationDeadline = addDays(ferNoticeDate, 6);
  }

  // 13. Bi-Monthly Post-Filing Inventor Updates (Every 2 Months) (Requirement 7)
  let earliestFilingDate = null;
  if (psFilingDate && csFilingDate) {
    earliestFilingDate = new Date(psFilingDate) <= new Date(csFilingDate) ? psFilingDate : csFilingDate;
  } else {
    earliestFilingDate = psFilingDate || csFilingDate || null;
  }

  let nextInventorUpdateDeadline = null;
  let inventorUpdateCycleInfo = null;
  if (earliestFilingDate) {
    inventorUpdateCycleInfo = getUpcomingInventorUpdateCycle(earliestFilingDate, params.completedInventorUpdates || []);
    if (inventorUpdateCycleInfo) {
      nextInventorUpdateDeadline = inventorUpdateCycleInfo.dueDate;
    }
  }

  // 14. Form-27 Working of Patent Statement (Section 146(2) & Rule 131)
  let form27Info = null;
  const grantDateVal = params.grant_date || params.grantDate;
  if (grantDateVal) {
    form27Info = calculateForm27Deadlines(grantDateVal, params.form27_mode || 'TRIENNIAL', params.completed_form27 || []);
  }

  return {
    csDeadline,
    filingAckDeadline,
    filing_ack_deadline: filingAckDeadline,
    ferDraftConfirmationDeadline,
    fer_draft_confirmation_deadline: ferDraftConfirmationDeadline,
    earliestFilingDate,
    earliest_filing_date: earliestFilingDate,
    nextInventorUpdateDeadline,
    next_inventor_update_deadline: nextInventorUpdateDeadline,
    inventorUpdateCycleInfo,
    cs_deadline: csDeadline,
    form1Deadline,
    form_1_deadline: form1Deadline,
    form26Deadline,
    form_26_deadline: form26Deadline,
    form3Deadline,
    form_3_deadline: form3Deadline,
    publicationDeadline,
    publication_deadline: publicationDeadline,
    rfeDeadline,
    rfe_deadline: rfeDeadline,
    ferReplyDeadline,
    fer_reply_deadline: ferReplyDeadline,
    wsDeadline,
    ws_deadline: wsDeadline,
    postDateFeasibility,
    postDateLeeway,
    nextRenewalDate,
    next_renewal_date: nextRenewalDate,
    currentAnnuityYear,
    isPost2024,
    form27Info,
    form_27_due_date: form27Info?.statutoryDueDate,
    form_27_window_start: form27Info?.windowStart,
    form_27_block: form27Info?.currentBlock,
    form_27_is_open: form27Info?.isWindowOpen,
  };
}
