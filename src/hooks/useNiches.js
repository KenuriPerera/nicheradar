import { useState, useEffect } from 'react'

// Single hook — all pages use this instead of hardcoding niche lists
// Adding a new niche to _data.js automatically appears everywhere in the UI

export function useNiches() {
  const [niches,  setNiches]  = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/niches')
      .then(r => r.json())
      .then(d => setNiches(d.niches ?? []))
      .catch(() => setNiches([
        // Fallback if API fails — mirrors NICHE_MAP keys
        { key: 'skincare', label: 'Skincare', icon: '✨' },
        { key: 'movies',   label: 'Movies',   icon: '🎬' },
        { key: 'quotes',   label: 'Quotes',   icon: '💬' },
        { key: 'books',    label: 'Books',    icon: '📚' },
        { key: 'reviews',  label: 'Reviews',  icon: '⭐' },
        { key: 'fashion',  label: 'Fashion',  icon: '👗' },
        { key: 'fitness',  label: 'Fitness',  icon: '💪' },
        { key: 'food',     label: 'Food',     icon: '🍜' },
        { key: 'travel',   label: 'Travel',   icon: '✈️' },
        { key: 'tech',     label: 'Tech',     icon: '💻' },
      ]))
      .finally(() => setLoading(false))
  }, [])

  return { niches, loading }
}
