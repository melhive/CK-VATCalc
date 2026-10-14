/**
 * CK-VATCalc core money logic (pure functions, no DOM).
 * Loaded as a normal script in the browser (exposes window.CKVat)
 * and also usable from Node for testing (module.exports).
 *
 * ROUNDING APPROACH
 * - Amounts are parsed from text into integer centavos (no floating point).
 * - VAT = round-half-up(gross * 12 / 112), computed with integers only.
 * - Net = gross - VAT, so VAT + Net always equals the entered gross exactly.
 */
(function (root) {
  'use strict';

  // Limit: 9 integer digits + 2 decimals (999,999,999.99).
  // Keeps gross*24 well under Number.MAX_SAFE_INTEGER.
  var MAX_CENTAVOS = 99999999999;

  /**
   * Parse user text into integer centavos.
   * Accepted: 1120, 1,120, 1,120.50, 350., .5, optional leading peso sign.
   * Rejected: negatives, letters, "1.234,56", bad comma grouping, >2 decimals.
   * Returns {status:'empty'} | {status:'ok', centavos} | {status:'error', message}
   */
  function parseAmount(raw) {
    var text = String(raw == null ? '' : raw).replace(/\s+/g, '');
    if (text.charAt(0) === '\u20B1') text = text.slice(1); // leading peso sign
    if (text === '') return { status: 'empty' };

    if (text.charAt(0) === '-' || text.charAt(0) === '\u2212') {
      return { status: 'error', message: 'Negative amounts are not allowed. Enter a positive amount.' };
    }
    if (!/^[0-9.,]+$/.test(text)) {
      return { status: 'error', message: 'Use digits only, with an optional comma and decimal point (example: 1,120.00).' };
    }

    var parts = text.split('.');
    if (parts.length > 2) {
      return { status: 'error', message: 'Only one decimal point is allowed (example: 1,120.00).' };
    }
    var intPart = parts[0];
    var decPart = parts.length === 2 ? parts[1] : '';

    if (decPart.indexOf(',') !== -1) {
      return { status: 'error', message: 'Commas belong before the decimal point. Use the format 1,234.56.' };
    }
    if (decPart.length > 2) {
      return { status: 'error', message: 'Use at most 2 decimal places (centavos).' };
    }
    if (intPart.indexOf(',') !== -1) {
      if (!/^[0-9]{1,3}(,[0-9]{3})+$/.test(intPart)) {
        return { status: 'error', message: 'Commas must separate thousands, like 1,234.56.' };
      }
      intPart = intPart.replace(/,/g, '');
    }
    if (intPart === '' && decPart === '') {
      return { status: 'error', message: 'Enter a number, for example 1,120.00.' };
    }
    if (intPart.replace(/^0+/, '').length > 9) {
      return { status: 'error', message: 'Amount is too large. The maximum is \u20B1999,999,999.99.' };
    }

    var pesos = intPart === '' ? 0 : parseInt(intPart, 10);
    var cents = decPart === '' ? 0 : parseInt((decPart + '0').slice(0, 2), 10);
    var centavos = pesos * 100 + cents;
    if (!isFinite(centavos) || centavos > MAX_CENTAVOS) {
      return { status: 'error', message: 'Amount is too large. The maximum is \u20B1999,999,999.99.' };
    }
    return { status: 'ok', centavos: centavos };
  }

  /** Split VAT-inclusive gross (integer centavos) into VAT and net. */
  function computeVat(grossCentavos) {
    // round-half-up of gross*12/112  ==  floor((gross*24 + 112) / 224)
    var vat = Math.floor((grossCentavos * 24 + 112) / 224);
    return { gross: grossCentavos, vat: vat, net: grossCentavos - vat };
  }

  /** Format integer centavos as "₱1,234.56" using integer math only. */
  function formatPeso(centavos) {
    var pesos = Math.floor(centavos / 100);
    var cents = centavos % 100;
    var p = String(pesos).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return '\u20B1' + p + '.' + (cents < 10 ? '0' : '') + cents;
  }

  /** Format centavos as editable text without symbol: "1,234.56". */
  function formatPlain(centavos) {
    return formatPeso(centavos).slice(1);
  }

  var api = {
    MAX_CENTAVOS: MAX_CENTAVOS,
    parseAmount: parseAmount,
    computeVat: computeVat,
    formatPeso: formatPeso,
    formatPlain: formatPlain
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.CKVat = api;
})(typeof window !== 'undefined' ? window : this);
