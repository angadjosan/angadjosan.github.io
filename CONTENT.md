# Writing with Galley

Write blog posts in the **Website** project in [Galley](https://galley-app.fly.dev). You do not need to write Markdown, HTML, or edit a JSON file.

## Where to put content

Select **Website** in Galley's project picker. Its API path is `website`, and it is linked to `angadjosan/angadjosan.github.io`. Create your blog documents directly inside this project; no extra folder is needed. Documents in other projects are never imported, even if they have a publishing checkpoint.

Create one document named **INTRO** in the same project for the homepage introduction. In Galley, make its first line a Heading 1 named `INTRO` (this names the document), then write your introduction in normal paragraphs below it. The website leaves out that title and displays only your introduction. Links, bold, italic, underline, and other inline emphasis work; images and heading styles are omitted. You do not need to write Markdown.

INTRO uses the latest saved text on each sync, without a publication checkpoint. It never appears as a blog post. Until INTRO exists, the website retains its built-in introduction. An empty INTRO or duplicate INTRO documents stops deployment with an error instead of publishing an ambiguous or empty introduction. Renaming or moving INTRO out of Website restores the built-in introduction at the next sync.

## Publish a post

1. Create a document inside **Website** in Galley. Make the first line your title using the **Heading 1** toolbar style.
2. Write below it using normal paragraphs, headings, bold, italic, lists, links, tables, quotes, code blocks, and uploaded images.
3. Wait for Galley to show that your changes are saved.
4. Open **File → Version history**.
5. In **Name this version**, enter **Publish to angadjosan.com**, then click **Save**.

That named version is the publication. The importer creates its HTML article, Writing listing, and homepage preview automatically. The title comes from the first heading and the excerpt comes from the first paragraph. Publication time supplies the date. No front matter or metadata syntax is necessary.

The GitHub Pages workflow checks Galley on a 30-minute schedule (at minutes 17 and 47), on pushes to `main`, and when manually run. Scheduled runs can be delayed by GitHub. In a public repository, GitHub disables scheduled workflows after 60 days without repository activity; re-enable the workflow in Actions if this happens. The workflow must be deployed to `main` before automatic updates start.

## Update or remove a post

Keep editing normally. Those edits stay drafts until you save another version named **Publish to angadjosan.com**. The next sync imports the new published snapshot while keeping the article's URL and original publication date.

To take a post off the site, save a version named **Unpublish from angadjosan.com**. It disappears on the next successful deployment. Publishing again restores it at the same URL. Trashing a document in Galley also removes it at the next successful sync. Prefer the named Unpublish version when keeping the document as a draft.

Only documents inside **Website** with the exact publishing label enter the blog (except INTRO, which is reserved for the homepage). Projects and other website pages are not imported from Galley. A network, authentication, image, or conversion failure stops deployment and leaves the currently deployed site intact.

Uploaded PNG, JPEG, GIF, WebP, and AVIF images are copied into the static site. Public HTTPS image URLs can also be used, but remain hosted at their original source. Export Mermaid diagrams and Galley design canvases to an image and insert that image before publishing; those specialized blocks are not rendered by this blog importer.

## Connection and local preview

The server and publication labels are configured in `assets/galley.json`. Locally, the importer uses your existing Galley CLI login (`~/.galley/config.json`) without printing or copying the token into the repository.

```sh
npm ci
npm run galley:sync
npm run build
npm run preview
```

Open http://127.0.0.1:8765. `npm run galley:sync -- --check` verifies the connection and conversion without changing the local cache.

GitHub Actions uses the encrypted `GALLEY_TOKEN` repository secret. To reconnect after changing or revoking your Galley login, sign in to the Galley and GitHub CLIs, then run:

```sh
npm run galley:connect
```

The connection helper sends the saved token directly to GitHub through stdin; it never prints the token. To stop automated publishing, disable the workflow in GitHub Actions. Removing its Galley secret stops future syncs but does not delete the already published website.

## Projects

Projects remain separate and intentionally empty in `assets/projects.json`. Each project requires `slug`, `title`, `category` (`apps` or `inference`), and `summary`. Optional fields: `date`, `image`, `imageAlt`, `demo`, `github`, `website`, and `body` (an array of paragraphs).

Use a root-relative image path such as `/images/project-preview.jpg`, and full HTTPS URLs for external links. Run `npm run build` after editing. The homepage previews the first two projects in each category. Each project gets a detail page at `/projects/SLUG.html`.

`assets/writing.json` remains an optional fallback for hand-managed posts. It is not needed for Galley publishing.

## Development and deployment

```sh
npm test
node scripts/build.mjs --out _site
```

`_site` contains only public HTML, CSS, icons, images, and the résumé. Source files, dependencies, credentials, and `.cache` are excluded. Galley article URLs use the immutable document id, so renaming a title does not break links.

The optional contract test also runs the real Galley server in memory, without changing your notes:

```sh
GALLEY_CHECKOUT=/path/to/galley npm test
```
