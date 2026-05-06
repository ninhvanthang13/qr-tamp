import { useEffect, useRef, useState, forwardRef } from 'react';
import QRCode from 'qrcode';
import { buildGuillocheLines } from '../guilloche.js';

// ── SVG canvas dimensions (screen units; scales to mm on print) ──────────────
const W  = 630;   // total width
const H  = 210;   // strip height
const QW = 152;   // QR zone width (left & right)
const CW = W - 2 * QW; // center zone = 326
const META_H = 68; // metadata block height below strip

// Precompute guilloché lines once (deterministic)
const GUILLOCHE = buildGuillocheLines(W, H);

// ── Holographic seal (fluorescent variant) ───────────────────────────────────
function HolographicSeal({ cx, cy, r = 52 }) {
  const id = 'holo-grad';
  return (
    <g>
      <defs>
        <radialGradient id={`${id}-inner`} cx="50%" cy="50%" r="50%">
          <stop offset="0%"   stopColor="#ffffff" stopOpacity="0.9" />
          <stop offset="40%"  stopColor="#c0f0ff" stopOpacity="0.7" />
          <stop offset="70%"  stopColor="#a0e8a0" stopOpacity="0.6" />
          <stop offset="100%" stopColor="#80c0ff" stopOpacity="0.4" />
        </radialGradient>
        <linearGradient id={`${id}-ring`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%"    stopColor="#ff80ff" />
          <stop offset="16.6%" stopColor="#ff8800" />
          <stop offset="33.3%" stopColor="#ffff00" />
          <stop offset="50%"   stopColor="#00ff80" />
          <stop offset="66.6%" stopColor="#00c0ff" />
          <stop offset="83.3%" stopColor="#8080ff" />
          <stop offset="100%"  stopColor="#ff80ff" />
        </linearGradient>
        <filter id={`${id}-glow`}>
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>
      {/* Outer rainbow ring */}
      <circle cx={cx} cy={cy} r={r+6} fill="none"
        stroke={`url(#${id}-ring)`} strokeWidth="5" opacity="0.85"
        filter={`url(#${id}-glow)`} />
      {/* Inner iridescent fill */}
      <circle cx={cx} cy={cy} r={r} fill={`url(#${id}-inner)`} opacity="0.75" />
      {/* Radial lines for hologram effect */}
      {Array.from({ length: 16 }, (_, i) => {
        const angle = (i * Math.PI * 2) / 16;
        return (
          <line key={i}
            x1={cx + (r * 0.35) * Math.cos(angle)} y1={cy + (r * 0.35) * Math.sin(angle)}
            x2={cx + (r * 0.90) * Math.cos(angle)} y2={cy + (r * 0.90) * Math.sin(angle)}
            stroke="white" strokeWidth="0.6" opacity="0.5" />
        );
      })}
      {/* UV text */}
      <text x={cx} y={cy - 10} textAnchor="middle" fontSize="8" fontWeight="700"
        fill="#004488" opacity="0.8" fontFamily="serif">PHÁT QUANG</text>
      <text x={cx} y={cy + 2} textAnchor="middle" fontSize="6" fill="#006600" opacity="0.7">
        UV SECURITY SEAL
      </text>
      <text x={cx} y={cy + 14} textAnchor="middle" fontSize="7" fontWeight="700"
        fill="#880000" opacity="0.8">IBO · TEM & VLCG</text>
      {/* Outer ring tick marks */}
      {Array.from({ length: 36 }, (_, i) => {
        const angle = (i * Math.PI * 2) / 36;
        const r2 = r + 3;
        const r3 = r + 6;
        return (
          <line key={i}
            x1={cx + r2 * Math.cos(angle)} y1={cy + r2 * Math.sin(angle)}
            x2={cx + r3 * Math.cos(angle)} y2={cy + r3 * Math.sin(angle)}
            stroke="#0044aa" strokeWidth="0.8" opacity="0.6" />
        );
      })}
    </g>
  );
}

// ── Product illustration (decorative — Bến Tre / cashew theme) ───────────────
function ProductIllustration({ cx, cy }) {
  return (
    <g opacity="0.18">
      {/* Stylised leaf cluster */}
      <ellipse cx={cx-18} cy={cy+8}  rx="22" ry="11" fill="#006600" transform={`rotate(-30,${cx-18},${cy+8})`} />
      <ellipse cx={cx+18} cy={cy+8}  rx="22" ry="11" fill="#008800" transform={`rotate(30,${cx+18},${cy+8})`} />
      <ellipse cx={cx}    cy={cy-5}  rx="18" ry="10" fill="#004400" transform={`rotate(-5,${cx},${cy-5})`} />
      {/* Cashew nut shape */}
      <ellipse cx={cx} cy={cy+22} rx="14" ry="8" fill="#c8960c" transform={`rotate(15,${cx},${cy+22})`} />
      <ellipse cx={cx+14} cy={cy+18} rx="7" ry="5" fill="#a07008" transform={`rotate(40,${cx+14},${cy+18})`} />
    </g>
  );
}

// ── CMYK swatch strip for metadata block ─────────────────────────────────────
function CMYKSwatches({ x, y }) {
  const swatches = [
    { label: 'C', color: '#00aeef' },
    { label: 'M', color: '#ec008c' },
    { label: 'Y', color: '#fff200' },
    { label: 'K', color: '#231f20' },
  ];
  return (
    <g>
      {swatches.map((s, i) => (
        <g key={s.label}>
          <rect x={x + i * 22} y={y} width="18" height="12" fill={s.color}
            stroke="#999" strokeWidth="0.5" rx="1" />
          <text x={x + i * 22 + 9} y={y + 21} textAnchor="middle"
            fontSize="7" fill="#333" fontFamily="sans-serif">{s.label}</text>
        </g>
      ))}
    </g>
  );
}

// ── Main stamp strip component ────────────────────────────────────────────────
const StampStrip = forwardRef(function StampStrip(
  { serial, url, variant = 'regular', productLabel = 'BƯỞi BẾN TRE', productCode = '', year = '', compact = false },
  ref
) {
  const [qrLeft,  setQrLeft]  = useState('');
  const [qrRight, setQrRight] = useState('');

  useEffect(() => {
    if (!url) return;
    const opts = { width: 140, margin: 1, color: { dark: '#000000', light: '#ffffff' } };
    QRCode.toDataURL(url, opts).then(d => { setQrLeft(d); setQrRight(d); });
  }, [url]);

  const today = new Date().toLocaleDateString('vi-VN');
  const sizeLabel = compact ? '38 × 38 mm' : '180 × 56 mm';

  if (compact) {
    // ── Compact square format ────────────────────────────────────────────────
    return (
      <div ref={ref} style={{ display: 'inline-block' }}>
        <svg width="152" height="152" viewBox="0 0 152 152"
          xmlns="http://www.w3.org/2000/svg" style={{ display: 'block' }}>
          <defs>
            <clipPath id="compact-clip">
              <rect width="152" height="152" rx="4" />
            </clipPath>
          </defs>
          {/* Background */}
          <rect width="152" height="152" fill="#e8f5e8" rx="4" />
          {/* Guilloché (clipped subset) */}
          <g clipPath="url(#compact-clip)" opacity="0.7">
            {GUILLOCHE.map((l, i) => (
              <path key={i} d={l.d} stroke={l.stroke} strokeWidth={l.sw}
                fill="none" opacity={l.op} />
            ))}
          </g>
          {/* Border */}
          <rect x="1" y="1" width="150" height="150" rx="3"
            fill="none" stroke="#006600" strokeWidth="1.5" />
          {/* QR code */}
          {qrLeft && <image href={qrLeft} x="16" y="8" width="120" height="120" />}
          {/* Serial number */}
          <text x="76" y="146" textAnchor="middle" fontSize="11"
            fontFamily="'JetBrains Mono', monospace" fontWeight="600" fill="#111">
            {serial || '—'}
          </text>
        </svg>
      </div>
    );
  }

  // ── Full horizontal strip ─────────────────────────────────────────────────
  const totalH = H + META_H;

  return (
    <div ref={ref} style={{ display: 'inline-block', userSelect: 'none' }}>
      <svg width={W} height={totalH} viewBox={`0 0 ${W} ${totalH}`}
        xmlns="http://www.w3.org/2000/svg"
        style={{ display: 'block', fontFamily: 'sans-serif' }}>

        <defs>
          <clipPath id="strip-clip">
            <rect width={W} height={H} rx="4" />
          </clipPath>
          {/* Outer border double-line */}
          <pattern id="border-hatch" patternUnits="userSpaceOnUse" width="4" height="4">
            <path d="M 0 4 L 4 0" stroke="#006600" strokeWidth="0.5" />
          </pattern>
        </defs>

        {/* ── Strip background ──────────────────────────────────────────── */}
        <rect width={W} height={H} fill="#e8f5e8" rx="4" />

        {/* ── Guilloché wave lines ──────────────────────────────────────── */}
        <g clipPath="url(#strip-clip)">
          {GUILLOCHE.map((l, i) => (
            <path key={i} d={l.d} stroke={l.stroke} strokeWidth={l.sw}
              fill="none" opacity={l.op} />
          ))}
        </g>

        {/* ── Outer border (double rule) ────────────────────────────────── */}
        <rect x="1"   y="1"   width={W-2}   height={H-2}   rx="3.5"
          fill="none" stroke="#005500" strokeWidth="1.5" />
        <rect x="4.5" y="4.5" width={W-9}   height={H-9}   rx="2"
          fill="none" stroke="#006600" strokeWidth="0.7" />

        {/* ── Left QR zone ─────────────────────────────────────────────── */}
        <rect x="0" y="0" width={QW} height={H} fill="rgba(255,255,255,0.08)" />
        <line x1={QW} y1="8" x2={QW} y2={H-8} stroke="#006600" strokeWidth="0.8" strokeDasharray="4,3" />
        {qrLeft && (
          <image href={qrLeft} x={QW/2 - 58} y={H/2 - 58} width="116" height="116"
            preserveAspectRatio="xMidYMid meet" />
        )}
        {/* Serial below left QR */}
        <text x={QW/2} y={H - 14} textAnchor="middle" fontSize="7.5"
          fontFamily="'JetBrains Mono',monospace" fontWeight="600" fill="#222" letterSpacing="1">
          {serial || ''}
        </text>

        {/* ── Right QR zone ─────────────────────────────────────────────── */}
        <rect x={W-QW} y="0" width={QW} height={H} fill="rgba(255,255,255,0.08)" />
        <line x1={W-QW} y1="8" x2={W-QW} y2={H-8} stroke="#006600" strokeWidth="0.8" strokeDasharray="4,3" />
        {qrRight && (
          <image href={qrRight} x={W - QW/2 - 58} y={H/2 - 58} width="116" height="116"
            preserveAspectRatio="xMidYMid meet" />
        )}
        <text x={W - QW/2} y={H - 14} textAnchor="middle" fontSize="7.5"
          fontFamily="'JetBrains Mono',monospace" fontWeight="600" fill="#222" letterSpacing="1">
          {serial || ''}
        </text>

        {/* ── Center zone ──────────────────────────────────────────────── */}
        {/* Header — red gov text */}
        <text x={QW + CW/2} y={22} textAnchor="middle" fontSize="10.5"
          fontFamily="'Times New Roman',Times,serif" fontWeight="700"
          fill="#cc0000" letterSpacing="0.5">
          BỘ NÔNG NGHIỆP VÀ MÔI TRƯỜNG
        </text>
        {/* Thin red rule */}
        <line x1={QW+12} y1={28} x2={QW+CW-12} y2={28} stroke="#cc0000" strokeWidth="0.8" />

        {/* Logo / wordmark area */}
        <text x={QW + CW/2} y={50} textAnchor="middle" fontSize="13"
          fontFamily="'Times New Roman',Times,serif" fontWeight="700"
          fill="#006600">
          Nông nghiệp &amp; Môi trường
        </text>
        <text x={QW + CW/2} y={64} textAnchor="middle" fontSize="8.5"
          fontFamily="sans-serif" fill="#004400" letterSpacing="1">
          TRUY XUẤT NGUỒN GỐC · PRODUCT TRACEABILITY
        </text>

        {/* Product label box */}
        <rect x={QW + CW/2 - 68} y={70} width="136" height="22" rx="3"
          fill="rgba(0,100,0,0.12)" stroke="#006600" strokeWidth="0.8" />
        <text x={QW + CW/2} y={84} textAnchor="middle" fontSize="10"
          fontFamily="'Times New Roman',Times,serif" fontWeight="700" fill="#004400">
          {productLabel}
        </text>

        {/* Product illustration (decorative) */}
        <ProductIllustration cx={QW + CW/2} cy={H/2 + 18} />

        {/* Fluorescent UV seal (variant) */}
        {variant === 'phat-quang' && (
          <HolographicSeal cx={QW + CW/2} cy={H/2 + 16} r={52} />
        )}

        {/* Thin blue rule */}
        <line x1={QW+12} y1={H-28} x2={QW+CW-12} y2={H-28} stroke="#003399" strokeWidth="0.8" />
        {/* Footer — blue agency text */}
        <text x={QW + CW/2} y={H-14} textAnchor="middle" fontSize="8"
          fontFamily="'Times New Roman',Times,serif" fontWeight="700"
          fill="#003399" letterSpacing="0.3">
          BỘ CÔNG AN · IBO · TRUNG TÂM TEM &amp; VLCG
        </text>

        {/* Variant badge */}
        <rect x={QW + CW - 60} y={8} width={56} height={14} rx="2"
          fill={variant === 'phat-quang' ? '#7c3aed' : '#065f46'} />
        <text x={QW + CW - 32} y={18} textAnchor="middle" fontSize="7"
          fill="white" fontWeight="600">
          {variant === 'phat-quang' ? 'PHÁT QUANG' : 'MẪU THƯỜNG'}
        </text>

        {/* ── Metadata block ─────────────────────────────────────────────── */}
        <rect x="0" y={H} width={W} height={META_H} fill="#f5f5f5"
          stroke="#ccc" strokeWidth="0.5" />
        {/* Divider */}
        <line x1="0" y1={H} x2={W} y2={H} stroke="#aaa" strokeWidth="1" />

        {/* Column 1: Mã số */}
        <text x="10" y={H+14} fontSize="7" fontWeight="700" fill="#555">MÃ SỐ / CODE</text>
        <text x="10" y={H+26} fontSize="9" fontFamily="monospace" fontWeight="600" fill="#111">
          {serial || '—'}
        </text>

        {/* Column 2: Thiết kế */}
        <text x="140" y={H+14} fontSize="7" fontWeight="700" fill="#555">THIẾT KẾ / DESIGN</text>
        <text x="140" y={H+26} fontSize="8" fill="#333">TraceViet — IBO</text>
        <text x="140" y={H+36} fontSize="7" fill="#666">traceviet.intrustdss.vn</text>

        {/* Column 3: CMYK swatches */}
        <text x="290" y={H+14} fontSize="7" fontWeight="700" fill="#555">TRÌNH TỰ MÀU IN / CMYK</text>
        <CMYKSwatches x={290} y={H+18} />

        {/* Column 4: Date + Size */}
        <text x="410" y={H+14} fontSize="7" fontWeight="700" fill="#555">NGÀY IN / DATE</text>
        <text x="410" y={H+26} fontSize="8" fill="#333">{today}</text>
        <text x="410" y={H+36} fontSize="7" fontWeight="700" fill="#555">KÍCH THƯỚC / SIZE</text>
        <text x="410" y={H+46} fontSize="8" fill="#333">{sizeLabel}</text>

        {/* Column 5: Signature area */}
        <text x="530" y={H+14} fontSize="7" fontWeight="700" fill="#555">XÁC NHẬN / SIGN</text>
        <rect x="530" y={H+18} width="88" height="38" rx="2"
          fill="white" stroke="#bbb" strokeWidth="0.8" strokeDasharray="3,2" />
        <text x="574" y={H+40} textAnchor="middle" fontSize="7" fill="#bbb">Chữ ký</text>

        {/* Bottom micro-print line */}
        <text x={W/2} y={H+META_H-5} textAnchor="middle" fontSize="5.5"
          fill="#999" letterSpacing="0.5">
          © BỘ NÔNG NGHIỆP VÀ MÔI TRƯỜNG — BỘ CÔNG AN IBO — SẢN XUẤT TẠI VIỆT NAM
        </text>
      </svg>
    </div>
  );
});

export default StampStrip;
