import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import Icon from '@/components/Icon';
import BillioMark from '@/components/BillioMark';

interface InviteDetails {
  org_name:   string;
  email:      string;
  role:       string;
  expires_at: string;
  status:     string;
}

const ROLE_LABELS: Record<string, string> = {
  owner:      'Propriétaire',
  admin:      'Administrateur',
  member:     'Membre',
  accountant: 'Comptable',
  observer:   'Observateur',
};


export default function InvitePage() {
  const { token } = useParams<{ token: string }>();
  const navigate  = useNavigate();

  const [invite,   setInvite]   = useState<InviteDetails | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [loading,  setLoading]  = useState(true);

  const [password,  setPassword]  = useState('');
  const [showPw,    setShowPw]    = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [authError,  setAuthError]  = useState('');
  const [confirmPending, setConfirmPending] = useState(false);

  useEffect(() => {
    if (!token) { setNotFound(true); setLoading(false); return; }
    supabase.rpc('get_invite_details', { p_token: token }).then(({ data, error }) => {
      if (error || !data || (data as InviteDetails[]).length === 0) {
        setNotFound(true);
      } else {
        const details = (data as InviteDetails[])[0];
        const expired = new Date(details.expires_at) < new Date();
        if (details.status !== 'pending' || expired) {
          setNotFound(true);
        } else {
          setInvite(details);
        }
      }
      setLoading(false);
    });
  }, [token]);

  async function handleAccept(e: React.FormEvent) {
    e.preventDefault();
    if (!invite || !token) return;
    setAuthError('');
    setSubmitting(true);

    try {
      // Try sign-in first (existing user accepting an invite)
      const { data: signInData, error: signInErr } = await supabase.auth.signInWithPassword({
        email: invite.email,
        password,
      });

      let userId: string | undefined;

      if (signInErr) {
        // New user — sign up
        const { data: signUpData, error: signUpErr } = await supabase.auth.signUp({
          email: invite.email,
          password,
        });
        if (signUpErr) throw signUpErr;

        if (!signUpData.session) {
          // Email confirmation required — user must confirm before the invite
          // can be accepted. The invite link remains valid after confirmation.
          setConfirmPending(true);
          setSubmitting(false);
          return;
        }

        userId = signUpData.user?.id;
      } else {
        userId = signInData.user?.id;
      }

      if (!userId) throw new Error('Impossible de récupérer l\'identifiant utilisateur.');

      const { error: acceptErr } = await supabase.rpc('accept_invitation', {
        p_token:   token,
        p_user_id: userId,
      });
      if (acceptErr) throw acceptErr;

      navigate('/dashboard');
    } catch (err: unknown) {
      setAuthError(err instanceof Error ? err.message : 'Une erreur est survenue.');
      setSubmitting(false);
    }
  }

  if (loading) return (
    <div className="auth-root">
      <div style={{ color: 'var(--color-text-tertiary)', fontSize: 14 }}>Chargement…</div>
    </div>
  );

  if (notFound) return (
    <div className="auth-root">
      <div className="auth-card" style={{ maxWidth: 420 }}>
        <section className="form-panel" style={{ borderRadius: 'inherit' }}>
          <div className="fp-inner">
            <div className="fp-eyebrow" style={{ color: 'var(--color-danger)' }}>Lien invalide</div>
            <div className="fp-title">Invitation introuvable</div>
            <div className="fp-sub">
              Ce lien d'invitation est invalide, a expiré ou a déjà été utilisé.
              Demandez à votre administrateur de vous envoyer un nouveau lien.
            </div>
            <button className="submit-btn" style={{ marginTop: 24 }} onClick={() => navigate('/login')}>
              Aller à la connexion <Icon name="arrow-right" ariaHidden />
            </button>
          </div>
        </section>
      </div>
    </div>
  );

  if (confirmPending) return (
    <div className="auth-root">
      <div className="auth-card" style={{ maxWidth: 420 }}>
        <section className="form-panel" style={{ borderRadius: 'inherit' }}>
          <div className="fp-inner">
            <div className="fp-eyebrow">Vérification requise</div>
            <div className="fp-title">Confirmez votre adresse e-mail</div>
            <div className="fp-sub">
              Un e-mail de confirmation a été envoyé à <strong>{invite!.email}</strong>.
              Cliquez sur le lien dans cet e-mail, puis revenez sur ce lien d'invitation pour rejoindre l'équipe.
            </div>
          </div>
        </section>
      </div>
    </div>
  );

  return (
    <div className="auth-root">
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
            <h2>Vous avez été invité !</h2>
            <p>
              Rejoignez l'espace <strong>{invite!.org_name}</strong> sur Billio pour créer
              et suivre des factures ensemble.
            </p>
            <div className="brand-features">
              <div className="bf">
                <span className="ck"><Icon name="check" /></span>
                Rôle : {ROLE_LABELS[invite!.role] ?? invite!.role}
              </div>
              <div className="bf">
                <span className="ck"><Icon name="check" /></span>
                Invité en tant que <strong>{invite!.email}</strong>
              </div>
              <div className="bf">
                <span className="ck"><Icon name="check" /></span>
                Expire le {new Date(invite!.expires_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
              </div>
            </div>
          </div>
        </aside>

        {/* Form panel */}
        <section className="form-panel">
          <div className="fp-inner">
            <div className="fp-eyebrow">Rejoindre {invite!.org_name}</div>
            <div className="fp-title">Créer votre compte</div>
            <div className="fp-sub">
              Choisissez un mot de passe pour accéder à votre espace de travail.
              Si vous avez déjà un compte Billio avec cette adresse, entrez votre mot de passe existant.
            </div>

            <form onSubmit={handleAccept} noValidate style={{ marginTop: 24 }}>
              <div className="field">
                <label className="field-label">Adresse e-mail</label>
                <div className="input-wrap">
                  <Icon name="mail" className="lead" ariaHidden />
                  <input
                    className="input"
                    type="email"
                    value={invite!.email}
                    readOnly
                    style={{ opacity: 0.7, cursor: 'not-allowed' }}
                  />
                </div>
              </div>

              <div className="field">
                <label className="field-label">Mot de passe</label>
                <div className="input-wrap">
                  <Icon name="lock" className="lead" ariaHidden />
                  <input
                    className="input"
                    type={showPw ? 'text' : 'password'}
                    placeholder="••••••••"
                    autoComplete="new-password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    autoFocus
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
              </div>

              {authError && (
                <div className="auth-error" role="alert">{authError}</div>
              )}

              <button className="submit-btn" type="submit" disabled={submitting || !password}>
                <span>{submitting ? 'Connexion en cours…' : 'Rejoindre l\'équipe'}</span>
                <Icon name="arrow-right" ariaHidden />
              </button>
            </form>

            <div className="fp-foot">
              <button className="link" onClick={() => navigate('/login')}>
                Connexion avec un compte existant
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
