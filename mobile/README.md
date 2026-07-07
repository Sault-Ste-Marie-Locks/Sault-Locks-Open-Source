# Sault Locks Ship Tracker - accent + alignment fix

This build fixes the selected accent colour in light mode by writing accent variables to both `html` and `body`, then applies the same accent to buttons, active tabs, settings toggles, save buttons, focus rings, hero cards, and return controls.

It also adds final alignment rules for time rows, Sync Time buttons, return selectors, Clear buttons, popup action buttons, and settings segmented buttons across the app.

Replace the old files and hard refresh/clear site data once if the browser still shows cached CSS.


Update: Tour Boat entry now has a visible Time field with Sync Time, and the saved Tour Boat log uses that field.


Update 2026-07-06 time + sync button fix:
- Sync Time buttons now use the selected accent theme in light and dark mode.
- Every entry page now defaults the time field to the current time when the entry page is opened/created.
- Existing restored draft times are preserved; empty draft time fields are filled with the current time.
