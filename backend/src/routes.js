'use strict';
const express = require('express');
const router  = express.Router();
const gen     = require('./serialGen');
const store   = require('./store');
const { STAMP_CONFIG } = require('./stampConfig');

// GET /api/config
router.get('/config', (req, res) => {
  res.json(STAMP_CONFIG);
});

// GET /api/state?type=CONG&year=26&productCode=PLM
router.get('/state', (req, res) => {
  const { type, year, productCode = '' } = req.query;
  if (!type || !year) return res.status(400).json({ error: 'type and year required' });
  res.json(store.getState(type, parseInt(year), productCode.toUpperCase()));
});

// POST /api/generate
router.post('/generate', (req, res) => {
  const { type, year, productCode = '', lPos, counter, qty, generatedBy = 'admin' } = req.body;

  if (!type || !year || !qty || qty < 1 || qty > 50000) {
    return res.status(400).json({ error: 'Invalid request. qty must be 1–50000.' });
  }
  if (!STAMP_CONFIG[type]) {
    return res.status(400).json({ error: 'Invalid stamp type' });
  }

  const pc    = (productCode || '').toUpperCase();
  const state = store.getState(type, parseInt(year), pc);
  const startLPos    = lPos    !== undefined ? parseInt(lPos)    : state.lPos;
  const startCounter = counter !== undefined ? parseInt(counter) : state.counter;

  try {
    const result = gen.generateBatch({
      type, year: parseInt(year), productCode: pc,
      lPos: startLPos, counter: startCounter, qty: parseInt(qty)
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
router.get('/batches', (req, res) => {
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
  res.send('﻿' + rows); // BOM for Excel
});

module.exports = router;
