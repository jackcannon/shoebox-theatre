import type { Input } from '../core/Input'
import type { UIStore } from '../core/uiStore'

/** Drives the typewriter dialogue box and choice menu from the game loop. */
export class DialogueController {
  charsPerSecond = 48
  private readonly ui: UIStore
  private readonly input: Input
  private pageResolve: (() => void) | null = null
  private choiceResolve: ((index: number) => void) | null = null
  /** Close the box next frame unless another line starts first, so consecutive `say` calls don't flicker */
  private pendingClose = false

  constructor(ui: UIStore, input: Input) {
    this.ui = ui
    this.input = input
  }

  async say(pages: string[], speaker?: string): Promise<void> {
    for (const page of pages) {
      this.show(page, speaker)
      await new Promise<void>((resolve) => {
        this.pageResolve = resolve
      })
    }
    this.pendingClose = true
  }

  async choice(prompt: string, options: string[], speaker?: string): Promise<number> {
    this.show(prompt, speaker)
    this.ui.setState({ choice: { options, index: 0 } })
    const index = await new Promise<number>((resolve) => {
      this.choiceResolve = resolve
    })
    this.pendingClose = true
    return index
  }

  close(): void {
    this.pageResolve = null
    this.choiceResolve = null
    this.pendingClose = false
    this.ui.setState({ dialogue: null, choice: null })
  }

  update(dt: number): void {
    const { dialogue, choice } = this.ui.getState()
    if (this.pendingClose) {
      this.pendingClose = false
      this.ui.setState({ dialogue: null, choice: null })
      return
    }
    if (!dialogue) return

    const confirm = this.input.wasPressed('confirm')
    const cancel = this.input.wasPressed('cancel')
    if (!dialogue.complete) {
      const length = dialogue.text.length
      const visible = confirm || cancel ? length : Math.min(length, dialogue.visible + dt * this.charsPerSecond)
      this.ui.setState({ dialogue: { ...dialogue, visible, complete: visible >= length } })
      return
    }

    if (choice && this.choiceResolve) {
      const n = choice.options.length
      let index = choice.index
      if (this.input.wasPressed('up')) index = (index + n - 1) % n
      if (this.input.wasPressed('down')) index = (index + 1) % n
      if (index !== choice.index) this.ui.setState({ choice: { ...choice, index } })
      if (confirm || cancel) {
        const resolve = this.choiceResolve
        this.choiceResolve = null
        this.ui.setState({ choice: null })
        resolve(cancel ? n - 1 : index)
      }
      return
    }

    if (this.pageResolve && (confirm || cancel)) {
      const resolve = this.pageResolve
      this.pageResolve = null
      resolve()
    }
  }

  private show(text: string, speaker?: string): void {
    this.pendingClose = false
    this.ui.setState({ dialogue: { text, speaker, visible: 0, complete: false }, choice: null })
  }
}
