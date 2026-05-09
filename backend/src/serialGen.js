'use strict';

const { ZIGZAG, BASE_URL: DEFAULT_BASE_URL, STAMP_CONFIG: DEFAULT_STAMP_CONFIG } = require('./stampConfig');
const store = require('./store');

// Build the ordered format array from a type config object
function buildFormat(cfg) {
  if (cfg.qrType === 'old') {
    const parts = [];
    if (cfg.prefix) parts.push('PREFIX');
    if (cfg.oldNumIdLen > 0) parts.push('OLD_NUM_ID');
    if (cfg.productCodeLen > 0) parts.push('PRODUCT_CODE');
    if (cfg.letterCount > 0) parts.push('LETTERS');
    parts.push('DIGITS');
    return parts;
  }
  const parts = [];
  if (cfg.prefix) parts.push('PREFIX');
  parts.push('YEAR');
  if (cfg.productCodeLen > 0) parts.push('PRODUCT_CODE');
  if (cfg.letterCount > 0) parts.push('LETTERS');
  parts.push('DIGITS');
  return parts;
}

// Build a validation regex from config params
function buildRegex(cfg) {
  let pat = '';
  if (cfg.qrType === 'old') {
    if (cfg.prefix) pat += cfg.prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    if (cfg.oldNumIdLen > 0) pat += `[0-9]{${cfg.oldNumIdLen}}`;
    if (cfg.productCodeLen > 0) pat += `[A-Z0-9]{${cfg.productCodeLen}}`;
    if (cfg.letterCount > 0) pat += `[A-Z]{${cfg.letterCount}}`;
    pat += `\\d{${cfg.digitCount}}`;
    return new RegExp(`^${pat}$`);
  }
  if (cfg.prefix) pat += cfg.prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  pat += `\\d{2}`;
  if (cfg.productCodeLen > 0) pat += `[A-Z]{${cfg.productCodeLen}}`;
  if (cfg.letterCount > 0) pat += `[A-Z]{${cfg.letterCount}}`;
  pat += `\\d{${cfg.digitCount}}`;
  return new RegExp(`^${pat}$`);
}

// Returns effective config: { baseUrl, types: { TYPE: { name, urlPath, prefix, productCodeLen, letterCount, digitCount, format, regex } } }
function getEffectiveConfig() {
  const stored = store.getStampTypeConfig();
  const baseUrl = (stored && stored.baseUrl) || DEFAULT_BASE_URL;

  const types = {};
  for (const [key, def] of Object.entries(DEFAULT_STAMP_CONFIG)) {
    const override = stored && stored.types && stored.types[key];
    const merged = {
      name:           (override && override.name           != null) ? override.name           : def.name,
      urlPath:        (override && override.urlPath        != null) ? override.urlPath        : def.urlPath,
      prefix:         (override && override.prefix         != null) ? override.prefix         : def.prefix,
      year:           (override && override.year           != null) ? override.year           : def.year || '',
      productCodeLen: (override && override.productCodeLen != null) ? override.productCodeLen : def.productCodeLen,
      letterCount:    (override && override.letterCount    != null) ? override.letterCount    : def.letterCount,
      digitCount:     (override && override.digitCount     != null) ? override.digitCount     : def.digitCount,
      qrType:         (override && override.qrType         != null) ? override.qrType         : def.qrType || 'new',
      oldNumIdLen:    (override && override.oldNumIdLen    != null) ? override.oldNumIdLen    : def.oldNumIdLen || 0,
      oldDomain:      (override && override.oldDomain      != null) ? override.oldDomain      : def.oldDomain || '',
    };
    merged.format = buildFormat(merged);
    merged.regex  = buildRegex(merged);
    types[key] = merged;
  }

  return { baseUrl, types };
}

// Flat config shape compatible with old STAMP_CONFIG (keyed by type, with baseUrl at root)
function getEffectiveFlatConfig() {
  const { baseUrl, types } = getEffectiveConfig();
  return { baseUrl, ...types };
}

function letterFromPos(pos) {
  const p = ((pos % ZIGZAG) + ZIGZAG) % ZIGZAG;
  return p <= 25
    ? String.fromCharCode(65 + p)
    : String.fromCharCode(65 + (ZIGZAG - p));
}

function makeSerial(typeCfg, year, productCode, lPos, counter, oldNumIdValue) {
  const parts = {
    PREFIX:       typeCfg.prefix || '',
    YEAR:         typeCfg.qrType === 'old' ? '' : String(year).slice(-2),
    OLD_NUM_ID:   typeCfg.qrType === 'old'
      ? String(oldNumIdValue || '0').padStart(typeCfg.oldNumIdLen, '0').slice(0, typeCfg.oldNumIdLen)
      : '',
    PRODUCT_CODE: typeCfg.productCodeLen > 0
      ? ((productCode || 'A').padEnd(typeCfg.productCodeLen, 'A')).slice(0, typeCfg.productCodeLen).toUpperCase()
      : '',
    DIGITS:       String(counter).padStart(typeCfg.digitCount, '0'),
  };

  if (typeCfg.letterCount === 1) {
    parts.LETTERS = letterFromPos(lPos);
  } else if (typeCfg.letterCount === 2) {
    parts.LETTERS = letterFromPos(Math.floor(lPos / ZIGZAG) % ZIGZAG)
                  + letterFromPos(lPos % ZIGZAG);
  } else {
    parts.LETTERS = '';
  }

  return typeCfg.format.map(p => parts[p] || '').join('');
}

function maxCounter(typeCfg) {
  return Math.pow(10, typeCfg.digitCount) - 1;
}

function maxLetterPos(typeCfg) {
  return Math.pow(ZIGZAG, typeCfg.letterCount || 1);
}

function advance(typeCfg, lPos, counter) {
  const mc = maxCounter(typeCfg);
  const ml = maxLetterPos(typeCfg);
  counter++;
  if (counter > mc) { counter = 0; lPos = (lPos + 1) % ml; }
  return { lPos, counter };
}

function generateBatch({ type, prefix, year, productCode = '', lPos = 0, counter = 0, qty, oldNumIdValue = '' }) {
  const { baseUrl, types } = getEffectiveConfig();
  const typeCfg = types[type];
  if (!typeCfg) throw new Error(`Unknown stamp type: ${type}`);

  // Override prefix if provided explicitly
  const effectiveTypeCfg = { ...typeCfg, prefix: prefix !== undefined ? prefix : typeCfg.prefix };

  const items = [];
  let lp = lPos, ct = counter;

  const effectiveDomain = effectiveTypeCfg.qrType === 'old' && effectiveTypeCfg.oldDomain
    ? effectiveTypeCfg.oldDomain.trim().replace(/\/$/, '')
    : baseUrl;

  for (let i = 0; i < qty; i++) {
    const serial = makeSerial(effectiveTypeCfg, year, productCode, lp, ct, oldNumIdValue);
    const url    = effectiveDomain + effectiveTypeCfg.urlPath + serial;
    items.push({ serial, url });
    ({ lPos: lp, counter: ct } = advance(effectiveTypeCfg, lp, ct));
  }

  return { items, nextLPos: lp, nextCounter: ct };
}

function detectType(serial) {
  const { types } = getEffectiveConfig();
  for (const [type, cfg] of Object.entries(types)) {
    if (cfg.regex.test(serial)) return type;
  }
  return null;
}

module.exports = {
  makeSerial,
  generateBatch,
  detectType,
  getEffectiveConfig,
  getEffectiveFlatConfig,
  letterFromPos,
  // legacy compat
  BASE_URL: DEFAULT_BASE_URL,
};
