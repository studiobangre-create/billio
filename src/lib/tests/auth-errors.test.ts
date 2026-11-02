import { describe, it, expect } from 'vitest';
import { authErrorMessage } from '@/lib/auth-errors';

describe('authErrorMessage', () => {
  it('translates common Supabase errors', () => {
    expect(authErrorMessage(new Error('Invalid login credentials'))).toBe('Email ou mot de passe incorrect.');
    expect(authErrorMessage(new Error('Email not confirmed'))).toMatch(/^Confirmez votre email/);
    expect(authErrorMessage(new Error('User already registered'))).toMatch(/^Un compte existe déjà/);
    expect(authErrorMessage(new Error('Password should be at least 6 characters.'))).toBe('Le mot de passe doit contenir au moins 6 caractères.');
    expect(authErrorMessage(new Error('Email rate limit exceeded'))).toMatch(/^Trop de tentatives/);
    expect(authErrorMessage(new Error('New password should be different from the old password.'))).toMatch(/^Choisissez un mot de passe différent/);
    expect(authErrorMessage(new TypeError('Failed to fetch'))).toMatch(/^Connexion impossible/);
  });

  it('explains password policy rejections', () => {
    expect(authErrorMessage(new Error('Password should contain at least one character of each: abcdefghijklmnopqrstuvwxyz, ABCDEFGHIJKLMNOPQRSTUVWXYZ, 0123456789.')))
      .toBe('Le mot de passe doit contenir au moins un caractère de chaque groupe : abcdefghijklmnopqrstuvwxyz, ABCDEFGHIJKLMNOPQRSTUVWXYZ, 0123456789.');
    expect(authErrorMessage(new Error('Password is known to be weak and easy to guess, please choose a different one.')))
      .toMatch(/^Ce mot de passe figure dans des fuites/);
  });

  it('falls back to a generic French message', () => {
    expect(authErrorMessage(new Error('Something odd'))).toBe('Une erreur est survenue. Veuillez réessayer.');
    expect(authErrorMessage(null)).toBe('Une erreur est survenue. Veuillez réessayer.');
    expect(authErrorMessage(new Error('Lien expiré'), 'Lien expiré')).toBe('Lien expiré');
  });
});
