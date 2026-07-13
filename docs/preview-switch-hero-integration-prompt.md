# Prompt adapté — intégration du composant PreviewSwitchHero

Tu dois intégrer un composant React déjà fourni dans cette base Next.js en respectant la structure shadcn + Tailwind + TypeScript du projet.

Contexte du projet
- Framework : Next.js 16
- Styling : Tailwind CSS 4
- UI : shadcn-style components dans `components/ui`
- Utilitaires : `cn` via `lib/utils`
- Icônes : `lucide-react`
- Animation : `motion/react`

Objectif
- Ajouter le composant dans `components/ui/preview-switch-hero.tsx`
- Ajouter une version de démonstration dans `components/ui/preview-switch-hero-demo.tsx`
- Intégrer la démo sur la page d’accueil dans `app/page.tsx`

Palette à utiliser
- Dégradé principal : `linear-gradient(135deg, #05201f 0%, #003635 55%, #005a58 100%)`
- Couleur primaire : `#003635`
- Couleur d’accent : `#E2FFC2`

Instructions
1. Vérifier que la structure shadcn existe déjà.
2. Déterminer que les composants doivent aller dans `components/ui`.
3. Installer les dépendances manquantes si nécessaire : `motion`.
4. Utiliser `lucide-react` pour les icônes si besoin.
5. Adapter le composant visuellement à la palette fournie et à une esthétique de hero premium.
6. Intégrer le composant sans casser la page actuelle.
