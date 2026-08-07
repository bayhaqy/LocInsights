/**
 * Competitor brand catalog — predefined list of non-MAP competitor brands in Indonesia.
 * Used by the Phase 2 competitor scraper.
 */

export interface CompetitorBrand {
  name: string
  category: 'convenience_store' | 'fast_food' | 'coffee' | 'fashion' | 'beauty' | 'supermarket' | 'pharmacy' | 'other'
  osm_tags: string[] // OSM tag patterns to query via Overpass
  search_terms: string[] // Nominatim search terms (brand + Indonesia)
}

export const COMPETITOR_BRANDS: CompetitorBrand[] = [
  // === Convenience stores ===
  { name: 'Indomaret', category: 'convenience_store', osm_tags: ['"brand"="Indomaret"', '"shop"="convenience"'], search_terms: ['Indomaret Bali'] },
  { name: 'Alfamart', category: 'convenience_store', osm_tags: ['"brand"="Alfamart"', '"shop"="convenience"'], search_terms: ['Alfamart Bali'] },
  { name: 'Circle K', category: 'convenience_store', osm_tags: ['"brand"="Circle K"', '"shop"="convenience"'], search_terms: ['Circle K Bali'] },
  { name: 'FamilyMart', category: 'convenience_store', osm_tags: ['"brand"="FamilyMart"', '"shop"="convenience"'], search_terms: ['FamilyMart Bali'] },

  // === Coffee ===
  { name: "McDonald's", category: 'fast_food', osm_tags: ['"brand"="McDonald\'s"', '"amenity"="fast_food"'], search_terms: ["McDonald's Bali"] },
  { name: 'KFC', category: 'fast_food', osm_tags: ['"brand"="KFC"', '"amenity"="fast_food"'], search_terms: ['KFC Bali'] },
  { name: 'J.CO Donuts', category: 'fast_food', osm_tags: ['"brand"="J.CO Donuts"', '"amenity"="fast_food"'], search_terms: ['J.CO Bali'] },
  { name: 'Domino Pizza', category: 'fast_food', osm_tags: ['"brand"="Domino\'s Pizza"', '"amenity"="fast_food"'], search_terms: ['Domino Pizza Bali'] },
  { name: 'Burger King', category: 'fast_food', osm_tags: ['"brand"="Burger King"', '"amenity"="fast_food"'], search_terms: ['Burger King Bali'] },
  { name: 'A&W', category: 'fast_food', osm_tags: ['"brand"="A&W"', '"amenity"="fast_food"'], search_terms: ['A&W Restaurants Bali'] },

  // === Coffee ===
  { name: 'Janji Jiwa', category: 'coffee', osm_tags: ['"brand"="Janji Jiwa"', '"amenity"="cafe"'], search_terms: ['Janji Jiwa Bali'] },
  { name: 'Kopi Kenangan', category: 'coffee', osm_tags: ['"brand"="Kopi Kenangan"', '"amenity"="cafe"'], search_terms: ['Kopi Kenangan Bali'] },
  { name: 'Excelso', category: 'coffee', osm_tags: ['"brand"="Excelso"', '"amenity"="cafe"'], search_terms: ['Excelso Coffee Bali'] },
  { name: 'Tomoro Coffee', category: 'coffee', osm_tags: ['"brand"="Tomoro Coffee"', '"amenity"="cafe"'], search_terms: ['Tomoro Coffee Bali'] },
  { name: 'Fore Coffee', category: 'coffee', osm_tags: ['"brand"="Fore"', '"amenity"="cafe"'], search_terms: ['Fore Coffee Bali'] },

  // === Fashion / Lifestyle ===
  { name: 'Uniqlo', category: 'fashion', osm_tags: ['"brand"="Uniqlo"', '"shop"="clothes"'], search_terms: ['Uniqlo Bali'] },
  { name: 'H&M', category: 'fashion', osm_tags: ['"brand"="H&M"', '"shop"="clothes"'], search_terms: ['H&M Bali'] },
  { name: 'Miniso', category: 'fashion', osm_tags: ['"brand"="Miniso"', '"shop"="variety_store"'], search_terms: ['Miniso Bali'] },

  // === Beauty ===
  { name: 'Guardian', category: 'beauty', osm_tags: ['"brand"="Guardian"', '"shop"="chemist"'], search_terms: ['Guardian store Bali'] },
  { name: 'Watsons', category: 'beauty', osm_tags: ['"brand"="Watsons"', '"shop"="chemist"'], search_terms: ['Watsons Bali'] },
  { name: 'Sociolla', category: 'beauty', osm_tags: ['"brand"="Sociolla"', '"shop"="beauty"'], search_terms: ['Sociolla Bali'] },

  // === Supermarket ===
  { name: 'Carrefour', category: 'supermarket', osm_tags: ['"brand"="Carrefour"', '"shop"="supermarket"'], search_terms: ['Carrefour Bali'] },
  { name: 'Hypermart', category: 'supermarket', osm_tags: ['"brand"="Hypermart"', '"shop"="supermarket"'], search_terms: ['Hypermart Bali'] },
  { name: 'Lotte Mart', category: 'supermarket', osm_tags: ['"brand"="Lotte Mart"', '"shop"="supermarket"'], search_terms: ['Lotte Mart Bali'] },
  { name: 'Bintang Supermarket', category: 'supermarket', osm_tags: ['"brand"="Bintang"', '"shop"="supermarket"'], search_terms: ['Bintang Supermarket Bali'] },
  { name: 'Pepito', category: 'supermarket', osm_tags: ['"brand"="Pepito"', '"shop"="supermarket"'], search_terms: ['Pepito Bali'] },

  // === Pharmacy ===
  { name: 'Kimia Farma', category: 'pharmacy', osm_tags: ['"brand"="Kimia Farma"', '"amenity"="pharmacy"'], search_terms: ['Kimia Farma Bali'] },
  { name: 'K24', category: 'pharmacy', osm_tags: ['"brand"="K24"', '"amenity"="pharmacy"'], search_terms: ['K24 Apotek Bali'] },
]

// Bali bounding box (used to constrain Overpass queries)
export const BALI_BBOX: [number, number, number, number] = [-8.85, 114.43, -8.05, 115.72]
