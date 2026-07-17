# Déployer FacturZen sur Vercel

Guide pas-à-pas, dans l'ordre réel. À la fin, l'app tourne sur Vercel avec une
base PostgreSQL, l'auth Google, les PDF et les crons.

> **Architecture** : Next.js 16 (App Router) · PostgreSQL via Prisma ·
> Auth.js v5 (Google) · PDF en runtime Node · fichiers sur Vercel Blob ·
> 3 crons Vercel. Une seule base (Postgres) en dev **et** en prod.

---

## Récapitulatif des variables d'environnement

| Variable | Requis | Où l'obtenir |
|---|---|---|
| `DATABASE_URL` | ✅ | Vercel → Storage → Postgres (§1) |
| `AUTH_SECRET` | ✅ | `npx auth secret` (§3) |
| `NEXT_PUBLIC_APP_URL` | ✅ | l'URL de prod, ex. `https://facturzen.vercel.app` |
| `CRON_SECRET` | ✅ | `openssl rand -hex 32` (§5) |
| `AUTH_GOOGLE_ID` | ➖ | Google Cloud Console (§4) — sinon connexion « bientôt » |
| `AUTH_GOOGLE_SECRET` | ➖ | Google Cloud Console (§4) — sinon connexion « bientôt » |
| `RESEND_API_KEY` | ➖ | [resend.com/api-keys](https://resend.com/api-keys) — sinon emails loggés |
| `EMAIL_FROM` | ➖ | Expéditeur Resend, ex. `FacturZen <notifications@votre-domaine.ch>` (défaut : test resend.dev) |
| `STRIPE_SECRET_KEY` | ➖ | [dashboard.stripe.com/apikeys](https://dashboard.stripe.com/apikeys) — sinon abonnement « bientôt » |
| `BLOB_READ_WRITE_TOKEN` | ➖ | Vercel → Storage → Blob (§6) — sinon upload logo désactivé |
| `ANTHROPIC_API_KEY` | ➖ | [console.anthropic.com](https://console.anthropic.com/settings/keys) — sinon devis IA masqué |

Une variable **requise** manquante fait échouer le build/boot avec un message
explicite (ex. `❌ AUTH_GOOGLE_SECRET manquante — voir DEPLOY.md §4`). Une
variable **optionnelle** manquante ne produit **jamais** de 500 : la
fonctionnalité se désactive proprement.

---

## 1. Créer la base PostgreSQL

1. Vercel → ton projet → onglet **Storage** → **Create Database**.
2. Choisis **Postgres** (Neon ou Prisma Postgres), région **Francfort (fra1)**
   (proche des utilisateurs suisses).
3. **Connecte** la base au projet : Vercel injecte automatiquement `DATABASE_URL`
   dans les variables d'environnement du projet.
4. Copie la valeur de `DATABASE_URL` (tu en as besoin à l'étape 2). Utilise l'URL
   **poolée** (« pooled ») si Neon en propose une.

---

## 2. Appliquer le schéma + seed (une fois)

Depuis ta machine, avec l'`DATABASE_URL` **de prod** :

```bash
# 1) Créer les tables (migrations)
DATABASE_URL="<url prod>" npx prisma migrate deploy

# 2) (Optionnel) Charger le compte démo « Léa Morand »
DATABASE_URL="<url prod>" npm run db:seed
```

> ⚠️ La migration initiale doit exister. Si le dossier `prisma/migrations/`
> est vide, génère-la **d'abord en local** contre ta base Postgres locale :
> ```bash
> npm run db:migrate -- --name init_postgres   # crée prisma/migrations/…
> ```
> puis commite le dossier `prisma/migrations/` avant de déployer.
>
> Le build **Vercel** applique désormais les migrations automatiquement :
> le script `vercel-build` exécute `prisma generate && prisma migrate deploy
> && next build`. Plus besoin de lancer la commande manuelle après chaque
> déploiement — elle ne sert qu'au tout premier setup (seed) ou en dépannage.
> Si une migration échoue, le build échoue : la prod reste sur la version
> précédente (comportement voulu). Le `npm run build` local, lui, ne migre
> jamais rien.

---

## 3. Générer les secrets et coller les variables

Génère les deux secrets :

```bash
npx auth secret          # → AUTH_SECRET
openssl rand -hex 32     # → CRON_SECRET
```

Vercel → **Settings → Environment Variables** → ajoute chaque variable du tableau
ci-dessus (au minimum les **4 requises**) pour l'environnement **Production**
(et **Preview** si tu veux tester les branches).

- `NEXT_PUBLIC_APP_URL` = l'URL exacte de ton déploiement (ex.
  `https://facturzen.vercel.app`), **sans slash final**.
- `AUTH_SECRET`, `CRON_SECRET` = les valeurs générées ci-dessus.
- `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET` = **optionnels** — voir étape 4. Sans
  eux, l'app se déploie ; la connexion affiche « bientôt disponible ».

> **Déploiement minimal** : `DATABASE_URL`, `AUTH_SECRET`, `NEXT_PUBLIC_APP_URL`,
> `CRON_SECRET` suffisent. Google n'est **pas** requis pour mettre en ligne.

---

## 4. Google Cloud Console (OAuth) — optionnel

Google est **optionnel au déploiement** : saute cette étape si tu ne peux pas
encore créer les identifiants — l'app tourne (landing + démo), la connexion
s'affiche en « bientôt ». Reviens ici quand tu es prêt.

> **✨ Activer la connexion Google** = ajouter les 2 variables `AUTH_GOOGLE_ID`
> et `AUTH_GOOGLE_SECRET` (local `.env` et/ou Vercel) puis **redéployer**. Aucun
> changement de code : le bouton Google réapparaît, l'état « bientôt » disparaît.

1. [console.cloud.google.com/apis/credentials](https://console.cloud.google.com/apis/credentials)
   → **Create Credentials → OAuth client ID → Web application**.
2. **Authorized redirect URIs** — déclare **exactement** ces deux URI :
   ```
   http://localhost:3000/api/auth/callback/google
   https://<votre-domaine-vercel>/api/auth/callback/google
   ```
   (remplace `<votre-domaine-vercel>` par ton domaine réel ; l'URI locale sert
   au dev.)
3. Copie le **Client ID** → `AUTH_GOOGLE_ID` et le **Client secret** →
   `AUTH_GOOGLE_SECRET` (local `.env` **et** Vercel).
4. Tant que l'app OAuth est en **mode Test** (écran de consentement) : **ajoute
   ton adresse email en « Test user »**, sinon Google refuse la connexion.

---

## 5. Crons (déjà configurés)

`vercel.json` déclare 3 tâches planifiées, toutes protégées par `CRON_SECRET`
(Vercel envoie `Authorization: Bearer $CRON_SECRET`) :

| Route | Heure (UTC) | Rôle |
|---|---|---|
| `/api/cron/reminders` | 07:00 | Relances de paiement dues |
| `/api/cron/demo-purge` | 03:00 | Purge des sandboxes démo expirées |
| `/api/cron/recurring` | 06:00 | Factures récurrentes (à venir) |

Rien à faire : les crons s'activent au déploiement dès que `CRON_SECRET` est
présent. Chaque route traite par lots et répond en < 10 s (limite hobby).

---

## 6. Uploads de fichiers (logo) — optionnel

Le filesystem Vercel est **éphémère** : le stockage local ne marche qu'en dev.
Pour activer l'upload de logo en prod :

1. Vercel → **Storage → Create → Blob**.
2. Connecte le store au projet → `BLOB_READ_WRITE_TOKEN` est injecté.
3. Redéploie. Sans ce token, l'upload de logo affiche « Stockage de fichiers
   non configuré » au lieu d'échouer — aucune 500.

---

## 6bis. Stripe — abonnements & paiement en ligne (optionnel)

Sans `STRIPE_SECRET_KEY`, tout dégrade proprement : Réglages → Abonnement gère
les plans/essais en interne, Réglages → Paiements propose le virement bancaire,
et aucun bouton mort n'apparaît. Pour activer Stripe :

1. **Clés** (Vercel → Env) : `STRIPE_SECRET_KEY`, puis pour les abonnements créez
   deux prix récurrents (24 / 49 CHF) dans Stripe → Products et collez
   `STRIPE_PRICE_INDEP` / `STRIPE_PRICE_STUDIO`.
2. **Webhook** : Stripe → Developers → Webhooks → endpoint
   `https://<domaine>/api/webhooks/stripe`, événements `checkout.session.completed`,
   `customer.subscription.updated`, `customer.subscription.deleted` → copiez le
   `whsec_...` dans `STRIPE_WEBHOOK_SECRET`.
3. **Stripe Connect** (paiement des factures) : activez Connect (comptes Express)
   dans le dashboard Stripe. Les utilisateurs connectent leur compte depuis
   Réglages → Paiements ; leurs clients paient depuis `/f/[token]`.
4. **Tester en local** :
   ```bash
   stripe listen --forward-to localhost:3000/api/webhooks/stripe
   ```
   copiez le `whsec_...` affiché dans `.env` (`STRIPE_WEBHOOK_SECRET`), puis payez
   une facture de test avec la carte `4242 4242 4242 4242`.

---

## 7. Redéployer et vérifier

Après avoir collé les variables : Vercel → **Deployments → Redeploy** (ou push).

Checklist de fumée une fois en ligne :

- [ ] `/` — la landing s'affiche.
- [ ] `/demo` — la sandbox se crée (dashboard de Léa peuplé).
- [ ] `/connexion` — « Continuer avec Google » connecte bien (redirect URI OK).
- [ ] Ouvrir une facture → **télécharger le PDF** (QR-facture suisse rendu).
- [ ] (si configuré) upload d'un logo dans Réglages.

---

## Développement local (rappel)

```bash
docker compose up -d          # Postgres local (ou une URL hébergée dans .env)
npm run db:migrate            # applique les migrations
npm run db:seed               # charge le compte démo Léa (optionnel)
npm run dev                   # http://localhost:3000
```

En local **sans** clés Google, `/connexion` propose un bouton **« Continuer en
mode développement »** (badge DEV) qui ouvre l'app complète avec un utilisateur
local `dev@facturzen.local` — pratique pour tester tout le parcours sans OAuth.
Ce raccourci n'existe **qu'en développement** (jamais en production).

Utilitaires : `npm run db:studio` (explorateur de base), `npm run db:deploy`
(migrations sans prompt).
