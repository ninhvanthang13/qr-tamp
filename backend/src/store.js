'use strict';
const fs   = require('fs');
const path = require('path');

const DATA_DIR  = path.join(__dirname, '../../data');
const DATA_FILE = path.join(DATA_DIR, 'stamps.json');

function load() {
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  } catch {
    return { states: {}, batches: [], serials: {}, nextBatchId: 1 };
  }
}

function persist(data) {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
}

// ── State (resume position per type+year+productCode) ─────────────────────────
function getState(type, year, productCode = '') {
  return load().states[`${type}:${year}:${productCode}`] || { lPos: 0, counter: 0 };
}

function setState(type, year, productCode = '', lPos, counter) {
  const data = load();
  data.states[`${type}:${year}:${productCode}`] = {
    lPos, counter, updatedAt: new Date().toISOString()
  };
  persist(data);
}

// ── Batches ────────────────────────────────────────────────────────────────────
function addBatch({ type, year, productCode = '', qty, items, fromSerial, toSerial, generatedBy = 'admin' }) {
  const data = load();
  const id   = data.nextBatchId++;
  const batch = {
    id, type, year, productCode, qty,
    fromSerial, toSerial, generatedBy,
    items,
    createdAt: new Date().toISOString()
  };
  data.batches.push(batch);
  // Index serials for O(1) lookup
  for (const item of items) {
    data.serials[item.serial] = {
      batchId: id, type, productCode, year, url: item.url,
      generatedAt: batch.createdAt
    };
  }
  persist(data);
  return batch;
}

function getBatches(limit = 100) {
  return [...load().batches].reverse().slice(0, limit);
}

function getBatchById(id) {
  return load().batches.find(b => b.id === id) || null;
}

// ── Serial lookup ──────────────────────────────────────────────────────────────
function findSerial(serial) {
  return load().serials[serial.toUpperCase()] || null;
}

// ── Search serials ─────────────────────────────────────────────────────────────
function searchSerials({ query = '', type, limit = 50 }) {
  const data = load();
  const q    = query.toUpperCase();
  return Object.entries(data.serials)
    .filter(([s, v]) => (!q || s.includes(q)) && (!type || v.type === type))
    .slice(0, limit)
    .map(([serial, v]) => ({ serial, ...v }));
}

// ── Stamp Type Config ──────────────────────────────────────────────────────────
// Stores: { baseUrl, types: { CONG: { name, urlPath, prefix, productCodeLen, letterCount, digitCount }, ... } }
const TYPE_CONFIG_FILE = path.join(DATA_DIR, 'stampTypeConfig.json');

function getStampTypeConfig() {
  try {
    return JSON.parse(fs.readFileSync(TYPE_CONFIG_FILE, 'utf8'));
  } catch {
    return null; // null → use defaults from stampConfig.js
  }
}

function saveStampTypeConfig(config) {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(TYPE_CONFIG_FILE, JSON.stringify(config, null, 2), 'utf8');
}

module.exports = { getState, setState, addBatch, getBatches, getBatchById, findSerial, searchSerials, getStampTypeConfig, saveStampTypeConfig };
