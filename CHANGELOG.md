# Change notes

The [live web app](https://epsc.vercel.app/) is deployed from `main`. The existing Windows desktop download is a separate build and does not automatically receive web updates.

## 2026-09-25 — Web app improvements

- Added Bulgarian/English and light/dark controls. The browser remembers both choices.
- Made HIBP results easier to interpret: a found password includes a next step; a password not found in HIBP is explicitly not guaranteed safe; and an incomplete check remains clearly marked as incomplete.
- Added a link to the official [HIBP password checker](https://haveibeenpwned.com/Passwords). The entered password is never included in the link.
- Added a Clear button that removes the entered password and displayed results, then returns focus to the input.
- Improved the password field layout on narrow screens.

## 2026-09-25 — HIBP reliability

- Added timeouts and one retry for temporary network, rate-limit, and server failures.
- Rejects malformed HIBP responses instead of treating them as a clean result.
- Shows a specific error and a retry button if the breach check cannot be completed.
- Removed the optional `Add-Padding` request header because browser CORS compatibility was uncertain. Only the first five characters of the SHA-1 hash are sent to HIBP; the full password stays in the browser.

The core test suite passed with 67 tests after these changes. A second online breach source has **not** been added.
