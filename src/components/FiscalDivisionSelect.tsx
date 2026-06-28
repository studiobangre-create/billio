import { useState, useRef, useEffect } from 'react';
import Icon from '@/components/Icon';

interface Option { value: string; label: string }
interface Group  { label: string; options: Option[] }

const GROUPS: Group[] = [
  {
    label: 'DGE — Direction des Grandes Entreprises',
    options: [
      { value: 'DGE', label: 'Direction des grandes entreprises' },
    ],
  },
  {
    label: 'DME — Directions des Moyennes Entreprises',
    options: [
      { value: 'DME du Centre 1',       label: 'DME du Centre 1' },
      { value: 'DME du Centre 2',       label: 'DME du Centre 2' },
      { value: 'DME du Centre 3',       label: 'DME du Centre 3' },
      { value: 'DME du Centre 4',       label: 'DME du Centre 4' },
      { value: 'DME du Centre 5',       label: 'DME du Centre 5' },
      { value: 'DME des Hauts-Bassins', label: 'DME des Hauts-Bassins' },
    ],
  },
  {
    label: 'DCI — Directions du Centre des Impôts',
    options: [
      { value: 'DCI Ouaga 1',        label: 'DCI Ouaga 1' },
      { value: 'DCI Ouaga 2',        label: 'DCI Ouaga 2' },
      { value: 'DCI Ouaga 3',        label: 'DCI Ouaga 3' },
      { value: 'DCI Ouaga 4',        label: 'DCI Ouaga 4' },
      { value: 'DCI Ouaga 5',        label: 'DCI Ouaga 5' },
      { value: 'DCI Ouaga 6',        label: 'DCI Ouaga 6' },
      { value: 'DCI Ouaga 7',        label: 'DCI Ouaga 7' },
      { value: 'DCI Ouaga 8',        label: 'DCI Ouaga 8' },
      { value: 'DCI Ouaga 9',        label: 'DCI Ouaga 9' },
      { value: 'DCI Bobo 1',         label: 'DCI Bobo 1' },
      { value: 'DCI Bobo 2',         label: 'DCI Bobo 2' },
      { value: 'DCI Bobo 3',         label: 'DCI Bobo 3' },
      { value: 'DCI Bobo 4',         label: 'DCI Bobo 4' },
      { value: "DCI de N'Dorola",    label: "DCI de N'Dorola" },
      { value: 'DCI de Samorogouan', label: 'DCI de Samorogouan' },
    ],
  },
  {
    label: 'DRI — Directions Régionales des Impôts',
    options: [
      { value: 'DRI du Centre-Est',           label: 'DRI du Centre-Est' },
      { value: 'DRI du Centre-Ouest',         label: 'DRI du Centre-Ouest' },
      { value: 'DRI du Centre-Nord',          label: 'DRI du Centre-Nord' },
      { value: 'DRI du Centre-Sud',           label: 'DRI du Centre-Sud' },
      { value: 'DRI des Cascades',            label: 'DRI des Cascades' },
      { value: 'DRI de la Boucle du Mouhoun', label: 'DRI de la Boucle du Mouhoun' },
      { value: 'DRI du Sahel',                label: 'DRI du Sahel' },
      { value: "DRI de l'Est",                label: "DRI de l'Est" },
      { value: 'DRI du Sud-Ouest',            label: 'DRI du Sud-Ouest' },
      { value: 'DRI du Nord',                 label: 'DRI du Nord' },
      { value: 'DRI du Plateau central',      label: 'DRI du Plateau central' },
    ],
  },
  {
    label: 'DPI — Directions Provinciales des Impôts',
    options: [
      { value: 'DPI du Kénédougou', label: 'DPI du Kénédougou' },
      { value: 'DPI du Tuy',        label: 'DPI du Tuy' },
      { value: 'DPI du Boulgou',    label: 'DPI du Boulgou' },
    ],
  },
];

const ALL_OPTIONS: Option[] = GROUPS.flatMap(g => g.options);

export function fiscalDivisionLabel(value: string): string {
  return ALL_OPTIONS.find(o => o.value === value)?.label ?? value;
}

interface Props {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export default function FiscalDivisionSelect({ value, onChange, placeholder = 'Rechercher une division…' }: Props) {
  const [open, setOpen]   = useState(false);
  const [query, setQuery] = useState('');
  const containerRef      = useRef<HTMLDivElement>(null);
  const inputRef          = useRef<HTMLInputElement>(null);

  const selectedLabel = ALL_OPTIONS.find(o => o.value === value)?.label ?? '';

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery('');
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  function openDropdown() {
    setOpen(true);
    setQuery('');
    setTimeout(() => inputRef.current?.focus(), 0);
  }

  function select(opt: Option) {
    onChange(opt.value);
    setOpen(false);
    setQuery('');
  }

  function clear(e: React.MouseEvent) {
    e.stopPropagation();
    onChange('');
    setOpen(false);
    setQuery('');
  }

  const q = query.toLowerCase();
  const filtered: Group[] = GROUPS.map(g => ({
    ...g,
    options: g.options.filter(o =>
      o.label.toLowerCase().includes(q) ||
      o.value.toLowerCase().includes(q) ||
      g.label.toLowerCase().includes(q)
    ),
  })).filter(g => g.options.length > 0);

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      <div
        className="form-input"
        onClick={openDropdown}
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', userSelect: 'none', minHeight: 37 }}
      >
        <span style={{ color: selectedLabel ? 'var(--color-text-primary)' : 'var(--color-text-tertiary)', fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {selectedLabel || placeholder}
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0, marginLeft: 6 }}>
          {value && (
            <span
              onMouseDown={clear}
              style={{ display: 'flex', alignItems: 'center', padding: 2, borderRadius: 4, color: 'var(--color-text-tertiary)', cursor: 'pointer' }}
            >
              <Icon name="x" size={13} />
            </span>
          )}
          <Icon name="chevron-down" size={14} style={{ color: 'var(--color-text-tertiary)', transition: 'transform .12s', transform: open ? 'rotate(180deg)' : 'none' }} />
        </span>
      </div>

      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, zIndex: 9999,
          background: 'var(--color-background-primary)',
          border: '0.5px solid var(--color-border-secondary)',
          borderRadius: 'var(--border-radius-md)',
          boxShadow: 'var(--shadow-md, 0 4px 16px rgba(0,0,0,.12))',
          overflow: 'hidden',
        }}>
          <div style={{ padding: '8px 10px', borderBottom: '0.5px solid var(--color-border-tertiary)', display: 'flex', alignItems: 'center', gap: 7 }}>
            <Icon name="search" size={13} style={{ color: 'var(--color-text-tertiary)', flexShrink: 0 }} />
            <input
              ref={inputRef}
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Filtrer…"
              style={{ border: 'none', outline: 'none', background: 'transparent', fontSize: 12.5, color: 'var(--color-text-primary)', fontFamily: 'var(--font-sans)', width: '100%' }}
            />
          </div>

          <div style={{ maxHeight: 260, overflowY: 'auto' }}>
            {filtered.length === 0 ? (
              <div style={{ padding: '14px', fontSize: 12.5, color: 'var(--color-text-tertiary)', textAlign: 'center' }}>Aucun résultat</div>
            ) : filtered.map(group => (
              <div key={group.label}>
                <div style={{ padding: '8px 12px 4px', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.6, color: 'var(--color-text-tertiary)' }}>
                  {group.label}
                </div>
                {group.options.map(opt => (
                  <div
                    key={opt.value}
                    onMouseDown={() => select(opt)}
                    style={{
                      padding: '8px 14px',
                      fontSize: 12.5,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      background: opt.value === value ? 'var(--brand-tint)' : 'transparent',
                      color: opt.value === value ? 'var(--brand)' : 'var(--color-text-primary)',
                      fontWeight: opt.value === value ? 600 : 400,
                    }}
                    onMouseEnter={e => { if (opt.value !== value) (e.currentTarget as HTMLDivElement).style.background = 'var(--color-background-secondary)'; }}
                    onMouseLeave={e => { if (opt.value !== value) (e.currentTarget as HTMLDivElement).style.background = 'transparent'; }}
                  >
                    <span>{opt.label}</span>
                    {opt.value === value && <Icon name="check" size={13} />}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
