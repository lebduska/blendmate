export interface KBNodeMeta {
  node_id: string;
  name: string;
  category: string;
  description: string;
  blender_version: string;
  tags: string[];
}

export interface KBNodeParam {
  name: string;
  type: string;
  description?: string;
  options?: string[];
}

export interface KBNodeParams {
  inputs?: KBNodeParam[];
  properties?: KBNodeParam[];
  outputs?: KBNodeParam[];
  notes?: string[];
}

export interface KBNodeEntry {
  meta: KBNodeMeta;
  markdown?: string;
  previewUrl?: string;
  params?: KBNodeParams;
}
