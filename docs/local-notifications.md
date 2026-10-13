# Local reminder permissions

The app requests local-notification permission through Expo Notifications on supported native devices, including simulators and emulators. It does not register push tokens or enable remote push notification infrastructure.

Android's `event-reminders` channel is created before the runtime permission request and before reminder scheduling. The OS owns permission and channel preferences. Granted permission does not cause another prompt; denied permission leaves reminder state unchanged and explains that nothing was set. Saved plans remain independent and usable.

Single-event and batch reminders use the same local channel. Calendar drafts keep their separate OS-editor permission flow. Physical-device delivery and simulator delivery require native validation; source tests do not establish OS delivery.

A stored reminder request with an unresolved published time appears unavailable. The detail screen explains why it cannot be scheduled and offers an explicit removal action. The stored request remains present until the user removes it.
