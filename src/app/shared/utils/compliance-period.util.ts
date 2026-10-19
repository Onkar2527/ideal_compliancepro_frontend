export interface CompliancePeriodInfo {
  cycleLabel: string;
  periodRangeLabel: string;
}

/**
 * Calculates human-friendly compliance cycle label and overall validity period
 * across all recurring frequencies (Daily, Weekly, Fortnight, Monthly, Quarterly, Semi-Annually, Yearly, One-Time).
 */
export function getCompliancePeriodInfo(params: {
  frequency?: string | number | null;
  startDate?: any;
  endDate?: any;
  proposedTimeline?: any;
  createdAt?: any;
}): CompliancePeriodInfo {
  const rawFreq = String(params.frequency ?? '').trim().toUpperCase();
  const startDateRaw = params.startDate;
  const endDateRaw = params.endDate;

  const parseD = (val: any): Date | null => {
    if (!val) return null;
    if (val instanceof Date) return isNaN(val.getTime()) ? null : val;
    const s = String(val).split('T')[0];
    const p = s.split('-');
    if (p.length === 3 && p[0].length === 4) {
      return new Date(parseInt(p[0], 10), parseInt(p[1], 10) - 1, parseInt(p[2], 10));
    }
    const d = new Date(val);
    return isNaN(d.getTime()) ? null : d;
  };

  const sDate = parseD(startDateRaw);
  const eDate = parseD(endDateRaw);

  // Reference date for this assignment cycle: use proposed_timeline (the cycle deadline) or created_at
  const refDate = parseD(params.proposedTimeline) || parseD(params.createdAt) || sDate || new Date();

  const formatShort = (d: Date) => d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  const formatDayMonth = (d: Date) => d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });

  let cycleLabel = '';

  if (rawFreq === '0' || rawFreq === 'DAILY') {
    cycleLabel = `Daily: ${formatShort(refDate)}`;
    // If task set has defined start and end dates (e.g. 7 days), compute day number
    if (sDate && eDate) {
      const sTime = new Date(sDate.getFullYear(), sDate.getMonth(), sDate.getDate()).getTime();
      const eTime = new Date(eDate.getFullYear(), eDate.getMonth(), eDate.getDate()).getTime();
      const rTime = new Date(refDate.getFullYear(), refDate.getMonth(), refDate.getDate()).getTime();
      const dayDiff = Math.floor((rTime - sTime) / (1000 * 60 * 60 * 24)) + 1;
      const totalDays = Math.floor((eTime - sTime) / (1000 * 60 * 60 * 24)) + 1;
      if (totalDays > 1 && dayDiff >= 1 && dayDiff <= totalDays) {
        cycleLabel = `Day ${dayDiff} of ${totalDays} (${formatShort(refDate)})`;
      }
    }
  } else if (rawFreq === '7' || rawFreq === 'WEEKLY') {
    const day = refDate.getDay() || 7;
    const mon = new Date(refDate);
    mon.setDate(refDate.getDate() - day + 1);
    const sun = new Date(mon);
    sun.setDate(mon.getDate() + 6);
    cycleLabel = `Week: ${formatDayMonth(mon)} – ${formatShort(sun)}`;
  } else if (rawFreq === '1' || rawFreq === 'FORTNIGHT') {
    const d = refDate.getDate();
    const monthStr = refDate.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
    if (d <= 15) {
      cycleLabel = `Fortnight: 01 – 15 ${monthStr} (1st Half)`;
    } else {
      const lastDay = new Date(refDate.getFullYear(), refDate.getMonth() + 1, 0).getDate();
      cycleLabel = `Fortnight: 16 – ${lastDay} ${monthStr} (2nd Half)`;
    }
  } else if (rawFreq === '2' || rawFreq === 'MONTHLY') {
    cycleLabel = `Month: ${refDate.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}`;
  } else if (rawFreq === '3' || rawFreq === 'QUARTERLY') {
    const q = Math.floor(refDate.getMonth() / 3) + 1;
    cycleLabel = `Quarter: Q${q} ${refDate.getFullYear()}`;
  } else if (rawFreq === '4' || rawFreq === 'SEMIANNUALLY' || rawFreq === 'SEMI-ANNUALLY') {
    const h = refDate.getMonth() < 6 ? 1 : 2;
    cycleLabel = `Half-Year: H${h} ${refDate.getFullYear()}`;
  } else if (rawFreq === '5' || rawFreq === 'YEARLY') {
    cycleLabel = `Year: ${refDate.getFullYear()}`;
  } else if (rawFreq === '6' || rawFreq === '1 TIME USE' || rawFreq === 'ONE_TIME' || rawFreq === 'ONCE') {
    if (sDate && eDate) {
      cycleLabel = `One-Time (${formatShort(sDate)} to ${formatShort(eDate)})`;
    } else if (eDate) {
      cycleLabel = `One-Time (Due: ${formatShort(eDate)})`;
    } else {
      cycleLabel = `One-Time`;
    }
  } else {
    if (sDate && eDate) {
      cycleLabel = `${formatShort(sDate)} – ${formatShort(eDate)}`;
    } else {
      cycleLabel = formatShort(refDate);
    }
  }

  let periodRangeLabel = '';
  if (sDate && eDate) {
    periodRangeLabel = `Period: ${sDate.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })} to ${eDate.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })}`;
  }

  return { cycleLabel, periodRangeLabel };
}
