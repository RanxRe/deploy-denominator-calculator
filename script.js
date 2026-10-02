(function () {
  'use strict';

  /* =========================================================
     1. CONFIG
     ========================================================= */

  // Notes first (highest → lowest), then coins (highest → lowest).
  // Each entry has a unique id so the same value can exist as
  // both a note and a coin (e.g. ₹5 note AND ₹5 coin).
  const DENOMINATIONS = [
    // ---- Notes ----
    { id: 'n500', value: 500, type: 'note', fill: '#8f918c', stroke: '#5b5d58', ink: '#ffffff' },
    { id: 'n200', value: 200, type: 'note', fill: '#f0bd45', stroke: '#a97c12', ink: '#4a3208' },
    { id: 'n100', value: 100, type: 'note', fill: '#b6a3d8', stroke: '#7259a3', ink: '#ffffff' },
    { id: 'n50',  value: 50,  type: 'note', fill: '#8fb4dd', stroke: '#3f6ea3', ink: '#0f2f55' },
    { id: 'n20',  value: 20,  type: 'note', fill: '#e0805f', stroke: '#a94727', ink: '#ffffff' },
    { id: 'n10',  value: 10,  type: 'note', fill: '#a8703f', stroke: '#77492a', ink: '#ffffff' },
    { id: 'n5',   value: 5,   type: 'note', fill: '#cfd9a8', stroke: '#88956a', ink: '#2f3a1a' },

    // ---- Coins ----
    { id: 'c20',  value: 20,  type: 'coin', fill: '#c98f5f', stroke: '#8a5a30', ink: '#ffffff' },
    { id: 'c10',  value: 10,  type: 'coin', fill: '#8fa9c9', stroke: '#4e6b8f', ink: '#ffffff' },
    { id: 'c5',   value: 5,   type: 'coin', fill: '#8fb894', stroke: '#4d7a53', ink: '#ffffff' },
    { id: 'c2',   value: 2,   type: 'coin', fill: '#a98cc4', stroke: '#6f5292', ink: '#ffffff' },
    { id: 'c1',   value: 1,   type: 'coin', fill: '#cf93ab', stroke: '#96607a', ink: '#ffffff' }
  ];

  // Quick lookup by id.
  const SPEC_BY_ID = Object.fromEntries(
    DENOMINATIONS.map(function (s) { return [s.id, s]; })
  );

  const money = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  });

  /* =========================================================
     2. SPECIMEN IMAGE BUILDER (inline SVG — no network needed)
     ========================================================= */

  function specimenSVG(spec) {
    const denom = spec.value;
    const font = 'system-ui,-apple-system,Segoe UI,Roboto,sans-serif';
    const kind = spec.type === 'note' ? 'note' : 'coin';

    if (spec.type === 'note') {
      // A stylised banknote: coloured body, inner border, portrait oval, numeral.
      const size = denom >= 1000 ? 11 : 13;

      return '<svg viewBox="0 0 64 40" role="img" aria-label="' + denom + ' rupee ' + kind + ' specimen">' +
        '<rect x="1" y="1" width="62" height="38" rx="4.5" fill="' + spec.fill + '" stroke="' + spec.stroke + '" stroke-width="2"/>' +
        '<rect x="4.5" y="4.5" width="55" height="31" rx="3" fill="none" stroke="' + spec.ink + '" stroke-opacity=".38" stroke-width="1"/>' +
        '<circle cx="17" cy="20" r="8.5" fill="' + spec.ink + '" fill-opacity=".22" stroke="' + spec.ink + '" stroke-opacity=".5" stroke-width="1"/>' +
        '<path d="M13.5 23.5a4 4 0 0 1 7 0" fill="' + spec.ink + '" fill-opacity=".3"/>' +
        '<circle cx="17" cy="17.5" r="2.6" fill="' + spec.ink + '" fill-opacity=".3"/>' +
        '<text x="43" y="24.5" font-size="' + size + '" font-weight="700" fill="' + spec.ink + '" ' +
          'text-anchor="middle" font-family="' + font + '">' + denom + '</text>' +
      '</svg>';
    }

    // A stylised coin: two concentric circles with the numeral in the middle.
    return '<svg viewBox="0 0 40 40" role="img" aria-label="' + denom + ' rupee ' + kind + ' specimen">' +
      '<circle cx="20" cy="20" r="18" fill="' + spec.fill + '" stroke="' + spec.stroke + '" stroke-width="2"/>' +
      '<circle cx="20" cy="20" r="14" fill="none" stroke="' + spec.ink + '" stroke-opacity=".42" stroke-width="1"/>' +
      '<text x="20" y="25.5" font-size="15" font-weight="700" fill="' + spec.ink + '" ' +
        'text-anchor="middle" font-family="' + font + '">' + denom + '</text>' +
    '</svg>';
  }

  /* =========================================================
     3. DOM REFERENCES
     ========================================================= */

  const grid        = document.getElementById('grid');
  const totalEl     = document.getElementById('total');
  const piecesEl    = document.getElementById('pieces');
  const breakdownEl = document.getElementById('breakdown');
  const clearBtn    = document.getElementById('clear');
  const copyBtn     = document.getElementById('copy');

  // Snapshot of the last calculation (used by the copy button).
  let lastRows   = [];
  let lastTotal  = 0;
  let lastPieces = 0;

  /* =========================================================
     4. BUILD THE GRID
     ========================================================= */

  grid.innerHTML = DENOMINATIONS.map(function (spec) {
    const label = money.format(spec.value);
    const kind  = spec.type === 'note' ? 'note' : 'coin';

    return '<div class="denom" data-id="' + spec.id + '">' +
      '<span class="thumb ' + spec.type + '">' + specimenSVG(spec) + '</span>' +
      '<span class="value">' + label + '</span>' +
      '<div class="stepper">' +
        '<button type="button" data-action="dec" aria-label="Decrease ' + label + ' ' + kind + '">\u2212</button>' +
        '<input type="text" inputmode="numeric" pattern="[0-9]*" autocomplete="off" ' +
               'placeholder="0" aria-label="Quantity of ' + label + ' ' + kind + '">' +
        '<button type="button" data-action="inc" aria-label="Increase ' + label + ' ' + kind + '">+</button>' +
      '</div>' +
    '</div>';
  }).join('');

  /* =========================================================
     5. CALCULATE + RENDER
     ========================================================= */

  function update() {
    let total = 0;
    let pieces = 0;
    const rows = [];

    grid.querySelectorAll('.denom').forEach(function (row) {
      const spec = SPEC_BY_ID[row.dataset.id];
      const input = row.querySelector('input');
      const qty = parseInt(input.value, 10) || 0;

      row.classList.toggle('active', qty > 0);

      if (qty > 0) {
        const subtotal = spec.value * qty;
        total += subtotal;
        pieces += qty;
        rows.push({ spec: spec, qty: qty, subtotal: subtotal });
      }
    });

    lastRows   = rows;
    lastTotal  = total;
    lastPieces = pieces;

    totalEl.textContent  = money.format(total);
    piecesEl.textContent = pieces;

    renderBreakdown(rows);
  }

  function renderBreakdown(rows) {
    if (rows.length === 0) {
      breakdownEl.innerHTML = '<p class="empty">Enter quantities above to see the breakdown.</p>';
      return;
    }

    breakdownEl.innerHTML = rows.map(function (r) {
      return '<div class="row">' +
        '<span class="row-left">' +
          '<span class="mini ' + r.spec.type + '">' + specimenSVG(r.spec) + '</span>' +
          '<span>' + money.format(r.spec.value) + ' &times; ' + r.qty + '</span>' +
        '</span>' +
        '<span class="sub">' + money.format(r.subtotal) + '</span>' +
      '</div>';
    }).join('');
  }

  /* =========================================================
     6. EVENTS
     ========================================================= */

  // Stepper buttons (event delegation).
  grid.addEventListener('click', function (event) {
    const button = event.target.closest('button[data-action]');
    if (!button) return;

    const row = button.closest('.denom');
    const input = row.querySelector('input');
    const step = button.dataset.action === 'inc' ? 1 : -1;
    const current = parseInt(input.value, 10) || 0;
    const next = Math.max(0, current + step);

    input.value = next === 0 ? '' : String(next);
    update();
  });

  // Typing in an input.
  grid.addEventListener('input', function (event) {
    const input = event.target;
    if (input.tagName !== 'INPUT') return;

    const cleaned = input.value.replace(/\D/g, '');
    if (cleaned !== input.value) input.value = cleaned;

    update();
  });

  // Clear all.
  clearBtn.addEventListener('click', function () {
    grid.querySelectorAll('input').forEach(function (input) { input.value = ''; });
    update();

    const first = grid.querySelector('input');
    if (first) first.focus();
  });

  // Copy summary.
  copyBtn.addEventListener('click', function () {
    if (lastRows.length === 0) {
      flashButton(copyBtn, 'Nothing to copy');
      return;
    }

    const lines = lastRows.map(function (r) {
      const kind = r.spec.type === 'note' ? 'note' : 'coin';
      return money.format(r.spec.value) + ' ' + kind + ' x ' + r.qty + ' = ' + money.format(r.subtotal);
    });

    lines.push('');
    lines.push('Total: ' + money.format(lastTotal) + ' (' + lastPieces + ' notes & coins)');

    const text = lines.join('\n');

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(
        function () { flashButton(copyBtn, 'Copied!'); },
        function () { flashButton(copyBtn, 'Copy failed'); }
      );
    } else {
      flashButton(copyBtn, 'Not supported');
    }
  });

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
     7. INIT
     ========================================================= */

  update();
})();