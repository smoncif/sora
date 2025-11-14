# 🎨 Neo-Brutalism Redesign - Role Analysis Page

## Vue d'ensemble

Refonte complète de la page d'analyse des rôles avec un design **Neo-Brutalism** moderne, inspiré par les terminaux modernes et les systèmes de data visualization.

## 🎯 Objectifs

- **Créer une identité visuelle unique** : Se démarquer des designs génériques "AI slop"
- **Améliorer la lisibilité** : Typographie distinctive et hiérarchie claire
- **Optimiser l'UX** : Workflow visuel avec progression claire
- **Animations fluides** : Micro-interactions et transitions engageantes
- **Performance** : Composants optimisés et réutilisables

## 🎨 Design System

### Palette de couleurs

```css
--primary: #FF6B35    /* Orange vif - accent énergique */
--secondary: #004E89  /* Bleu profond - confiance */
--accent: #F7B801     /* Jaune doré - highlights */
--success: #06D6A0    /* Vert cyan - succès */
--warning: #EF476F    /* Rose vif - attention */
--info: #00A8E8       /* Bleu clair - information */
```

### Typographie

- **Titres & Chiffres** : JetBrains Mono (monospace moderne, tech-forward)
- **Corps de texte** : IBM Plex Sans (lisible, professionnel, caractère unique)

### Caractéristiques visuelles

- **Bordures épaisses** (3-4px) avec coins arrondis subtils
- **Ombres dures** (pas de blur, décalage net)
- **Patterns géométriques** en arrière-plan
- **Animations CSS** performantes
- **Glassmorphism** pour la barre d'actions

## 📦 Composants

### 1. HeroHeader

Header principal avec métriques inline.

```tsx
import { HeroHeader, createMetric, MetricIcons } from 'lib/components/analysis/redesign';

<HeroHeader
  title="ANALYSE DES RÔLES MÉTIER"
  subtitle="Optimisation intelligente"
  metrics={[
    createMetric('RÔLES', 42, '#FF6B35', MetricIcons.Speed),
    createMetric('TRANSACTIONS', 1250, '#00A8E8', MetricIcons.Check),
  ]}
  loading={false}
/>
```

**Features:**
- Pattern géométrique en arrière-plan
- Métriques avec icônes et couleurs personnalisées
- Animations staggered au chargement
- Support des trends (optionnel)

### 2. WorkflowStep

Cartes de workflow avec numérotation et états.

```tsx
import { WorkflowStep } from 'lib/components/analysis/redesign';

<WorkflowStep
  stepNumber={1}
  title="Importer les données"
  description="Fichier Excel ou analyse sauvegardée"
  isActive={true}
  isCompleted={false}
  color="#FF6B35"
  delay={100}
>
  {/* Contenu de l'étape */}
</WorkflowStep>
```

**Features:**
- Badge numéroté avec états (actif, complété)
- Bordure colorée selon l'état
- Indicateur de statut en bas
- Animation au chargement avec delay

### 3. ProgressArrow

Flèche animée entre les étapes du workflow.

```tsx
import { ProgressArrow } from 'lib/components/analysis/redesign';

<ProgressArrow isActive={true} delay={200} />
```

**Features:**
- Cercle avec icône de flèche
- Animation pulse quand actif
- Ligne pointillée animée
- Rotation au hover

### 4. CompactStatsCard

Cartes de statistiques compactes et modernes.

```tsx
import { CompactStatsCard } from 'lib/components/analysis/redesign';

<CompactStatsCard
  label="RÔLES MÉTIER"
  value={42}
  icon={<BusinessIcon />}
  color="#FF6B35"
  trend={{ value: 12, label: 'vs mois dernier' }}
  delay={100}
/>
```

**Features:**
- Icône dans un badge carré
- Pattern géométrique en arrière-plan
- Support des trends
- État de chargement (skeleton)
- Hover effect avec lift

### 5. FloatingActionBar

Barre d'actions sticky en bas de page avec glassmorphism.

```tsx
import { FloatingActionBar, createAction, ActionIcons } from 'lib/components/analysis/redesign';

const actions = [
  createAction('Sauvegarder', ActionIcons.Save, handleSave),
  createAction('Exporter', ActionIcons.Export, handleExport, { color: 'secondary' }),
];

<FloatingActionBar actions={actions} visible={true} />
```

**Features:**
- Glassmorphism (backdrop blur)
- Boutons avec bordures épaisses
- Tooltips optionnels
- Responsive (wrap sur mobile)
- Transition slide-up

## 🎬 Animations

Toutes les animations sont définies dans `lib/styles/neoBrutalism.css` :

### Classes d'animation

```css
.neo-animate-slide-up    /* Slide from bottom */
.neo-animate-slide-left  /* Slide from left */
.neo-animate-slide-right /* Slide from right */
.neo-animate-fade        /* Fade in */
.neo-animate-scale       /* Scale + fade in */
```

### Delays

```css
.neo-delay-100  /* 100ms */
.neo-delay-200  /* 200ms */
.neo-delay-300  /* 300ms */
.neo-delay-400  /* 400ms */
.neo-delay-500  /* 500ms */
.neo-delay-600  /* 600ms */
```

### Exemple d'utilisation

```tsx
<Box className="neo-animate-slide-up neo-delay-200">
  {/* Contenu qui slide up avec 200ms de delay */}
</Box>
```

## 🛠️ Patterns CSS

### Backgrounds géométriques

```css
.neo-pattern-dots      /* Points réguliers */
.neo-pattern-grid      /* Grille */
.neo-pattern-diagonal  /* Lignes diagonales */
.neo-pattern-circuit   /* Circuit board style */
```

### Utility classes

```css
.neo-card              /* Carte avec bordure et ombre */
.neo-button            /* Bouton avec bordure et ombre */
.neo-badge             /* Badge avec bordure */
.neo-skeleton          /* Loading skeleton avec shimmer */
.neo-glow-primary      /* Glow effect primaire */
```

## 📱 Responsive

Les composants sont responsive par défaut :

- **Mobile** : Stack vertical, cartes pleine largeur
- **Tablet** : Grid 2 colonnes pour les stats
- **Desktop** : Layout complet avec workflow horizontal

Les breakpoints MUI sont utilisés :
```tsx
size={{ xs: 12, sm: 6, md: 3 }}
```

## 🚀 Utilisation

### 1. Importer le thème

Le thème Neo-Brutalism est disponible dans `lib/styles/themes/neoBrutalism.ts` :

```tsx
import { neoBrutalismLightTheme, neoBrutalismDarkTheme } from 'lib/styles/themes/neoBrutalism';
```

### 2. Importer les composants

```tsx
import {
  HeroHeader,
  WorkflowStep,
  ProgressArrow,
  CompactStatsCard,
  FloatingActionBar,
} from 'lib/components/analysis/redesign';
```

### 3. Utiliser les classes CSS

Les classes CSS sont automatiquement disponibles via `lib/styles/neoBrutalism.css` importé dans `app/layout.tsx`.

## 📄 Page de démonstration

Une page complète de démonstration est disponible :

```
/dashboard/analysis/roles-redesign
```

Cette page montre l'intégration complète de tous les composants redesignés.

## 🎯 Prochaines étapes

- [ ] Créer ResultCard compact pour l'affichage des résultats
- [ ] Tests de responsivité sur différents devices
- [ ] Optimisations de performance
- [ ] Tests d'accessibilité (WCAG)
- [ ] Documentation Storybook

## 📝 Notes

- Les fonts sont chargées via Next.js font optimization
- Les animations utilisent CSS pur pour de meilleures performances
- Le thème est compatible avec le mode sombre/clair
- Tous les composants sont TypeScript strict
- Les composants sont optimisés avec React.memo et useCallback

## 🤝 Contribution

Pour ajouter de nouveaux composants :

1. Créer un dossier dans `lib/components/analysis/redesign/`
2. Suivre la structure existante (composant + index.ts)
3. Utiliser les tokens CSS définis dans `neoBrutalism.css`
4. Ajouter les animations avec les classes existantes
5. Exporter depuis `lib/components/analysis/redesign/index.ts`

## 📚 Ressources

- [JetBrains Mono Font](https://www.jetbrains.com/lp/mono/)
- [IBM Plex Sans Font](https://www.ibm.com/plex/)
- [Neo-Brutalism Design](https://hype4.academy/articles/design/neo-brutalism-in-web-design)
- [Material-UI v7](https://mui.com/material-ui/)

