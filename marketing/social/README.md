# Kart Connect social posts

Kit for building on-brand Instagram carousel posts (1080×1350) for Kart Connect.

- `BRAND.md` — the rules every post follows. Read it first.
- `SCHEDULE.md` — the current series and the angle for each post.
- `examples/` — approved posts as JSON specs. Match their style.
- `assets/` — the logo and real app screenshots.
- `build.py` — turns a JSON spec into slide images, a preview and a review page.

```bash
python3 marketing/social/build.py marketing/social/examples/post-2-race-weekend.json /tmp/out
```

Output: `slide-01.png` … in `/tmp/out`, plus `preview.png` (all slides in a row) and `index.html`
(the review page with slides and captions, published as a private Artifact and emailed as a link).
