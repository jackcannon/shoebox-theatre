import { describe, expect, it } from 'vitest'

import type { Action, Input } from '../core/Input'
import { createUIStore } from '../core/uiStore'

import { DialogueController } from './DialogueController'

function setup() {
  const ui = createUIStore()
  const pressed = new Set<Action>()
  const input = { wasPressed: (action: Action) => pressed.has(action) } as unknown as Input
  const dialogue = new DialogueController(ui, input)
  const frame = (...actions: Action[]) => {
    pressed.clear()
    for (const action of actions) pressed.add(action)
    dialogue.update(1 / 60)
  }
  return { ui, dialogue, frame }
}

const flush = () => new Promise((resolve) => setTimeout(resolve, 0))

describe('DialogueController.say', () => {
  it('reveals text over time and completes it on confirm', () => {
    const { ui, dialogue, frame } = setup()
    void dialogue.say(['Hello there, traveller!'], 'Guide')
    expect(ui.getState().dialogue).toMatchObject({ speaker: 'Guide', visible: 0, complete: false })
    frame()
    const partial = ui.getState().dialogue
    expect(partial?.visible).toBeGreaterThan(0)
    expect(partial?.complete).toBe(false)
    frame('confirm')
    expect(ui.getState().dialogue).toMatchObject({ visible: 'Hello there, traveller!'.length, complete: true })
  })

  it('resolves each page on the next confirm and closes after the last', async () => {
    const { ui, dialogue, frame } = setup()
    let resolved = false
    void dialogue.say(['First page', 'Second page']).then(() => {
      resolved = true
    })
    frame('confirm')
    await flush()
    expect(ui.getState().dialogue?.text).toBe('First page')
    frame('confirm')
    await flush()
    expect(ui.getState().dialogue?.text).toBe('Second page')
    expect(resolved).toBe(false)
    frame('confirm')
    frame('confirm')
    await flush()
    expect(resolved).toBe(true)
    expect(ui.getState().dialogue).not.toBeNull()
    frame()
    expect(ui.getState().dialogue).toBeNull()
  })
})

describe('DialogueController.choice', () => {
  it('moves the cursor with up/down and resolves the index on confirm', async () => {
    const { ui, dialogue, frame } = setup()
    const result = dialogue.choice('Pick one', ['Red', 'Green', 'Blue'])
    expect(ui.getState().choice).toEqual({ options: ['Red', 'Green', 'Blue'], index: 0 })
    frame('confirm')
    frame('down')
    frame('down')
    expect(ui.getState().choice?.index).toBe(2)
    frame('down')
    expect(ui.getState().choice?.index).toBe(0)
    frame('up')
    frame('up')
    expect(ui.getState().choice?.index).toBe(1)
    frame('confirm')
    await expect(result).resolves.toBe(1)
    expect(ui.getState().choice).toBeNull()
  })

  it('picks the last option on cancel', async () => {
    const { dialogue, frame } = setup()
    const result = dialogue.choice('Take a nap?', ['Yes', 'No'])
    frame('cancel')
    frame('cancel')
    await expect(result).resolves.toBe(1)
  })
})
