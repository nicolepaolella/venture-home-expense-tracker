# public/

Files in this folder are served at the root URL (e.g., `/logo.png`).

## Add your company logo

Drop an image file named **`logo.png`** into this folder. The sidebar will pick
it up automatically on the next browser refresh.

Tips:
- PNG with a transparent background works best on the dark sidebar.
- Aim for at least 220px wide and 56px tall (or any image that fits roughly
  those proportions). The CSS resizes it to fit.
- JPG works too — just rename to `logo.jpg` and change `/logo.png` to
  `/logo.jpg` in `src/App.jsx` (line near the `<img src=...` tag).
