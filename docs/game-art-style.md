# Mossvale character art style

This is the look of the Mossvale demo's characters, and the rules for keeping new ones consistent with it. The characters are data in `src/game/characterModels.ts`. The engine's model renderer turns each one into a sprite sheet when the game loads. How that renderer works, and every option it takes, is engine documentation in [character-models.md](character-models.md). This doc covers only what Mossvale does with it.

## The look

- **Chibi, readable at a glance.** The head is about 45% of the character's height, so the face and hair carry the character. Adults are about 26 px from feet to crown inside a 24×32 frame. `kid` is `scale: 0.85`, and nobody else is scaled.
- **Finer than the world.** Characters are drawn at 21 px per tile, against the world's 16, so they have a little more detail than the tiles and props around them. They stand about 1.14 tiles wide.
- **8 directions.** Every character has diagonal walk rows. The left-facing rows mirror the right ones, so designs are symmetric: no side partings, single earrings or one-sided bags.
- **Black line art.** A 1 px near-black outline (`#141018`) goes around every character. Black lines also separate the parts inside: hair from face, sleeve from hand, arm from body, leg from leg. Faces and hands keep all their pixels, because the lines go on the neighbouring part.
- **Two flat tones per colour.** Each colour has one shadow tone and one lit tone, with no gradients, dithering or specular highlights. The light always comes from above and in front, so front views are mostly lit with shadow down one side. Shadows lean cool purple, and skin shadows lean rose.
- **Small faces.** The eyes are two 3-pixel-tall dark columns and the mouth is a 2-pixel rosy line, or 1 pixel in profile. There are no eyebrows, noses or eye whites. Back views show no face.
- **Solid-coloured clothes.** Outfits are flat blocks of colour with a few details: the V-neck, the belt, an apron, a tie, a cap badge. There are no patterns or small print, which wouldn't survive at this size.

## The hero

The player's character, `hero`, is the style's reference design:

- **Cap:** red (`#d9493e`) with a white oval badge on the front and a short brim, worn low so the hair shows under it all round.
- **Hair:** spiky, dark brown (`#4d3127`). Seven thick spikes fan back and down from under the cap. One sticks out over each ear, three short ones fall along the forehead under the brim, and hair covers the temples and ends in pointed sideburns. The hair frames the face from the front, and there is no straight edge above the ear in profile. It is shaded by depth instead of by the light: dark at the roots, mid-brown along the spikes and light at the tips. That keeps the spikes readable from every side.
- **Clothes:** a blue tunic (`#3569b5`) with a cream V-neck and a brown belt, navy trousers and brown boots.

## The other characters

Each NPC is one of the shared hair styles and outfits, told apart by palette and a few optional parts:

| Id | Hair | Outfit | Distinguishing parts |
|---|---|---|---|
| `mom` | bun, auburn | dress, coral | cream apron |
| `florist` | long, blonde | dress, sky blue | white apron |
| `elder` | short, white | tunic, olive | grey trousers |
| `fisher` | short, black | tunic, amber | navy cap, darker skin |
| `kid` | short, brown | tunic, green | yellow belt, smaller |
| `professor` | short, grey | coat, white | wine tie |
| `aide` | short, dark | coat, white | blue tie |
| `sister` | long, chestnut | dress, purple | none |

Which map character uses which sheet is in [game-content.md](game-content.md#characters).

## Rules for new characters

- Add an entry to `characterModels` in `src/game/characterModels.ts`. `characters.ts` turns every entry into a sheet with `characterModelSheet`.
- Reuse the existing hair styles and outfits, and tell characters apart by colour. Add a new hair style or outfit to the engine only when no existing one can make the character read differently ([character-models.md](character-models.md#adding-a-hair-style-or-outfit)).
- Keep the hero's red cap and spiky hair unique to the player, so they're easy to pick out in a crowd.
- Choose mid-saturation colours with clear value contrast between hair, top, bottom and shoes. Neighbouring parts of similar value merge once they're shaded and inked. Shoes are dark.
- Skin tones sit between `#d9a47a` and `#f2c9a0` in the current cast.
- Check a new character from the front, the side and the back, standing and walking, before using it in a map.
- Every design must be original: no characters, outfits or colour schemes taken from other games.
