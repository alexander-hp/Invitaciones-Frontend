export type VisualFontCategory = 'elegant' | 'script' | 'modern' | 'classic' | 'display';

export type VisualFontOption = {
  name: string;
  family: string;
  category: VisualFontCategory;
};

export const VISUAL_FONT_CATEGORIES: Array<{ value: 'all' | VisualFontCategory; label: string }> = [
  { value: 'all', label: 'Todas' },
  { value: 'elegant', label: 'Elegantes' },
  { value: 'script', label: 'Manuscritas' },
  { value: 'modern', label: 'Modernas' },
  { value: 'classic', label: 'Clásicas' },
  { value: 'display', label: 'Decorativas' }
];

export const VISUAL_FONT_CATALOG: VisualFontOption[] = [
  { name: 'Cormorant Garamond', family: "'Cormorant Garamond', serif", category: 'elegant' },
  { name: 'Playfair Display', family: "'Playfair Display', serif", category: 'elegant' },
  { name: 'DM Serif Display', family: "'DM Serif Display', serif", category: 'elegant' },
  { name: 'Libre Baskerville', family: "'Libre Baskerville', serif", category: 'elegant' },
  { name: 'Lora', family: "'Lora', serif", category: 'elegant' },
  { name: 'Bodoni Moda', family: "'Bodoni Moda', serif", category: 'elegant' },
  { name: 'Cinzel', family: "'Cinzel', serif", category: 'elegant' },
  { name: 'Marcellus', family: "'Marcellus', serif", category: 'elegant' },
  { name: 'Great Vibes', family: "'Great Vibes', cursive", category: 'script' },
  { name: 'Pinyon Script', family: "'Pinyon Script', cursive", category: 'script' },
  { name: 'Alex Brush', family: "'Alex Brush', cursive", category: 'script' },
  { name: 'Parisienne', family: "'Parisienne', cursive", category: 'script' },
  { name: 'Allura', family: "'Allura', cursive", category: 'script' },
  { name: 'Dancing Script', family: "'Dancing Script', cursive", category: 'script' },
  { name: 'Sacramento', family: "'Sacramento', cursive", category: 'script' },
  { name: 'Pacifico', family: "'Pacifico', cursive", category: 'script' },
  { name: 'Montserrat', family: "'Montserrat', sans-serif", category: 'modern' },
  { name: 'Poppins', family: "'Poppins', sans-serif", category: 'modern' },
  { name: 'Outfit', family: "'Outfit', sans-serif", category: 'modern' },
  { name: 'Raleway', family: "'Raleway', sans-serif", category: 'modern' },
  { name: 'Nunito Sans', family: "'Nunito Sans', sans-serif", category: 'modern' },
  { name: 'Inter', family: "'Inter', sans-serif", category: 'modern' },
  { name: 'Quicksand', family: "'Quicksand', sans-serif", category: 'modern' },
  { name: 'Georgia', family: 'Georgia, serif', category: 'classic' },
  { name: 'Times New Roman', family: "'Times New Roman', serif", category: 'classic' },
  { name: 'Arial', family: 'Arial, sans-serif', category: 'classic' },
  { name: 'Verdana', family: 'Verdana, sans-serif', category: 'classic' },
  { name: 'Abril Fatface', family: "'Abril Fatface', serif", category: 'display' },
  { name: 'Bebas Neue', family: "'Bebas Neue', sans-serif", category: 'display' },
  { name: 'Cinzel Decorative', family: "'Cinzel Decorative', serif", category: 'display' }
];

