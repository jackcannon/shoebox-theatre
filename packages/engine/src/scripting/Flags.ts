export type FlagValue = boolean | number | string

/** Persistent story state shared by every script (quest progress, one-off events, ...). */
export class Flags {
  private readonly values = new Map<string, FlagValue>()

  get(key: string): FlagValue | undefined {
    return this.values.get(key)
  }

  has(key: string): boolean {
    return Boolean(this.values.get(key))
  }

  set(key: string, value: FlagValue = true): void {
    this.values.set(key, value)
  }
}
