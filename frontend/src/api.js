const BASE = import.meta.env.VITE_API_BASE || '/api';

async function req(path, opts = {}) {
  const r = await fetch(BASE + path, {
    headers: { 'Content-Type': 'application/json' },
    cache: 'no-store',
    ...opts,
    body: opts.body ? JSON.stringify(opts.body) : undefined
  });
  if (!r.ok) {
    const err = await r.json().catch(() => ({ error: r.statusText }));
    throw new Error(err.error || r.statusText);
  }
  return r.json();
}

export const getConfig   = () => req('/config');
export const saveConfig  = (cfg) => req('/config', { method: 'PUT', body: cfg });

export const getState    = (type, year, productCode = '') =>
  req(`/state?type=${type}&year=${year}&productCode=${productCode}`);

export const generateBatch = (params) =>
  req('/generate', { method: 'POST', body: params });

export const getBatches  = () => req('/batches');
export const getBatch    = (id) => req(`/batches/${id}`);

export const verifySerial = (serial) =>
  req(`/verify/${encodeURIComponent(serial)}`);

export const searchSerials = (q = '', type = '', limit = 50) =>
  req(`/serials/search?q=${encodeURIComponent(q)}&type=${type}&limit=${limit}`);

export const csvExportUrl = (batchId) => `${BASE}/export/csv/${batchId}`;
