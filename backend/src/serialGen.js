'use strict';

// Zigzag letter cycle: A→Z (pos 0-25), then Y→B (pos 26-49), wraps at 50
// Full sequence: A B C … Z Y X … B A B C … (period=50)
const ZIGZAG = 50;

function letterFromPos(pos) {
  const p = ((pos % ZIGZAG) + ZIGZAG) % ZIGZAG;
  return p <= 25
    ? String.fromCharCode(65 + p)           // A‥Z
    : String.fromCharCode(65 + (ZIGZAG - p)); // Y‥B  (p=26→Y, p=49→B)
}

const BASE_URL = 'https://traceviet.intrustdss.vn';
const URL_PATHS = { CONG: '/2/', THUNG: '/1/', SAN_PHAM: '/02/' };

function makeSerial(type, year, productCode, lPos, counter) {
  const yy = String(year).slice(-2);

  if (type === 'CONG') {
    // C(1) + YY(2) + SSS(3) + A(1) + NNNNN(5) = 12
    const sss = ((productCode || 'AAA') + 'AAA').slice(0, 3).toUpperCase();
    const a   = letterFromPos(lPos);
    const n   = String(counter).padStart(5, '0');
    return `C${yy}${sss}${a}${n}`;
  }

  if (type === 'THUNG') {
    // T(1) + YY(2) + AA(2) + NNNNNNN(7) = 12
    const left  = letterFromPos(Math.floor(lPos / ZIGZAG) % ZIGZAG);
    const right = letterFromPos(lPos % ZIGZAG);
    const n     = String(counter).padStart(7, '0');
    return `T${yy}${left}${right}${n}`;
  }

  if (type === 'SAN_PHAM') {
    // YY(2) + SSS(3) + AA(2) + NNNNN(5) = 12
    const sss   = ((productCode || 'AAA') + 'AAA').slice(0, 3).toUpperCase();
    const left  = letterFromPos(Math.floor(lPos / ZIGZAG) % ZIGZAG);
    const right = letterFromPos(lPos % ZIGZAG);
    const n     = String(counter).padStart(5, '0');
    return `${yy}${sss}${left}${right}${n}`;
  }

  throw new Error(`Unknown stamp type: ${type}`);
}

function maxCounter(type) {
  return type === 'THUNG' ? 9_999_999 : 99_999;
}

function maxLetterPos(type) {
  return type === 'CONG' ? ZIGZAG : ZIGZAG * ZIGZAG;
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

  for (let i = 0; i < qty; i++) {
    const serial = makeSerial(type, year, productCode, lp, ct);
    const url    = BASE_URL + URL_PATHS[type] + serial;
    items.push({ serial, url });
    ({ lPos: lp, counter: ct } = advance(type, lp, ct));
  }

  return { items, nextLPos: lp, nextCounter: ct };
}

const PATTERNS = {
  CONG:     /^C\d{2}[A-Z]{3}[A-Z]\d{5}$/,
  THUNG:    /^T\d{2}[A-Z]{2}\d{7}$/,
  SAN_PHAM: /^\d{2}[A-Z]{5}\d{5}$/,
};

function detectType(serial) {
  for (const [type, re] of Object.entries(PATTERNS)) {
    if (re.test(serial)) return type;
  }
  return null;
}

module.exports = { makeSerial, generateBatch, detectType, URL_PATHS, BASE_URL, PATTERNS, letterFromPos };
