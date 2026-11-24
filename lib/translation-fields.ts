import type { Entity } from './db';
import type { EntityType, Product, Category, Featured } from './types';
export function sourceFields(type: EntityType, p: Entity): Record<string, string> {
  if (type === 'products') {
    const a = p as Product;
    return {
      name: a.name_id,
      short_description: a.short_description_id,
      description: a.description_id,
      unit_label: a.unit_label_id,
      ...Object.fromEntries(
        [...a.images]
          .filter((i) => i.alt_id.trim())
          .sort((a, b) => a.id.localeCompare(b.id))
          .map((i) => [`alt:${i.id}`, i.alt_id]),
      ),
    };
  }
  if (type === 'categories') return { name: (p as Category).name_id };
  const f = p as Featured;
  return { title: f.title_id, subtitle: f.subtitle_id, cta: f.cta_id };
}
