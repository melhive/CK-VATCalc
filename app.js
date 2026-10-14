/* CK-VATCalc UI + service worker registration. Depends on vat.js (window.CKVat). */
(function () {
  'use strict';

  var Vat = window.CKVat;
  var SS_KEY = 'ckvatcalc.pendingAmount'; // one-shot restore across an update reload

  var $ = function (id) { return document.getElementById(id); };
  var input = $('amount');
  var wrap = input.parentNode;
  var message = $('amount-message');
  var outGross = $('out-gross');
  var outVat = $('out-vat');
  var outNet = $('out-net');
  var outTotalDue = $('out-total-due');

  var DASH = '\u2014';

  var howLive = $('how-live');
  var HOW_EMPTY = 'Type an amount above to see your own answer here.';

  // Set text; if it changed, replay a short highlight (disabled by prefers-reduced-motion).
  function setText(el, text) {
    if (el.textContent === text) return;
    el.textContent = text;
    if (text === DASH) return;
    el.classList.remove('flash');
    void el.offsetWidth; // restart animation
    el.classList.add('flash');
  }
  document.addEventListener('animationend', function (e) {
    if (e.target.classList && e.target.classList.contains('flash')) e.target.classList.remove('flash');
  });

  function setOutputs(g, v, n) {
    setText(outTotalDue, g); // TOTAL AMOUNT DUE = the entered amount
    setText(outGross, g);
    setText(outVat, v);
    setText(outNet, n);
  }

  function setMessage(text, isError) {
    message.textContent = text;
    message.className = 'message' + (isError ? ' error' : '');
    wrap.classList.toggle('invalid', !!isError);
    if (isError) input.setAttribute('aria-invalid', 'true');
    else input.removeAttribute('aria-invalid');
  }

  function update() {
    var res = Vat.parseAmount(input.value);
    if (res.status === 'empty') {
      setOutputs(DASH, DASH, DASH);
      howLive.textContent = HOW_EMPTY;
      setMessage('Enter an amount to see the calculation.', false);
    } else if (res.status === 'error') {
      setOutputs(DASH, DASH, DASH);
      howLive.textContent = HOW_EMPTY;
      setMessage(res.message, true);
    } else {
      var r = Vat.computeVat(res.centavos);
      setOutputs(Vat.formatPeso(r.gross), Vat.formatPeso(r.vat), Vat.formatPeso(r.net));
      howLive.textContent = 'Your ' + Vat.formatPeso(r.gross) + ' has ' + Vat.formatPeso(r.vat) +
        ' of VAT inside. Without the VAT, the price is ' + Vat.formatPeso(r.net) + '.';
      setMessage(res.centavos === 0
        ? 'Amount is zero, so there is no VAT to extract.'
        : 'Calculated: VAT ' + Vat.formatPeso(r.vat) + ', net ' + Vat.formatPeso(r.net) + '.', false);
    }
  }

  input.addEventListener('input', update);
  input.addEventListener('paste', function () { setTimeout(update, 0); });
  input.addEventListener('blur', function () {
    var res = Vat.parseAmount(input.value);
    if (res.status === 'ok') { input.value = Vat.formatPlain(res.centavos); update(); }
  });

  $('reset-btn').addEventListener('click', function () {
    input.value = '';
    update();
    input.focus();
  });

  $('print-btn').addEventListener('click', function () { window.print(); });

  // Restore an amount saved just before an "Update now" reload (read once, then removed).
  try {
    var saved = sessionStorage.getItem(SS_KEY);
    if (saved !== null) { sessionStorage.removeItem(SS_KEY); input.value = saved; }
  } catch (e) { /* storage unavailable: ignore */ }

  update();

  /* ---------- Service worker + update flow ---------- */
  if (!('serviceWorker' in navigator)) return;

  var banner = $('update-banner');
  var updateBtn = $('update-btn');
  var versionEl = $('version');
  var waitingWorker = null;
  var updateRequested = false; // only reload for updates the user asked for
  var reloading = false;       // guard against reload loops

  function showUpdate(worker) {
    waitingWorker = worker;
    banner.hidden = false;
  }

  function watch(reg) {
    if (reg.waiting && navigator.serviceWorker.controller) showUpdate(reg.waiting);
    reg.addEventListener('updatefound', function () {
      var nw = reg.installing;
      if (!nw) return;
      nw.addEventListener('statechange', function () {
        // "installed" with an existing controller = update ready and waiting
        if (nw.state === 'installed' && navigator.serviceWorker.controller) showUpdate(nw);
      });
    });
  }

  function showVersion() {
    var ctrl = navigator.serviceWorker.controller;
    if (!ctrl) return;
    var ch = new MessageChannel();
    ch.port1.onmessage = function (e) {
      if (e.data && e.data.version) { versionEl.textContent = 'Version ' + e.data.version; versionEl.hidden = false; }
    };
    ctrl.postMessage({ type: 'GET_VERSION' }, [ch.port2]);
  }

  updateBtn.addEventListener('click', function () {
    if (!waitingWorker || updateRequested) return;
    updateRequested = true;
    updateBtn.disabled = true;
    try { sessionStorage.setItem(SS_KEY, input.value); } catch (e) { /* ignore */ }
    waitingWorker.postMessage({ type: 'SKIP_WAITING' });
  });

  navigator.serviceWorker.addEventListener('controllerchange', function () {
    if (!updateRequested || reloading) return;
    reloading = true;
    window.location.reload();
  });

  window.addEventListener('load', function () {
    navigator.serviceWorker.register('service-worker.js', { updateViaCache: 'none' })
      .then(function (reg) {
        watch(reg);
        showVersion();
        function check() { if (navigator.onLine) reg.update().catch(function () {}); }
        document.addEventListener('visibilitychange', function () {
          if (document.visibilityState === 'visible') check();
        });
        window.addEventListener('online', check);
      })
      .catch(function () { /* calculator keeps working without the service worker */ });
  });
})();
