/* =========================================================
   AGE CALCULATOR
   ========================================================= */
(function () {
  'use strict';

  /* ---------- DOM ---------- */
  const dobEl         = document.getElementById('dob');
  const asofEl        = document.getElementById('asof');
  const ageMain       = document.getElementById('age-main');
  const ageBreakdown  = document.getElementById('age-breakdown');
  const resetBtn      = document.getElementById('age-reset');
  const copyBtn       = document.getElementById('age-copy');

  /* ---------- Formatters ---------- */
  const DATE_FMT = new Intl.DateTimeFormat('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric'
  });

  const NUM = new Intl.NumberFormat('en-IN');

  /* ---------- State ---------- */
  let lastResult = null;

  /* =========================================================
     DATE HELPERS
     ========================================================= */

  function startOfDay(d) {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  }

  function toInputValue(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return y + '-' + m + '-' + d;
  }

  // Parse a yyyy-mm-dd string into a local Date, or null if invalid.
  function parseDateInput(str) {
    if (!str) return null;
    const parts = str.split('-').map(Number);
    if (parts.length !== 3 || parts.some(isNaN)) return null;

    const [y, m, d] = parts;
    const date = new Date(y, m - 1, d);

    // Reject things like 2025-02-31 (JS would roll it over to March 3)
    if (date.getFullYear() !== y ||
        date.getMonth()    !== m - 1 ||
        date.getDate()     !== d) {
      return null;
    }
    return date;
  }

  // Add months to a date, clamping the day to the last valid day of the target month.
  // e.g. Jan 31 + 1 month = Feb 28/29 (not March 2/3)
  function addMonths(date, n) {
    const y = date.getFullYear();
    const m = date.getMonth() + n;
    const d = date.getDate();
    const lastDay = new Date(y, m + 1, 0).getDate();
    return new Date(y, m, Math.min(d, lastDay));
  }

  function addYears(date, n) {
    return addMonths(date, n * 12);
  }

  function daysBetween(a, b) {
    return Math.round((b - a) / 86400000);
  }

  /* =========================================================
     CORE CALCULATION
     ========================================================= */

  // Returns { years, months, days } between two dates (from <= to).
  // Handles month-end clamping correctly (Jan 31 → Mar 1 = 1m 1d, not 1m -1d).
  function diffYMD(from, to) {
    let years = to.getFullYear() - from.getFullYear();
    let anchor = addYears(from, years);

    if (anchor > to) {
      years -= 1;
      anchor = addYears(from, years);
    }

    let months =
      (to.getFullYear() - anchor.getFullYear()) * 12 +
      (to.getMonth()    - anchor.getMonth());

    if (addMonths(anchor, months) > to) months -= 1;

    anchor = addMonths(anchor, months);
    const days = daysBetween(anchor, to);

    return { years: years, months: months, days: days };
  }

  // The next occurrence of the birthday on or after `ref`.
  function nextBirthday(dob, ref) {
    const y = ref.getFullYear();
    let next = addYears(dob, y - dob.getFullYear());
    if (next < ref) next = addYears(dob, y - dob.getFullYear() + 1);
    return next;
  }

  /* =========================================================
     RENDER
     ========================================================= */

  function showMessage(msg) {
    ageMain.textContent = '\u2014';
    ageBreakdown.innerHTML = '<p class="empty">' + msg + '</p>';
    lastResult = null;
  }

  function calculate() {
    const dob  = parseDateInput(dobEl.value);
    const asof = parseDateInput(asofEl.value) || startOfDay(new Date());

    if (!dob) {
      showMessage('Enter a date of birth to begin.');
      return;
    }

    const today = startOfDay(new Date());

    if (dob > today) {
      showMessage('Date of birth can\u2019t be in the future.');
      return;
    }

    if (asof < dob) {
      showMessage('\u201CAs of\u201D date must be on or after the date of birth.');
      return;
    }

    const { years, months, days } = diffYMD(dob, asof);

    const totalDays   = daysBetween(dob, asof);
    const totalWeeks  = Math.floor(totalDays / 7);
    const totalMonths = years * 12 + months;
    const totalHours  = totalDays * 24;

    const nb              = nextBirthday(dob, asof);
    const daysToBirthday  = daysBetween(asof, nb);
    const turning         = nb.getFullYear() - dob.getFullYear();

    /* ---- Big display ---- */
    const parts = [];
    if (years)  parts.push(years  + 'y');
    if (years || months) parts.push(months + 'm');
    parts.push(days + 'd');
    ageMain.textContent = parts.join(' ');

    /* ---- Breakdown rows ---- */
    const rows = [
      ['Years',                 NUM.format(years)],
      ['Months',                NUM.format(months)],
      ['Days',                  NUM.format(days)],
      ['Total months',          NUM.format(totalMonths)],
      ['Total weeks',           NUM.format(totalWeeks)],
      ['Total days',            NUM.format(totalDays)],
      ['Total hours',           NUM.format(totalHours)],
      ['Date of birth',         DATE_FMT.format(dob)],
      ['Age as of',             DATE_FMT.format(asof)],
      ['Next birthday',         DATE_FMT.format(nb) + ' (turning ' + turning + ')'],
      ['Days to next birthday', daysToBirthday === 0 ? 'Today! 🎉' : NUM.format(daysToBirthday)]
    ];

    ageBreakdown.innerHTML = rows.map(function (r) {
      return '<div class="row">' +
               '<span>' + r[0] + '</span>' +
               '<span class="sub">' + r[1] + '</span>' +
             '</div>';
    }).join('');

    /* ---- Snapshot for copy ---- */
    lastResult = {
      years: years, months: months, days: days,
      dob: dob, asof: asof,
      totalDays: totalDays, totalWeeks: totalWeeks, totalHours: totalHours,
      nb: nb, turning: turning, daysToBirthday: daysToBirthday
    };
  }

  /* =========================================================
     CLIPBOARD (with file:// fallback)
     ========================================================= */

  function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(text).then(
        function () { return true; },
        function () { return legacyCopy(text); }
      );
    }
    return Promise.resolve(legacyCopy(text));
  }

  function legacyCopy(text) {
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.position = 'fixed';
      ta.style.top = '-1000px';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      ta.setSelectionRange(0, ta.value.length);
      const ok = document.execCommand('copy');
      document.body.removeChild(ta);
      return ok;
    } catch (err) {
      return false;
    }
  }

  function flashButton(button, message) {
    if (button.dataset.busy === '1') return;
    button.dataset.busy = '1';

    const original = button.textContent;
    button.textContent = message;
    button.disabled = true;

    setTimeout(function () {
      button.textContent = original;
      button.disabled = false;
      button.dataset.busy = '0';
    }, 1400);
  }

  /* =========================================================
     EVENTS
     ========================================================= */

  dobEl.addEventListener('input', calculate);
  asofEl.addEventListener('input', calculate);

  resetBtn.addEventListener('click', function () {
    dobEl.value  = '';
    asofEl.value = toInputValue(new Date());
    calculate();
    dobEl.focus();
  });

  copyBtn.addEventListener('click', function () {
    if (!lastResult) {
      flashButton(copyBtn, 'Nothing to copy');
      return;
    }

    const r = lastResult;
    const text =
      'Age: ' + r.years + ' years, ' + r.months + ' months, ' + r.days + ' days\n' +
      'Date of birth: ' + DATE_FMT.format(r.dob) + '\n' +
      'Age as of: ' + DATE_FMT.format(r.asof) + '\n' +
      'Total days: ' + NUM.format(r.totalDays) + '\n' +
      'Next birthday: ' + DATE_FMT.format(r.nb) +
        ' (turning ' + r.turning + ', in ' + r.daysToBirthday + ' days)';

    copyText(text).then(function (ok) {
      flashButton(copyBtn, ok ? 'Copied!' : 'Copy failed');
    });
  });

  /* =========================================================
     INIT
     ========================================================= */

  asofEl.value = toInputValue(new Date());
  calculate();
})();