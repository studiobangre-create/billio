import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from '../components/Icon';
import { supabase } from '../lib/supabase';
import BillioMark from '../components/BillioMark';

interface Props {
  onDone: () => void;
}

export default function ResetPasswordPage({ onDone }: Props) {
  const navigate = useNavigate();
  const [password,  setPassword]  = useState('');
  const [confirm,   setConfirm]   = useState('');
  const [showPw,    setShowPw]    = useState(false);
  const [loading,   setLoading]   = useState(false);
  const [done,      setDone]      = useState(false);
  const [errors,    setErrors]    = useState<Record<string, string>>({});
  const [apiError,  setApiError]  = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setApiError('');

    const newErrors: Record<string, string> = {};
    if (password.length < 8)       newErrors.password = 'Au moins 8 caractères.';
    if (password !== confirm)       newErrors.confirm  = 'Les mots de passe ne correspondent pas.';
    if (Object.keys(newErrors).length) { setErrors(newErrors); return; }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (error) { setApiError(error.message); return; }

    setDone(true);
    setTimeout(() => { onDone(); navigate('/dashboard'); }, 2000);
  }

  return (
    <div className="auth-root">
      <h1 className="sr-only">Billio — réinitialisation du mot de passe</h1>
      <div className="auth-card">

        {/* Brand panel */}
        <aside className="brand-panel">
          <div className="brand-logo">
            <div className="mark"><BillioMark /></div>
            <div>
              <div className="name">Billio</div>
              <div className="tag">Facturation</div>
            </div>
          </div>
          <div className="brand-head">
            <h2>Choisissez un nouveau mot de passe.</h2>
            <p>Votre identité a été vérifiée. Définissez un mot de passe fort pour sécuriser votre espace Billio.</p>
            <div className="brand-features">
              <div className="bf"><span className="ck"><Icon name="check" /></span>Au moins 8 caractères</div>
              <div className="bf"><span className="ck"><Icon name="check" /></span>Majuscules et chiffres recommandés</div>
              <div className="bf"><span className="ck"><Icon name="check" /></span>Ne réutilisez pas un ancien mot de passe</div>
            </div>
          </div>
          <div className="mini-invoice">
            <div className="dot" aria-hidden="true"><Icon name="circle-check-filled" /></div>
            <div>
              <div className="mi-top">Identité vérifiée</div>
              <div className="mi-sub">Lien de réinitialisation valide</div>
            </div>
            <div className="mi-amt" style={{ color: 'var(--tofee-green, #22c55e)', fontSize: 13 }}>✓ OK</div>
          </div>
        </aside>

        {/* Form panel */}
        <section className="form-panel">
          <div className="fp-inner">
            {done ? (
              <>
                <div className="fp-eyebrow">Succès</div>
                <div className="fp-title">Mot de passe mis à jour</div>
                <div className="fp-sub">Votre mot de passe a été modifié. Vous allez être redirigé vers votre tableau de bord…</div>
                <div style={{ marginTop: 32, display: 'flex', justifyContent: 'center' }}>
                  <Icon name="circle-check-filled" />
                </div>
              </>
            ) : (
              <>
                <div className="fp-eyebrow">Sécurité</div>
                <div className="fp-title">Nouveau mot de passe</div>
                <div className="fp-sub">Choisissez un mot de passe fort d'au moins 8 caractères.</div>

                <form onSubmit={handleSubmit} noValidate style={{ marginTop: 24 }}>

                  <div className="field">
                    <label className="field-label">Nouveau mot de passe</label>
                    <div className="input-wrap">
                      <Icon name="lock" className="lead" ariaHidden />
                      <input
                        className={`input${errors.password ? ' err' : ''}`}
                        type={showPw ? 'text' : 'password'}
                        placeholder="••••••••"
                        autoComplete="new-password"
                        value={password}
                        onChange={e => { setPassword(e.target.value); setErrors(p => ({ ...p, password: '' })); }}
                      />
                      <button
                        className="pw-toggle"
                        type="button"
                        aria-label={showPw ? 'Masquer' : 'Afficher'}
                        onClick={() => setShowPw(v => !v)}
                      >
                        <Icon name={showPw ? 'eye-off' : 'eye'} ariaHidden />
                      </button>
                    </div>
                    {errors.password && <div className="field-err">{errors.password}</div>}
                  </div>

                  <div className="field">
                    <label className="field-label">Confirmer le mot de passe</label>
                    <div className="input-wrap">
                      <Icon name="lock" className="lead" ariaHidden />
                      <input
                        className={`input${errors.confirm ? ' err' : ''}`}
                        type={showPw ? 'text' : 'password'}
                        placeholder="••••••••"
                        autoComplete="new-password"
                        value={confirm}
                        onChange={e => { setConfirm(e.target.value); setErrors(p => ({ ...p, confirm: '' })); }}
                      />
                    </div>
                    {errors.confirm && <div className="field-err">{errors.confirm}</div>}
                  </div>

                  {apiError && <div className="auth-error" role="alert">{apiError}</div>}

                  <button className="submit-btn" type="submit" disabled={loading}>
                    <span>{loading ? 'Enregistrement…' : 'Définir le nouveau mot de passe'}</span>
                    <Icon name="arrow-right" ariaHidden />
                  </button>
                </form>

                <div className="fp-foot">
                  <button className="link" onClick={() => navigate('/login')}>
                    Retour à la connexion
                  </button>
                </div>
              </>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
