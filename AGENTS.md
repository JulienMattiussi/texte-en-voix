# texte-en-voix

Application **100% front-end** de synthèse vocale **sans IA et sans
synthétiseur**. L'utilisateur saisit un texte ; pour chaque mot, l'app interroge
le **Wiktionnaire francophone**, récupère les enregistrements audio disponibles
(modèle `{{écouter}}`), choisit de préférence un **accent vosgien,
québécois, suisse ou du Sud-Ouest**, puis lit la phrase comme une succession
de ces enregistrements.
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
| Caveat (`@fontsource-variable/caveat`) | Police manuscrite du titre, embarquée (aucun appel Google Fonts) |
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
│   ├── lemma.ts              # flexionLemma / frenchIpas / sameIpa : repli par le mot de base
│   ├── synthesis.ts          # prepareSynthesis : mots -> enregistrements décodés
│   ├── audio.ts              # voiceBounds / normalizationGain / timeline (calculs audio)
│   ├── pacing.ts             # Verrous : 50 mots max, durée 5-8 s, annulation 3 s
│   ├── messages.ts           # Messages bidons de chargement / déchargement, rotation
│   ├── examples.ts           # Phrases d'exemple (vérifiées en ligne)
│   └── random.ts             # pickRandom / pickRandomIndex
├── player.ts                 # Lecture Web Audio (non testé : jsdom n'a pas d'AudioContext)
├── useSynthesis.ts           # Hook : préparation cadencée, annulation, lecture
├── Title.tsx                 # Titre dessiné (police Caveat, crayon, ondes de voix)
├── WiktionaryLogo.tsx        # Petite tuile « W » de la ligne « Source : Wiktionnaire »
├── WordList.tsx              # Bulles de mots (préparation puis lecture), à la place du textarea
├── ProgressBar.tsx           # Barre de progression de la préparation
├── MissingWords.tsx          # Encart « synthèse impossible » + invitation Lingua Libre
├── App.tsx                   # Page : saisie, préparation, lecture
├── main.tsx                  # Point d'entrée
├── index.css                 # Import Tailwind
└── vite-env.d.ts             # Types Vite
public/
├── favicon.svg               # Favicon
├── og.png                    # Image de partage 1200x630 (générée par `make og`)
├── robots.txt                # Autorise tout, pointe vers le sitemap
└── sitemap.xml               # Une seule page
tools/
└── og.tsx                    # Page de l'image de partage (vrais composants), servie via og.html
docs/images/
└── lecture.png               # Capture d'une vraie lecture, pour le README
tests/
├── setup.ts                  # Setup Testing Library (jest-dom)
├── fakeWikimedia.ts          # Faux fetch : Wiktionnaire, Commons et fichiers audio
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
  Sud-Ouest (liste de lieux par accent), puis n'importe quel autre accent
  régional (« France (Lyon) », « Belgique »...), et seulement en dernier un
  accent neutre (lieu vide, « France » seul, ou Paris). À rang égal, le premier
  enregistrement de la page gagne.
- **API Wiktionnaire** (`src/lib/wiktionary.ts`) : `https://fr.wiktionary.org/w/api.php`
  avec `action=query&prop=revisions&rvprop=content&rvslots=main&redirects=1&formatversion=2&origin=*`.
  `origin=*` active le CORS anonyme ; `titles` accepte jusqu'à 50 titres par
  appel. Les lots partent **l'un après l'autre** (jamais en parallèle), les
  redirections (`aujourd'hui` -> `aujourd’hui`) sont suivies, et la pagination
  `continue` est gérée. Un cache (titre -> wikitexte ou `null` si absent) évite
  de redemander un titre déjà vu.
- **Identification** (`src/lib/mediawiki.ts`) : chaque appel aux API envoie
  `Api-User-Agent: TexteEnVoix/1.0 (<site>; <dépôt GitHub>)`, comme le demande
  Wikimédia (le navigateur interdit de modifier `User-Agent`). Les deux API
  l'autorisent en CORS (au prix d'une requête de vérification par appel). **Ne pas
  l'ajouter aux téléchargements audio** (`upload.wikimedia.org`), dont la
  politique CORS pour cet en-tête n'est pas garantie.
- **Phrase** (`src/lib/sentence.ts`) : chaque mot est cherché tel quel puis en
  minuscules (titres sensibles à la casse). Si **un seul** mot n'a aucun
  enregistrement français, la phrase entière est refusée (« La synthèse vocale
  n'est pas possible. »).
- **Repli par le mot de base** (`src/lib/lemma.ts`, `src/lib/sentence.ts`) : un
  pluriel ou une flexion sans enregistrement (« mirabelles ») emprunte la voix
  de son mot de base (« Pluriel de [[mirabelle]] » ou `s=` du tableau de
  flexions), **seulement si la prononciation écrite `{{pron}}` est identique**
  (points, accents toniques et liaisons ignorés). « mangeons » n'emprunte donc
  pas « manger ». Une seule requête de plus, et seulement s'il manque des mots.
  La bulle affiche « via mirabelle ».
- **Verrous** (`src/lib/pacing.ts`, `src/useSynthesis.ts`) : pour ménager
  Wikimedia et donner une attente réaliste. Texte limité à **50 mots**. Une
  préparation dure **au moins 5 s** (tirage entre 5 et 8 s, plus si le réseau est
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
  Trois caches (wikitextes, infos des fichiers, sons décodés) : relire une phrase déjà lue ne
  fait **aucun** appel réseau.
- **Crédits des voix** (`src/lib/commons.ts`) : la même requête Commons
  demande `iiprop=url|extmetadata` (filtré sur `Artist|LicenseShortName`).
  `authorName` garde le **locuteur** des fichiers Lingua Libre (« Speaker: X /
  Recorder: Y »), sinon le texte de l'auteur. Chaque bulle affiche « 🎙 auteur »,
  l'infobulle ajoute la licence, et le pied de page indique « Voix :
  Wikimedia Commons, licences libres » (visible aussi sur mobile, sans survol). Obligatoire : les enregistrements sont sous licences libres
  (CC BY-SA le plus souvent), qui imposent de créditer l'auteur.
- **Lecture** (`src/lib/audio.ts`, `src/player.ts`) : chaque son est rogné de ses
  silences (seuil à 5 % du pic, marge de 30 ms), normalisé (pic à 0.8, gain max
  5), puis les mots sont enchaînés avec 80 ms d'écart. Le mot en cours est mis
  en avant (`aria-current`). L'`AudioContext` est débloqué dans le clic sur
  « Lire » (politique d'autoplay des navigateurs). « Réécouter » rejoue sans
  attente ni réseau.
- **Interface** (`src/App.tsx`) : au clic sur « Lire », les bulles de mots
  prennent la place du textarea (même hauteur, pour que rien ne bouge). Une
  fois la voix prête, chaque bulle affiche le lieu du locuteur et ouvre la page
  du mot dans l'onglet nommé `wiktionnaire` ; boutons « Réécouter » /
  « Arrêter » et « Modifier le texte ». En cas de refus, les mots introuvables
  pointent aussi vers le Wiktionnaire et un encart invite à les enregistrer sur
  Lingua Libre (`https://lingualibre.org/app/`, qui ne permet pas de
  pré-remplir le mot).
- **Accueil et attente** (`src/lib/examples.ts`, `src/lib/messages.ts`) : une
  phrase d'exemple est tirée au hasard à l'arrivée. **Chaque nouvelle phrase
  d'exemple doit être vérifiée en ligne** (tous les mots en un seul lot). Pendant
  la préparation, des messages bidons défilent toutes les 1,5 s (« On réveille
  le Vosgien… ») ; pendant l'annulation, d'autres messages (« On rembobine la
  cassette… ») et la barre se **vide** en 3 s.
- **Look** : sobre, touches « techno » discrètes qui ne prennent jamais le pas
  sur le fonctionnel : grille de points pâle en fond (`src/index.css`),
  monospace pour les petits textes techniques (compteur, lieux, messages
  d'attente en « > ligne de journal »), forme d'onde du titre animée pendant la
  lecture (coupée si l'utilisateur réduit les animations).
- **Mode sombre** : suit la préférence du système (variantes `dark:` de
  Tailwind, `color-scheme: light dark`). Toute nouvelle couleur claire doit
  avoir sa variante `dark:`.
- **SEO et partage** (`index.html`) : adresse publique
  `https://texte-en-voix.yavadeus.dev/` (canonical, Open Graph, Twitter, JSON-LD
  `WebApplication`). L'image de partage est rendue depuis les vrais composants
  (`tools/og.tsx`) avec des mots et lieux issus d'une vraie recherche : si l'UI
  change, relancer `make og`. Pied de page : « Fait avec ❤️ par YavaDeus »,
  lien vers `https://yavadeus.vercel.app/`.
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
- `src/useSynthesis.ts` : l'état et l'orchestration (préparation, annulation,
  lecture) ; `src/player.ts` : la seule couche qui touche à la Web Audio API.
- `src/*.tsx` : composants d'affichage ; `src/App.tsx` assemble la page.
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
- Les tests ne touchent jamais le réseau : mocker `fetch` (`tests/fakeWikimedia.ts`).
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
| `make og` | Régénère `public/og.png` (Vite + Chrome headless, nécessite `google-chrome`) |
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
