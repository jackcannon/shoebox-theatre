# UI overlay

The UI is plain React DOM over the canvas, in `packages/engine/src/ui/`. It holds no game logic: every component reads the zustand UI store through `useUI(selector)` and renders. Engine code (the runtime and the `DialogueController`) writes the store; the UI never writes it. The store's shape is in [architecture.md](architecture.md#runtime-state-vs-ui-state).

## Structure

`Shoebox` renders:

```
<div class="shoebox-root">            fixed full-screen, black, font and text colour
  <GameCanvas />                   .shoebox-canvas (the R3F canvas)
  <GameUI title={config.title} />  .shoebox-ui (absolute, pointer-events: none)
</div>
```

`GameUI` renders these children, in DOM order (later ones stack above earlier ones):

| Component | Shows when | Behaviour |
|---|---|---|
| `LocationBanner` | `banner` is set | Top-left ornate banner with `banner.text`. It is keyed by `banner.key`, so each new banner remounts and replays a CSS animation that shows it, then hides it after about 2.8 s. |
| `ControlsHint` | always | Small bottom-right text: "WASD / Arrows move · Shift run · Space / Enter / Z talk · Esc / X back" |
| `Fade` | always | Full-screen black div with `opacity = fade.opacity` and `transition: opacity <fade.duration>ms linear`. It sits below the dialogue area, so text can show over black. |
| `ChoiceBox` (inside `.shoebox-dialogue-area`) | `choice` is set and `dialogue.complete` | Vertical option list, top-right of the dialogue box, with a ▶ cursor on `choice.index` |
| `DialogueBox` (inside `.shoebox-dialogue-area`) | `dialogue` is set | Name plate for `speaker`. It renders `text.slice(0, visible)`, then the rest in a hidden span so line wrapping doesn't shift while typing. A bobbing ▼ appears when the page is `complete` and no choice is open. `white-space: pre-wrap`, so `\n` breaks lines. |
| `Loading` | `loading !== null` | The game title and a progress bar at `loading × 100%` |

## Styling (`ui.css`)

`GameUI.tsx` imports `ui.css` and the Pixelify Sans font at weights 400 and 600. Keep CSS imports out of `Shoebox.tsx` and other files whose types the package exports: `tsc` keeps side-effect imports in the emitted `.d.ts` files, and a `.css` import there breaks type resolution for games.

- **Font and colour:** `.shoebox-root` sets `font-family: 'Pixelify Sans', system-ui, sans-serif`, text colour `#f5ecd7` and `user-select: none`.
- **Panels:** `.shoebox-panel` is shared by the dialogue and choice boxes. It has:
  - a deep navy translucent gradient background
  - a 2 px gold border (`#d9b56a`) with an inset dark ring, an inset gold highlight and a dark outer ring
  - 10 px rounded corners and a text shadow
- **Dialogue area:** `.shoebox-dialogue-area` is centred at the bottom, `width: min(880px, 92vw)`. The dialogue is at least 130 px tall, with `font-size: clamp(17px, 2.3vw, 24px)` and `line-height: 1.45`.
- **Sizes:** responsive sizes use `clamp()` throughout.
- **Animations:** `shoebox-rise` (panels rise in), `shoebox-bob` (the ▼), `shoebox-nudge` (the ▶ cursor) and `shoebox-banner` (show then hide).
- **Class prefix:** every class starts with `shoebox-`, and modifiers use `is-*`, for example `is-active` on the current choice.

## Adding a UI element

1. Add the state it needs to `UIState` in `core/uiStore.ts`, with an initial value in `createUIStore()`.
2. Write it from the runtime, or from a controller the runtime calls, with `runtime.ui.setState(...)`. Keep per-frame data out of the store: it triggers React renders.
3. Add a small component in `packages/engine/src/ui/` that reads the state with `useUI(selector)`, and render it from `GameUI`.
4. Style it in `ui.css` with `shoebox-` classes, reusing `.shoebox-panel` for boxed UI.
5. Input for the element goes through `Input`, not DOM listeners. The overlay has `pointer-events: none`, and the game is keyboard/gamepad-driven.
6. Update this doc and [architecture.md](architecture.md) (the `UIState` table).
