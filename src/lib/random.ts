export function pickRandomIndex(items: readonly unknown[], random: () => number = Math.random) {
  return Math.min(items.length - 1, Math.floor(random() * items.length))
}

export function pickRandom<T>(items: readonly T[], random: () => number = Math.random): T {
  return items[pickRandomIndex(items, random)]!
}
