'use strict';
const express = require('express');
const router  = express.Router();
const gen     = require('./serialGen');
const store   = require('./store');

// GET /api/config  — returns effective stamp type config (flat, keyed by type + baseUrl at root)
router.get('/config', (_req, res) => {
  res.set('Cache-Control', 'no-store');
  res.json(gen.getEffectiveFlatConfig());
});

// PUT /api/config  — saves overrides for baseUrl and/or per-type params
router.put('/config', (req, res) => {
  const { baseUrl, types } = req.body;
  if (!baseUrl || typeof baseUrl !== 'string') {
    return res.status(400).json({ error: 'baseUrl is required' });
  }
  if (!types || typeof types !== 'object') {
    return res.status(400).json({ error: 'types is required' });
  }
  // Sanitize: only keep known numeric/string fields per type
  const sanitized = {};
  for (const [key, val] of Object.entries(types)) {
    sanitized[key] = {
      name:           String(val.name || ''),
      urlPath:        String(val.urlPath || '/'),
      prefix:         String(val.prefix || ''),
      year:           String(val.year || ''),
      productCodeLen: parseInt(val.productCodeLen, 10) || 0,
      letterCount:    parseInt(val.letterCount, 10) || 0,
      digitCount:     Math.max(1, parseInt(val.digitCount, 10) || 5),
      qrType:         val.qrType === 'old' ? 'old' : 'new',
      oldNumIdLen:    Math.max(0, parseInt(val.oldNumIdLen, 10) || 0),
      oldDomain:      String(val.oldDomain || ''),
    };
  }
  store.saveStampTypeConfig({ baseUrl: baseUrl.trim().replace(/\/$/, ''), types: sanitized });
  res.json({ ok: true });
});

// GET /api/state?type=CONG&year=26&productCode=PLM
router.get('/state', (req, res) => {
  const { type, year, productCode = '' } = req.query;
  if (!type || !year) return res.status(400).json({ error: 'type and year required' });
  res.json(store.getState(type, parseInt(year), productCode.toUpperCase()));
});

// POST /api/generate
router.post('/generate', (req, res) => {
  const { type, prefix, year, productCode = '', lPos, counter, qty, generatedBy = 'admin', oldNumIdValue = '' } = req.body;

  const cfg = gen.getEffectiveFlatConfig();
  if (!cfg[type]) return res.status(400).json({ error: 'Invalid stamp type' });

  if (!type || !year || !qty || qty < 1 || qty > 50000) {
    return res.status(400).json({ error: 'Invalid request. qty must be 1–50000.' });
  }

  const pc    = (productCode || '').toUpperCase();
  const state = store.getState(type, parseInt(year), pc);
  const startLPos    = lPos    !== undefined ? parseInt(lPos)    : state.lPos;
  const startCounter = counter !== undefined ? parseInt(counter) : state.counter;

  try {
    const result = gen.generateBatch({
      type, prefix, year: parseInt(year), productCode: pc,
      lPos: startLPos, counter: startCounter, qty: parseInt(qty),
      oldNumIdValue: String(oldNumIdValue || '')
    });

    const batch = store.addBatch({
      type, year: parseInt(year), productCode: pc,
      qty: parseInt(qty), items: result.items,
      fromSerial: result.items[0].serial,
      toSerial:   result.items[result.items.length - 1].serial,
      generatedBy
    });

    store.setState(type, parseInt(year), pc, result.nextLPos, result.nextCounter);

    res.json({
      batchId:     batch.id,
      items:       result.items,
      nextLPos:    result.nextLPos,
      nextCounter: result.nextCounter,
      fromSerial:  batch.fromSerial,
      toSerial:    batch.toSerial
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/batches
router.get('/batches', (_req, res) => {
  res.json(store.getBatches());
});

// GET /api/batches/:id
router.get('/batches/:id', (req, res) => {
  const batch = store.getBatchById(parseInt(req.params.id));
  if (!batch) return res.status(404).json({ error: 'Batch not found' });
  res.json(batch);
});

// GET /api/serials/search?q=&type=&limit=
router.get('/serials/search', (req, res) => {
  const { q = '', type, limit = 50 } = req.query;
  res.json(store.searchSerials({ query: q, type, limit: parseInt(limit) }));
});

// GET /api/verify/:serial
router.get('/verify/:serial', (req, res) => {
  const found = store.findSerial(req.params.serial);
  if (!found) return res.status(404).json({ found: false, serial: req.params.serial });
  res.json({ found: true, serial: req.params.serial, ...found });
});

// GET /api/export/csv/:batchId
router.get('/export/csv/:batchId', (req, res) => {
  const batch = store.getBatchById(parseInt(req.params.batchId));
  if (!batch) return res.status(404).send('Batch not found');

  const rows = [
    'Serial,URL,Type,ProductCode,Year,GeneratedAt',
    ...batch.items.map(i =>
      `${i.serial},${i.url},${batch.type},${batch.productCode},${batch.year},${batch.createdAt}`
    )
  ].join('\r\n');

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="batch-${batch.id}.csv"`);
  res.send('﻿' + rows);
});

module.exports = router;
