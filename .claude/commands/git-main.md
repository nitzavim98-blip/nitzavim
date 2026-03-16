Run `git diff --cached --stat && git diff --stat` to see what changed, then write a concise commit message summarizing the changes.

Execute these commands in order:
1. `git add .`
2. `git commit -m "<summary of changes>"`  — replace the placeholder with an actual summary based on the diff
3. `git push origin main`

Keep the commit message short and descriptive (under 72 chars). Use imperative mood (e.g. "Add watchlist toggle", "Fix recommendation fetch error").
