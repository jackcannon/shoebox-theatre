const path = require('node:path')
const { generateFiles, installPackagesTask, joinPathFragments, logger, readJson, writeJson } = require('@nx/devkit')

const sorted = (object) => Object.fromEntries(Object.entries(object).sort(([a], [b]) => a.localeCompare(b)))

/**
 * Creates games/<name>: a game workspace that depends on the engine, with one map, a map test and a deploy target.
 * @param tree - Nx virtual file tree of the workspace
 * @param options - name, and optional title and Dokku app name
 */
module.exports = async function gameGenerator(tree, options) {
  const { name } = options
  const root = joinPathFragments('games', name)
  if (tree.exists(root)) throw new Error(`${root} already exists`)

  const title = options.title ?? name.split('-').map((word) => word[0].toUpperCase() + word.slice(1)).join(' ')
  const app = options.app ?? name

  // Versions come from the engine package, so a new game always matches what the engine expects.
  const engine = readJson(tree, 'packages/engine/package.json')
  const reactPlugin = readJson(tree, 'node_modules/@vitejs/plugin-react/package.json')
  const devTools = ['@types/react', '@types/react-dom', '@types/three', 'vite']

  writeJson(tree, joinPathFragments(root, 'package.json'), {
    name,
    private: true,
    type: 'module',
    scripts: {
      dev: 'vite',
      build: 'vite build',
      preview: 'vite preview',
      typecheck: 'tsc -p tsconfig.json',
      test: 'vitest run',
    },
    dependencies: sorted({ ...engine.peerDependencies, shoeboxtheatre: 'workspace:^' }),
    devDependencies: sorted({
      ...Object.fromEntries(devTools.map((tool) => [tool, engine.devDependencies[tool]])),
      '@vitejs/plugin-react': `^${reactPlugin.version}`,
    }),
    nx: {
      tags: ['type:game'],
      targets: {
        deploy: { command: `git push --force dokku@ssh.cannonbury.co.uk:${app} HEAD:master` },
      },
    },
  })

  generateFiles(tree, path.join(__dirname, 'files'), root, { name, title, app })

  return () => {
    installPackagesTask(tree, true)
    logger.info(`Created ${root}. Next:`)
    logger.info(`  1. yarn nx run ${name}:dev (port 5173, so stop any other game's dev server first)`)
    logger.info(`  2. Add games/${name}/docs to docs/README.md`)
    logger.info(`  3. Ask Jack to create the Dokku app "${app}" with GAME=${name} (see docs/deployment.md)`)
  }
}
