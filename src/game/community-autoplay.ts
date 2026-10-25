interface AutoplayOptions {
  run: () => Promise<boolean>
  canRun: () => boolean
  onIdle: () => void
  delayMs?: number
  maxRounds?: number
}

/** Paced, bounded discussion; closing or typing invalidates any old continuation. */
export class CommunityAutoplay {
  private readonly options: AutoplayOptions
  private timer: ReturnType<typeof setTimeout> | undefined
  private generation = 0
  private enabled = false
  private remaining = 0

  constructor(options: AutoplayOptions) {
    this.options = options
  }
  get active(): boolean {
    return this.enabled
  }
  start(immediate = true): void {
    this.stop()
    this.enabled = true
    this.remaining = this.options.maxRounds ?? 4
    this.schedule(immediate ? 0 : (this.options.delayMs ?? 10000))
  }
  stop(): void {
    this.enabled = false
    this.generation++
    if (this.timer !== undefined) clearTimeout(this.timer)
    this.timer = undefined
  }
  private schedule(delay: number): void {
    const generation = this.generation
    this.timer = setTimeout(() => {
      this.timer = undefined
      void this.tick(generation)
    }, delay)
  }
  private async tick(generation: number): Promise<void> {
    if (!this.isCurrent(generation)) return
    if (!this.options.canRun()) {
      this.schedule(this.options.delayMs ?? 10000)
      return
    }
    let success = false
    try {
      success = await this.options.run()
    } catch {
      /* A failed round never retries automatically. */
    }
    if (!this.isCurrent(generation)) return
    this.remaining--
    if (!success || this.remaining <= 0) {
      this.stop()
      this.options.onIdle()
      return
    }
    this.schedule(this.options.delayMs ?? 10000)
  }
  private isCurrent(generation: number): boolean {
    return this.enabled && generation === this.generation
  }
}
