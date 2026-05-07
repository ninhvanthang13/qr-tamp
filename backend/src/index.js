'use strict';
const express = require('express');
const cors    = require('cors');
const store   = require('./store');
const routes  = require('./routes');

const app = express();
app.use(cors({
  origin: '*', // Tạm thời cho phép mọi nơi để debug
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

app.use('/api', routes);

// Public verification endpoint per spec: GET /verify/:serial
app.get('/verify/:serial', (req, res) => {
  const found = store.findSerial(req.params.serial);
  if (!found) return res.status(404).json({ found: false, serial: req.params.serial, message: 'Serial not found' });
  res.json({ found: true, serial: req.params.serial, ...found });
});

app.get('/', (req, res) => {
  res.json({ service: 'QR Stamp API', version: '1.0.0', status: 'ok' });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`\n  QR Stamp API  →  http://localhost:${PORT}`);
  console.log(`  Verify:        GET http://localhost:${PORT}/verify/:serial\n`);
});
