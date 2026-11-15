# JARVIS — Android narrow/desktop-mode viewport fix

The user's physical Android screen recording of the newly published `/jarvis-unified` revealed two narrow columns and small text. It is consistent with the browser rendering a desktop-like viewport around 864 CSS pixels rather than activating the existing `max-width:680px` layout.

This CSS-only candidate fix uses a single column under 980 CSS pixels, raises tap target and text sizes, and keeps the two-column desktop layout on large screens. Under 420 pixels it stacks the advanced modules vertically. The Android-like Chromium test additionally checks the single-column layout at 864px, plus its existing 360/393/412px workflow, import cancellation and chat.

**No changes to Cloudflare Access, D1, chat behavior or production code have been deployed by this PR.** Chat's statement that a plan was “approved” while the approval queue showed none is a separate semantic concern and must not be interpreted as a confirmed action.
