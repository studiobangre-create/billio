/** Asks before a panel closes over input the user hasn't saved. */
export function confirmDiscard(dirty: boolean): boolean {
  return !dirty || window.confirm('Fermer sans enregistrer ? Les informations saisies seront perdues.');
}
