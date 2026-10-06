<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Architecture
- Online AI goes through `src/routes/api/chat.ts` → `src/lib/ai/chat.server.ts`; models are swapped only in its `PROVIDER_MODELS` map. Why: keys stay server-side, one place to change providers.
- Calculator math lives in `src/lib/calc/core.ts`, shared by on-device answers and AI tools. Why: one source of truth for results.
- Chat history is stored in the browser (IndexedDB); offline app shell is `public/sw.js`, registered only on the published site. Why: no login needed, and the editor preview stays uncached.
