# texte-en-voix

Application **100% front-end** de synthèse vocale **sans IA et sans
synthétiseur**. L'utilisateur saisit un texte ; pour chaque mot, l'app interroge
le **Wiktionnaire francophone**, récupère les enregistrements audio disponibles
(modèle `{{écouter}}`), choisit de préférence un **accent vosgien,
québécois, suisse ou du Sud-Ouest**, puis lit la phrase comme une succession de ces enregistrements.
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
│   ├── pronunciations.ts     # parsePronunciations / pickPronunciation
│   ├── mediawiki.ts          # queryPages : API MediaWiki (lots, redirections, continue, cache)
│   ├── wiktionary.ts         # fetchWikitexts : wikitexte des pages du Wiktionnaire
│   ├── commons.ts            # fetchFileUrls : URL des fichiers audio sur Commons
│   ├── download.ts           # downloadAudio : téléchargements espacés, un à la fois, cache
│   ├── sentence.ts           # lookupSentence : une voix par mot, ou phrase impossible
│   ├── synthesis.ts          # prepareSynthesis : mots -> enregistrements décodés
│   ├── audio.ts              # voiceBounds / normalizationGain / timeline (calculs audio)
│   └── pacing.ts             # Verrous : 50 mots max, durée 5-8 s, annulation 3 s
├── player.ts                 # Lecture Web Audio (non testé : jsdom n'a pas d'AudioContext)
├── useVoiceLookup.ts         # Hook : préparation cadencée, annulation, lecture
├── Title.tsx                 # Titre dessiné (police Caveat, crayon, ondes de voix)
├── WordList.tsx              # Bulles de mots (préparation puis lecture), à la place du textarea
├── App.tsx                   # UI (saisie, chargement, lecture mot par mot)
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

- **Découpage** (`src/lib/tokenize.ts`) : mots avec leur casse, apostrophes et
  traits d'union internes conservés, apostrophe droite convertie en `’` (forme
  utilisée par les titres du Wiktionnaire).
- **Prononciations** (`src/lib/pronunciations.ts`) : `parsePronunciations` lit
  le wikitexte d'une page et extrait chaque `{{écouter|<lieu>|<API>|audio=...|lang=fr}}`
  (paramètres positionnels : lieu puis API, ordre des nommés libre).
  `pickPronunciation` préfère un accent vosgien, québécois, suisse ou du
  Sud-Ouest (liste de lieux par accent), sinon le premier enregistrement.
- **API Wiktionnaire** (`src/lib/wiktionary.ts`) : `https://fr.wiktionary.org/w/api.php`
  avec `action=query&prop=revisions&rvprop=content&rvslots=main&redirects=1&formatversion=2&origin=*`.
  `origin=*` active le CORS anonyme ; `titles` accepte jusqu'à 50 titres par
  appel. Les lots partent **l'un après l'autre** (jamais en parallèle), les
  redirections (`aujourd'hui` -> `aujourd’hui`) sont suivies, et la pagination
  `continue` est gérée. Un cache (titre -> wikitexte ou `null` si absent) évite
  de redemander un titre déjà vu.
- **Phrase** (`src/lib/sentence.ts`) : chaque mot est cherché tel quel puis en
  minuscules (titres sensibles à la casse). Si **un seul** mot n'a aucun
  enregistrement français, la phrase entière est refusée (« La synthèse vocale
  n'est pas possible. »).
- **Verrous** (`src/lib/pacing.ts`, `src/useVoiceLookup.ts`) : pour ménager
  Wikimedia et donner une attente réaliste. Texte limité à **50 mots**. Une
  recherche dure **au moins 5 s** (tirage entre 5 et 8 s, plus si le réseau est
  lent), avec barre de progression et mots révélés au fil de l'attente ; le
  texte est verrouillé pendant ce temps. On peut **annuler** (les requêtes sont
  interrompues via `AbortSignal`) ; l'annulation dure **au moins 3 s**, après
  quoi on peut relancer.
- **Audio** (`src/lib/commons.ts`, `src/lib/download.ts`, `src/lib/synthesis.ts`) :
  une requête Commons (`prop=imageinfo&iiprop=url`, 50 fichiers par lot) donne
  l'URL de chaque fichier, puis les fichiers sont téléchargés **un par un,
  espacés de 100 ms**, pendant l'attente de 5-8 s. `upload.wikimedia.org`
  renvoie `Access-Control-Allow-Origin: *`, donc la Web Audio API peut les
  décoder. Un fichier absent (404) ou indécodable rend la phrase impossible.
  Trois caches (wikitextes, URL, sons décodés) : relire une phrase déjà lue ne
  fait **aucun** appel réseau.
- **Lecture** (`src/lib/audio.ts`, `src/player.ts`) : chaque son est rogné de ses
  silences (seuil à 5 % du pic, marge de 30 ms), normalisé (pic à 0.8, gain max
  5), puis les mots sont enchaînés avec 80 ms d'écart. Le mot en cours est mis
  en avant (`aria-current`). L'`AudioContext` est débloqué dans le clic sur
  « Lire » (politique d'autoplay des navigateurs). « Réécouter » rejoue sans
  attente ni réseau.
- **Appels de test** : ne jamais saturer Wikimedia (un blocage tuerait le
  projet). Tous les tests mockent `fetch` ; une vérification réelle se limite à
  une phrase, une fois.

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
- Les tests ne touchent jamais le réseau : mocker `fetch` (`tests/fakeWiktionary.ts`).
- Les délais se testent avec `vi.useFakeTimers({ shouldAdvanceTime: true })`
  (sans `shouldAdvanceTime`, Testing Library attend un `setTimeout` qui ne part
  jamais) et `Math.random` mocké pour une durée fixe de 5 s. `@/player` est
  remplacé par un faux via `vi.mock` dans les tests de composants.

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
