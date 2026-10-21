// Node-only test tooling (not shipped to browsers): resolve figkit's bare specifiers
// (figkit/…, app/…) the way a built page's import map does. Used by `figkit test`.
import { register } from "node:module";

register(new URL("./hooks.mjs", import.meta.url), { data: JSON.parse(process.env.FIGKIT_ROOTS ?? "{}") });
