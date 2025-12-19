import { KBNodeEntry, KBNodeMeta } from "../types/kb";

// Pro vývojové účely v prohlížeči budeme simulovat načítání.
// V produkci (Tauri) budeme používat Tauri FS API nebo fetch z assetů.

export async function loadNodeHelp(nodeId: string): Promise<KBNodeEntry> {
  try {
    // Simulace fetch volání (předpokládáme, že knowledge je v public nebo assetech)
    // V reálném Tauri prostředí bychom použili pathResolver k získání cesty
    const metaResponse = await fetch(`/knowledge/blender-4.5/${nodeId}/meta.json`);
    if (!metaResponse.ok) throw new Error("Node meta not found");
    const meta: KBNodeMeta = await metaResponse.json();

    let markdown: string | undefined;
    try {
      const infoResponse = await fetch(`/knowledge/blender-4.5/${nodeId}/info.md`);
      if (infoResponse.ok) {
        markdown = await infoResponse.text();
      }
    } catch (e) {
      console.warn(`No info.md found for ${nodeId}`);
    }

    // Preview URL - jednoduše sestavíme cestu
    const previewUrl = `/knowledge/blender-4.5/${nodeId}/preview.webp`;

    return {
      meta,
      markdown,
      previewUrl
    };
  } catch (error) {
    console.error(`Failed to load KB for ${nodeId}:`, error);
    throw error;
  }
}
