# Event Flow Diagram

```
Current Architecture:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

┌─────────────────────────────────────────────────────────────────┐
│                         BLENDER EVENTS                           │
└─────────────────────────────────────────────────────────────────┘
                            ↓
    ┌───────────────────────┼───────────────────────┐
    ↓                       ↓                       ↓
┌─────────────────┐  ┌──────────────┐  ┌──────────────────────┐
│ depsgraph_update│  │ frame_change │  │  save_post/load_post │
│   (100+/sec)    │  │  (24-60/sec) │  │     (<1/sec)         │
│ ⚠️ HIGH CPU     │  │ ⚠️ SPAM      │  │   ✅ GOOD           │
└─────────────────┘  └──────────────┘  └──────────────────────┘
         ↓                   ↓                      ↓
         └───────────────────┴──────────────────────┘
                            ↓
                  ┌─────────────────┐
                  │ send_to_blendmate│
                  │   (adds to queue)│
                  └─────────────────┘
                            ↓
                  ┌─────────────────┐
                  │  Message Queue  │
                  │  (thread-safe)  │
                  └─────────────────┘
                            ↓
                  ┌─────────────────┐
                  │  Timer (100ms)  │
                  │ process_queue() │
                  │   ✅ OPTIMAL    │
                  └─────────────────┘
                            ↓
                  ┌─────────────────┐
                  │   WebSocket     │
                  │ (background     │
                  │   thread)       │
                  └─────────────────┘
                            ↓
                  ┌─────────────────┐
                  │  Blendmate App  │
                  └─────────────────┘

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━


Proposed Architecture (After Migration):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

┌─────────────────────────────────────────────────────────────────┐
│                         BLENDER EVENTS                           │
└─────────────────────────────────────────────────────────────────┘
                            ↓
    ┌───────────────────────┼───────────────────────┐
    ↓                       ↓                       ↓
┌─────────────────┐  ┌──────────────┐  ┌──────────────────────┐
│   MSGBUS        │  │ frame_change │  │  save_post/load_post │
│ node_tree       │  │  (debounced) │  │   (normalized)       │
│  changes        │  │   ~10/sec    │  │     (<1/sec)         │
│ ✅ TARGETED     │  │ ✅ EFFICIENT │  │   ✅ GOOD           │
└─────────────────┘  └──────────────┘  └──────────────────────┘
         ↓                   ↓                      ↓
         └───────────────────┴──────────────────────┘
                            ↓
                  ┌─────────────────┐
                  │ send_to_blendmate│
                  │ (debounce helper)│
                  └─────────────────┘
                            ↓
                  ┌─────────────────┐
                  │  Message Queue  │
                  │  (thread-safe)  │
                  └─────────────────┘
                            ↓
                  ┌─────────────────┐
                  │  Timer (100ms)  │
                  │ process_queue() │
                  │   ✅ OPTIMAL    │
                  └─────────────────┘
                            ↓
                  ┌─────────────────┐
                  │   WebSocket     │
                  │ (background     │
                  │   thread)       │
                  └─────────────────┘
                            ↓
                  ┌─────────────────┐
                  │  Blendmate App  │
                  │ (receives       │
                  │  normalized     │
                  │  events)        │
                  └─────────────────┘

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━


Key Improvements:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. MSGBUS MIGRATION
   Before: depsgraph_update fires 100+ times/sec
   After:  msgbus fires only on actual node tree changes
   Impact: 90%+ CPU reduction

2. DEBOUNCING
   Before: frame_change fires 24-60 times/sec
   After:  debounced to ~10 times/sec (100ms window)
   Impact: 75%+ message reduction, imperceptible delay

3. NORMALIZATION
   Before: Inconsistent payload formats
   After:  All events follow schema from protocol-events-v0.1.json
   Impact: Better app integration, future-proof

4. QUEUE + TIMER (unchanged)
   Already optimal! Decouples event handling from I/O
   No changes needed ✅


Performance Comparison:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

                          CURRENT    →    PROPOSED    IMPROVEMENT
                          ───────         ────────    ───────────
Node detection calls/sec:  100+      →      <1           99%
Frame change msgs/sec:     24-60     →     ~10           75%
Total handler overhead:    HIGH      →      LOW          90%
Message queue efficiency:  GOOD      →     GOOD          0% (keep)
```
