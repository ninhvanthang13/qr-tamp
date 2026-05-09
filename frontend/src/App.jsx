import React, { useState, useEffect, useRef } from 'react';
import { getConfig, saveConfig, getState, generateBatch, getBatches, searchSerials, csvExportUrl, verifySerial } from './api';
import StampStrip from './components/StampStrip';
import QRCode from 'qrcode';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { QrCode, ClipboardList, Search, Download, Printer, Box, Layers, Play, CheckCircle, XCircle, Settings, FileText, LayoutGrid, List } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState('generator');
  const [previewStamps, setPreviewStamps] = useState([]); // Array of stamps

  return (
    <div className="min-h-screen bg-gray-50 flex relative">
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
          <NavItem icon={<Settings size={18} />} label="URL Config" active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} />
        </nav>
        <div className="p-4 text-xs text-gray-400 text-center border-t border-gray-100">
          TraceViet IBO © 2026
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto bg-gray-50/50">
        {activeTab === 'generator' && <GeneratorTab onPreview={(stamp) => setPreviewStamps([stamp])} onMultiPreview={(stamps) => setPreviewStamps(stamps)} />}
        {activeTab === 'history' && <HistoryTab />}
        {activeTab === 'search' && <SearchTab />}
        {activeTab === 'settings' && <UrlConfigTab />}
      </div>

      {/* Fullscreen Preview Modal */}
      {previewStamps.length > 0 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200" onClick={() => setPreviewStamps([])}>
          <div className="relative w-full max-w-5xl bg-white rounded-3xl shadow-2xl flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
            <div className="p-8 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h3 className="text-2xl font-bold text-gray-900">Stamp Preview ({previewStamps.length} stamps)</h3>
                <p className="text-sm text-gray-500">Inspecting selected stamp designs</p>
              </div>
              <button 
                onClick={() => setPreviewStamps([])}
                className="w-10 h-10 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-full flex items-center justify-center transition-colors"
              >
                <XCircle size={24} />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-12 space-y-12 bg-gray-50/30">
              {previewStamps.map((stamp, idx) => (
                <div key={stamp.serial + idx} className="flex flex-col items-center">
                  <div className="w-full flex justify-center [&>div]:w-full [&>div]:max-w-3xl [&_svg]:w-full [&_svg]:h-auto drop-shadow-xl bg-white p-6 rounded-2xl border border-gray-100">
                    <StampStrip {...stamp} />
                  </div>
                  <div className="mt-4 flex items-center space-x-3">
                    <span className="px-3 py-1 bg-white border border-gray-200 rounded-lg text-xs font-mono font-bold text-gray-500">#{idx + 1}</span>
                    <span className="font-mono font-bold text-gray-700">{stamp.serial}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="p-6 border-t border-gray-100 bg-white rounded-b-3xl flex justify-center">
              <p className="text-gray-500 font-mono text-sm bg-gray-100 px-6 py-2 rounded-full flex items-center space-x-2">
                <Search size={14} /> <span>You can scroll to see all selected stamps</span>
              </p>
            </div>
          </div>
        </div>
      )}
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
// Live Preview Panel (used inside GeneratorTab)
// -----------------------------------------------------------------------------
function LivePreviewPanel({ stampConfig, form, activeCfg, isOld, onPreview }) {
  const numIdLen = activeCfg ? (activeCfg.oldNumIdLen || 0) : 0;
  const numIdDisplay = isOld
    ? String(form.oldNumIdValue || '').padStart(numIdLen, '0').slice(0, numIdLen)
    : '';
  const previewSerial = isOld
    ? (activeCfg.prefix || '') + numIdDisplay + (form.productCode || '') + 'A' + '00001'
    : (form.prefix || '') + (form.year || '') + (form.productCode || '') + 'A' + '00001';
  const previewDomain = isOld && activeCfg && activeCfg.oldDomain
    ? activeCfg.oldDomain.replace(/\/$/, '')
    : (stampConfig && stampConfig.baseUrl) || 'https://traceviet.intrustdss.vn';
  const previewPath = activeCfg ? activeCfg.urlPath : '/2/';
  const previewUrl = previewDomain + previewPath + previewSerial;

  return (
    <div
      className="w-full max-w-lg [&>div]:w-full [&_svg]:w-full [&_svg]:h-auto flex justify-center relative cursor-pointer group"
      onClick={() => onPreview && onPreview({
        serial: previewSerial,
        url: previewUrl,
        productLabel: form.productLabel || 'PRODUCT',
        variant: form.variant,
        bgImage: form.bgImage
      })}
    >
      <StampStrip
        serial={previewSerial}
        url={previewUrl}
        productLabel={form.productLabel || 'PRODUCT'}
        variant={form.variant}
        bgImage={form.bgImage}
      />
      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 rounded-xl transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
        <div className="bg-white/90 backdrop-blur-sm text-gray-900 px-4 py-2 rounded-lg font-bold shadow-lg flex items-center space-x-2">
          <Search size={18} /> <span>Click to Enlarge</span>
        </div>
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// Generator Tab
// -----------------------------------------------------------------------------
function GeneratorTab({ onPreview, onMultiPreview }) {
  const currentYY = new Date().getFullYear().toString().slice(-2);
  const [form, setForm] = useState({
    type: 'CONG',
    prefix: 'C',
    year: currentYY,
    productCode: '',
    productLabel: 'PRODUCT',
    qty: 10,
    lPos: 0,
    counter: 0,
    variant: 'regular',
    oldNumIdValue: '',
    bgImage: null,
  });
  
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [stampConfig, setStampConfig] = useState(null);
  const [viewMode, setViewMode] = useState('grid');
  const [previewLimit, setPreviewLimit] = useState(50);
  const [selectedSerials, setSelectedSerials] = useState(new Set());

  // Derived — recomputed every render from latest state
  const activeCfg = (stampConfig && stampConfig[form.type]) || null;
  const isOld = activeCfg ? activeCfg.qrType === 'old' : false;

  const [configKey, setConfigKey] = useState(0);
  const refreshConfig = () => setConfigKey(k => k + 1);

  // Fetch config on mount and on manual refresh
  useEffect(() => {
    getConfig().then(cfg => {
      setStampConfig(cfg);
    }).catch(console.error);
  }, [configKey]);

  // Auto-fetch next sequence
  useEffect(() => {
    if (!form.type || !stampConfig || !stampConfig[form.type]) return;
    const cfg = stampConfig[form.type];
    const old = cfg.qrType === 'old';
    const pcReady = cfg.productCodeLen === 0 || old || form.productCode.length === cfg.productCodeLen;
    if (!old && !form.year) return;
    if (!pcReady) return;
    const fetchState = async () => {
      try {
        const yearParam = old ? '0' : (form.year || currentYY);
        const res = await getState(form.type, yearParam, form.productCode);
        setForm(f => ({ ...f, lPos: res.lPos, counter: res.counter }));
      } catch (err) {
        console.error('State fetch error', err);
      }
    };
    fetchState();
  }, [form.type, form.year, form.productCode, stampConfig]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(f => ({ ...f, [name]: value }));
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setForm(f => ({ ...f, bgImage: ev.target.result }));
      };
      reader.readAsDataURL(file);
    } else {
      setForm(f => ({ ...f, bgImage: null }));
    }
  };

  // Sync prefix and year when type changes
  useEffect(() => {
    if (stampConfig && stampConfig[form.type]) {
      setForm(f => ({
        ...f,
        prefix: stampConfig[form.type].prefix || '',
        year: stampConfig[form.type].year || new Date().getFullYear().toString().slice(-2)
      }));
    }
  }, [form.type, stampConfig]);

  const handleGenerate = async (e) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);
    try {
      const res = await generateBatch({
        type: form.type,
        prefix: form.prefix,
        year: form.year,
        productCode: form.productCode,
        qty: parseInt(form.qty, 10),
        lPos: parseInt(form.lPos, 10),
        counter: parseInt(form.counter, 10),
        oldNumIdValue: form.oldNumIdValue || ''
      });
      setResult(res);
      setPreviewLimit(50); // Reset preview limit for new batch
      // Update form to next state
      setForm(f => ({ ...f, lPos: res.nextLPos, counter: res.nextCounter }));
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleSelect = (serial) => {
    setSelectedSerials(prev => {
      const next = new Set(prev);
      if (next.has(serial)) next.delete(serial);
      else next.add(serial);
      return next;
    });
  };

  const handleSelectAll = () => {
    if (!result) return;
    const allVisible = result.items.slice(0, previewLimit).map(it => it.serial);
    const areAllSelected = allVisible.every(s => selectedSerials.has(s));
    
    setSelectedSerials(prev => {
      const next = new Set(prev);
      if (areAllSelected) {
        allVisible.forEach(s => next.delete(s));
      } else {
        allVisible.forEach(s => next.add(s));
      }
      return next;
    });
  };

  const handlePreviewSelected = () => {
    if (selectedSerials.size === 0 || !result) return;
    const selectedStamps = result.items
      .filter(it => selectedSerials.has(it.serial))
      .map(it => ({
        serial: it.serial,
        url: it.url,
        productLabel: form.productLabel || 'PRODUCT',
        variant: form.variant,
        bgImage: form.bgImage
      }));
    onMultiPreview(selectedStamps);
  };

  return (
    <div className="max-w-6xl mx-auto p-8 space-y-8">
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Generate QR Stamps</h2>
          <p className="text-gray-500 mt-1">Create a new batch of serialized QR code strips for traceability.</p>
        </div>
        <button
          type="button"
          onClick={refreshConfig}
          className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-gray-500 hover:text-green-700 bg-white border border-gray-200 rounded-lg hover:border-green-300 transition-colors shadow-sm"
          title="Tải lại cấu hình từ server"
        >
          <Settings size={13} /> Làm mới cấu hình
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-0">
          <form onSubmit={handleGenerate} className="p-8 space-y-6 bg-white z-10 relative">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Stamp Type</label>
                <select name="type" value={form.type} onChange={handleChange} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-green-500 transition-all font-medium text-gray-700">
                  {stampConfig ? Object.entries(stampConfig).filter(([, v]) => typeof v === 'object').map(([key, config]) => (
                    <option key={key} value={key}>{config.name} ({key})</option>
                  )) : <option value={form.type}>Loading...</option>}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Product Label</label>
                <input name="productLabel" value={form.productLabel} onChange={handleChange} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-green-500 transition-all font-medium text-gray-700" />
              </div>
            </div>

            {/* Badge loại tem */}
            {activeCfg && (
              <div className="flex items-center gap-2">
                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${isOld ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700'}`}>
                  {isOld ? '🟠 Tem Cũ (Old QR)' : '🟢 Tem Mới (New QR)'}
                </span>
                {isOld && <span className="text-xs text-gray-400">Cấu hình tại URL Config</span>}
              </div>
            )}

            {/* Prefix + Year/ProductCode */}
            {isOld ? (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Tiền tố (Prefix)</label>
                  <input name="prefix" value={form.prefix} onChange={handleChange} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-orange-400 transition-all font-medium text-gray-700" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Mã sản phẩm (Product Code)</label>
                  <input name="productCode" value={form.productCode} onChange={handleChange}
                    disabled={activeCfg && activeCfg.productCodeLen === 0}
                    maxLength={activeCfg ? activeCfg.productCodeLen || 20 : 20}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-orange-400 transition-all font-medium text-gray-700 disabled:opacity-50" />
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Tiền tố (Prefix)</label>
                  <input name="prefix" value={form.prefix} onChange={handleChange} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-green-500 transition-all font-medium text-gray-700" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Năm (YY)</label>
                  <input name="year" value={form.year} onChange={handleChange} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-green-500 transition-all font-medium text-gray-700" maxLength="2" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Mã sản phẩm</label>
                  <input name="productCode" value={form.productCode} onChange={handleChange}
                    disabled={activeCfg && activeCfg.productCodeLen === 0}
                    maxLength={activeCfg ? activeCfg.productCodeLen || 3 : 3}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-green-500 transition-all font-medium text-gray-700 disabled:opacity-50" />
                </div>
              </div>
            )}

            {/* Quantity + Background */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Số lượng (Qty)</label>
                <input name="qty" type="number" min="1" max="50000" value={form.qty} onChange={handleChange} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-green-500 transition-all font-medium text-gray-700" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Ảnh nền (Background Image)</label>
                <input type="file" accept="image/*" onChange={handleImageUpload} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-green-500 transition-all font-medium text-gray-700 text-sm file:mr-4 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-green-50 file:text-green-700 hover:file:bg-green-100" />
              </div>
            </div>

            {/* Sequence params */}
            <div className={`p-4 rounded-xl border space-y-3 ${isOld ? 'bg-orange-50/60 border-orange-100' : 'bg-blue-50/50 border-blue-100'}`}>
              <p className={`text-xs font-bold uppercase tracking-wider ${isOld ? 'text-orange-600' : 'text-blue-700'}`}>
                {isOld ? 'Thông số Tem Cũ (Old QR)' : 'Thông số vị trí'}
              </p>
              {isOld && (
                <div>
                  <label className="block text-xs font-semibold text-orange-700 uppercase tracking-wider mb-1">
                    Số ID bắt đầu (NumId — {activeCfg ? activeCfg.oldNumIdLen || '?' : '?'} chữ số)
                  </label>
                  <input
                    name="oldNumIdValue"
                    value={form.oldNumIdValue}
                    onChange={handleChange}
                    placeholder={'0'.repeat(activeCfg ? activeCfg.oldNumIdLen || 15 : 15)}
                    maxLength={activeCfg ? activeCfg.oldNumIdLen || 15 : 15}
                    className="w-full bg-white border border-orange-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-orange-400 text-sm font-mono text-gray-900"
                  />
                  <p className="text-xs text-orange-400 mt-1">vd: 018933401282822</p>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={`block text-xs font-semibold uppercase tracking-wider mb-1 ${isOld ? 'text-orange-700' : 'text-blue-700'}`}>
                    {isOld ? 'Vị trí chữ cái (LPos)' : 'Next LPos'}
                  </label>
                  <input name="lPos" type="number" value={form.lPos} onChange={handleChange}
                    className={`w-full bg-white rounded-lg px-3 py-2 outline-none text-sm font-mono ${isOld ? 'border border-orange-200 focus:ring-2 focus:ring-orange-400 text-orange-900' : 'border border-blue-200 focus:ring-2 focus:ring-blue-500 text-blue-900'}`} />
                </div>
                <div>
                  <label className={`block text-xs font-semibold uppercase tracking-wider mb-1 ${isOld ? 'text-orange-700' : 'text-blue-700'}`}>
                    {isOld ? 'Số cuối bắt đầu (Counter)' : 'Next Counter'}
                  </label>
                  <input name="counter" type="number" value={form.counter} onChange={handleChange}
                    className={`w-full bg-white rounded-lg px-3 py-2 outline-none text-sm font-mono ${isOld ? 'border border-orange-200 focus:ring-2 focus:ring-orange-400 text-orange-900' : 'border border-blue-200 focus:ring-2 focus:ring-blue-500 text-blue-900'}`} />
                </div>
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
            <LivePreviewPanel
              stampConfig={stampConfig}
              form={form}
              activeCfg={activeCfg}
              isOld={isOld}
              onPreview={onPreview}
            />
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
              <div className="flex bg-gray-100 p-1 rounded-lg">
                <button onClick={() => setViewMode('grid')} className={`flex items-center space-x-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${viewMode === 'grid' ? 'bg-white shadow-sm text-gray-800' : 'text-gray-500 hover:text-gray-700'}`}><LayoutGrid size={14} /> <span>Grid</span></button>
                <button onClick={() => setViewMode('table')} className={`flex items-center space-x-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${viewMode === 'table' ? 'bg-white shadow-sm text-gray-800' : 'text-gray-500 hover:text-gray-700'}`}><List size={14} /> <span>Table</span></button>
              </div>
              
              <div className="h-8 w-[1px] bg-gray-200 self-center mx-1"></div>

              <button 
                onClick={handleSelectAll} 
                className="flex items-center space-x-2 bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm"
              >
                {result.items.slice(0, previewLimit).every(s => selectedSerials.has(s.serial)) ? 'Bỏ chọn hết' : 'Chọn tất cả'}
              </button>

              <button 
                onClick={handlePreviewSelected}
                disabled={selectedSerials.size === 0}
                className="flex items-center space-x-2 bg-green-600 text-white hover:bg-green-700 px-4 py-2 rounded-lg text-sm font-medium transition-all shadow-sm disabled:opacity-50 disabled:bg-gray-300"
              >
                <Search size={16} /> <span>Xem {selectedSerials.size} tem đã chọn</span>
              </button>

              <a href={csvExportUrl(result.batchId)} target="_blank" rel="noreferrer" className="flex items-center space-x-2 bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm">
                <Download size={16} /> <span>CSV</span>
              </a>
              <button onClick={() => window.print()} className="flex items-center space-x-2 bg-blue-50 text-blue-700 hover:bg-blue-100 px-4 py-2 rounded-lg text-sm font-medium transition-colors border border-blue-100">
                <Printer size={16} /> <span>Print PDF</span>
              </button>
            </div>
          </div>

          {viewMode === 'table' ? (
            <div className="bg-gray-50 rounded-xl border border-gray-200 overflow-hidden">
               <table className="w-full text-left text-sm text-gray-600">
                  <thead className="bg-gray-100 text-xs uppercase font-semibold text-gray-500">
                    <tr>
                      <th className="px-6 py-3 w-10">
                        <input 
                          type="checkbox" 
                          checked={result.items.slice(0, previewLimit).every(s => selectedSerials.has(s.serial))} 
                          onChange={handleSelectAll}
                          className="w-4 h-4 rounded border-gray-300 text-green-600 focus:ring-green-500"
                        />
                      </th>
                      <th className="px-6 py-3">#</th>
                      <th className="px-6 py-3">Serial</th>
                      <th className="px-6 py-3">Full URL</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 font-mono">
                    {result.items.slice(0, previewLimit).map((item, i) => (
                      <tr key={item.serial} className={`hover:bg-white cursor-pointer ${selectedSerials.has(item.serial) ? 'bg-green-50/50' : ''}`} onClick={() => toggleSelect(item.serial)}>
                        <td className="px-6 py-3" onClick={e => e.stopPropagation()}>
                          <input 
                            type="checkbox" 
                            checked={selectedSerials.has(item.serial)} 
                            onChange={() => toggleSelect(item.serial)}
                            className="w-4 h-4 rounded border-gray-300 text-green-600 focus:ring-green-500"
                          />
                        </td>
                        <td className="px-6 py-3 text-gray-400">{i + 1}</td>
                        <td className="px-6 py-3 font-semibold text-gray-900">{item.serial}</td>
                        <td className="px-6 py-3 text-xs">{item.url}</td>
                      </tr>
                    ))}
                  </tbody>
               </table>
               {result.items.length > previewLimit && (
                 <div className="p-4 bg-white border-t border-gray-200 flex justify-center space-x-4">
                   <button onClick={() => setPreviewLimit(p => p + 50)} className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition-colors">Tải thêm 50</button>
                   <button onClick={() => setPreviewLimit(result.items.length)} className="px-4 py-2 bg-green-50 hover:bg-green-100 text-green-700 rounded-lg text-sm font-medium transition-colors">Hiển thị tất cả ({result.items.length})</button>
                 </div>
               )}
            </div>
          ) : (
            <div className="bg-gray-50/80 rounded-xl border border-gray-200 p-6 overflow-hidden">
               <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-6">
                 {result.items.slice(0, previewLimit).map((item, i) => (
                   <div 
                     key={item.serial} 
                     className={`flex flex-col items-center group bg-white p-4 rounded-xl shadow-sm border transition-all cursor-pointer relative ${selectedSerials.has(item.serial) ? 'border-green-500 ring-2 ring-green-500/20' : 'border-gray-100 hover:border-green-300'}`}
                     onClick={() => toggleSelect(item.serial)}
                   >
                      {/* Selection Checkbox */}
                      <div className="absolute top-3 left-3 z-30" onClick={e => e.stopPropagation()}>
                        <input 
                          type="checkbox" 
                          checked={selectedSerials.has(item.serial)} 
                          onChange={() => toggleSelect(item.serial)}
                          className="w-5 h-5 rounded border-gray-300 text-green-600 focus:ring-green-500 cursor-pointer shadow-sm"
                        />
                      </div>

                      <div className="w-full overflow-hidden flex justify-center [&>div]:w-full [&_svg]:w-full [&_svg]:h-auto relative z-10 pointer-events-none">
                         <StampStrip 
                           serial={item.serial} 
                           url={item.url}
                           productLabel={form.productLabel || 'PRODUCT'}
                           variant={form.variant}
                           bgImage={form.bgImage}
                         />
                      </div>
                      <div className="mt-4 px-3 py-1.5 bg-gray-50 rounded-lg border border-gray-100 text-sm font-mono font-bold text-gray-700 group-hover:bg-green-50 group-hover:text-green-700 transition-colors w-full text-center relative z-10 pointer-events-none">
                         {item.serial}
                      </div>
                      
                      <div className="absolute inset-0 bg-green-500/0 group-hover:bg-green-500/5 transition-colors rounded-xl flex flex-col items-center justify-center z-20">
                         <div 
                           className="opacity-0 group-hover:opacity-100 bg-white shadow-lg text-green-700 px-4 py-2 rounded-lg font-bold text-sm flex items-center space-x-2 transform scale-95 group-hover:scale-100 transition-all absolute"
                           onClick={(e) => {
                             e.stopPropagation();
                             onPreview({
                               serial: item.serial,
                               url: item.url,
                               productLabel: form.productLabel || 'PRODUCT',
                               variant: form.variant,
                               bgImage: form.bgImage
                             });
                           }}
                         >
                           <Search size={16} /> <span>Preview Fullscreen</span>
                         </div>
                      </div>
                   </div>
                 ))}
               </div>
               {result.items.length > previewLimit && (
                 <div className="mt-8 flex justify-center space-x-4">
                   <button onClick={() => setPreviewLimit(p => p + 50)} className="px-6 py-2.5 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-xl text-sm font-medium transition-colors shadow-sm">Tải thêm 50 tem</button>
                   <button onClick={() => setPreviewLimit(result.items.length)} className="px-6 py-2.5 bg-green-50 border border-green-100 hover:bg-green-100 text-green-700 rounded-xl text-sm font-medium transition-colors shadow-sm">Hiển thị tất cả ({result.items.length})</button>
                 </div>
               )}
            </div>
          )}
          
          {/* Print container (Hidden in screen, visible in print) */}
          <div className="hidden print:block absolute top-0 left-0 w-full bg-white z-50 p-4">
             <div className="flex flex-wrap gap-4">
               {result.items.map(item => (
                 <div key={item.serial} className="break-inside-avoid mb-8">
                   <StampStrip 
                     serial={item.serial} 
                     url={item.url}
                     productLabel={form.productLabel || 'PRODUCT'}
                     variant={form.variant}
                     bgImage={form.bgImage}
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
// URL Config Tab
// -----------------------------------------------------------------------------
// URL + Serial Structure Config Tab
// -----------------------------------------------------------------------------
const FIELD_META = [
  { key: 'name',           label: 'Tên hiển thị',      type: 'text',   placeholder: 'Ví dụ: Sản phẩm' },
  { key: 'urlPath',        label: 'URL Path',           type: 'text',   placeholder: '/02/' },
  { key: 'prefix',        label: 'Tiền tố (Prefix)',   type: 'text',   placeholder: 'C hoặc để trống' },
  { key: 'year',          label: 'Năm (YY)',           type: 'text',   placeholder: 'Ví dụ: 26' },
  { key: 'productCodeLen', label: 'Độ dài Mã SP (SSS)', type: 'text', placeholder: '3 (0 = không dùng)' },
  { key: 'letterCount',   label: 'Số chữ cái (A→Z)',   type: 'number', placeholder: '1 hoặc 2' },
  { key: 'digitCount',    label: 'Số chữ số cuối',     type: 'number', placeholder: '5' },
];

function buildSerialPreview(cfg, sampleProduct = 'SAURIENG') {
  if (cfg.qrType === 'old') {
    const prefix = cfg.prefix || '';
    const numId = '0'.repeat(Math.max(0, cfg.oldNumIdLen || 0));
    const pc = cfg.productCodeLen > 0 ? (sampleProduct + 'AAAA').slice(0, cfg.productCodeLen) : '';
    const letters = cfg.letterCount === 1 ? 'A' : cfg.letterCount === 2 ? 'AA' : '';
    const digits = '0'.repeat(Math.max(1, cfg.digitCount || 5));
    return [prefix, numId, pc, letters, digits].join('');
  }
  const yy = cfg.year || new Date().getFullYear().toString().slice(-2);
  const prefix = cfg.prefix || '';
  const pc = cfg.productCodeLen > 0 ? (sampleProduct + 'AAA').slice(0, cfg.productCodeLen) : '';
  const letters = cfg.letterCount === 1 ? 'A' : cfg.letterCount === 2 ? 'AA' : '';
  const digits = '0'.repeat(Math.max(1, cfg.digitCount || 5));
  return [prefix, yy, pc, letters, digits].join('');
}

function UrlConfigTab() {
  const [baseUrl, setBaseUrl] = useState('');
  const [types, setTypes] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    getConfig().then(cfg => {
      const { baseUrl: bu, ...rest } = cfg;
      setBaseUrl(bu || '');
      // strip non-plain fields (format, regex) — keep only editable ones
      const clean = {};
      for (const [k, v] of Object.entries(rest)) {
        clean[k] = {
          name: v.name || '',
          urlPath: v.urlPath || '/',
          prefix: v.prefix || '',
          year: v.year || '',
          productCodeLen: v.productCodeLen ?? 0,
          letterCount: v.letterCount ?? 1,
          digitCount: v.digitCount ?? 5,
          qrType: v.qrType || 'new',
          oldNumIdLen: v.oldNumIdLen ?? 0,
          oldDomain: v.oldDomain || '',
        };
      }
      setTypes(clean);
      setLoading(false);
    }).catch(console.error);
  }, []);

  const setField = (type, field, value) => {
    setTypes(prev => ({
      ...prev,
      [type]: { ...prev[type], [field]: value }
    }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    try {
      await saveConfig({ baseUrl: baseUrl.trim().replace(/\/$/, ''), types });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-12 text-center text-gray-500 animate-pulse">Loading config...</div>;

  return (
    <div className="max-w-4xl mx-auto p-8 space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Cấu hình Tem QR</h2>
        <p className="text-gray-500 mt-1">Cấu hình cấu trúc serial và URL được mã hóa vào QR theo từng loại tem.</p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Base URL */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">Base URL (Domain)</h3>
          <input
            type="url"
            value={baseUrl}
            onChange={e => setBaseUrl(e.target.value)}
            placeholder="https://traceviet.intrustdss.vn"
            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-green-500 font-mono text-sm text-gray-800"
            required
          />
        </div>

        {/* Per-type config */}
        {Object.entries(types).map(([type, cfg]) => {
          const isOld = cfg.qrType === 'old';
          const serial = buildSerialPreview(cfg);
          const domain = isOld && cfg.oldDomain ? cfg.oldDomain.replace(/\/$/, '') : (baseUrl || '<domain>');
          const url = domain + cfg.urlPath + serial;
          return (
            <div key={type} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="flex items-center gap-3 px-6 py-4 bg-gray-50 border-b border-gray-100">
                <span className="bg-green-100 text-green-700 px-2.5 py-1 rounded-md text-xs font-bold">{type}</span>
                <span className="font-semibold text-gray-700 text-sm">{cfg.name}</span>
                <div className="ml-auto flex items-center gap-2">
                  <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Loại tem:</span>
                  <div className="flex bg-gray-100 p-0.5 rounded-lg">
                    <button
                      type="button"
                      onClick={() => setField(type, 'qrType', 'new')}
                      className={`px-3 py-1 text-xs font-bold rounded-md transition-colors ${!isOld ? 'bg-white shadow-sm text-green-700' : 'text-gray-500 hover:text-gray-700'}`}
                    >New</button>
                    <button
                      type="button"
                      onClick={() => setField(type, 'qrType', 'old')}
                      className={`px-3 py-1 text-xs font-bold rounded-md transition-colors ${isOld ? 'bg-white shadow-sm text-orange-600' : 'text-gray-500 hover:text-gray-700'}`}
                    >Old</button>
                  </div>
                </div>
              </div>

              <div className="p-6 space-y-4">
                {/* Old-type specific fields */}
                {isOld && (
                  <div className="bg-orange-50 border border-orange-100 rounded-xl p-4 space-y-3">
                    <p className="text-xs font-bold text-orange-600 uppercase tracking-wider">Cấu hình Tem Cũ (Old QR)</p>
                    <p className="text-xs text-orange-700 font-mono">Cấu trúc: <span className="font-bold">{'{prefix}'}{'{numId}'}{'{maSP}'}{'{chữ}'}{'{số}'}</span></p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-orange-700 uppercase tracking-wider mb-1.5">Domain (Old)</label>
                        <input
                          type="text"
                          value={cfg.oldDomain ?? ''}
                          onChange={e => setField(type, 'oldDomain', e.target.value)}
                          placeholder="https://traceviet.mae.gov.vn"
                          className="w-full bg-white border border-orange-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-orange-400 font-mono text-sm text-gray-800"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-orange-700 uppercase tracking-wider mb-1.5">Độ dài Số ID (NumId)</label>
                        <input
                          type="number"
                          min="0"
                          value={cfg.oldNumIdLen ?? 0}
                          onChange={e => setField(type, 'oldNumIdLen', parseInt(e.target.value, 10) || 0)}
                          placeholder="15"
                          className="w-full bg-white border border-orange-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-orange-400 font-mono text-sm text-gray-800"
                        />
                        <p className="text-xs text-orange-500 mt-1">Số chữ số của NumId (vd: 15 → 018933401282822)</p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {FIELD_META.filter(f => isOld ? !['year'].includes(f.key) : true).map(({ key, label, type: ftype, placeholder }) => (
                    <div key={key}>
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">{label}</label>
                      <input
                        type={ftype}
                        value={cfg[key] ?? ''}
                        min={ftype === 'number' ? 0 : undefined}
                        onChange={e => setField(type, key, ftype === 'number' ? parseInt(e.target.value, 10) || 0 : e.target.value)}
                        placeholder={placeholder}
                        className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-green-500 font-mono text-sm text-gray-800"
                      />
                    </div>
                  ))}
                </div>

                {/* Preview */}
                <div className={`rounded-xl border px-4 py-3 space-y-1 ${isOld ? 'bg-orange-50 border-orange-100' : 'bg-blue-50 border-blue-100'}`}>
                  <p className={`text-xs font-semibold uppercase tracking-wider ${isOld ? 'text-orange-600' : 'text-blue-600'}`}>
                    Preview {isOld ? '(Old)' : '(New)'}
                  </p>
                  <p className={`font-mono text-sm font-bold ${isOld ? 'text-orange-900' : 'text-blue-900'}`}>{serial}</p>
                  <p className={`font-mono text-xs break-all ${isOld ? 'text-orange-700' : 'text-blue-700'}`}>{url}</p>
                </div>
              </div>
            </div>
          );
        })}

        <div className="flex items-center gap-4 pb-4">
          <button
            type="submit"
            disabled={saving}
            className="bg-green-600 hover:bg-green-700 text-white font-bold px-8 py-3 rounded-xl transition-all shadow-md hover:shadow-lg disabled:opacity-70"
          >
            {saving ? <span className="animate-pulse">Đang lưu...</span> : 'Lưu cấu hình'}
          </button>
          {saved && (
            <span className="flex items-center gap-1.5 text-green-600 font-medium text-sm">
              <CheckCircle size={16} /> Đã lưu thành công
            </span>
          )}
        </div>
      </form>
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
