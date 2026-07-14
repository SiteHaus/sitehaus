/**
 * Common values to offer once a seller names what varies ("Size" -> S, M, L…).
 *
 * Purely a typing shortcut: everything here is still free text, and a dimension we
 * don't recognise (Count, Capsules, Grind…) simply gets no suggestions rather than
 * wrong ones. Better to offer nothing than to make someone delete six bad guesses.
 */
const SUGGESTIONS: Record<string, string[]> = {
  size: ["XS", "S", "M", "L", "XL", "XXL"],
  color: ["Black", "White", "Grey", "Navy", "Blue", "Green", "Red", "Pink", "Beige", "Brown"],
  material: ["Cotton", "Linen", "Wool", "Leather", "Denim", "Silk", "Polyester"],
  fit: ["Slim", "Regular", "Relaxed", "Oversized"],
  style: ["Classic", "Modern", "Vintage"],
  finish: ["Matte", "Glossy", "Satin", "Brushed"],
  flavor: ["Vanilla", "Chocolate", "Strawberry", "Unflavored"],
  scent: ["Unscented", "Lavender", "Citrus", "Vanilla", "Sandalwood"],
  width: ["Narrow", "Regular", "Wide"],
};

/** "Colors" and "Colour" should both find the color list. */
function normalize(name: string) {
  const key = name.trim().toLowerCase().replace(/s$/, "");
  return key === "colour" ? "color" : key === "flavour" ? "flavor" : key;
}

export function suggestionsFor(dimensionName: string): string[] {
  return SUGGESTIONS[normalize(dimensionName)] ?? [];
}
