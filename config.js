/* Accès direct sans authentification. Configuration publique uniquement.
   Ne jamais mettre de clé secrète dans ce fichier.
   Voir CONFIGURATION.md pour le futur paiement sans compte. */
window.ELAN_CONFIG = Object.freeze({
  priceXof: 2000,
  paymentEnabled: false,
  trialExportEnabled: true
});
