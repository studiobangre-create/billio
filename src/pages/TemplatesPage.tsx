import { useState } from 'react';
import Icon from '../components/Icon';
import { EmptyState } from '../components/EmptyState';
import { TemplatesEmptyIllustration } from '../components/PageEmptyIllustrations';
import InvoicePaper from '../components/InvoicePaper';
import type { PaperConfig, PaperLayout, PaperDensity, TableStyle, TotalStyle, BizInfo } from '../components/InvoicePaper';
import { PageSkeleton } from '../components/SkeletonLoader';
import { useApp } from '../context/AppContext';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const ACCENT_COLORS = [
  { label: 'Bleu',    hex: '#185FA5' },
  { label: 'Vert',    hex: '#1A7A47' },
  { label: 'Violet',  hex: '#5B2D8E' },
  { label: 'Orange',  hex: '#C4540A' },
  { label: 'Ardoise', hex: '#334155' },
  { label: 'Teal',    hex: '#0D7B7B' },
  { label: 'Rose',    hex: '#9B2460' },
  { label: 'Brique',  hex: '#7C2D12' },
];

const FONTS: { label: string; desc: string; family: string; sample: string }[] = [
  { label: 'Jakarta Sans', desc: 'Sans-serif moderne',          family: '"Plus Jakarta Sans", sans-serif',        sample: 'Aa' },
  { label: 'Space Grotesk',desc: 'Géométrique technique',       family: '"Space Grotesk", sans-serif',            sample: 'Aa' },
  { label: 'Lora',         desc: 'Serif élégant',               family: '"Lora", Georgia, serif',                 sample: 'Aa' },
  { label: 'IBM Plex Mono',desc: 'Monospace professionnel',     family: '"IBM Plex Mono", "Courier New", monospace', sample: 'Aa' },
];

const LAYOUTS: { key: PaperLayout; label: string }[] = [
  { key: 'classic', label: 'Classique' },
  { key: 'band',    label: 'Bandeau' },
  { key: 'minimal', label: 'Minimal' },
  { key: 'sidebar', label: 'Colonne' },
  { key: 'receipt', label: 'Reçu' },
];

// ---------------------------------------------------------------------------
// Template type
// ---------------------------------------------------------------------------
interface Template {
  id:       string;
  name:     string;
  purpose:  string;
  chips:    string[];
  isDefault: boolean;
  starred:  boolean;
  config:   PaperConfig;
}

const DEFAULT_CONFIG: PaperConfig = {
  layout: 'classic', color: '#185FA5',
  fontFamily: '"Plus Jakarta Sans", sans-serif',
  density: 'cozy', tableStyle: 'tinted', totalStyle: 'filled',
  showQty: true, showTax: true, showDiscount: false,
  showSignature: false, showPayment: true, footer: '',
};

const INITIAL_TEMPLATES: Template[] = [
  {
    id: '1', name: 'Classique Billio', purpose: 'Facture standard tout usage',
    chips: ['Classique', 'TVA', 'Paiement'],
    isDefault: true, starred: false,
    config: { ...DEFAULT_CONFIG, layout: 'classic', color: '#185FA5', tableStyle: 'tinted', totalStyle: 'filled' },
  },
  {
    id: '2', name: 'Bandeau Vert', purpose: 'En-tête coloré percutant',
    chips: ['Bandeau', 'TVA', 'Signature'],
    isDefault: false, starred: true,
    config: { ...DEFAULT_CONFIG, layout: 'band', color: '#1A7A47', fontFamily: '"Space Grotesk", sans-serif', tableStyle: 'band-h', totalStyle: 'ruled', showSignature: true },
  },
  {
    id: '3', name: 'Minimal Serif', purpose: 'Épuré, idéal pour agences créatives',
    chips: ['Minimal', 'Serif', 'Aéré'],
    isDefault: false, starred: false,
    config: { ...DEFAULT_CONFIG, layout: 'minimal', color: '#334155', fontFamily: '"Lora", Georgia, serif', density: 'spacious', tableStyle: 'plain', totalStyle: 'ruled', showPayment: false },
  },
  {
    id: '4', name: 'Colonne Violette', purpose: 'Mise en page en deux colonnes',
    chips: ['Colonne', 'Premium', 'Moderne'],
    isDefault: false, starred: false,
    config: { ...DEFAULT_CONFIG, layout: 'sidebar', color: '#5B2D8E', tableStyle: 'tinted', totalStyle: 'plain' },
  },
  {
    id: '5', name: 'Reçu Teal', purpose: 'Format reçu compact pour petites transactions',
    chips: ['Reçu', 'Compact', 'Mono'],
    isDefault: false, starred: false,
    config: { ...DEFAULT_CONFIG, layout: 'receipt', color: '#0D7B7B', fontFamily: '"IBM Plex Mono", monospace', density: 'compact', tableStyle: 'plain', totalStyle: 'plain' },
  },
  {
    id: '6', name: 'Orange Moderne', purpose: 'Bandeau audacieux pour prestataires',
    chips: ['Bandeau', 'Moderne', 'Sans-serif'],
    isDefault: false, starred: false,
    config: { ...DEFAULT_CONFIG, layout: 'band', color: '#C4540A', fontFamily: '"Space Grotesk", sans-serif', tableStyle: 'band-h', totalStyle: 'filled' },
  },
];

// ---------------------------------------------------------------------------
// Layout mini-diagrams (SVG-like using absolute divs)
// ---------------------------------------------------------------------------
const LAYOUT_DIAGRAMS: Record<PaperLayout, React.ReactNode> = {
  classic: (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <div className="lm acc" style={{ top: 4, left: 4, right: 4, height: 8, borderRadius: 2 }} />
      <div className="lm" style={{ top: 16, left: 4, width: '40%', height: 3 }} />
      <div className="lm" style={{ top: 21, left: 4, width: '30%', height: 3 }} />
      <div className="lm" style={{ top: 28, left: 4, right: 4, height: 2 }} />
      <div className="lm" style={{ top: 33, left: 4, width: '60%', height: 2 }} />
      <div className="lm" style={{ top: 37, left: 4, width: '50%', height: 2 }} />
    </div>
  ),
  band: (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <div className="lm acc" style={{ top: 0, left: 0, right: 0, height: 12, borderRadius: 0 }} />
      <div className="lm" style={{ top: 16, left: 4, width: '40%', height: 3 }} />
      <div className="lm" style={{ top: 21, left: 4, right: 4, height: 2 }} />
      <div className="lm" style={{ top: 26, left: 4, width: '70%', height: 2 }} />
      <div className="lm" style={{ top: 31, left: 4, width: '50%', height: 2 }} />
      <div className="lm" style={{ top: 37, left: 4, right: 4, height: 2 }} />
    </div>
  ),
  minimal: (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <div className="lm acc" style={{ top: 4, left: 4, width: '50%', height: 5, borderRadius: 1 }} />
      <div className="lm" style={{ top: 12, left: 4, right: 4, height: 1 }} />
      <div className="lm" style={{ top: 16, left: 4, width: '35%', height: 2 }} />
      <div className="lm" style={{ top: 20, left: 4, width: '45%', height: 2 }} />
      <div className="lm" style={{ top: 27, left: 4, right: 4, height: 2 }} />
      <div className="lm" style={{ top: 32, left: 4, width: '70%', height: 2 }} />
    </div>
  ),
  sidebar: (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <div className="lm acc" style={{ top: 0, left: 0, width: '30%', bottom: 0, borderRadius: 0 }} />
      <div className="lm" style={{ top: 6, left: '34%', width: '40%', height: 3 }} />
      <div className="lm" style={{ top: 12, left: '34%', right: 4, height: 2 }} />
      <div className="lm" style={{ top: 17, left: '34%', width: '55%', height: 2 }} />
      <div className="lm" style={{ top: 22, left: '34%', width: '45%', height: 2 }} />
      <div className="lm" style={{ top: 30, left: '34%', right: 4, height: 2 }} />
    </div>
  ),
  receipt: (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <div className="lm acc" style={{ top: 4, left: '50%', transform: 'translateX(-50%)', width: 18, height: 18, borderRadius: '50%' }} />
      <div className="lm" style={{ top: 26, left: '20%', right: '20%', height: 1 }} />
      <div className="lm" style={{ top: 31, left: 4, right: 4, height: 2 }} />
      <div className="lm" style={{ top: 36, left: 4, width: '60%', height: 2 }} />
    </div>
  ),
};

// ---------------------------------------------------------------------------
// Thumbnail scale helper
// ---------------------------------------------------------------------------
function thumbScale(layout: PaperLayout) {
  return layout === 'receipt' ? 0.57 : 0.37;
}

// ---------------------------------------------------------------------------
// Template card
// ---------------------------------------------------------------------------
function TemplateCard({
  tpl, biz, onEdit, onUse, onToggleStar,
}: {
  tpl: Template;
  biz: BizInfo;
  onEdit: () => void;
  onUse: () => void;
  onToggleStar: () => void;
}) {
  const scale = thumbScale(tpl.config.layout);
  const paperWidth = tpl.config.layout === 'receipt' ? 462 : 720;
  const scaledW = paperWidth * scale;
  const offsetX = tpl.config.layout === 'receipt' ? Math.max(0, (264 - scaledW) / 2) : 0;

  return (
    <div className="tpl-card">
      {/* Thumbnail */}
      <div className="tpl-thumb" onClick={onEdit}>
        <div
          className="tp-paper-wrap"
          style={{ transform: `scale(${scale})`, left: offsetX }}
        >
          <InvoicePaper config={tpl.config} biz={biz} />
        </div>

        {tpl.isDefault && <div className="tpl-badge default-badge">Défaut</div>}
        {!tpl.isDefault && (
          <div className="tpl-badge">
            <Icon name="layout-grid" size={13} ariaHidden />
            {LAYOUTS.find(l => l.key === tpl.config.layout)?.label}
          </div>
        )}

        <div className="tpl-hoverbtn">
          <button className="btn" onClick={e => { e.stopPropagation(); onEdit(); }}>
            <Icon name="edit" size={14} ariaHidden />
            Personnaliser
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="tpl-body">
        <div className="tpl-name-row">
          <div
            className="tpl-pic"
            style={{ background: tpl.config.color }}
          >
            <Icon name="file-invoice" size={16} ariaHidden />
          </div>
          <div>
            <div className="tpl-name">{tpl.name}</div>
            <div className="tpl-purpose">{tpl.purpose}</div>
          </div>
        </div>
        <div className="tpl-meta">
          {tpl.chips.map(c => <span key={c} className="tpl-chip">{c}</span>)}
        </div>
        <div className="tpl-foot">
          <button className="btn btn-sm tpl-star" onClick={onToggleStar} title={tpl.starred ? 'Retirer des favoris' : 'Ajouter aux favoris'}>
            <Icon name={tpl.starred ? 'star-filled' : 'star'} size={15} ariaHidden />
          </button>
          <button className="btn btn-sm" onClick={onEdit}>
            <Icon name="edit" size={14} ariaHidden />
            Modifier
          </button>
          <button className="btn btn-sm btn-primary" onClick={onUse}>
            <Icon name="check" size={14} ariaHidden />
            Utiliser
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Editor controls panel
// ---------------------------------------------------------------------------
function EditorControls({ cfg, onChange }: { cfg: PaperConfig; onChange: (c: PaperConfig) => void }) {
  function set<K extends keyof PaperConfig>(k: K, v: PaperConfig[K]) {
    onChange({ ...cfg, [k]: v });
  }

  const COL_OPTS: { key: keyof PaperConfig; label: string; sub: string }[] = [
    { key: 'showQty',      label: 'Quantité',  sub: 'Colonne Qté dans le tableau' },
    { key: 'showTax',      label: 'TVA',       sub: 'Ligne TVA dans les totaux' },
    { key: 'showDiscount', label: 'Remise',    sub: 'Ligne remise dans les totaux' },
  ];
  const SEC_OPTS: { key: keyof PaperConfig; label: string; sub: string }[] = [
    { key: 'showPayment',   label: 'Modes de paiement', sub: 'Bloc paiement & notes' },
    { key: 'showSignature', label: 'Signature',          sub: 'Ligne de signature' },
  ];

  return (
    <div className="ed-controls">
      {/* Layout */}
      <div className="ed-group">
        <div className="ed-group-title"><Icon name="layout-grid" size={14} ariaHidden />Mise en page</div>
        <div className="layout-grid">
          {LAYOUTS.map(l => (
            <button
              key={l.key}
              className={`layout-btn${cfg.layout === l.key ? ' active' : ''}`}
              onClick={() => set('layout', l.key)}
            >
              <div className="layout-mini">{LAYOUT_DIAGRAMS[l.key]}</div>
              <div className="layout-label">{l.label}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Color */}
      <div className="ed-group">
        <div className="ed-group-title"><Icon name="palette" size={14} ariaHidden />Couleur d'accent</div>
        <div className="swatch-row">
          {ACCENT_COLORS.map(c => (
            <div
              key={c.hex}
              className={`swatch${cfg.color === c.hex ? ' active' : ''}`}
              style={{ background: c.hex, color: c.hex }}
              title={c.label}
              role="radio"
              aria-checked={cfg.color === c.hex}
              aria-label={c.label}
              tabIndex={0}
              onClick={() => set('color', c.hex)}
              onKeyDown={e => e.key === 'Enter' && set('color', c.hex)}
            />
          ))}
        </div>
      </div>

      {/* Font */}
      <div className="ed-group">
        <div className="ed-group-title"><Icon name="file-text" size={14} ariaHidden />Police</div>
        <div className="font-grid">
          {FONTS.map(f => (
            <div
              key={f.family}
              className={`font-opt${cfg.fontFamily === f.family ? ' active' : ''}`}
              onClick={() => set('fontFamily', f.family)}
            >
              <div className="font-sample" style={{ fontFamily: f.family }}>{f.sample}</div>
              <div className="font-info">
                <div className="fn">{f.label}</div>
                <div className="fd">{f.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Density */}
      <div className="ed-group">
        <div className="ed-group-title"><Icon name="list" size={14} ariaHidden />Densité</div>
        <div className="dens-seg">
          {(['compact', 'cozy', 'spacious'] as PaperDensity[]).map(d => (
            <button
              key={d}
              className={`dens-opt${cfg.density === d ? ' active' : ''}`}
              onClick={() => set('density', d)}
            >
              {d === 'compact' ? 'Compact' : d === 'cozy' ? 'Normal' : 'Aéré'}
            </button>
          ))}
        </div>
      </div>

      {/* Table style */}
      <div className="ed-group">
        <div className="ed-group-title"><Icon name="table" size={14} ariaHidden />Style tableau</div>
        <div className="dens-seg">
          {([['plain', 'Lignes'], ['tinted', 'Teinte'], ['band-h', 'Plein']] as [TableStyle, string][]).map(([k, lbl]) => (
            <button
              key={k}
              className={`dens-opt${cfg.tableStyle === k ? ' active' : ''}`}
              onClick={() => set('tableStyle', k)}
            >
              {lbl}
            </button>
          ))}
        </div>
      </div>

      {/* Total style */}
      <div className="ed-group">
        <div className="ed-group-title"><Icon name="cash" size={14} ariaHidden />Style total</div>
        <div className="dens-seg">
          {([['plain', 'Simple'], ['filled', 'Rempli'], ['ruled', 'Souligné']] as [TotalStyle, string][]).map(([k, lbl]) => (
            <button
              key={k}
              className={`dens-opt${cfg.totalStyle === k ? ' active' : ''}`}
              onClick={() => set('totalStyle', k)}
            >
              {lbl}
            </button>
          ))}
        </div>
      </div>

      {/* Columns */}
      <div className="ed-group">
        <div className="ed-group-title"><Icon name="columns" size={14} ariaHidden />Colonnes</div>
        {COL_OPTS.map(o => (
          <div key={o.key} className="chk-row">
            <div
              className={`chk${cfg[o.key] ? ' on' : ''}`}
              onClick={() => set(o.key as keyof PaperConfig, !cfg[o.key] as PaperConfig[typeof o.key])}
              role="checkbox"
              aria-checked={!!cfg[o.key]}
              tabIndex={0}
              onKeyDown={e => e.key === 'Enter' && set(o.key as keyof PaperConfig, !cfg[o.key] as PaperConfig[typeof o.key])}
            >
              {cfg[o.key] && <Icon name="check" size={12} ariaHidden />}
            </div>
            <div className="row-label">
              {o.label}
              <small>{o.sub}</small>
            </div>
          </div>
        ))}
      </div>

      {/* Sections */}
      <div className="ed-group">
        <div className="ed-group-title"><Icon name="eye" size={14} ariaHidden />Sections</div>
        {SEC_OPTS.map(o => (
          <div key={o.key} className="tog-row">
            <div className="row-label">
              {o.label}
              <small>{o.sub}</small>
            </div>
            <button
              className={`tp-toggle${cfg[o.key] ? ' on' : ''}`}
              onClick={() => set(o.key as keyof PaperConfig, !cfg[o.key] as PaperConfig[typeof o.key])}
              aria-pressed={!!cfg[o.key]}
              aria-label={o.label}
            />
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="ed-group">
        <div className="ed-group-title"><Icon name="info-circle" size={14} ariaHidden />Pied de page</div>
        <textarea
          className="ed-textarea"
          rows={3}
          placeholder="Studio Wend SARL · Facture générée via Billio"
          value={cfg.footer}
          onChange={e => set('footer', e.target.value)}
        />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------
type View = 'gallery' | { kind: 'editor'; id: string };

export default function TemplatesPage() {
  const { orgSettings, loading } = useApp();

  if (loading) return <PageSkeleton title="Modèles de factures" subtitle="Personnalisez vos modèles" variant="table-only" rows={4} />;
  const [templates, setTemplates] = useState<Template[]>(INITIAL_TEMPLATES);
  const [view, setView] = useState<View>('gallery');
  const [zoom, setZoom] = useState(100);

  // Editor state — editing a copy of the template's config
  const [edConfig, setEdConfig] = useState<PaperConfig>(DEFAULT_CONFIG);
  const [edName, setEdName] = useState('');

  function openEditor(id: string) {
    const tpl = id === 'new'
      ? { id: 'new', name: 'Nouveau modèle', config: DEFAULT_CONFIG }
      : templates.find(t => t.id === id)!;
    setEdConfig({ ...tpl.config });
    setEdName(tpl.name);
    setView({ kind: 'editor', id });
    setZoom(100);
  }

  function closeEditor() {
    setView('gallery');
  }

  function resetEditor() {
    if (view === 'gallery') return;
    const id = view.id;
    if (id === 'new') {
      setEdConfig(DEFAULT_CONFIG);
      setEdName('Nouveau modèle');
    } else {
      const tpl = templates.find(t => t.id === id);
      if (tpl) { setEdConfig({ ...tpl.config }); setEdName(tpl.name); }
    }
  }

  function saveTemplate() {
    if (view === 'gallery') return;
    const { id } = view;
    if (id === 'new') {
      const newId = String(Date.now());
      setTemplates(prev => [...prev, {
        id: newId, name: edName.trim() || 'Nouveau modèle',
        purpose: 'Modèle personnalisé', chips: [LAYOUTS.find(l => l.key === edConfig.layout)?.label ?? 'Personnalisé'],
        isDefault: false, starred: false, config: { ...edConfig },
      }]);
    } else {
      setTemplates(prev => prev.map(t => t.id === id
        ? { ...t, name: edName.trim() || t.name, config: { ...edConfig } }
        : t,
      ));
    }
    setView('gallery');
  }

  function toggleStar(id: string) {
    setTemplates(prev => prev.map(t => t.id === id ? { ...t, starred: !t.starred } : t));
  }

  function useTemplate(id: string) {
    setTemplates(prev => prev.map(t => ({ ...t, isDefault: t.id === id })));
  }

  function zoomStep(dir: 1 | -1) {
    setZoom(z => Math.min(150, Math.max(50, z + dir * 10)));
  }

  const editorId = view !== 'gallery' ? view.id : null;
  const editorTpl = editorId && editorId !== 'new' ? templates.find(t => t.id === editorId) : null;

  return (
    <div className="main" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* ===== GALLERY VIEW ===== */}
      {view === 'gallery' && (
        <>
          <div className="topbar">
            <div>
              <div className="page-title">Modèles de facture</div>
              <div className="page-sub">Choisissez un design prêt à l'emploi ou créez le vôtre</div>
            </div>
            <div className="topbar-actions">
              <button className="btn btn-primary" onClick={() => openEditor('new')}>
                <Icon name="plus" size={16} ariaHidden />
                Créer un modèle
              </button>
            </div>
          </div>

          <div className="content">
            <div className="gallery-wrap">
              {/* Intro banner */}
              <div className="gallery-intro">
                <div className="gi-ico"><Icon name="sparkles" size={19} ariaHidden /></div>
                <div>
                  <div className="gi-title">Vos factures, à votre image</div>
                  <div className="gi-sub">
                    Choisissez un modèle et utilisez-le sur vos nouvelles factures, ou personnalisez-le — couleurs, police, mise en page, colonnes et sections. Vous pouvez aussi créer un modèle vierge.
                  </div>
                </div>
              </div>

              {/* Grid */}
              <div className="gallery-head">
                <div className="gallery-title">
                  Tous les modèles <span className="cnt">{templates.length}</span>
                </div>
              </div>

              <div className="tpl-grid">
                {templates.length === 0 && (
                  <div style={{ gridColumn: '1 / -1' }}>
                    <EmptyState
                      illustration={<TemplatesEmptyIllustration />}
                      title="Aucun modèle"
                      description="Vous n'avez pas encore de modèles. Créez-en un pour gagner du temps."
                    />
                  </div>
                )}
                {templates.map(tpl => (
                  <TemplateCard
                    key={tpl.id}
                    tpl={tpl}
                    biz={orgSettings}
                    onEdit={() => openEditor(tpl.id)}
                    onUse={() => useTemplate(tpl.id)}
                    onToggleStar={() => toggleStar(tpl.id)}
                  />
                ))}

                {/* Create blank card */}
                <div className="tpl-card create" onClick={() => openEditor('new')}>
                  <div className="create-inner">
                    <div className="create-ico"><Icon name="plus" size={26} ariaHidden /></div>
                    <div className="create-title">Modèle vierge</div>
                    <div className="create-sub">Partez de zéro et configurez chaque détail</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ===== EDITOR VIEW ===== */}
      {view !== 'gallery' && (
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
          {/* Editor topbar */}
          <div className="topbar">
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
              <button className="crumb-back" onClick={closeEditor} aria-label="Retour aux modèles">
                <Icon name="arrow-left" ariaHidden />
              </button>
              <div>
                <input
                  className="ed-name-input"
                  value={edName}
                  onChange={e => setEdName(e.target.value)}
                  spellCheck={false}
                />
                <div className="ed-sub">
                  {editorTpl ? `Modification de "${editorTpl.name}"` : 'Nouveau modèle'}
                </div>
              </div>
            </div>
            <div className="topbar-actions">
              <button className="btn" onClick={resetEditor}>
                <Icon name="arrow-down-left" size={15} ariaHidden />
                Réinitialiser
              </button>
              <button className="btn btn-primary" onClick={saveTemplate}>
                <Icon name="check" size={15} ariaHidden />
                Enregistrer
              </button>
            </div>
          </div>

          {/* Editor body */}
          <div className="ed-body">
            <EditorControls cfg={edConfig} onChange={setEdConfig} />

            {/* Preview */}
            <div className="ed-preview">
              <div className="ed-preview-bar">
                <span style={{ flex: 1, textAlign: 'left' }}>
                  {LAYOUTS.find(l => l.key === edConfig.layout)?.label} · {edConfig.density}
                </span>
                <button className="zoom-btn" onClick={() => zoomStep(-1)} aria-label="Zoom arrière">−</button>
                <span className="zoom-val">{zoom}%</span>
                <button className="zoom-btn" onClick={() => zoomStep(1)} aria-label="Zoom avant">+</button>
              </div>
              <div className="ed-stage">
                <div
                  className="ed-paper-shadow"
                  style={{
                    transformOrigin: 'top center',
                    transform: `scale(${zoom / 100})`,
                    transition: 'transform .15s',
                    display: 'inline-block',
                  }}
                >
                  <InvoicePaper config={edConfig} biz={orgSettings} />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
