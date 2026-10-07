# Deployment

Every game is its own [Dokku](https://dokku.com) app on the server cannonbury (`dokku@ssh.cannonbury.co.uk`), and deploys as a static site. Dokku builds each game from source with buildpacks on every push; `dist/` is never committed. Mossvale's app is `mossvale`, served at `mossvale.cannonbury.co.uk`.

## How a monorepo game builds

A deploy pushes the whole monorepo to the game's Dokku app. The app's `GAME` config variable selects the game, so one set of build files serves every app.

1. **`.buildpacks`** lists 3 buildpacks, in order:
   1. `https://github.com/jackcannon/heroku-buildpack-env` loads `.dokku.env` into the build environment.
   2. `https://github.com/jackcannon/heroku-buildpack-node` installs Node and yarn (see [stack.md](stack.md#deployment)), runs `yarn install --immutable` for every workspace, then runs the root `heroku-postbuild` script. It runs `heroku-postbuild` instead of `build` when both exist.
   3. `https://github.com/jackcannon/heroku-buildpack-nginx` makes nginx serve `NGINX_ROOT`.
2. **`heroku-postbuild`** runs `tools/heroku-postbuild.sh`:
   - It stops with an error if `GAME` is not set.
   - It runs `yarn nx run $GAME:build --skip-nx-cache`.
   - It copies `games/$GAME/dist` to the root `dist/`.
3. **`.dokku.env`** is the same for every app: `NGINX_ROOT='dist'`, `NX_DAEMON='false'` and `NX_NO_CLOUD='true'`. It is committed, so it must never hold secrets.
4. **`.static`** is an empty file. The nginx buildpack runs only when it exists.

If a build fails, Dokku keeps the previous release running.

Every app installs the dependencies of every workspace, because the buildpack runs a plain `yarn install`. The buildpack caches the install, so later builds are faster. A game that adds very large dependencies is a reason to move it to its own repo.

The build log shows "Some peer dependencies are incorrectly met" during the buildpack's `yarn heroku prune` step, which runs after the build and removes dev dependencies. It does not affect the static site.

## Deploying

Run deploys from your machine, from a clean `master` that matches `origin/master`:

| Command | What it deploys |
|---|---|
| `yarn deploy` | Only the games affected since the last deploy: `nx affected -t deploy --base=deployed --head=HEAD --parallel=2` |
| `yarn deploy:all` | Every game: `nx run-many -t deploy --parallel=2` |

`tools/deploy.sh` runs both:

1. It stops unless the branch is `master`, the working tree is clean, and `HEAD` matches `origin/master` (after a fetch).
2. It runs the `deploy` target of each selected game. With no `deployed` tag yet, it deploys every game.
3. It moves the git tag `deployed` to `HEAD` and pushes it to `origin`, so other clones see where the last deploy was.

If one push fails, the script stops before it moves the tag. The next `yarn deploy` then pushes every affected game again, including those that worked. That is safe.

Each game has a `deploy` target in the `nx` field of its `package.json`:

```json
"nx": {
  "tags": ["type:game"],
  "targets": {
    "deploy": { "command": "git push --force dokku@ssh.cannonbury.co.uk:mossvale HEAD:master" }
  }
}
```

- `--force` is safe, because the Dokku app's repo is only a deploy target, and the script deploys only a clean `master` that matches `origin/master`.
- The engine has no `deploy` target, so it is never deployed.
- SSH to cannonbury goes through Cloudflare Access (`cloudflared access ssh` in `~/.ssh/config`), so deploys work only from a machine set up that way.
- `--parallel=2` limits how many builds run on the server at the same time.

### What counts as affected

| Change | Games that deploy |
|---|---|
| A file in `packages/engine/` | Every game |
| A file in `games/<game>/` | That game |
| The root `package.json` or `yarn.lock` | Every game |
| `docs/`, `README.md`, `.buildpacks`, `.dokku.env`, `.static` or `tools/` | None. Run `yarn deploy:all` after a change to the build files or scripts. |

## Games in their own repos

A game in its own repo is a normal single-app repo with the same 3 buildpacks. It has no `GAME` variable and no `heroku-postbuild` script:

- `.buildpacks`: the same 3 buildpack URLs as this repo.
- `.dokku.env`: `NGINX_ROOT='dist'`.
- `.static`: an empty file.
- `package.json`: `build` is `tsc -b && vite build` (or the same type check and build in another form), which writes `dist/`.

The Node buildpack runs `yarn install --immutable` and `yarn run build`, and nginx serves `dist/`. Deploy with `git push --force <dokku remote> master`, after Jack creates the app (`ssh dokku@ssh.cannonbury.co.uk apps:create <app>`).

The game installs a published `shoeboxtheatre` version. To try unreleased engine changes in it:

1. In the game: `yarn link <path to this repo>/packages/engine`. This adds a `portal:` resolution to its `package.json`.
2. In this repo: `yarn nx run shoeboxtheatre:build` once, then `yarn workspace shoeboxtheatre dev` (`tsc --watch`).
3. Run the game's dev server.
4. When the change is released, run `yarn unlink shoeboxtheatre` in the game, then `yarn up shoeboxtheatre`.

Do not commit the `portal:` resolution. The Dokku build can't see a folder outside the repo, so the deploy fails.

## Setting up an app for a new game

These commands run on the server. Jack runs them:

```sh
ssh dokku@ssh.cannonbury.co.uk apps:create <app>
ssh dokku@ssh.cannonbury.co.uk config:set --no-restart <app> GAME=<game folder>
ssh dokku@ssh.cannonbury.co.uk domains:add <app> <domain>
```

Copy any other settings from `mossvale`, such as TLS. Then add the game's `deploy` target and run `yarn deploy`.

After a history rewrite on `origin`, the Dokku app's repo keeps the old objects. The forced push still works. To remove the old objects, run `ssh dokku@ssh.cannonbury.co.uk repo:gc <app>`.
