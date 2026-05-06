import React, { useState, useEffect, useRef } from 'react';
import { getConfig, getState, generateBatch, getBatches, searchSerials, csvExportUrl, verifySerial } from './api';
import StampStrip from './components/StampStrip';
import QRCode from 'qrcode';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { QrCode, ClipboardList, Search, Download, Printer, Box, Layers, Play, CheckCircle, XCircle } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState('generator');

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <div className="w-64 bg-white border-r border-gray-200 flex flex-col shadow-sm">
        <div className="p-6 border-b border-gray-100 flex items-center space-x-3">
          <div className="w-8 h-8 rounded-lg bg-green-600 flex items-center justify-center text-white">
            <QrCode size={18} />
          </div>
          <div>
            <h1 className="font-bold text-gray-800 tracking-tight leading-tight">TraceViet</h1>
            <p className="text-xs text-green-600 font-medium">QR Stamp Generator</p>
          </div>
        </div>
        <nav className="p-4 space-y-1 flex-1">
          <NavItem icon={<Play size={18} />} label="Generator" active={activeTab === 'generator'} onClick={() => setActiveTab('generator')} />
          <NavItem icon={<ClipboardList size={18} />} label="History & Export" active={activeTab === 'history'} onClick={() => setActiveTab('history')} />
          <NavItem icon={<Search size={18} />} label="Search & Verify" active={activeTab === 'search'} onClick={() => setActiveTab('search')} />
        </nav>
        <div className="p-4 text-xs text-gray-400 text-center border-t border-gray-100">
          TraceViet IBO © 2026
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto bg-gray-50/50">
        {activeTab === 'generator' && <GeneratorTab />}
        {activeTab === 'history' && <HistoryTab />}
        {activeTab === 'search' && <SearchTab />}
      </div>
    </div>
  );
}

function NavItem({ icon, label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 text-sm font-medium ${
        active ? 'bg-green-50 text-green-700 shadow-sm' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
      }`}
    >
      <span className={active ? 'text-green-600' : 'text-gray-400'}>{icon}</span>
      <span>{label}</span>
    </button>
  );
}

// -----------------------------------------------------------------------------
// Generator Tab
// -----------------------------------------------------------------------------
function GeneratorTab() {
  const [form, setForm] = useState({
    type: 'SAN_PHAM',
    year: new Date().getFullYear().toString().slice(-2),
    productCode: 'PLM',
    qty: 1,
    lPos: 0,
    counter: 0,
    productLabel: 'BƯỞI BẾN TRE',
    variant: 'regular',
  });
  
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [stampConfig, setStampConfig] = useState(null);

  // Fetch config on mount
  useEffect(() => {
    getConfig().then(setStampConfig).catch(console.error);
  }, []);

  // Auto-fetch next sequence
  useEffect(() => {
    const fetchState = async () => {
      try {
        const res = await getState(form.type, form.year, form.productCode);
        setForm(f => ({ ...f, lPos: res.lPos, counter: res.counter }));
      } catch (err) {
        console.error('State fetch error', err);
      }
    };
    if (form.type && form.year && stampConfig && stampConfig[form.type]) {
      const config = stampConfig[form.type];
      if (config.productCodeLen === 0 || form.productCode.length === config.productCodeLen) {
        fetchState();
      }
    }
  }, [form.type, form.year, form.productCode, stampConfig]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(f => ({ ...f, [name]: value }));
  };

  const handleGenerate = async (e) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);
    try {
      const res = await generateBatch({
        type: form.type,
        year: form.year,
        productCode: form.productCode,
        qty: parseInt(form.qty, 10),
        lPos: parseInt(form.lPos, 10),
        counter: parseInt(form.counter, 10)
      });
      setResult(res);
      // Update form to next state
      setForm(f => ({ ...f, lPos: res.nextLPos, counter: res.nextCounter }));
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-8 space-y-8">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900">Generate QR Stamps</h2>
        <p className="text-gray-500 mt-1">Create a new batch of serialized QR code strips for traceability.</p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-0">
          <form onSubmit={handleGenerate} className="p-8 space-y-6 bg-white z-10 relative">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Stamp Type</label>
                <select name="type" value={form.type} onChange={handleChange} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-green-500 transition-all font-medium text-gray-700">
                  {stampConfig ? Object.entries(stampConfig).map(([key, config]) => (
                    <option key={key} value={key}>{config.name} ({key})</option>
                  )) : <option value={form.type}>Loading...</option>}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Year (YY)</label>
                <input name="year" value={form.year} onChange={handleChange} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-green-500 transition-all font-medium text-gray-700" maxLength="2" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Product Code</label>
                <input name="productCode" value={form.productCode} onChange={handleChange} disabled={stampConfig && stampConfig[form.type] && stampConfig[form.type].productCodeLen === 0} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-green-500 transition-all font-medium text-gray-700 disabled:opacity-50" maxLength={stampConfig && stampConfig[form.type] ? stampConfig[form.type].productCodeLen || 3 : 3} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Quantity</label>
                <input name="qty" type="number" min="1" max="50000" value={form.qty} onChange={handleChange} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-green-500 transition-all font-medium text-gray-700" />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4 bg-blue-50/50 p-4 rounded-xl border border-blue-100">
              <div>
                <label className="block text-xs font-semibold text-blue-700 uppercase tracking-wider mb-2">Next LPos</label>
                <input name="lPos" type="number" value={form.lPos} onChange={handleChange} className="w-full bg-white border border-blue-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 text-sm font-mono text-blue-900" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-blue-700 uppercase tracking-wider mb-2">Next Counter</label>
                <input name="counter" type="number" value={form.counter} onChange={handleChange} className="w-full bg-white border border-blue-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 text-sm font-mono text-blue-900" />
              </div>
            </div>

            <div className="pt-2">
               <button type="submit" disabled={loading} className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3.5 rounded-xl transition-all shadow-md hover:shadow-lg disabled:opacity-70 flex items-center justify-center space-x-2">
                 {loading ? <span className="animate-pulse">Generating...</span> : <><Play size={18} /> <span>Generate Batch</span></>}
               </button>
            </div>
          </form>

          {/* Preview Panel */}
          <div className="bg-gray-50 p-8 border-l border-gray-100 flex flex-col justify-center items-center">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-6 w-full text-left">Live Preview</h3>
            <div className="transform scale-[0.65] md:scale-[0.8] origin-top">
              <StampStrip 
                serial="C26PLMA00003" 
                url="https://traceviet.intrustdss.vn/2/C26PLMA00003"
                productLabel={form.productCode || 'PRODUCT'}
                variant={form.variant}
              />
            </div>
            <div className="mt-8 w-full">
               <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Stamp Variant</label>
               <select name="variant" value={form.variant} onChange={handleChange} className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-green-500 transition-all font-medium text-gray-700">
                  <option value="regular">Mẫu thường (Regular)</option>
                  <option value="phat-quang">Phát quang (UV Hologram)</option>
                </select>
            </div>
          </div>
        </div>
      </div>

      {result && (
        <div className="bg-white rounded-2xl shadow-sm border border-green-100 p-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-green-100 text-green-600 rounded-full flex items-center justify-center">
                <CheckCircle size={24} />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">Batch #{result.batchId} Generated</h3>
                <p className="text-sm text-gray-500">Successfully generated {result.items.length} stamps.</p>
              </div>
            </div>
            <div className="flex space-x-3">
              <a href={csvExportUrl(result.batchId)} target="_blank" rel="noreferrer" className="flex items-center space-x-2 bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm">
                <Download size={16} /> <span>CSV</span>
              </a>
              <button onClick={() => window.print()} className="flex items-center space-x-2 bg-blue-50 text-blue-700 hover:bg-blue-100 px-4 py-2 rounded-lg text-sm font-medium transition-colors border border-blue-100">
                <Printer size={16} /> <span>Print PDF</span>
              </button>
            </div>
          </div>

          <div className="bg-gray-50 rounded-xl border border-gray-200 overflow-hidden">
             <table className="w-full text-left text-sm text-gray-600">
                <thead className="bg-gray-100 text-xs uppercase font-semibold text-gray-500">
                  <tr>
                    <th className="px-6 py-3">#</th>
                    <th className="px-6 py-3">Serial</th>
                    <th className="px-6 py-3">Full URL</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 font-mono">
                  {result.items.slice(0, 10).map((item, i) => (
                    <tr key={item.serial} className="hover:bg-white">
                      <td className="px-6 py-3 text-gray-400">{i + 1}</td>
                      <td className="px-6 py-3 font-semibold text-gray-900">{item.serial}</td>
                      <td className="px-6 py-3 text-xs">{item.url}</td>
                    </tr>
                  ))}
                  {result.items.length > 10 && (
                    <tr>
                      <td colSpan="3" className="px-6 py-4 text-center text-gray-500 font-sans italic text-xs">
                        ... and {result.items.length - 10} more items
                      </td>
                    </tr>
                  )}
                </tbody>
             </table>
          </div>
          
          {/* Print container (Hidden in screen, visible in print) */}
          <div className="hidden print:block absolute top-0 left-0 w-full bg-white z-50 p-4">
             <div className="flex flex-wrap gap-4">
               {result.items.map(item => (
                 <div key={item.serial} className="break-inside-avoid mb-8">
                   <StampStrip 
                     serial={item.serial} 
                     url={item.url}
                     productLabel={form.productCode || 'PRODUCT'}
                     variant={form.variant}
                   />
                 </div>
               ))}
             </div>
          </div>
        </div>
      )}
    </div>
  );
}

// -----------------------------------------------------------------------------
// History Tab
// -----------------------------------------------------------------------------
function HistoryTab() {
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [zipping, setZipping] = useState(false);

  useEffect(() => {
    getBatches().then(res => {
      setBatches(res);
      setLoading(false);
    });
  }, []);

  const handleDownloadZip = async (batch) => {
    try {
      setZipping(batch.id);
      const zip = new JSZip();
      const folder = zip.folder(`batch_${batch.id}_${batch.type}`);
      
      const limit = Math.min(batch.items.length, 500); // hard limit to avoid browser crash
      for(let i = 0; i < limit; i++) {
        const item = batch.items[i];
        const dataUrl = await QRCode.toDataURL(item.url, { width: 300, margin: 1 });
        const base64 = dataUrl.split(',')[1];
        folder.file(`${item.serial}.png`, base64, { base64: true });
      }
      
      const content = await zip.generateAsync({ type: 'blob' });
      saveAs(content, `batch_${batch.id}.zip`);
    } catch(e) {
      alert('Zip creation failed');
    } finally {
      setZipping(false);
    }
  };

  if (loading) return <div className="p-12 text-center text-gray-500 animate-pulse">Loading batches...</div>;

  return (
    <div className="max-w-6xl mx-auto p-8">
       <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900">Batch History</h2>
        <p className="text-gray-500 mt-1">Audit log and export options for previously generated batches.</p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-left text-sm text-gray-600">
           <thead className="bg-gray-50 text-xs uppercase font-semibold text-gray-500 border-b border-gray-100">
             <tr>
               <th className="px-6 py-4">ID</th>
               <th className="px-6 py-4">Type</th>
               <th className="px-6 py-4">Product</th>
               <th className="px-6 py-4">Qty</th>
               <th className="px-6 py-4">Range</th>
               <th className="px-6 py-4">Date</th>
               <th className="px-6 py-4 text-right">Exports</th>
             </tr>
           </thead>
           <tbody className="divide-y divide-gray-100">
             {batches.map(b => (
               <tr key={b.id} className="hover:bg-gray-50 transition-colors">
                 <td className="px-6 py-4 font-mono font-bold text-gray-900">#{b.id}</td>
                 <td className="px-6 py-4"><span className="bg-green-100 text-green-700 px-2 py-1 rounded-md text-xs font-bold">{b.type}</span></td>
                 <td className="px-6 py-4 font-mono">{b.productCode || '-'}</td>
                 <td className="px-6 py-4">{b.qty.toLocaleString()}</td>
                 <td className="px-6 py-4 font-mono text-xs text-gray-500">
                    <div className="text-gray-900">{b.fromSerial}</div>
                    <div>{b.toSerial}</div>
                 </td>
                 <td className="px-6 py-4 text-xs whitespace-nowrap">{new Date(b.createdAt).toLocaleString()}</td>
                 <td className="px-6 py-4 text-right space-x-2">
                   <a href={csvExportUrl(b.id)} target="_blank" rel="noreferrer" title="Download CSV" className="inline-flex p-2 bg-white border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 hover:text-blue-600 transition-colors shadow-sm">
                     <FileText size={16} />
                   </a>
                   <button onClick={() => handleDownloadZip(b)} disabled={zipping === b.id} title="Download ZIP of QR codes" className="inline-flex p-2 bg-white border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 hover:text-green-600 transition-colors shadow-sm disabled:opacity-50">
                     {zipping === b.id ? <span className="animate-spin w-4 h-4 border-2 border-green-600 border-t-transparent rounded-full" /> : <Layers size={16} />}
                   </button>
                 </td>
               </tr>
             ))}
             {batches.length === 0 && (
               <tr>
                 <td colSpan="7" className="px-6 py-12 text-center text-gray-400">No batches generated yet.</td>
               </tr>
             )}
           </tbody>
        </table>
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// Search Tab
// -----------------------------------------------------------------------------
function SearchTab() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searched, setSearched] = useState(false);

  const handleSearch = async (e) => {
    e.preventDefault();
    if(!query.trim()) return;
    try {
      // Could use searchSerials or verifySerial
      const res = await verifySerial(query.trim());
      setResults(res.found ? [res] : []);
      setSearched(true);
    } catch(e) {
      setResults([]);
      setSearched(true);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-8">
      <div className="mb-8 text-center">
        <h2 className="text-3xl font-bold text-gray-900 mb-4">Stamp Verification</h2>
        <p className="text-gray-500">Enter a 12-character serial number to verify authenticity.</p>
      </div>

      <form onSubmit={handleSearch} className="flex justify-center mb-12">
        <div className="relative w-full max-w-lg">
          <input 
            type="text" 
            value={query} 
            onChange={e => setQuery(e.target.value.toUpperCase())}
            placeholder="e.g. C26PLMA00003"
            className="w-full pl-5 pr-14 py-4 rounded-full border border-gray-200 shadow-sm focus:ring-4 focus:ring-green-500/20 outline-none text-lg font-mono tracking-widest text-gray-800 uppercase"
            maxLength="12"
          />
          <button type="submit" className="absolute right-2 top-2 bottom-2 w-10 h-10 bg-green-600 hover:bg-green-700 text-white rounded-full flex items-center justify-center transition-colors">
            <Search size={18} />
          </button>
        </div>
      </form>

      {searched && (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          {results.length > 0 ? (
            <div className="bg-white rounded-2xl shadow-sm border-2 border-green-500 p-8 text-center max-w-lg mx-auto relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-2 bg-green-500"></div>
              <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle size={32} />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Authentic Stamp</h3>
              <p className="text-green-600 font-medium mb-6">This serial number exists in the registry.</p>
              
              <div className="bg-gray-50 rounded-xl p-4 text-left space-y-3 font-mono text-sm border border-gray-100">
                <div className="flex justify-between"><span className="text-gray-500">Serial</span> <span className="font-bold">{results[0].serial}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Type</span> <span className="font-bold">{results[0].type}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Product Code</span> <span className="font-bold">{results[0].productCode}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Batch ID</span> <span className="font-bold">#{results[0].batchId}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Issued</span> <span className="font-bold">{new Date(results[0].generatedAt).toLocaleDateString()}</span></div>
              </div>
            </div>
          ) : (
             <div className="bg-white rounded-2xl shadow-sm border-2 border-red-500 p-8 text-center max-w-lg mx-auto relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-2 bg-red-500"></div>
              <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <XCircle size={32} />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Not Found</h3>
              <p className="text-red-600 font-medium mb-6">This serial number does not exist or is invalid.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
