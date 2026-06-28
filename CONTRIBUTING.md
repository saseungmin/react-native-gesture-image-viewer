# Contributing

Contributions are always welcome, no matter how large or small!

We want this community to be friendly and respectful to each other. Please follow it in all your interactions with the project. Before contributing, please read the [code of conduct](./CODE_OF_CONDUCT.md).

## Development Workflow

This project uses pnpm workspaces for the example app and documentation site, while the npm package itself remains at the repository root. It contains:

- The library package at the repository root.
- An example app in `example/`.
- The Rspress documentation site in `docs/`.

To get started, make sure you have the correct version of [Node.js](https://nodejs.org/) installed. See [`.nvmrc`](./.nvmrc) for the version used in this project.

Enable Corepack and install dependencies from the root directory:

```sh
corepack enable
pnpm install
```

The [example app](/example/) demonstrates usage of the library. It depends on the local root package through `workspace:*`, so changes under `src` are reflected in the example app. Native changes require rebuilding the example app.

To start the packager:

```sh
pnpm example start
```

To run the example app on Android:

```sh
pnpm example android
```

To run the example app on iOS:

```sh
pnpm example ios
```

To confirm that the app is running with the new architecture, you can check the Metro logs for a message like this:

```sh
Running "GestureImageViewerExample" with {"fabric":true,"initialProps":{"concurrentRoot":true},"rootTag":1}
```

Note the `"fabric":true` and `"concurrentRoot":true` properties.

To run the example app on Web:

```sh
pnpm example web
```

Make sure your code passes TypeScript, linting, formatting, and tests:

```sh
pnpm typecheck
pnpm lint
pnpm format:check
pnpm test
```

## Commit Message Convention

We follow the [conventional commits specification](https://www.conventionalcommits.org/en) for commit messages:

- `fix`: bug fixes, e.g. fix crash due to deprecated method.
- `feat`: new features, e.g. add new method to the module.
- `refactor`: code refactor, e.g. migrate from class components to hooks.
- `docs`: changes into documentation, e.g. add usage example for the module.
- `test`: adding or updating tests, e.g. add integration tests.
- `chore`: tooling changes, e.g. change CI config.

Our pre-commit hooks verify that your commit message matches this format when committing.

## Scripts

The root `package.json` contains scripts for common tasks:

- `pnpm install`: install workspace dependencies.
- `pnpm format`: format supported files with Oxfmt.
- `pnpm format:check`: check formatting without writing files.
- `pnpm lint`: lint source files with Oxlint.
- `pnpm lint:fix`: apply safe Oxlint fixes.
- `pnpm typecheck`: type-check the library package.
- `pnpm test`: run library unit tests with [Jest](https://jestjs.io/).
- `pnpm build`: build the root library package with Bob.
- `pnpm example start`: start the Metro server for the example app.
- `pnpm example android`: run the example app on Android.
- `pnpm example ios`: run the example app on iOS.
- `pnpm example:build`: export the example app for web.
- `pnpm docs:typecheck`: type-check the Rspress docs package.
- `pnpm docs:build`: build the Rspress docs package.

## Sending A Pull Request

> **Working on your first pull request?** You can learn how from this _free_ series: [How to Contribute to an Open Source Project on GitHub](https://app.egghead.io/playlists/how-to-contribute-to-an-open-source-project-on-github).

When you're sending a pull request:

- Prefer small pull requests focused on one change.
- Verify that linters and tests are passing.
- Review the documentation to make sure it looks good.
- Follow the pull request template when opening a pull request.
- For pull requests that change the API or implementation, discuss with maintainers first by opening an issue.
