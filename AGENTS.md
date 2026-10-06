# texte-en-voix

Application **100% front-end** de synthèse vocale **sans IA et sans
synthétiseur**. L'utilisateur saisit un texte ; pour chaque mot, l'app interroge
le **Wiktionnaire francophone**, récupère les enregistrements audio disponibles
(modèle `{{écouter}}`), choisit de préférence un **accent vosgien ou
québécois**, puis lit la phrase comme une succession de ces enregistrements.
Interface en **français**, une seule page simple et accueillante. Partage la
stack et les conventions de `hide-words`.

---

## Stack technique

| Outil | Usage |
|---|---|
| React 19 + TypeScript | UI |
| Node 22 ou 24 (LTS) | Vitest 5 ne supporte pas les versions impaires (25) |
| Vite | Build / dev server (port **9999**) |
| Tailwind CSS v4 | Styles (via `@tailwindcss/vite`, pas de config JS) |
| Vitest + Testing Library | Tests unitaires et composants |
| Prettier | Formatage |
| ESLint (typescript-eslint) | Linting |
| Knip | Détection des fichiers / exports / dépendances inutilisés |

---

## Arborescence

```
src/
├── lib/                      # Logique pure, zéro React (entièrement testée)
│   ├── tokenize.ts           # tokenize : texte -> mots (titres Wiktionnaire)
│   └── pronunciations.ts     # parsePronunciations / pickPronunciation
├── App.tsx                   # UI (saisie, liste des mots)
├── main.tsx                  # Point d'entrée
├── index.css                 # Import Tailwind
└── vite-env.d.ts             # Types Vite
public/
└── favicon.svg               # Favicon
tests/
├── setup.ts                  # Setup Testing Library (jest-dom)
├── unit/                     # Vitest - un fichier de test par module de src/lib/
└── component/                # Vitest + Testing Library (App)
```

---

## Le concept, en détail

- **Découpage** (`src/lib/tokenize.ts`) : mots en minuscules, apostrophes et
  traits d'union internes conservés, apostrophe droite convertie en `’` (forme
  utilisée par les titres du Wiktionnaire).
- **Prononciations** (`src/lib/pronunciations.ts`) : `parsePronunciations` lit
  le wikitexte d'une page et extrait chaque `{{écouter|<lieu>|<API>|audio=...|lang=fr}}`
  (paramètres positionnels : lieu puis API, ordre des nommés libre).
  `pickPronunciation` préfère un lieu vosgien ou québécois, sinon le premier.
- **API Wiktionnaire** (à venir) : `https://fr.wiktionary.org/w/api.php` avec
  `action=query&prop=revisions&rvprop=content&rvslots=main&formatversion=2&origin=*`.
  `origin=*` active le CORS anonyme ; `titles` accepte jusqu'à 50 mots par appel.
- **Audio** (à venir) : URL réelle du fichier via l'API Commons
  (`prop=imageinfo&iiprop=url`). `upload.wikimedia.org` renvoie
  `Access-Control-Allow-Origin: *`, donc les fichiers peuvent être décodés par
  la Web Audio API (enchaînement, rognage des silences).

---

## Contraintes techniques

- **100% front-end** : aucun backend ; seuls appels réseau autorisés : les API
  publiques Wikimedia (Wiktionnaire, Commons) et leurs fichiers audio.
- **Pas de SSR** : Vite SPA. Ne pas introduire Next.js ou Remix.
- **Alias `@/`** pointe vers `src/`. Toujours l'utiliser pour les imports
  internes, jamais de chemins relatifs `../../`.
- **Tailwind v4** : `@import 'tailwindcss'` dans le CSS, pas de
  `tailwind.config.js`.
- **TypeScript strict** : `noUnusedLocals`, `noUnusedParameters`,
  `noUncheckedIndexedAccess` activés. Ne pas les désactiver.

---

## Règles de développement

### Structure
- `src/lib/` : logique pure, zéro import React.
- `src/App.tsx` : le React (état, UI, rendu).
- **Taille des fichiers** : viser < ~300 lignes ; au-delà, découper.

### Qualité du code
- **Factoriser, ne pas dupliquer** : extraire les helpers réutilisables.
- **Pas de code mort** : tout export doit être utilisé ou testé. `make knip`
  doit rester vert.
- **Commentaires utiles seulement** : expliquer le pourquoi / le non-évident ;
  ne jamais paraphraser le code.

### Tests
- **Logique pure entièrement testée** (`src/lib/`).
- **Tests de composants** sur les interactions clés via Testing Library.
- Les tests ne touchent jamais le réseau : mocker `fetch`.

### Accessibilité
- Tout cliquable est un bouton/lien avec libellé accessible ; champs avec label
  ou `aria-label` ; focus clavier visible ; ne jamais coder l'information par la
  seule couleur.

### Qualité (avant de considérer une tâche terminée)
- `make check` doit passer (build + lint + typecheck + knip + tests).

---

## Commandes (Makefile)

| Commande | Effet |
|---|---|
| `make install` | Installe les dépendances |
| `make start` | Serveur de dev (http://localhost:9999) |
| `make build` | Build de production |
| `make preview` | Build puis prévisualisation locale |
| `make lint` | ESLint |
| `make knip` | Détecte fichiers / exports / dépendances inutilisés |
| `make format` | Formate avec Prettier |
| `make format-check` | Vérifie le formatage sans modifier |
| `make typecheck` | Vérifie les types |
| `make test` | Tests unitaires et composants |
| `make test-watch` | Tests en mode watch |
| `make test-coverage` | Tests avec couverture (`src/lib/`) |
| `make fix` | Format + lint |
| `make check` | build + lint + typecheck + knip + tests |
| `make clean` | Supprime dist, node_modules, coverage |

---

## Conventions globales du dépôt

- **Code en anglais** : commentaires, identifiants, noms de variables et de
  fonctions. Seules les valeurs affichées à l'utilisateur sont en français.
- **Commits** : pas de trailer `Co-Authored-By`. Auteur = le compte git de
  YavaDeus uniquement. Vaut aussi pour les descriptions de pull request.
- **Typographie** : ne jamais introduire de tiret long (em-dash ou en-dash) dans
  le code, les chaînes, les commentaires ou la doc. Utiliser un tiret ASCII `-`,
  deux-points, parenthèses, ou reformuler.
