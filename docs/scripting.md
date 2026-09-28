# Scripting: dialogue, choices, flags and cutscenes

Interactions and cutscenes are async functions:

```ts
type Script = (ctx: ScriptContext) => void | Promise<void>
```

Scripts appear in three places in map data:

- `NpcDefinition.interact`, run when the player talks to the NPC
- `MapObject.interact`, run when the player inspects the object
- `TriggerDefinition.script`, run when the player enters the trigger area

`NpcDefinition.dialogue` and `MapObject.text` are shorthands. Each becomes a script that calls `say` with the given page or pages. NPC shorthands use the NPC's `name` as the speaker; object text has no speaker.

## Running scripts

`GameRuntime.runScript(script, self?)`:

- increments a counter of running scripts, which makes `playerFree` false and locks player movement, interaction and tile events
- builds a fresh `ScriptContext`, awaits the script and logs any thrown error to the console as `Script failed`
- decrements the counter, and closes the dialogue box once no script is running

Several scripts can run at once. For example, two triggers on the same tile both start, and the player stays locked until all of them finish.

## `ScriptContext`

| Member | Behaviour |
|---|---|
| `runtime` | The `GameRuntime`, as an escape hatch |
| `flags` | Shared `Flags` store |
| `player` | `CharacterHandle` for the player, bound when the script starts (see gotchas below) |
| `self` | Handle for the NPC being talked to. `undefined` for objects and triggers. |
| `npc(id)` | Handle for an NPC on the **current** map. Throws if there is none. |
| `say(text, speaker?)` | Shows one page per string and resolves after the player dismisses the last page |
| `choice(prompt, options, speaker?)` | Shows the prompt, then a menu once the text has finished typing. Resolves to the chosen index. Cancel picks the **last** option. |
| `wait(ms)` | Timer promise |
| `fadeOut(ms = 280)`, `fadeIn(ms = 280)` | Animate the black overlay to opacity 1 or 0 and resolve when done |
| `warp(to)` | The same fade-and-load transition as a door |

`CharacterHandle`:

| Member | Behaviour |
|---|---|
| `character` | The underlying `Character` |
| `face(dir)` | Sets its facing |
| `faceToward(handle)` | Faces another character, choosing the closest cardinal direction |
| `walk(dir, tiles = 1)` | Walks in a straight line at 3.2 tiles/s, **ignoring collision**, and resolves on arrival |

## Dialogue controller

`scripting/DialogueController.ts` runs inside the game loop and talks to the UI store:

- **Typewriter.** A page reveals 48 characters per second (`charsPerSecond`), updating `dialogue.visible`. Confirm or cancel while typing reveals the whole page at once.
- **Pages.** Once a page is `complete`, confirm or cancel resolves it and the next page shows.
- **No flicker between calls.** After the last page of a `say` or a choice is resolved, the box is scheduled to close on the next frame. If another `say` or `choice` starts first, it cancels the close. So consecutive `say` calls in one script run without the box blinking.
- **Choices.** The menu appears only after the prompt has finished typing. Up and down move the cursor with wrap-around. Confirm returns the current index; cancel returns `options.length − 1`.
- When the last running script ends, the runtime calls `close()`, which clears the dialogue and choice state and drops any pending resolvers.

## Flags

`Flags` (`scripting/Flags.ts`) is a `Map<string, boolean | number | string>` shared by all scripts for the whole session:

- `get(key)` returns the raw value or `undefined`.
- `has(key)` returns `Boolean(value)`, so `false`, `0` and `''` count as unset.
- `set(key, value = true)` stores a value.

Flags live only in memory. There is no save/load yet ([known-issues.md](known-issues.md)).

## Example

This is Mom's script from `src/game/maps/playerHouse1F.ts`:

```ts
interact: async (ctx) => {
  if (ctx.flags.has('metMom')) {
    await ctx.say("Don't keep the professor waiting! His lab is the big building to the south.", 'Mom')
    return
  }
  await ctx.say(
    [
      'Oh, good morning, sleepyhead!',
      "Professor Hawthorne stopped by earlier. He'd like you to visit his lab when you're ready.",
    ],
    'Mom',
  )
  ctx.flags.set('metMom')
}
```

## Gotchas

- **Walking after `warp()` hangs.** `ctx.player` and `ctx.self` are bound to the `Character` objects of the map the script started on. After `ctx.warp()` those characters belong to a discarded `World`, so `ctx.player.walk(...)` never resolves, the script never ends, and the player stays locked. Put walks before the warp. After a warp, use `ctx.npc(id)`, which looks up the current map, or `ctx.runtime.world`.
- `walk` ignores collision, so a script can walk characters through walls or into water. Check paths by hand.
- `say` with an empty array shows nothing but still schedules a close.
- A script that throws is logged and ended; the player is unlocked once no scripts remain.
- Use `flags` for story state rather than module-level variables in map files, so every script reads the same state and a future save system can persist it.
