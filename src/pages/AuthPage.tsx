import { useState } from 'react';
import Icon from '../components/Icon';
import { supabase } from '../lib/supabase';
import BillioMark from '../components/BillioMark';

const MOCK = import.meta.env.VITE_MOCK_AUTH === 'true';

type AuthMode = 'login' | 'signup';

const COUNTRIES = ['Burkina Faso', 'Mali', "Côte d'Ivoire", 'Sénégal', 'Niger'];

interface AuthPageProps {
  onLogin?: () => void; // used in mock mode; real mode relies on onAuthStateChange
}

export default function AuthPage({ onLogin }: AuthPageProps = {}) {
  const [mode, setMode] = useState<AuthMode>('login');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, boolean>>({});
  const [authError, setAuthError] = useState('');
  const [resetSent, setResetSent] = useState(false);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [country, setCountry] = useState(COUNTRIES[0]);

  const isSignup = mode === 'signup';

  const clearError = (field: string) =>
    setErrors(prev => ({ ...prev, [field]: false }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');

    const newErrors: Record<string, boolean> = {};
    if (!email.trim()) newErrors.email = true;
    if (!password.trim()) newErrors.password = true;
    if (Object.keys(newErrors).some(k => newErrors[k])) {
      setErrors(newErrors);
      return;
    }

    setLoading(true);
    try {
      if (MOCK) {
        onLogin?.();
        return;
      }
      if (isSignup) {
        const { error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { data: { country } },
        });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error) throw error;
      }
      onLogin?.();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Une erreur est survenue.';
      setAuthError(msg);
      setLoading(false);
    }
  };

  const switchMode = (next: AuthMode) => {
    setMode(next);
    setErrors({});
    setLoading(false);
  };

  return (
    <div className="auth-root">
      <h1 className="sr-only">Billio — connexion ou création de compte</h1>
      <div className="auth-card">
        {/* Panneau marque */}
        <aside className="brand-panel">
          <div className="brand-logo">
            <div className="mark"><BillioMark /></div>
            <div>
              <div className="name">Billio</div>
              <div className="tag">Facturation</div>
            </div>
          </div>

          <div className="brand-head">
            <h2>La facturation qui accélère vos paiements.</h2>
            <p>Créez, envoyez et suivez vos factures en quelques minutes — Mobile Money, relances et rapports inclus.</p>
            <div className="brand-features">
              <div className="bf">
                <span className="ck"><Icon name="check" /></span>
                Mobile Money &amp; virements bancaires
              </div>
              <div className="bf">
                <span className="ck"><Icon name="check" /></span>
                Relances automatiques de paiement
              </div>
              <div className="bf">
                <span className="ck"><Icon name="check" /></span>
                Rapports de revenus en temps réel
              </div>
            </div>
          </div>

          <div className="mini-invoice">
            <div className="dot" aria-hidden="true">
              <Icon name="circle-check-filled" />
            </div>
            <div>
              <div className="mi-top">#FAC-0040 payée</div>
              <div className="mi-sub">Sahel Banque · à l'instant</div>
            </div>
            <div className="mi-amt">1,2M F CFA</div>
          </div>
        </aside>

        {/* Panneau formulaire */}
        <section className="form-panel">
          <div className="fp-inner">
            <div className="fp-eyebrow">{isSignup ? 'Commencer' : 'Bon retour'}</div>
            <div className="fp-title">{isSignup ? 'Créer votre compte' : 'Connexion à Billio'}</div>
            <div className="fp-sub">
              {isSignup
                ? 'Lancez votre facturation en quelques minutes — sans carte requise.'
                : 'Saisissez vos identifiants pour accéder à votre espace.'}
            </div>

            <form onSubmit={handleSubmit} noValidate style={{ marginTop: 24 }}>

              <div className="field">
                <label className="field-label">Adresse e-mail</label>
                <div className="input-wrap">
                  <Icon name="mail" className="lead" ariaHidden />
                  <input
                    className={`input${errors.email ? ' err' : ''}`}
                    type="email"
                    placeholder="vous@entreprise.com"
                    autoComplete="email"
                    value={email}
                    onChange={e => { setEmail(e.target.value); clearError('email'); }}
                  />
                </div>
              </div>

              <div className="field">
                <label className="field-label">Mot de passe</label>
                <div className="input-wrap">
                  <Icon name="lock" className="lead" ariaHidden />
                  <input
                    className={`input${errors.password ? ' err' : ''}`}
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    autoComplete={isSignup ? 'new-password' : 'current-password'}
                    value={password}
                    onChange={e => { setPassword(e.target.value); clearError('password'); }}
                  />
                  <button
                    className="pw-toggle"
                    type="button"
                    aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                    onClick={() => setShowPassword(v => !v)}
                  >
                    <Icon name={showPassword ? 'eye-off' : 'eye'} ariaHidden />
                  </button>
                </div>
              </div>

              {isSignup && (
                <div className="field">
                  <label className="field-label">Pays</label>
                  <select
                    className="input"
                    value={country}
                    onChange={e => setCountry(e.target.value)}
                  >
                    {COUNTRIES.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
              )}

              {!isSignup && (
                <div className="opts-row">
                  <label className="checkbox">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={e => setRememberMe(e.target.checked)}
                    />
                    Se souvenir de moi
                  </label>
                  <button
                    type="button"
                    className="link"
                    onClick={async () => {
                      if (!email.trim()) { setErrors(e => ({ ...e, email: true })); return; }
                      setAuthError('');
                      setResetSent(false);
                      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
                        redirectTo: `${window.location.origin}/reset-password`,
                      });
                      if (error) { setAuthError(error.message); return; }
                      setResetSent(true);
                    }}
                  >
                    Mot de passe oublié ?
                  </button>
                </div>
              )}

              {resetSent && (
                <div className="auth-success" role="status">
                  <Icon name="check" ariaHidden /> E-mail envoyé — vérifiez votre boîte de réception.
                </div>
              )}

              {authError && (
                <div className="auth-error" role="alert">{authError}</div>
              )}

              <button className="submit-btn" type="submit" disabled={loading}>
                <span>
                  {loading
                    ? (isSignup ? 'Création en cours…' : 'Connexion en cours…')
                    : (isSignup ? 'Créer le compte' : 'Se connecter')}
                </span>
                <Icon name="arrow-right" ariaHidden />
              </button>
            </form>

            <div className="fp-foot">
              {isSignup ? (
                <>Vous avez déjà un compte ?{' '}
                  <button className="link" onClick={() => switchMode('login')}>Se connecter</button>
                </>
              ) : (
                <>Nouveau sur Billio ?{' '}
                  <button className="link" onClick={() => switchMode('signup')}>Créer un compte</button>
                </>
              )}
            </div>

            {isSignup && (
              <div className="fp-terms">
                En créant un compte, vous acceptez les{' '}
                <a href="#">Conditions d'utilisation</a> et la{' '}
                <a href="#">Politique de confidentialité</a> de Billio.
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
