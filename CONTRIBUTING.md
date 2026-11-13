# Contributing

Kanjiskole started as a personal project and is maintained by one person, so the pace is relaxed. Bug reports,
ideas and pull requests are all welcome.

- **Bugs and ideas**: open an issue with the templates. For wrong readings or meanings, the fix belongs upstream
  in JMdict/KANJIDIC2 (the issue form links to how), and arrives here with the next data build.
- **Security**: never in an issue; see [SECURITY.md](SECURITY.md).
- **Pull requests**: small and focused. Talk about anything large in an issue first.

## Working on the code

Setup and the full list of commands are in the [README](README.md#development). Before you push:

```sh
npm test && npm run typecheck && npm run lint
```

CI also runs the audit, the native-module and notices checks, both bundles, the data build and a REUSE lint.

## Conventions

- **Logic goes in `packages/core`** with tests; the app only renders it and wires up storage.
- **Both languages**: every UI string exists in Danish and English (`app/src/i18n/`). English is typed against
  Danish, so a missing key is a compile error.
- **Dependencies**: exact versions, at least two weeks old, and native modules at the versions the Expo SDK lists
  (`npm run check:native`). Lifecycle scripts stay disabled.
- **Data** is generated (`npm run data`), never edited by hand.
- **Decisions** that change behaviour or architecture get a short entry in `docs/DECISIONS.md`.
- **Comments** say why, not what. Each file starts with one line on what it is for.

## Licence

By contributing you agree that your contribution is licensed under the [GPL-3.0](LICENSE), like the rest of the
code. Please follow the [Code of Conduct](CODE_OF_CONDUCT.md).
