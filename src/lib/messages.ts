export const LOADING_MESSAGES = [
  'On réveille le Vosgien…',
  'Le Québécois cherche son micro…',
  'On époussette le Wiktionnaire…',
  'On accorde les cordes vocales…',
  'On chauffe la voix au thé à la mirabelle…',
  'Le Suisse arrive, il prend son temps…',
  'On découpe les silences au ciseau…',
  'On demande poliment à Wikimédia…',
  'On recolle les syllabes…',
  'Le Toulousain finit son cassoulet…',
]

export const UNLOADING_MESSAGES = [
  'On remet les mots dans le dictionnaire…',
  'On rend les micros…',
  'Le Vosgien retourne se coucher…',
  'On rembobine la cassette…',
  'On range les voyelles par ordre alphabétique…',
  'On s’excuse auprès du Québécois…',
]

export const MESSAGE_PERIOD_MS = 1500

export function messageAt(messages: readonly string[], first: number, elapsedMs: number): string {
  return messages[(first + Math.floor(elapsedMs / MESSAGE_PERIOD_MS)) % messages.length]!
}
