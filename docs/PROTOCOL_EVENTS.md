# Protocol Events Catalog (v0.1)

This catalog targets Blender 4.5 and is generated from publicly available handlers in the Python API (e.g., `bpy.app.handlers.*`, `bpy.app.timers`, and `bpy.msgbus`). It is intentionally minimal so the Blendmate app can serialize events consistently.

## Extending for future Blender versions

1. **Clone the matching Blender tag** (e.g., `v4.6.x`) and skim the `release/scripts/modules/bpy/app/handlers.py` and `source/blender/makesrna` RNA updates for new handlers or properties.
2. **Check API docs** at https://docs.blender.org/api/current/ for new or deprecated handlers (`bpy.app.handlers`, `bpy.msgbus`) and updated payload fields.
3. **Add new events** by creating structured entries in `docs/protocol-events-v0.x.json` with `name`, `description`, `origin`, and `payload_schema_example`. Prefer additive changes; avoid renaming existing payload keys.
4. **Version the catalog**: bump the filename suffix (e.g., `protocol-events-v0.2.json`) and keep prior files for backward compatibility.
5. **Document migrations**: note handler changes and payload deltas in this file so clients know how to transition between versions.

Following these steps keeps the event contract aligned with Blender releases while preserving compatibility for Blendmate clients.
