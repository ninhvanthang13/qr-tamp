'use strict';

const { ZIGZAG, BASE_URL, STAMP_CONFIG } = require('./stampConfig');

function letterFromPos(pos) {
  const p = ((pos % ZIGZAG) + ZIGZAG) % ZIGZAG;
  return p <= 25
    ? String.fromCharCode(65 + p)           // A‥Z
    : String.fromCharCode(65 + (ZIGZAG - p)); // Y‥B  (p=26→Y, p=49→B)
}

function makeSerial(type, year, productCode, lPos, counter) {
  const config = STAMP_CONFIG[type];
  if (!config) throw new Error(`Unknown stamp type: ${type}`);

  const parts = {
    PREFIX: config.prefix,
    YEAR: String(year).slice(-2),
    PRODUCT_CODE: config.productCodeLen > 0 
      ? ((productCode || 'AAA') + 'AAA').slice(0, config.productCodeLen).toUpperCase()
      : '',
    DIGITS: String(counter).padStart(config.digitCount, '0')
  };

  // Generate Letters based on letterCount
  if (config.letterCount === 1) {
    parts.LETTERS = letterFromPos(lPos);
  } else if (config.letterCount === 2) {
    const left = letterFromPos(Math.floor(lPos / ZIGZAG) % ZIGZAG);
    const right = letterFromPos(lPos % ZIGZAG);
    parts.LETTERS = left + right;
  } else {
    parts.LETTERS = '';
  }

  // Build the final serial string based on the configured format array
  return config.format.map(part => parts[part] || '').join('');
}

function maxCounter(type) {
  const config = STAMP_CONFIG[type];
  if (!config) return 0;
  return Math.pow(10, config.digitCount) - 1;
}

function maxLetterPos(type) {
  const config = STAMP_CONFIG[type];
  if (!config) return 0;
  return Math.pow(ZIGZAG, config.letterCount);
}

function advance(type, lPos, counter) {
  const mc = maxCounter(type);
  const ml = maxLetterPos(type);
  counter++;
  if (counter > mc) { counter = 0; lPos = (lPos + 1) % ml; }
  return { lPos, counter };
}

function generateBatch({ type, year, productCode = '', lPos = 0, counter = 0, qty }) {
  const items = [];
  let lp = lPos, ct = counter;
  const config = STAMP_CONFIG[type];

  for (let i = 0; i < qty; i++) {
    const serial = makeSerial(type, year, productCode, lp, ct);
    const url = BASE_URL + config.urlPath + serial;
    items.push({ serial, url });
    ({ lPos: lp, counter: ct } = advance(type, lp, ct));
  }

  return { items, nextLPos: lp, nextCounter: ct };
}

function detectType(serial) {
  for (const [type, config] of Object.entries(STAMP_CONFIG)) {
    if (config.regex.test(serial)) return type;
  }
  return null;
}

// Export legacy structure for compatibility with routes.js if needed
const URL_PATHS = Object.fromEntries(
  Object.entries(STAMP_CONFIG).map(([k, v]) => [k, v.urlPath])
);
const PATTERNS = Object.fromEntries(
  Object.entries(STAMP_CONFIG).map(([k, v]) => [k, v.regex])
);

module.exports = { 
  makeSerial, 
  generateBatch, 
  detectType, 
  URL_PATHS, 
  BASE_URL, 
  PATTERNS, 
  letterFromPos 
};
