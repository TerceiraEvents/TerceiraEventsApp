# Calendar drafts and event reminders

`islandInstant(date, clock)` resolves a published clock in Atlantic/Azores independently of the device timezone. It requires a unique instant: spring gaps and autumn folds return an unresolved reason. Intl supplies timezone rules; the fallback uses the island's UTC−1/UTC offsets and EU last-Sunday transitions for years 1996 onward. Historic offsets outside those supported candidates remain unresolved.

`publishedEventTime(event)` accepts a single HH:mm or a complete HH:mm–HH:mm clock range, including whitespace and overnight ranges. A multi-day programme has no single attendance instant. Free-form schedules remain published information rather than an inferred clock.

`calendarDraft(event)` builds data for the OS calendar editor. A published clock range supplies its full duration and Atlantic/Azores timezone. A start without a published end uses a one-hour placeholder that is explicitly disclosed before review and in the draft notes. Missing-time and multi-day programmes use reviewed all-day drafts covering their inclusive published dates. All-day date components are floating calendar days; they do not assert an attendance time. Ambiguous or nonexistent clocks cannot create a timed draft. Canceling review makes no calendar call; the system editor owns the final user decision.

`reminderDate(event, leadMinutes, now)` returns a future reminder instant only for a uniquely published single occurrence. Reminder attempts without one explain that nothing was scheduled. Cleanup uses the island calendar day and retains the date/name reminder IDs. Daily summaries use the configured device clock.

The app uses the existing Expo Calendar public system-editor API. iOS 17+ manages its editor permissions; earlier supported iOS versions request calendar permission first. Android cannot distinguish saved from canceled editor results, so the app reports success only when the API explicitly returns `saved`.
