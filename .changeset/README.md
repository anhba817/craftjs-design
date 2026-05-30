# Changesets

This folder is managed by [Changesets](https://github.com/changesets/changesets).
It's how `@crafted-design/editor` versions + publishes.

## Adding a changeset (do this in every PR that changes shipped behavior)

```bash
npm run changeset
```

Pick the bump level and write a one-line summary:

- **patch** — bug fix, internal change, doc-only that affects the package.
- **minor** — new canonical / adapter / theme / SDK export / panel (the
  `0.x` norm — see CHANGELOG "What counts as a breaking change").
- **major** — removes an export, drops a built-in canonical, changes the
  document envelope without a migration, or renames a registered panel id.

Commit the generated `.changeset/*.md` with your PR. The release workflow
consumes pending changesets on merge to `main`.

## Releasing (automated)

On merge to `main`, the release workflow runs `changeset version` (bumps
`package.json` + folds the changesets into `CHANGELOG.md`) and
`changeset publish` (builds dist + publishes to npm under the `next`
dist-tag). Until `1.0.0` we publish behind `next`; promote to `latest`
manually when the SDK surface freezes.
