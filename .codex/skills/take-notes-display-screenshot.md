# Skill: Capture notes display screenshot (Upload MIDI file test)

## Goal
Take a screenshot showing the rendered note blocks after uploading the `music/hejsokoly.mid` MIDI file.

## Steps
1. Start the dev server:
   ```bash
   npm run dev -- --host 0.0.0.0 --port 5173
   ```
2. Use Playwright to load the app and upload the MIDI file:
   - Navigate to `http://127.0.0.1:5173/guitar/`.
   - Select **Ukulele** in the instrument dropdown.
   - Upload `music/hejsokoly.mid` via the file input.
   - Wait for `.note` elements to render (notes are drawn as positioned blocks).
3. Scroll the `.scroll-container` horizontally to bring the first note into view if needed.
4. Capture a full-page screenshot once notes are visible.

## Verification
Confirm the screenshot shows note blocks with fret numbers over the tab lines.
