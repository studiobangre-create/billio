import { useState, useEffect } from 'react';
import Icon from '../components/Icon';
import { useApp } from '../context/AppContext';
import { supabase } from '../lib/supabase';

type SettingsTab = 'profile' | 'business' | 'invoicing' | 'reminders' | 'payments' | 'providers' | 'notifications' | 'team' | 'plan';

const TABS: { key: SettingsTab; icon: string; label: string }[] = [
  { key: 'profile',       icon: 'user',           label: 'Profil'               },
  { key: 'business',      icon: 'building',        label: 'Entreprise'           },
  { key: 'invoicing',     icon: 'file-invoice',    label: 'Préférences facture'  },
  { key: 'reminders',     icon: 'bell',            label: 'Relances'             },
  { key: 'payments',      icon: 'credit-card',     label: 'Moyens de paiement'   },
  { key: 'providers',     icon: 'plug-connected',  label: 'Prestataires'         },
  { key: 'notifications', icon: 'bell',            label: 'Notifications'        },
  { key: 'team',          icon: 'users',           label: 'Équipe'               },
  { key: 'plan',          icon: 'sparkles',        label: 'Plan & facturation'   },
];

function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      className={'s-toggle' + (on ? ' on' : '')}
      onClick={() => onChange(!on)}
      aria-pressed={on}
    />
  );
}

/* ─── Profile ──────────────────────────────────────────────────── */
function ProfileSection() {
  const { userInitials, showToast } = useApp();

  const [firstName, setFirstName] = useState('');
  const [lastName,  setLastName]  = useState('');
  const [title,     setTitle]     = useState('');
  const [email,     setEmail]     = useState('');
  const [phone,     setPhone]     = useState('');
  const [loading,   setLoading]   = useState(true);
  const [saving,    setSaving]    = useState(false);
  const [dirty,     setDirty]     = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      const m = (user.user_metadata ?? {}) as Record<string, string>;
      setFirstName(m.first_name ?? '');
      setLastName(m.last_name  ?? '');
      setTitle(m.title         ?? '');
      setEmail(user.email      ?? '');
      setPhone(m.phone         ?? '');
      setLoading(false);
    });
  }, []);

  function field<T>(setter: (v: T) => void) {
    return (e: React.ChangeEvent<HTMLInputElement>) => {
      setter(e.target.value as T);
      setDirty(true);
    };
  }

  async function handleSave() {
    setSaving(true);
    const { error } = await supabase.auth.updateUser({
      email,
      data: { first_name: firstName, last_name: lastName, title, phone },
    });
    setSaving(false);
    if (error) { showToast(error.message, true); return; }
    setDirty(false);
    showToast('Profil enregistré');
  }

  function handleCancel() {
    setLoading(true);
    setDirty(false);
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      const m = (user.user_metadata ?? {}) as Record<string, string>;
      setFirstName(m.first_name ?? '');
      setLastName(m.last_name  ?? '');
      setTitle(m.title         ?? '');
      setEmail(user.email      ?? '');
      setPhone(m.phone         ?? '');
      setLoading(false);
    });
  }

  return (
    <div className="s-card">
      <div className="s-card-head">
        <div className="s-card-title">Profil</div>
        <div className="s-card-desc">Ces informations apparaissent sur votre compte et dans les journaux d'activité.</div>
      </div>
      <div className="s-card-body">
        <div className="s-field">
          <label className="s-label">Photo de profil</label>
          <div className="s-avatar-row">
            <div className="s-avatar-lg">{userInitials}</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-sm" disabled><Icon name="edit" size={14} /> Modifier</button>
            </div>
          </div>
        </div>
        <div className="s-field-row">
          <div className="s-field">
            <label className="s-label">Prénom</label>
            <input className="form-input" value={firstName} onChange={field(setFirstName)} disabled={loading} />
          </div>
          <div className="s-field">
            <label className="s-label">Nom</label>
            <input className="form-input" value={lastName} onChange={field(setLastName)} disabled={loading} />
          </div>
        </div>
        <div className="s-field-row">
          <div className="s-field">
            <label className="s-label">Titre</label>
            <input className="form-input" value={title} onChange={field(setTitle)} disabled={loading} placeholder="ex. Fondateur" />
          </div>
          <div className="s-field">
            <label className="s-label">Téléphone</label>
            <div className="input-affix">
              <span className="prefix">+226</span>
              <input value={phone} onChange={field(setPhone)} type="tel" disabled={loading} />
            </div>
          </div>
        </div>
        <div className="s-field">
          <label className="s-label">Adresse e-mail</label>
          <input className="form-input" type="email" value={email} onChange={field(setEmail)} disabled={loading} />
          {dirty && email !== '' && <div className="s-hint">Un e-mail de confirmation sera envoyé à la nouvelle adresse.</div>}
        </div>
      </div>
      <div className="s-card-foot">
        <button className="btn" onClick={handleCancel} disabled={saving || !dirty}>Annuler</button>
        <button className="btn btn-primary" onClick={handleSave} disabled={saving || !dirty}>
          {saving ? 'Enregistrement…' : 'Enregistrer'}
        </button>
      </div>
    </div>
  );
}

const COUNTRIES = ['Burkina Faso', "Côte d'Ivoire", 'Mali', 'Niger', 'Sénégal', 'Togo', 'Bénin', 'Guinée'];
const CURRENCIES = [
  { value: 'XOF', label: 'XOF — Franc CFA' },
  { value: 'EUR', label: 'EUR — Euro' },
  { value: 'USD', label: 'USD — Dollar' },
  { value: 'GHS', label: 'GHS — Cedi' },
  { value: 'NGN', label: 'NGN — Naira' },
];

/* ─── Business ─────────────────────────────────────────────────── */
function BusinessSection() {
  const { orgId, showToast } = useApp();

  const [name,     setName]    = useState('');
  const [ifu,      setIfu]     = useState('');
  const [rccm,     setRccm]    = useState('');
  const [address,  setAddress] = useState('');
  const [city,     setCity]    = useState('');
  const [country,  setCountry] = useState('Burkina Faso');
  const [currency, setCurrency]= useState('XOF');
  const [loading,  setLoading] = useState(true);
  const [saving,   setSaving]  = useState(false);

  useEffect(() => {
    if (!orgId) return;
    supabase
      .from('organizations')
      .select('name, ifu, rccm, address, city, country, currency')
      .eq('id', orgId)
      .single()
      .then(({ data, error }) => {
        if (error) { console.warn('[settings] org fetch:', error.message); setLoading(false); return; }
        if (!data) return;
        setName(data.name     ?? '');
        setIfu(data.ifu       ?? '');
        setRccm(data.rccm     ?? '');
        setAddress(data.address ?? '');
        setCity(data.city     ?? '');
        setCountry(data.country  ?? 'Burkina Faso');
        setCurrency(data.currency ?? 'XOF');
        setLoading(false);
      });
  }, [orgId]);

  async function handleSave() {
    if (!orgId) return;
    setSaving(true);
    const { error } = await supabase
      .from('organizations')
      .update({ name, ifu, rccm, address, city, country, currency })
      .eq('id', orgId);
    setSaving(false);
    if (error) { showToast(error.message, true); return; }
    showToast('Entreprise enregistrée');
  }

  return (
    <div className="s-card">
      <div className="s-card-head">
        <div className="s-card-title">Informations entreprise</div>
        <div className="s-card-desc">Affichées sur chaque facture et devis que vous envoyez.</div>
      </div>
      <div className="s-card-body">
        <div className="s-field">
          <label className="s-label">Raison sociale</label>
          <input className="form-input" value={name} onChange={e => setName(e.target.value)} disabled={loading} />
        </div>
        <div className="s-field-row">
          <div className="s-field">
            <label className="s-label">IFU</label>
            <input className="form-input" value={ifu} onChange={e => setIfu(e.target.value)} disabled={loading} placeholder="00012345 B" />
          </div>
          <div className="s-field">
            <label className="s-label">RCCM</label>
            <input className="form-input" value={rccm} onChange={e => setRccm(e.target.value)} disabled={loading} placeholder="BF-OUA-2021-B-1234" />
          </div>
        </div>
        <div className="s-field">
          <label className="s-label">Adresse</label>
          <input className="form-input" value={address} onChange={e => setAddress(e.target.value)} disabled={loading} placeholder="Av. Kwame Nkrumah, Immeuble Baobab" />
        </div>
        <div className="s-field-row-3">
          <div className="s-field">
            <label className="s-label">Ville</label>
            <input className="form-input" value={city} onChange={e => setCity(e.target.value)} disabled={loading} placeholder="Ouagadougou" />
          </div>
          <div className="s-field">
            <label className="s-label">Pays</label>
            <select className="form-input" value={country} onChange={e => setCountry(e.target.value)} disabled={loading}>
              {COUNTRIES.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div className="s-field">
            <label className="s-label">Devise</label>
            <select className="form-input" value={currency} onChange={e => setCurrency(e.target.value)} disabled={loading}>
              {CURRENCIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </div>
        </div>
      </div>
      <div className="s-card-foot">
        <button className="btn btn-primary" onClick={handleSave} disabled={saving || loading}>
          {saving ? 'Enregistrement…' : 'Enregistrer'}
        </button>
      </div>
    </div>
  );
}

const TERMS_OPTIONS = ['À réception', 'Net 7 jours', 'Net 14 jours', 'Net 30 jours'];

/* ─── Invoicing ─────────────────────────────────────────────────── */
function InvoicingSection() {
  const { orgId, showToast } = useApp();

  const [prefix,    setPrefix]    = useState('INV-');
  const [nextNum,   setNextNum]   = useState('0001');
  const [terms,     setTerms]     = useState('Net 14 jours');
  const [taxRate,   setTaxRate]   = useState(18);
  const [footer,    setFooter]    = useState('');
  const [loading,   setLoading]   = useState(true);
  const [saving,    setSaving]    = useState(false);

  const [autoReminders, setAutoReminders] = useState(true);
  const [attachPdf,     setAttachPdf]     = useState(true);
  const [lateFees,      setLateFees]      = useState(false);

  useEffect(() => {
    if (!orgId) return;
    supabase
      .from('organizations')
      .select('inv_prefix, inv_next_number, payment_terms, default_tax_rate, invoice_footer')
      .eq('id', orgId)
      .single()
      .then(({ data, error }) => {
        if (error) { console.warn('[settings] invoicing fetch:', error.message); setLoading(false); return; }
        if (!data) return;
        setPrefix(data.inv_prefix        ?? 'INV-');
        setNextNum(data.inv_next_number  ?? '0001');
        setTerms(data.payment_terms      ?? 'Net 14 jours');
        setTaxRate(Number(data.default_tax_rate ?? 18));
        setFooter(data.invoice_footer    ?? '');
        setLoading(false);
      });
  }, [orgId]);

  async function handleSave() {
    if (!orgId) return;
    setSaving(true);
    const { error } = await supabase
      .from('organizations')
      .update({ inv_prefix: prefix, inv_next_number: nextNum, payment_terms: terms, default_tax_rate: taxRate, invoice_footer: footer })
      .eq('id', orgId);
    setSaving(false);
    if (error) { showToast(error.message, true); return; }
    showToast('Paramètres de facturation enregistrés');
  }

  return (
    <>
      <div className="s-card">
        <div className="s-card-head">
          <div className="s-card-title">Paramètres par défaut</div>
          <div className="s-card-desc">Pré-remplis sur chaque nouvelle facture. Vous pouvez les modifier par facture.</div>
        </div>
        <div className="s-card-body">
          <div className="s-field-row">
            <div className="s-field">
              <label className="s-label">Préfixe numéro</label>
              <input className="form-input" value={prefix} onChange={e => setPrefix(e.target.value)} disabled={loading} />
              <div className="s-hint">Prochain numéro : <b>#{prefix}{nextNum}</b></div>
            </div>
            <div className="s-field">
              <label className="s-label">Prochain numéro</label>
              <input className="form-input tnum" value={nextNum} onChange={e => setNextNum(e.target.value)} disabled={loading} />
            </div>
          </div>
          <div className="s-field-row">
            <div className="s-field">
              <label className="s-label">Conditions de paiement</label>
              <select className="form-input" value={terms} onChange={e => setTerms(e.target.value)} disabled={loading}>
                {TERMS_OPTIONS.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div className="s-field">
              <label className="s-label">TVA par défaut</label>
              <div className="input-affix">
                <input value={taxRate} onChange={e => setTaxRate(Number(e.target.value))} type="number" min={0} max={100} disabled={loading} />
                <span className="suffix">%</span>
              </div>
            </div>
          </div>
          <div className="s-field">
            <label className="s-label">Pied de page facture</label>
            <textarea className="form-input" rows={2} value={footer} onChange={e => setFooter(e.target.value)} disabled={loading} />
          </div>
        </div>
        <div className="s-card-foot">
          <button className="btn btn-primary" onClick={handleSave} disabled={saving || loading}>
            {saving ? 'Enregistrement…' : 'Enregistrer'}
          </button>
        </div>
      </div>
      <div className="s-card">
        <div className="s-card-head"><div className="s-card-title">Automatisation</div></div>
        <div className="s-card-body">
          <div className="s-row">
            <div className="s-row-ico"><Icon name="bell" size={17} /></div>
            <div className="s-row-main">
              <div className="s-row-title">Relances automatiques</div>
              <div className="s-row-sub">Suivis automatiques selon un calendrier configuré.</div>
            </div>
            <div className="s-row-aside">
              <button className="btn btn-sm">Configurer</button>
              <Toggle on={autoReminders} onChange={setAutoReminders} />
            </div>
          </div>
          <div className="s-row">
            <div className="s-row-ico"><Icon name="file-text" size={17} /></div>
            <div className="s-row-main">
              <div className="s-row-title">Joindre un PDF</div>
              <div className="s-row-sub">Inclure la facture en pièce jointe dans l'e-mail client.</div>
            </div>
            <div className="s-row-aside"><Toggle on={attachPdf} onChange={setAttachPdf} /></div>
          </div>
          <div className="s-row">
            <div className="s-row-ico"><Icon name="shield-check" size={17} /></div>
            <div className="s-row-main">
              <div className="s-row-title">Pénalités de retard</div>
              <div className="s-row-sub">Appliquer 2 % de pénalité mensuelle aux factures impayées.</div>
            </div>
            <div className="s-row-aside"><Toggle on={lateFees} onChange={setLateFees} /></div>
          </div>
        </div>
      </div>
    </>
  );
}

/* ─── Payment Methods ───────────────────────────────────────────── */
function PaymentMethodsSection({ onSave }: { onSave: () => void }) {
  const [mtn, setMtn]     = useState(true);
  const [orange, setOrange] = useState(true);
  const [wave, setWave]   = useState(false);
  const [bank, setBank]   = useState(true);
  const [cash, setCash]   = useState(false);

  return (
    <div className="s-card">
      <div className="s-card-head">
        <div className="s-card-title">Moyens de paiement</div>
        <div className="s-card-desc">Les méthodes activées s'affichent sur la facture envoyée au client.</div>
      </div>
      <div className="s-card-body">
        <div className="s-row">
          <div className="s-row-ico"><Icon name="device-mobile" size={17} /></div>
          <div className="s-row-main"><div className="s-row-title">Mobile Money — MTN</div><div className="s-row-sub">Recevez les paiements sur votre compte MTN MoMo.</div></div>
          <div className="s-row-aside">
            <input className="form-input" style={{ width: 160 }} defaultValue="70 12 34 56" type="tel" />
            <Toggle on={mtn} onChange={setMtn} />
          </div>
        </div>
        <div className="s-row">
          <div className="s-row-ico"><Icon name="device-mobile" size={17} /></div>
          <div className="s-row-main"><div className="s-row-title">Mobile Money — Orange</div><div className="s-row-sub">Recevez les paiements sur votre compte Orange Money.</div></div>
          <div className="s-row-aside">
            <input className="form-input" style={{ width: 160 }} defaultValue="76 98 76 54" type="tel" />
            <Toggle on={orange} onChange={setOrange} />
          </div>
        </div>
        <div className="s-row">
          <div className="s-row-ico"><Icon name="wave" size={17} /></div>
          <div className="s-row-main"><div className="s-row-title">Wave</div><div className="s-row-sub">Acceptez les paiements par QR Wave et lien.</div></div>
          <div className="s-row-aside">
            <input className="form-input" style={{ width: 160 }} placeholder="Numéro Wave" type="tel" />
            <Toggle on={wave} onChange={setWave} />
          </div>
        </div>
        <div className="s-row">
          <div className="s-row-ico"><Icon name="building-bank" size={17} /></div>
          <div className="s-row-main"><div className="s-row-title">Virement bancaire</div><div className="s-row-sub">Ecobank · IBAN BF76 0001 2345 6789</div></div>
          <div className="s-row-aside">
            <button className="btn btn-sm" onClick={() => {}}>Modifier</button>
            <Toggle on={bank} onChange={setBank} />
          </div>
        </div>
        <div className="s-row">
          <div className="s-row-ico"><Icon name="cash" size={17} /></div>
          <div className="s-row-main"><div className="s-row-title">Espèces</div><div className="s-row-sub">Marquer les factures comme payées en espèces manuellement.</div></div>
          <div className="s-row-aside"><Toggle on={cash} onChange={setCash} /></div>
        </div>
      </div>
      <div className="s-card-foot"><button className="btn btn-primary" onClick={onSave}>Enregistrer</button></div>
    </div>
  );
}

/* ─── Providers ─────────────────────────────────────────────────── */
function ProvidersSection({ onSave }: { onSave: () => void }) {
  const [mode, setMode] = useState<'test' | 'live'>('live');
  const [reconAuto, setReconAuto] = useState(true);
  const [momoOn, setMomoOn] = useState(true);
  const [waveOn, setWaveOn] = useState(true);
  const [cardOn, setCardOn] = useState(true);
  const [bankOn, setBankOn] = useState(false);

  return (
    <>
      <div className="s-card">
        <div className="s-card-head" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 14 }}>
          <div>
            <div className="s-card-title">Prestataires de paiement</div>
            <div className="s-card-desc">Connectez un prestataire pour collecter les paiements en ligne via liens et QR codes.</div>
          </div>
          <div className="pv-mode">
            <button className={'pv-mode-opt' + (mode === 'test' ? ' active' : '')} onClick={() => setMode('test')}>Test</button>
            <button className={'pv-mode-opt' + (mode === 'live' ? ' active' : '')} onClick={() => setMode('live')}>Live</button>
          </div>
        </div>
        <div className="s-card-body">
          <div className="pv-intro">
            <div className="pv-intro-ico"><Icon name="bolt" size={18} /></div>
            <div>
              <div className="pv-intro-title">Un lien, toutes les méthodes locales</div>
              <div className="pv-intro-sub">Votre prestataire connecté alimente le checkout <b>billio.app/pay</b> — Mobile Money, Wave, carte et banque — et confirme les paiements automatiquement.</div>
            </div>
          </div>

          <div className="pv-connected-head">
            <div className="pv-logo pv-paystack">P</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="pv-conn-name">
                Paystack
                <span className="pv-conn-badge">
                  <Icon name="circle-check" size={12} /> {mode === 'live' ? 'Connecté' : 'Mode test'}
                </span>
              </div>
              <div className="pv-conn-meta">studiowend · connecté le 4 juin 2026 · règlement Ecobank •••6789</div>
            </div>
            <button className="icon-btn"><Icon name="dots" size={16} /></button>
          </div>

          <div className="pv-stats">
            <div className="pv-stat">
              <div className="pv-stat-label"><Icon name="credit-card" size={13} /> Collecté (juin)</div>
              <div className="pv-stat-val tnum">2,41M <small>XOF</small></div>
              <div className="pv-stat-sub">38 paiements</div>
            </div>
            <div className="pv-stat">
              <div className="pv-stat-label"><Icon name="clock-pause" size={13} /> Prochain virement</div>
              <div className="pv-stat-val tnum">486K <small>XOF</small></div>
              <div className="pv-stat-sub">Demain, J+1</div>
            </div>
            <div className="pv-stat">
              <div className="pv-stat-label"><Icon name="refresh" size={13} /> Auto-rapprochés</div>
              <div className="pv-stat-val">100<small>%</small></div>
              <div className="pv-stat-sub">38 sur 38 réconciliés</div>
            </div>
          </div>
        </div>
      </div>

      <div className="s-card">
        <div className="s-card-head">
          <div className="s-card-title">Méthodes &amp; frais</div>
          <div className="s-card-desc">Les méthodes activées apparaissent sur votre checkout. Les frais sont déduits par Paystack.</div>
        </div>
        <div className="s-card-body">
          <div className="pv-method-row">
            <div className="pv-m-ico pv-mi-momo"><Icon name="device-mobile" size={18} /></div>
            <div className="pv-m-main"><div className="pv-m-title">Mobile Money</div><div className="pv-m-sub">MTN MoMo · Orange Money</div></div>
            <div className="pv-m-fee">1,5 %</div>
            <Toggle on={momoOn} onChange={setMomoOn} />
          </div>
          <div className="pv-method-row">
            <div className="pv-m-ico pv-mi-wave"><Icon name="wave" size={18} /></div>
            <div className="pv-m-main"><div className="pv-m-title">Wave</div><div className="pv-m-sub">QR &amp; lien deep-link</div></div>
            <div className="pv-m-fee">1,0 %</div>
            <Toggle on={waveOn} onChange={setWaveOn} />
          </div>
          <div className="pv-method-row">
            <div className="pv-m-ico pv-mi-card"><Icon name="credit-card" size={18} /></div>
            <div className="pv-m-main"><div className="pv-m-title">Carte</div><div className="pv-m-sub">Visa · Mastercard · 3-D Secure</div></div>
            <div className="pv-m-fee">2,9 % + 100</div>
            <Toggle on={cardOn} onChange={setCardOn} />
          </div>
          <div className="pv-method-row">
            <div className="pv-m-ico pv-mi-bank"><Icon name="building-bank" size={18} /></div>
            <div className="pv-m-main"><div className="pv-m-title">Virement bancaire</div><div className="pv-m-sub">Pay-with-transfer · auto-vérifié</div></div>
            <div className="pv-m-fee">0,5 %</div>
            <Toggle on={bankOn} onChange={setBankOn} />
          </div>
        </div>
        <div className="s-card-foot"><button className="btn btn-primary" onClick={onSave}>Enregistrer</button></div>
      </div>

      <div className="s-card">
        <div className="s-card-head" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 14 }}>
          <div>
            <div className="s-card-title">Rapprochement automatique</div>
            <div className="s-card-desc">À chaque paiement réussi, Billio associe le montant à la facture et la marque payée.</div>
          </div>
          <Toggle on={reconAuto} onChange={setReconAuto} />
        </div>
        <div className="s-card-body">
          <div className="pv-flow">
            <div className="pv-flow-step"><span className="pv-fs-ico"><Icon name="device-mobile" size={14} /></span> Client paie</div>
            <Icon name="arrow-right" size={14} style={{ color: 'var(--color-text-tertiary)' }} />
            <div className="pv-flow-step"><span className="pv-fs-ico"><Icon name="bolt" size={14} /></span> Webhook</div>
            <Icon name="arrow-right" size={14} style={{ color: 'var(--color-text-tertiary)' }} />
            <div className="pv-flow-step"><span className="pv-fs-ico"><Icon name="link" size={14} /></span> Correspondance</div>
            <Icon name="arrow-right" size={14} style={{ color: 'var(--color-text-tertiary)' }} />
            <div className="pv-flow-step pv-flow-paid"><span className="pv-fs-ico"><Icon name="check" size={14} /></span> Payée</div>
          </div>

          <div className="pv-recon-head">
            <span className="pv-recon-label">Derniers rapprochements</span>
          </div>
          <div className="pv-recon-list">
            {[
              { inv: 'FAC-0010', client: 'Société Bâtir', amt: '1 200 000', time: "Aujourd'hui 09h14" },
              { inv: 'FAC-0012', client: 'Ouaga Tech',    amt: '960 000',   time: "Aujourd'hui 08h30" },
              { inv: 'FAC-0014', client: 'NoCode BF',     amt: '280 000',   time: '4 juin 11h02'      },
            ].map(r => (
              <div key={r.inv} className="pv-recon-item">
                <div className="pv-recon-dot"><Icon name="circle-check" size={15} /></div>
                <div className="pv-recon-main">
                  <div className="pv-recon-text"><b>{r.inv}</b> — {r.client}</div>
                  <div className="pv-recon-time">{r.time}</div>
                </div>
                <div className="pv-recon-amt">+{r.amt} XOF</div>
                <span className="pv-recon-badge">Réconcilié</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="s-card">
        <div className="s-card-head">
          <div className="s-card-title">Autres prestataires</div>
          <div className="s-card-desc">Changer ou ajouter un prestataire. Un seul peut alimenter votre checkout à la fois.</div>
        </div>
        <div className="s-card-body">
          <div className="pv-avail-grid">
            {[
              { name: 'Flutterwave', cls: 'pv-flutter', letter: 'F', sub: 'MoMo · carte · banque' },
              { name: 'Wave Business', cls: 'pv-wave-biz', letter: 'W', sub: 'Règlement Wave direct' },
              { name: 'Stripe', cls: 'pv-stripe', letter: 'S', sub: 'Cartes internationales' },
              { name: 'API personnalisée', cls: 'pv-custom', letter: 'A', sub: 'Custom / self-hosted' },
            ].map(p => (
              <div key={p.name} className="pv-avail-card">
                <div className={`pv-logo ${p.cls}`}>{p.letter}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="pv-avail-name">{p.name}</div>
                  <div className="pv-avail-sub">{p.sub}</div>
                </div>
                <button className="btn btn-sm">Connecter</button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

const AV_CLASSES = ['av-a', 'av-b', 'av-c', 'av-d', 'av-e', 'av-f'] as const;

const ROLE_LABELS: Record<string, string> = {
  owner:      'Propriétaire',
  admin:      'Administrateur',
  member:     'Membre',
  accountant: 'Comptable',
  observer:   'Observateur',
};

interface TeamMember {
  user_id:    string;
  role:       string;
  email:      string;
  first_name: string;
  last_name:  string;
  joined_at:  string;
}

interface PendingInvite {
  id:         string;
  token:      string;
  email:      string;
  role:       string;
  expires_at: string;
}

function memberInitials(m: TeamMember) {
  if (m.first_name || m.last_name)
    return `${m.first_name[0] ?? ''}${m.last_name[0] ?? ''}`.toUpperCase() || '?';
  return m.email.slice(0, 2).toUpperCase();
}

function memberName(m: TeamMember) {
  if (m.first_name || m.last_name) return `${m.first_name} ${m.last_name}`.trim();
  return m.email.split('@')[0];
}

const INVITE_ROLES = [
  { value: 'admin',      label: 'Administrateur' },
  { value: 'member',     label: 'Membre'         },
  { value: 'accountant', label: 'Comptable'      },
  { value: 'observer',   label: 'Observateur'    },
];

/* ─── Invite Modal ──────────────────────────────────────────────── */
interface InviteModalProps {
  orgId:   string;
  userId:  string;
  onClose: () => void;
  onDone:  (invite: PendingInvite) => void;
}

function InviteModal({ orgId, userId, onClose, onDone }: InviteModalProps) {
  const { showToast } = useApp();
  const [email,    setEmail]    = useState('');
  const [role,     setRole]     = useState('member');
  const [emailErr, setEmailErr] = useState(false);
  const [saving,   setSaving]   = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!/.+@.+\..+/.test(email.trim())) { setEmailErr(true); return; }
    setSaving(true);

    const token = crypto.randomUUID();
    const id    = crypto.randomUUID();

    const { error } = await supabase.from('pending_invitations').upsert(
      { id, token, org_id: orgId, email: email.toLowerCase().trim(), role, invited_by: userId || undefined },
      { onConflict: 'org_id,email', ignoreDuplicates: false }
    );

    setSaving(false);
    if (error) { showToast(error.message, true); return; }

    const invite: PendingInvite = {
      id,
      token,
      email: email.toLowerCase().trim(),
      role,
      expires_at: new Date(Date.now() + 7 * 86_400_000).toISOString(),
    };
    onDone(invite);
    showToast('Invitation créée');
  }

  // Close on Escape
  useEffect(() => {
    const fn = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', fn);
    return () => window.removeEventListener('keydown', fn);
  }, [onClose]);

  return (
    <div className="inv-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="inv-modal" role="dialog" aria-modal="true" aria-label="Inviter un membre">
        <div className="inv-modal-head">
          <div className="inv-modal-title">
            <Icon name="user-plus" size={17} />
            Inviter un membre
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="Fermer">
            <Icon name="x" size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          <div className="inv-modal-body">
            <div className="s-field">
              <label className="s-label">Adresse e-mail</label>
              <div className="input-wrap" style={{ position: 'relative' }}>
                <Icon name="mail" className="lead" size={15} ariaHidden />
                <input
                  className={`form-input${emailErr ? ' err' : ''}`}
                  style={{ paddingLeft: 34 }}
                  type="email"
                  placeholder="nom@entreprise.com"
                  value={email}
                  autoFocus
                  onChange={e => { setEmail(e.target.value); setEmailErr(false); }}
                />
              </div>
              {emailErr && <div className="s-hint" style={{ color: 'var(--color-danger)' }}>Adresse e-mail invalide.</div>}
            </div>

            <div className="s-field" style={{ marginBottom: 0 }}>
              <label className="s-label">Rôle</label>
              <select className="form-input" value={role} onChange={e => setRole(e.target.value)}>
                {INVITE_ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
              <div className="s-hint" style={{ marginTop: 6 }}>
                {role === 'admin'      && 'Peut gérer les factures, les clients et inviter des membres.'}
                {role === 'member'     && 'Peut créer et envoyer des factures.'}
                {role === 'accountant' && 'Accès en lecture aux rapports et aux paiements.'}
                {role === 'observer'   && 'Accès en lecture seule à tout le workspace.'}
              </div>
            </div>
          </div>

          <div className="inv-modal-foot">
            <button type="button" className="btn" onClick={onClose}>Annuler</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving
                ? 'Envoi…'
                : <><Icon name="send" size={14} /> Créer l'invitation</>
              }
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ─── Invite Link Row ───────────────────────────────────────────── */
interface InviteLinkRowProps {
  invite:    PendingInvite;
  index:     number;
  onRevoke:  (id: string) => void;
}

function InviteLinkRow({ invite, index, onRevoke }: InviteLinkRowProps) {
  const [copied, setCopied] = useState(false);
  const url = `${window.location.origin}/invite/${invite.token}`;

  function copy() {
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="s-team-row inv-link-row">
      <div className={`s-team-av ${AV_CLASSES[index % AV_CLASSES.length]}`} style={{ opacity: 0.45 }}>
        {invite.email[0]?.toUpperCase() ?? '?'}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="s-team-name">{invite.email}</div>
        <div className="inv-link-url" onClick={copy} title="Cliquer pour copier">{url}</div>
      </div>
      <span className="s-role-badge">{ROLE_LABELS[invite.role] ?? invite.role}</span>
      <button className={`btn btn-sm${copied ? ' btn-copied' : ''}`} onClick={copy}>
        {copied ? <><Icon name="check" size={13} /> Copié</> : <><Icon name="link" size={13} /> Copier</>}
      </button>
      <button className="icon-btn" title="Révoquer l'invitation" onClick={() => onRevoke(invite.id)}>
        <Icon name="trash" size={15} />
      </button>
    </div>
  );
}

/* ─── Team ──────────────────────────────────────────────────────── */
function TeamSection() {
  const { orgId, userId, showToast } = useApp();

  const [members,     setMembers]     = useState<TeamMember[]>([]);
  const [pending,     setPending]     = useState<PendingInvite[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [showInvite,  setShowInvite]  = useState(false);

  useEffect(() => {
    if (!orgId) return;
    Promise.all([
      supabase.rpc('get_org_team', { p_org_id: orgId }),
      supabase
        .from('pending_invitations')
        .select('id, token, email, role, expires_at')
        .eq('org_id', orgId)
        .eq('status', 'pending'),
    ]).then(([teamRes, invRes]) => {
      if (teamRes.error) console.warn('[settings] team fetch:', teamRes.error.message);
      else setMembers((teamRes.data as TeamMember[]) ?? []);
      if (invRes.error) console.warn('[settings] invites fetch:', invRes.error.message);
      else setPending((invRes.data as PendingInvite[]) ?? []);
      setLoading(false);
    });
  }, [orgId]);

  async function revokeInvite(id: string) {
    const { error } = await supabase.from('pending_invitations').delete().eq('id', id);
    if (error) { showToast(error.message, true); return; }
    setPending(prev => prev.filter(p => p.id !== id));
    showToast('Invitation révoquée');
  }

  return (
    <>
      {showInvite && orgId && (
        <InviteModal
          orgId={orgId}
          userId={userId}
          onClose={() => setShowInvite(false)}
          onDone={invite => { setPending(prev => [...prev, invite]); setShowInvite(false); }}
        />
      )}

      <div className="s-card">
        <div className="s-card-head" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div className="s-card-title">Membres de l'équipe</div>
            <div className="s-card-desc">Personnes ayant accès à ce workspace Billio.</div>
          </div>
          <button className="btn btn-sm btn-primary" onClick={() => setShowInvite(true)}>
            <Icon name="user-plus" size={14} /> Inviter
          </button>
        </div>
        <div className="s-card-body">
          {loading && <div style={{ color: 'var(--color-text-tertiary)', fontSize: 13, padding: '8px 0' }}>Chargement…</div>}
          {members.map((m, i) => {
            const isMe = m.user_id === userId;
            return (
              <div key={m.user_id} className="s-team-row">
                <div className={`s-team-av ${AV_CLASSES[i % AV_CLASSES.length]}`}>{memberInitials(m)}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="s-team-name">
                    {memberName(m)}
                    {isMe && <span style={{ color: 'var(--color-text-tertiary)', fontWeight: 400 }}> (vous)</span>}
                  </div>
                  <div className="s-team-email">{m.email}</div>
                </div>
                <span className={'s-role-badge' + (m.role === 'owner' ? ' owner' : '')}>
                  {ROLE_LABELS[m.role] ?? m.role}
                </span>
                <button className="icon-btn" disabled={isMe || m.role === 'owner'}>
                  <Icon name="dots" size={15} />
                </button>
              </div>
            );
          })}
        </div>
      </div>

      <div className="s-card">
        <div className="s-card-head" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div className="s-card-title">Invitations en attente</div>
            <div className="s-card-desc">Partagez le lien — votre collaborateur pourra créer son compte et rejoindre directement.</div>
          </div>
          {pending.length > 0 && (
            <span className="s-role-badge" style={{ fontVariantNumeric: 'tabular-nums' }}>{pending.length}</span>
          )}
        </div>
        <div className="s-card-body">
          {loading
            ? <div style={{ color: 'var(--color-text-tertiary)', fontSize: 13 }}>Chargement…</div>
            : pending.length === 0
              ? (
                <div className="inv-empty">
                  <Icon name="user-plus" size={22} />
                  <div className="inv-empty-title">Aucune invitation en attente</div>
                  <div className="inv-empty-sub">Cliquez sur <b>Inviter</b> pour générer un lien de rejoindre.</div>
                </div>
              )
              : pending.map((p, i) => (
                <InviteLinkRow key={p.id} invite={p} index={i} onRevoke={revokeInvite} />
              ))
          }
        </div>
      </div>
    </>
  );
}

/* ─── Plan ──────────────────────────────────────────────────────── */
function PlanSection() {
  return (
    <>
      <div className="s-card">
        <div className="s-card-head">
          <div className="s-card-title">Plan &amp; facturation</div>
          <div className="s-card-desc">Gérez votre abonnement et vos informations de paiement.</div>
        </div>
        <div className="s-card-body">
          <div className="s-plan-card">
            <div className="s-plan-badge"><Icon name="sparkles" size={22} /></div>
            <div style={{ flex: 1 }}>
              <div className="s-plan-name">Plan Pro</div>
              <div className="s-plan-price"><b>9 000 XOF</b> / mois · renouvellement le 6 juillet 2026</div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-sm">Changer</button>
              <button className="btn btn-sm" style={{ color: '#A32D2D' }}>Annuler</button>
            </div>
          </div>
          <div className="s-usage">
            <div className="s-usage-top"><span>Factures ce mois</span><span className="tnum">41 <span style={{ color: 'var(--color-text-tertiary)', fontWeight: 500 }}>/ illimité</span></span></div>
            <div className="s-bar-track"><div className="s-bar-fill" style={{ width: '41%' }} /></div>
          </div>
        </div>
        <div className="s-card-foot">
          <button className="btn"><Icon name="file-text" size={14} /> Historique de facturation</button>
        </div>
      </div>
      <div className="s-card s-danger-card">
        <div className="s-card-head">
          <div className="s-card-title" style={{ color: '#A32D2D' }}>Supprimer le workspace</div>
          <div className="s-card-desc">Supprime définitivement ce workspace et toutes les factures.</div>
        </div>
        <div className="s-card-foot" style={{ justifyContent: 'flex-start', background: 'var(--color-background-primary)', borderTop: 'none', paddingTop: 0 }}>
          <button className="btn" style={{ color: '#A32D2D', borderColor: 'var(--color-border-secondary)' }}>
            <Icon name="trash" size={14} /> Supprimer le workspace
          </button>
        </div>
      </div>
    </>
  );
}

/* ─── Main component ────────────────────────────────────────────── */
export default function SettingsPage() {
  const { showToast } = useApp();
  const [tab, setTab] = useState<SettingsTab>('profile');
  const onSave = () => showToast('Paramètres enregistrés');

  return (
    <div className="main">
      <div className="topbar">
        <div>
          <div className="page-title">Paramètres</div>
          <div className="page-sub">Gérez vos préférences de workspace et de facturation</div>
        </div>
        <button className="btn btn-primary" onClick={onSave}>
          <Icon name="check" size={15} /> Enregistrer
        </button>
      </div>

      <div className="content">
        <div className="s-grid">
          {/* Sub-nav */}
          <nav className="s-nav">
            {TABS.map(t => (
              <button
                key={t.key}
                className={'s-nav-item' + (tab === t.key ? ' active' : '')}
                onClick={() => setTab(t.key)}
              >
                <Icon name={t.icon} size={18} />
                {t.label}
              </button>
            ))}
          </nav>

          {/* Content */}
          <div className="s-col">
            {tab === 'profile'       && <ProfileSection />}
            {tab === 'business'      && <BusinessSection />}
            {tab === 'invoicing'     && <InvoicingSection />}
            {tab === 'payments'      && <PaymentMethodsSection onSave={onSave} />}
            {tab === 'providers'     && <ProvidersSection     onSave={onSave} />}
            {tab === 'team'          && <TeamSection />}
            {tab === 'plan'          && <PlanSection />}
            {(tab === 'reminders' || tab === 'notifications') && (
              <div className="s-card">
                <div className="s-card-body" style={{ color: 'var(--color-text-secondary)', textAlign: 'center', padding: '48px 20px' }}>
                  <div style={{ fontSize: 32, marginBottom: 12 }}>🚧</div>
                  <div style={{ fontWeight: 600 }}>Bientôt disponible</div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
