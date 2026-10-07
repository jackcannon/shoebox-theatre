export type Action = 'up' | 'down' | 'left' | 'right' | 'confirm' | 'cancel' | 'run'

const DEFAULT_KEYS: Record<string, Action> = {
  ArrowUp: 'up',
  KeyW: 'up',
  ArrowDown: 'down',
  KeyS: 'down',
  ArrowLeft: 'left',
  KeyA: 'left',
  ArrowRight: 'right',
  KeyD: 'right',
  Space: 'confirm',
  Enter: 'confirm',
  KeyZ: 'confirm',
  KeyE: 'confirm',
  Escape: 'cancel',
  KeyX: 'cancel',
  Backspace: 'cancel',
  ShiftLeft: 'run',
  ShiftRight: 'run',
}

const GAMEPAD_BUTTONS: Partial<Record<number, Action>> = {
  0: 'confirm',
  1: 'cancel',
  2: 'run',
  12: 'up',
  13: 'down',
  14: 'left',
  15: 'right',
}

const STICK_DEADZONE = 0.25

/** Keyboard + gamepad input, sampled once per frame so presses are edge-triggered per frame. */
export class Input {
  readonly bindings: Record<string, Action>
  private readonly keysDown = new Set<Action>()
  private readonly queued = new Set<Action>()
  private readonly pressed = new Set<Action>()
  private padDown = new Set<Action>()
  private stick = { x: 0, z: 0 }
  private target: Window | null = null

  constructor(bindings: Record<string, Action> = DEFAULT_KEYS) {
    this.bindings = bindings
  }

  attach(target: Window): void {
    this.detach()
    this.target = target
    target.addEventListener('keydown', this.onKeyDown)
    target.addEventListener('keyup', this.onKeyUp)
    target.addEventListener('blur', this.onBlur)
  }

  detach(): void {
    if (!this.target) return
    this.target.removeEventListener('keydown', this.onKeyDown)
    this.target.removeEventListener('keyup', this.onKeyUp)
    this.target.removeEventListener('blur', this.onBlur)
    this.target = null
    this.onBlur()
  }

  /** Call once at the start of every frame. */
  update(): void {
    this.pressed.clear()
    for (const action of this.queued) this.pressed.add(action)
    this.queued.clear()
    this.pollGamepad()
  }

  isDown(action: Action): boolean {
    return this.keysDown.has(action) || this.padDown.has(action)
  }

  /** @returns true only on the frame the action was pressed */
  wasPressed(action: Action): boolean {
    return this.pressed.has(action)
  }

  /** @returns movement vector, x = east, z = south, length <= 1 */
  axis(): { x: number; z: number } {
    let x = (this.isDown('right') ? 1 : 0) - (this.isDown('left') ? 1 : 0) + this.stick.x
    let z = (this.isDown('down') ? 1 : 0) - (this.isDown('up') ? 1 : 0) + this.stick.z
    const len = Math.hypot(x, z)
    if (len > 1) {
      x /= len
      z /= len
    }
    return { x, z }
  }

  private pollGamepad(): void {
    const pad = typeof navigator !== 'undefined' ? navigator.getGamepads?.().find((p) => p?.connected) : null
    if (!pad) {
      this.padDown.clear()
      this.stick = { x: 0, z: 0 }
      return
    }
    const next = new Set<Action>()
    pad.buttons.forEach((button, i) => {
      const action = GAMEPAD_BUTTONS[i]
      if (action && button.pressed) next.add(action)
    })
    for (const action of next) if (!this.padDown.has(action)) this.pressed.add(action)
    this.padDown = next
    const sx = pad.axes[0] ?? 0
    const sz = pad.axes[1] ?? 0
    this.stick = Math.hypot(sx, sz) > STICK_DEADZONE ? { x: sx, z: sz } : { x: 0, z: 0 }
  }

  private onKeyDown = (e: KeyboardEvent): void => {
    const action = this.bindings[e.code]
    if (!action) return
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
    e.preventDefault()
    if (!e.repeat) this.queued.add(action)
    this.keysDown.add(action)
  }

  private onKeyUp = (e: KeyboardEvent): void => {
    const action = this.bindings[e.code]
    if (action) this.keysDown.delete(action)
  }

  private onBlur = (): void => {
    this.keysDown.clear()
    this.queued.clear()
  }
}
