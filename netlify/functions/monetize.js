import { NICHE_MAP, NICHE_KEYS } from './_data.js'

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  'Content-Type': 'application/json',
}

// Platform mechanics — based on how each platform works, not yearly trends
const PLATFORM_DATA = {
  kofi: {
    name:        'Ko-fi',
    icon:        '☕',
    model:       'Tips, memberships, shop, commissions',
    bestFor:     ['art', 'wellness', 'books', 'quotes', 'gaming', 'finance'],
    strengths:   'Low barrier — supporters tip with no subscription required. Best for creators with loyal audience who want to show appreciation.',
    contentTips: [
      'Post free value consistently — Ko-fi supporters tip creators they follow regularly',
      'Offer exclusive behind-the-scenes content for members',
      'Sell digital downloads — templates, presets, guides, wallpapers',
      'Use the shop for one-time digital product sales',
      'Commissions work well for art, writing, and design niches',
    ],
    topProducts: ['Digital downloads', 'Tip jar', 'Monthly membership', 'Commissions', 'Exclusive posts'],
    linkStrategy: 'Add Ko-fi link to every post caption and bio. Mention it at natural end of content.',
  },
  gumroad: {
    name:        'Gumroad',
    icon:        '🛒',
    model:       'Digital products, pay-what-you-want, subscriptions',
    bestFor:     ['finance', 'tech', 'art', 'fitness', 'reviews', 'gaming'],
    strengths:   'Best platform for selling digital products at scale. Built-in discovery and affiliate system.',
    contentTips: [
      'Create PDF guides, templates, or checklists related to your niche',
      'Use pay-what-you-want pricing to lower the entry barrier',
      'Bundle multiple products for higher average order value',
      'Gumroad has its own discovery feed — optimise your product titles with keywords',
      'Offer a free product first to build your buyer list',
    ],
    topProducts: ['PDF guides', 'Templates', 'Video courses', 'Presets', 'eBooks'],
    linkStrategy: 'Create a lead magnet — free product that collects email. Upsell from there.',
  },
  payhip: {
    name:        'Payhip',
    icon:        '💳',
    model:       'Digital products, courses, memberships, physical goods',
    bestFor:     ['skincare', 'fashion', 'food', 'travel', 'wellness', 'books'],
    strengths:   'No monthly fee — only takes percentage of sales. Great for lifestyle and physical product niches.',
    contentTips: [
      'Sell digital lookbooks, recipe collections, or travel guides',
      'Course builder works well for tutorial-heavy niches',
      'EU VAT is handled automatically — good for international creators',
      'Affiliate program built in — let followers earn by sharing your products',
      'Use the coaching feature for 1-on-1 sessions',
    ],
    topProducts: ['Digital guides', 'Online courses', 'Membership plans', 'Coaching sessions', 'Printables'],
    linkStrategy: 'Payhip checkout can be embedded on any site. Link directly from bio and content.',
  },
}

// Generate niche-specific product ideas per platform
function getNicheProducts(niche, platform) {
  const NICHE_PRODUCTS = {
    skincare: {
      kofi:     ['Skincare routine PDF guide', 'Product recommendation list', 'Ingredient glossary download'],
      gumroad:  ['Skincare ingredient cheat sheet', 'Routine builder template', 'Product tracker spreadsheet'],
      payhip:   ['Complete skincare course', 'Personalised routine consultation', 'Skincare printable planner'],
    },
    movies: {
      kofi:     ['Monthly watchlist PDF', 'Film analysis exclusive posts', 'Movie recommendation commission'],
      gumroad:  ['Genre guide eBook', 'Film criticism template', 'Director filmography spreadsheet'],
      payhip:   ['Film study course', 'Movie club membership', 'Cinema history guide'],
    },
    quotes: {
      kofi:     ['Quote wallpaper pack', 'Daily quote membership', 'Custom quote commission'],
      gumroad:  ['Quote design template pack', 'Affirmation card printable', 'Motivational journal PDF'],
      payhip:   ['Mindset course', 'Printable quote poster set', 'Journaling membership'],
    },
    books: {
      kofi:     ['Monthly reading list PDF', 'Book club membership', 'Annotation guide'],
      gumroad:  ['Reading tracker spreadsheet', 'Genre recommendation guide', 'Book review template'],
      payhip:   ['Speed reading course', 'Book club community', 'Reading challenge planner'],
    },
    reviews: {
      kofi:     ['Honest review newsletter', 'Product testing membership', 'Recommendation commission'],
      gumroad:  ['Product comparison template', 'Review framework guide', 'Category buying guide PDF'],
      payhip:   ['Product research course', 'Review community membership', 'Affiliate link toolkit'],
    },
    fashion: {
      kofi:     ['Style guide PDF', 'Outfit planning commission', 'Seasonal lookbook download'],
      gumroad:  ['Capsule wardrobe template', 'Style formula guide', 'Shopping list spreadsheet'],
      payhip:   ['Personal style course', 'Wardrobe audit guide', 'Sustainable fashion handbook'],
    },
    fitness: {
      kofi:     ['Workout plan PDF', 'Form check commission', 'Monthly programming membership'],
      gumroad:  ['Training programme download', 'Nutrition guide PDF', 'Progress tracker spreadsheet'],
      payhip:   ['Fitness coaching course', '12-week programme', 'Nutrition planning membership'],
    },
    food: {
      kofi:     ['Recipe collection PDF', 'Meal plan commission', 'Monthly recipe membership'],
      gumroad:  ['Recipe eBook', 'Meal prep template', 'Ingredient substitution guide'],
      payhip:   ['Cooking course', 'Cuisine deep-dive guide', 'Meal planning membership'],
    },
    travel: {
      kofi:     ['Destination guide PDF', 'Itinerary commission', 'Travel tips membership'],
      gumroad:  ['Packing list template', 'Budget tracker spreadsheet', 'City guide download'],
      payhip:   ['Travel planning course', 'Solo travel safety guide', 'Digital nomad handbook'],
    },
    tech: {
      kofi:     ['Setup guide PDF', 'Tool recommendation list', 'Tech review membership'],
      gumroad:  ['Productivity system template', 'Tool comparison spreadsheet', 'Setup checklist PDF'],
      payhip:   ['Productivity course', 'Tech buying guide', 'Software tutorial membership'],
    },
    wellness: {
      kofi:     ['Self care routine PDF', 'Daily check-in membership', 'Wellness journal commission'],
      gumroad:  ['Mental health toolkit PDF', 'Habit tracker printable', 'Meditation guide download'],
      payhip:   ['Wellness programme course', 'Mindfulness membership', 'Therapy prep workbook'],
    },
    pets: {
      kofi:     ['Pet care guide PDF', 'Training commission', 'Monthly pet tips membership'],
      gumroad:  ['Training plan download', 'Pet health checklist', 'Breed guide PDF'],
      payhip:   ['Pet training course', 'New pet owner guide', 'Vet visit prep workbook'],
    },
    gaming: {
      kofi:     ['Game guide PDF', 'Build commission', 'Gaming membership community'],
      gumroad:  ['Strategy guide download', 'Game tier list template', 'Setup guide PDF'],
      payhip:   ['Gaming coaching course', 'Game design introduction', 'Esports training guide'],
    },
    art: {
      kofi:     ['Art print download', 'Commission requests', 'Monthly exclusive art membership'],
      gumroad:  ['Brush preset pack', 'Process video download', 'Reference photo pack'],
      payhip:   ['Art course for beginners', 'Digital art masterclass', 'Commission pricing guide'],
    },
    finance: {
      kofi:     ['Budget template PDF', 'Financial check-in membership', 'Money coaching commission'],
      gumroad:  ['Budget spreadsheet template', 'Investment starter guide', 'Debt payoff planner'],
      payhip:   ['Personal finance course', 'Financial freedom roadmap', 'Money mindset membership'],
    },
  }

  return NICHE_PRODUCTS[niche]?.[platform] ?? ['Digital guide', 'Template pack', 'Membership community']
}

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' }
  }

  const niche = event.queryStringParameters?.niche ?? 'skincare'

  const platforms = Object.entries(PLATFORM_DATA).map(([key, p]) => ({
    key,
    name:         p.name,
    icon:         p.icon,
    model:        p.model,
    isRecommended: p.bestFor.includes(niche),
    strengths:    p.strengths,
    contentTips:  p.contentTips,
    topProducts:  p.topProducts,
    nicheProducts: getNicheProducts(niche, key),
    linkStrategy: p.linkStrategy,
  })).sort((a, b) => b.isRecommended - a.isRecommended)

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({ niche, platforms, fetchedAt: new Date().toISOString() }),
  }
}
