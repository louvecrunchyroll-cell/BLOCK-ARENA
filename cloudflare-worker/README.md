# Worker Cloudflare — sessions et résultats de partie

Le client envoie les opérations de partie au Worker `tetrisw-xp`, configuré par `BLOCK_ARENA_WORKER_URL` dans `firebase-config.js`. Il vérifie le jeton Firebase ID du joueur, génère la graine serveur, rejoue les actions horodatées et enregistre le résultat dans Firestore avec une transaction. Le reçu idempotent, les XP de partie et de quête, le record d'une seule partie, l'état du Boost XP consommé et les récompenses Battle Pass sont sauvegardés ensemble. Les XP de quête ne reçoivent pas le bonus Boost XP.

Le Worker utilise le projet existant `tetris-862ae`; il ne crée pas de base Firebase et ne modifie pas les règles Firestore. Son secret `FIREBASE_SERVICE_ACCOUNT_JSON` doit contenir le JSON complet d'un compte de service de ce projet, et rester configuré dans Cloudflare; il ne doit jamais être ajouté au dépôt, au code client ou partagé. L'URL du Worker est publique; aucun jeton Firebase ou secret ne doit y être inclus. Si ce secret est absent ou invalide, le Worker refuse le démarrage avant toute écriture et renvoie un message de configuration explicite, sans exposer son contenu.

Le Worker est publié séparément du site. Les changements de code locaux ne deviennent actifs qu'après publication manuelle. Aucune commande de déploiement n'est lancée automatiquement. Pour remplacer un secret invalide, depuis ce dossier, `npx wrangler secret put FIREBASE_SERVICE_ACCOUNT_JSON` demande la valeur dans le terminal; fournir le contenu complet du fichier JSON téléchargé depuis Google Cloud, sans le copier dans le dépôt ou le chat, puis republier le Worker.

## Tests

Depuis ce dossier :

```powershell
npm test
```

Le test de partie vérifie le démarrage de session, la consommation d'un boost réel, les XP de quête sans double attribution et le reçu de résultat idempotent.

## Publication manuelle

Après vérification du projet Cloudflare et du secret existant, publie manuellement le Worker puis le site :

```powershell
npx wrangler deploy
Set-Location ..
firebase deploy --only hosting --project tetris-862ae
```

Ne publie pas les Cloud Functions Firebase pour ce parcours : leur déploiement exige le forfait Blaze. Les fonctions historiques liées au suivi des amis et à la synchronisation initiale du classement ne sont pas modifiées par ce Worker.
