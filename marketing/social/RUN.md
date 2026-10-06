# Scheduled run: build and email one post

Each scheduled run handles exactly one post from `SCHEDULE.md`. The run's prompt gives the post number.

1. **Get the kit.** It lives on branch `claude/cart-connect-social-posts-ektax0`:
   `git fetch origin claude/cart-connect-social-posts-ektax0 && git checkout claude/cart-connect-social-posts-ektax0`
2. **Read** `BRAND.md`, this post's section in `SCHEDULE.md`, every file in `examples/` and every file already in `posts/`.
   The approved style is in those files. Copy their structure: slide 1 is the hook at the bottom of the slide (`.spacer` first),
   the middle slides explain, the last slide is a short close.
3. **Check facts in the app code** (`src/`) for anything the post claims. Don't claim what the code and `SCHEDULE.md` don't support.
4. **Write the spec** to `marketing/social/posts/<slug>.json` (slug from `SCHEDULE.md`), with `title`, `slides` and two `captions`.
5. **Build:** `python3 marketing/social/build.py marketing/social/posts/<slug>.json <scratchpad>/<slug>`
6. **Look once** at `<scratchpad>/<slug>/preview.png`, and at any slide that looks crowded at full size.
   Fix overflow, text running into the footer, or a word broken across lines; rebuild once. Then move on.
7. **Publish** with the Artifact tool (load the `artifact-design` skill first): `file_path` = `<scratchpad>/<slug>/index.html`,
   `files` = each `slide-NN.png` mapped to its own name, `icon` = `image`,
   `description` = "Kart Connect social post N of 9: <title>."
8. **Email** with Gmail `send_message` to `jacques.houseofjbads@gmail.com`:
   - Subject: `Kart Connect post N of 9: <title>`
   - Body: same layout as post 1 (gradient bar, "Social post N of 9", title, one line on what the post covers,
     a purple "Open the slides and captions" button linking to the Artifact URL, the save-and-post tip,
     "The link opens when you're signed in to Claude. The slide images are also in your Kart Connect chat in the Claude app, ready to save.", caption option A, caption option B,
     and a last line naming the next post and its date from `SCHEDULE.md`, or "That's the last post in this series." for post 9).
   - Also pass a plain-text `body` with the link and both captions.
9. **Send the slides to the owner's phone:** call `SendUserFile` with every `slide-NN.png` in order, then `<slug>.pdf`,
   `status: "proactive"`, `display: "attach"`, caption "Post N of 9: <title>. Slides in order, ready to save and post, plus a PDF of all slides."
   The owner saves these straight from the Claude app, so this step is required, not optional.
10. **Record it:** commit `marketing/social/posts/<slug>.json` and push to `claude/cart-connect-social-posts-ektax0`
   (`git push -u origin claude/cart-connect-social-posts-ektax0`, retry up to 4 times on network errors).
   Don't change any other files.

If something blocks the run (build fails, Gmail refuses), send a short email to the same address saying which post
could not be built and why, so the owner knows to ask for it.
