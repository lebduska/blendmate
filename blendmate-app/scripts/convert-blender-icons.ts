/**
 * Convert Blender SVG icons to React components
 *
 * Usage: npx tsx scripts/convert-blender-icons.ts
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, basename } from 'path';

// Icons to convert (from domain/blender/icons.ts)
const ICONS_TO_CONVERT = [
  // Object types
  'mesh_data',
  'curve_data',
  'surface_data',
  'meta_data',
  'font_data',
  'volume_data',
  'curves_data',
  'pointcloud_data',
  'outliner_data_greasepencil',
  'armature_data',
  'lattice_data',
  'camera_data',
  'light_data',
  'lightprobe_sphere',
  'empty_data',
  'speaker',

  // Modifiers
  'mod_subsurf',
  'mod_solidify',
  'mod_boolean',
  'mod_array',
  'mod_bevel',
  'mod_decim',
  'mod_triangulate',
  'mod_weld',
  'mod_screw',
  'mod_skin',
  'mod_remesh',
  'mod_build',
  'mod_wireframe',
  'mod_edgesplit',
  'mod_mask',
  'mod_multires',
  'mod_mirror',
  'mod_armature',
  'mod_lattice',
  'mod_shrinkwrap',
  'mod_simpledeform',
  'mod_smooth',
  'mod_meshdeform',
  'hook',
  'mod_cast',
  'mod_curve',
  'mod_displace',
  'mod_wave',
  'mod_warp',
  'geometry_nodes',
  'mod_cloth',
  'mod_fluid',
  'mod_physics',
  'mod_soft',
  'mod_particles',
  'mod_dynamicpaint',
  'mod_ocean',

  // Categories
  'object_data',
  'orientation_global',
  'modifier',
  'material',

  // UI - Visibility
  'hide_off',
  'hide_on',
  'restrict_render_off',
  'restrict_render_on',

  // UI - Outliner
  'outliner_collection',
];

const SOURCE_DIR = process.env.HOME + '/.ai-workspace/assets/blender-icons';
const OUTPUT_DIR = './src/components/icons/blender';

function toPascalCase(str: string): string {
  return str
    .split(/[-_]/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join('');
}

function cleanSvg(svgContent: string): string {
  // Remove XML declaration
  let cleaned = svgContent.replace(/<\?xml[^>]*\?>/g, '');

  // Remove sodipodi and inkscape namespaces from svg tag
  cleaned = cleaned.replace(/xmlns:inkscape="[^"]*"/g, '');
  cleaned = cleaned.replace(/xmlns:sodipodi="[^"]*"/g, '');

  // Remove sodipodi:namedview and its contents
  cleaned = cleaned.replace(/<sodipodi:namedview[^>]*>[\s\S]*?<\/sodipodi:namedview>/g, '');
  cleaned = cleaned.replace(/<sodipodi:namedview[^/]*\/>/g, '');

  // Remove inkscape: attributes
  cleaned = cleaned.replace(/inkscape:[a-z-]+="[^"]*"/gi, '');

  // Replace fill="#fff" or fill="white" with currentColor
  cleaned = cleaned.replace(/fill="#fff"/g, 'fill="currentColor"');
  cleaned = cleaned.replace(/fill="white"/g, 'fill="currentColor"');
  cleaned = cleaned.replace(/fill="#ffffff"/gi, 'fill="currentColor"');

  // Keep original viewBox - let SVG scaling handle everything
  // The viewBox 0 0 1600 1600 works correctly with the transforms
  cleaned = cleaned.replace(/width="1600"/g, '');
  cleaned = cleaned.replace(/height="1600"/g, '');

  // Clean up extra whitespace
  cleaned = cleaned.replace(/\s+/g, ' ').trim();

  return cleaned;
}

function createReactComponent(iconName: string, svgContent: string): string {
  const componentName = toPascalCase(iconName);
  const cleanedSvg = cleanSvg(svgContent);

  // Extract the inner content (everything between <svg> tags)
  const innerMatch = cleanedSvg.match(/<svg[^>]*>([\s\S]*)<\/svg>/);
  const innerContent = innerMatch ? innerMatch[1].trim() : '';

  // Convert SVG attributes to JSX (basic conversions)
  const jsxContent = innerContent
    .replace(/fill-rule=/g, 'fillRule=')
    .replace(/clip-rule=/g, 'clipRule=')
    .replace(/stroke-width=/g, 'strokeWidth=')
    .replace(/stroke-linecap=/g, 'strokeLinecap=')
    .replace(/stroke-linejoin=/g, 'strokeLinejoin=')
    .replace(/enable-background=/g, 'enableBackground=');

  return `import type { SVGProps } from 'react';

interface ${componentName}Props extends SVGProps<SVGSVGElement> {
  size?: number | string;
}

export function ${componentName}({ size = 24, ...props }: ${componentName}Props) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 1600 1600"
      width={size}
      height={size}
      fill="currentColor"
      {...props}
    >
      ${jsxContent}
    </svg>
  );
}
`;
}

function main() {
  // Create output directory
  if (!existsSync(OUTPUT_DIR)) {
    mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  const converted: string[] = [];
  const failed: string[] = [];

  for (const iconName of ICONS_TO_CONVERT) {
    const sourcePath = join(SOURCE_DIR, `${iconName}.svg`);

    if (!existsSync(sourcePath)) {
      console.warn(`⚠ Icon not found: ${iconName}`);
      failed.push(iconName);
      continue;
    }

    try {
      const svgContent = readFileSync(sourcePath, 'utf-8');
      const component = createReactComponent(iconName, svgContent);
      const outputPath = join(OUTPUT_DIR, `${toPascalCase(iconName)}.tsx`);

      writeFileSync(outputPath, component);
      converted.push(iconName);
      console.log(`✓ ${iconName} → ${toPascalCase(iconName)}.tsx`);
    } catch (err) {
      console.error(`✗ Error converting ${iconName}:`, err);
      failed.push(iconName);
    }
  }

  // Create barrel export
  const exports = converted
    .map(name => `export { ${toPascalCase(name)} } from './${toPascalCase(name)}';`)
    .join('\n');

  writeFileSync(join(OUTPUT_DIR, 'index.ts'), exports + '\n');

  console.log(`\n✓ Converted ${converted.length} icons`);
  if (failed.length > 0) {
    console.log(`✗ Failed: ${failed.length} (${failed.join(', ')})`);
  }
}

main();
