// French messages for the Supabase Auth errors users actually hit.

const KNOWN: [RegExp, string | ((m: RegExpMatchArray) => string)][] = [
  [/invalid login credentials/i,          'Email ou mot de passe incorrect.'],
  [/email not confirmed/i,                'Confirmez votre email avant de vous connecter : ouvrez le lien reçu dans votre boîte mail.'],
  [/user already registered|already been registered/i, 'Un compte existe déjà avec cet email. Connectez-vous ou réinitialisez votre mot de passe.'],
  [/password should be at least (\d+)/i,  m => `Le mot de passe doit contenir au moins ${m[1]} caractères.`],
  [/password should contain at least one character of each:\s*(.+)/i, m => `Le mot de passe doit contenir au moins un caractère de chaque groupe : ${m[1].trim().replace(/\.$/, '')}.`],
  [/password is known to be weak|pwned|leaked/i, 'Ce mot de passe figure dans des fuites de données connues. Choisissez-en un autre.'],
  [/should be different from the old password/i, 'Choisissez un mot de passe différent de l\'ancien.'],
  [/unable to validate email address|invalid format|email address .* is invalid/i, 'Adresse email invalide.'],
  [/rate limit|too many requests|security purposes/i, 'Trop de tentatives. Réessayez dans quelques minutes.'],
  [/failed to fetch|network/i,            'Connexion impossible. Vérifiez votre connexion internet et réessayez.'],
];

/** `fallback` is shown for unrecognised errors (e.g. a message the app wrote itself). */
export function authErrorMessage(err: unknown, fallback = 'Une erreur est survenue. Veuillez réessayer.'): string {
  const raw = err instanceof Error ? err.message : typeof err === 'string' ? err : '';
  for (const [re, fr] of KNOWN) {
    const m = raw.match(re);
    if (m) return typeof fr === 'string' ? fr : fr(m);
  }
  return fallback;
}
