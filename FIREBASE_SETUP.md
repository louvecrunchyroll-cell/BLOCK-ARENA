# Données joueur Firebase

L’application conserve Firebase Authentication (Google et e-mail/mot de passe) et Firestore dans le projet existant `tetris-862ae`. Les pages chargent le SDK Web Firebase compat. Les données joueur sont toujours adressées par l’UID de `auth.currentUser`; aucun compte ni document joueur n’est supprimé par le code de migration. Le démarrage et la validation des parties utilisent le Worker Cloudflare `tetrisw-xp`, afin de rester sur le forfait Firebase Spark. Aucun déploiement n’est effectué automatiquement.

## Ce qui est persisté aujourd’hui

- `players/{uid}` : pseudo, e-mail, XP totale, niveau, lignes, crédits, statistiques, progression Battle Pass existante et horodatages.
- `players/{uid}/processedGames/{gameId}` : reçus des parties, écrits dans la même transaction que le profil pour éviter les doubles soumissions.
- `players/{uid}/quests/progress` : statistiques, étapes terminées, étapes récompensées et XP de quêtes; lecture réservée au propriétaire et écriture exclusivement serveur.
- `players/{uid}/preferences/current` : skin/musique équipés et paramètres de jeu.
- `players/{uid}/inventory/{itemId}` : récompenses cosmétiques gagnées et persistées dans le casier.
- `players/{uid}/battlePassSeasons/season-1` et `rewards/{niveau}` : niveaux de crédits déjà attribués et reçus idempotents.
- `players/{uid}/friends/{otherUid}`, `blocked/{otherUid}`, `friendRequestsSent/{otherUid}` et `friendRequestsReceived/{otherUid}` : relations et demandes; l’acceptation écrit les deux côtés et les deux demandes dans une transaction.
- `publicProfiles/{uid}` et `usernames/{pseudo}` : découverte de joueurs.
- `leaderboards/{board}/entries/{uid}` : lecture seulement côté client. Les règles refusent au client de fabriquer une entrée.

Les nouveaux profils sont créés transactionnellement dans Firestore sous `players/{auth.uid}` avec 0 XP et 0 crédit. Si un ancien document `users/{uid}` existe, sa progression et son solde valide sont repris au lieu d’être remis à zéro; le document historique n’est pas supprimé. Une valeur historique incohérente fait échouer la création avec une erreur plutôt que d’être écrasée.

Pour une partie, le Worker `/game/start` crée la session et consomme un Boost XP uniquement s’il est réellement sélectionné et disponible. `/game/submit` rejoue les actions, puis enregistre dans une transaction le reçu idempotent, les XP, les statistiques, les récompenses Battle Pass et les étapes de quêtes atteintes. Les XP des quêtes ne reçoivent pas le bonus Boost XP. Le Worker vérifie le jeton Firebase ID du joueur avant d’accéder à Firestore avec son secret de service; le navigateur n’écrit pas les résultats de partie ni la progression des quêtes. Les règles Firestore existantes ne sont pas modifiées.

Les cadeaux restent désactivés dans la Boutique. Leur quête affiche explicitement que le suivi n’est pas disponible et ne progresse pas tant qu’un véritable envoi réussi ne peut pas être vérifié. Le classement conserve son meilleur nombre de lignes sur une seule partie; la quête de lignes cumulées utilise un compteur indépendant.

**Limite de déploiement :** le site et le Worker doivent tous deux avoir une version publiée contenant les changements. Firebase Cloud Functions nécessite le forfait Blaze; elles ne sont pas utilisées pour démarrer ou valider les parties. Le Worker nécessite le secret Cloudflare `FIREBASE_SERVICE_ACCOUNT_JSON` et son URL publique, définie dans `firebase-config.js`. Ne jamais copier ce secret dans le dépôt ou le navigateur. Les déclencheurs Cloud Functions historiques des quêtes d’amis et la synchronisation initiale du classement ne sont pas remplacés par ce changement.

Les XP sont attribués à chaque pièce posée et aux lignes effacées. Quitter avant la pose de la première pièce rapporte donc légitimement 0 XP; ce résultat à 0 XP est tout de même confirmé et comptabilisé. Une partie courte n’est plus rejetée uniquement parce qu’elle a duré moins de trois secondes.

## Fonctionnalités qui ne sont pas encore des opérations réelles

- Boutique : cinq emplacements provisoires numérotés (quatre skins de bloc et une musique) affichent les prix indiqués et changent d’ordre chaque lundi à 00:00 UTC. Le compte à rebours suit jours/heures/minutes/secondes. Les boutons Acheter et Cadeau sont affichés mais désactivés tant que les visuels/effets des articles, l’acquisition des crédits et les opérations transactionnelles ne sont pas implémentés. Aucun débit de crédit ou achat n’est effectué.
- Remboursements et débit de crédits : aucun achat réel n’est traité par l’application.
- Récompenses Battle Pass Saison 1 : 100 crédits à chaque niveau multiple de 4, 20 skins aux niveaux 5, 10, …, 100, et boosts XP aux niveaux configurés. À la connexion, le client lit le XP existant puis récupère les récompenses manquantes par transactions Firestore; les règles vérifient les seuils de XP. Les documents déjà présents et l’historique des crédits sont conservés. Une récompense déjà enregistrée n’est jamais recréée, une récompense future ne peut pas être réclamée, et un rattrapage répété ne crédite pas deux fois. Le casier se met à jour depuis l’écoute Firestore.
- Aucun déblocage de musique ou de couleur n’est défini dans la configuration actuelle du Battle Pass; aucun objet ou crédit supplémentaire n’est créé.
- Les règles historiques autorisent encore au propriétaire une mise à jour structurellement valide de son propre XP et de ses reçus `processedGames`; elles ne constituent pas une preuve de partie. Le client de jeu utilise maintenant les callables pour ses parties, et les XP de quête sont exclusivement calculés depuis les événements validés par le serveur. Les quêtes ne peuvent pas être avancées en écrivant directement dans Firestore. Le chemin historique ne permet ni l’écriture sur le profil d’un autre UID ni la modification directe des crédits.
- Classement : les fonctions de validation et de synchronisation mettent à jour la ligne du classement mondial; les amis et les autres écrans de classement restent inchangés.

Les achats et leurs journaux (`purchases/{purchaseId}` et `creditTransactions/{transactionId}`) ne sont pas activés. Les règles refusent les écritures client sur les achats; seules les réclamations Battle Pass éligibles peuvent écrire les documents de récompense définis.

## Configuration et publication manuelle

1. Dans Firebase Authentication, active Google et, si nécessaire, Email/Password; autorise les domaines HTTPS du jeu.
2. Vérifie que le projet Firebase est `tetris-862ae` et que Firestore est initialisé.
3. Vérifie dans Cloudflare que le Worker `tetrisw-xp` possède le secret `FIREBASE_SERVICE_ACCOUNT_JSON` et que ses origines autorisées comprennent les domaines du jeu.
4. Après vérification et tests, publie manuellement le Worker et les pages statiques (sans fonctions ni règles) :

   ```powershell
   Set-Location .\cloudflare-worker
   npx wrangler deploy
   Set-Location ..
   firebase deploy --only hosting --project tetris-862ae
   ```

Ces commandes ne sont pas exécutées automatiquement. Le site et le Worker doivent être publiés manuellement pour que la correction soit active en production.

## Vérification requise sur Firebase

Pour tester les règles sans modifier le projet réel, avec un JDK 21 ou ultérieur installé :

```powershell
firebase emulators:exec --only firestore --project demo-block-arena "npm --prefix functions run test:rules"
```

Les tests couvrent les 70 étapes et leurs récompenses, l’idempotence, le calcul du record sur une seule partie, la confidentialité des quêtes, le refus des écritures client, ainsi que les règles Firestore des fonctions déjà présentes. Les tests Worker vérifient également la création de session, la consommation d’un boost, le rejeu de partie et l’attribution unique des XP. Pour une validation réelle, après publication manuelle du Worker et du site, depuis le domaine HTTPS :

1. confirmer `auth.currentUser.uid`;
2. vérifier le profil `players/{uid}` et conserver les crédits/inventaire préexistants;
3. vérifier qu’un compte sous le niveau requis ne reçoit rien, qu’au niveau exact il obtient la récompense et qu’un niveau dépassé récupère tous les paliers manquants;
4. vérifier les 20 skins, les 100 crédits à chaque multiple de 4 et l’absence de doublons;
5. actualiser/reconnecter sur PC et Safari iPhone, puis changer d’appareil et vérifier que le casier, le solde et les reçus restent identiques;
6. vérifier que les XP de quête ne sont accordés qu’aux seuils confirmés par les fonctions serveur, et que les étapes terminées restent présentes après reconnexion.

Les tests automatisés ne remplacent pas une validation avec un compte connecté sur le site. Aucun test d’écriture/relecture sur le projet Firebase réel n’a été réalisé depuis cet environnement.

Firestore conserve les documents tant qu’ils ne sont pas supprimés, mais cela ne constitue pas une sauvegarde indépendante ni une garantie de conservation à perpétuité. Les exports/sauvegardes automatiques doivent être vérifiés séparément dans la console et peuvent nécessiter une facturation; aucune configuration de sauvegarde n’a été activée.
