export interface KBNodeMeta {
  node_id: string;
  name: string;
  category: string;
  description: string;
  blender_version: string;
  tags: string[];
}

export interface KBNodeEntry {
  meta: KBNodeMeta;
  markdown?: string;
  previewUrl?: string;
}
