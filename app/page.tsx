'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder'
const supabase = createClient(supabaseUrl, supabaseKey)

const PRICE_THRESHOLD = 400

interface PriceRecord {
  id: number
  timestamp: string
  source: string
  price: number
  airline: string
  departure_date: string
  return_date: string
  origin: string
  destination: string
  url: string
  is_deal: boolean
}

interface ChartPoint {
  date: string
  minPrice: number
  avgPrice: number
}

function sourceLabel(source: string): string {
  const labels: Record<string, string> = {
    amadeus: 'Amadeus API',
    dealabs: 'Dealabs',
    secretflying: 'Secret Flying',
    voyagespirates: 'VoyagesPirates',
    airfrance: 'Air France',
    aircaraibes: 'Air Caraïbes',
    google_search: 'Google',
    skyscanner: 'Skyscanner',
  }
  return labels[source] || source
}

function sourceColor(source: string): string {
  const colors: Record<string, string> = {
    amadeus: '#3b82f6',
    dealabs: '#ef4444',
    secretflying: '#f97316',
    voyagespirates: '#8b5cf6',
    airfrance: '#0055a4',
    aircaraibes: '#22c55e',
    google_search: '#facc15',
    skyscanner: '#06b6d4',
  }
  return colors[source] || '#888'
}

export default function Dashboard() {
  const [prices, setPrices] = useState<PriceRecord[]>([])
  const [deals, setDeals] = useState<PriceRecord[]>([])
  const [chartData, setChartData] = useState<ChartPoint[]>([])
  const [bestPrice, setBestPrice] = useState<PriceRecord | null>(null)
  const [lastScan, setLastScan] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  async function fetchData() {
    try {
      const { data: allPrices, error: pricesError } = await supabase
        .from('price_history')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(500)

      if (pricesError) throw pricesError

      if (allPrices && allPrices.length > 0) {
        setPrices(allPrices)
        const best = allPrices.reduce((min, p) => p.price < min.price ? p : min, allPrices[0])
        setBestPrice(best)
        setDeals(allPrices.filter(p => p.is_deal))
        setLastScan(new Date(allPrices[0].timestamp).toLocaleString('fr-FR'))

        const byDate = new Map<string, number[]>()
        allPrices.forEach(p => {
          const date = new Date(p.timestamp).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit' })
          if (!byDate.has(date)) byDate.set(date, [])
          byDate.get(date)!.push(p.price)
        })

        const chart: ChartPoint[] = Array.from(byDate.entries())
          .map(([date, pxs]) => ({
            date,
            minPrice: Math.min(...pxs),
            avgPrice: Math.round(pxs.reduce((a, b) => a + b, 0) / pxs.length),
          }))
          .reverse()

        setChartData(chart)
      }
    } catch (e: any) {
      setError(e.message || 'Erreur de chargement')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Chargement des prix...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-4 md:p-8 max-w-6xl mx-auto">
      <header className="mb-8">
        <h1 className="text-2xl md:text-3xl font-bold mb-2">Flight Tracker - Guyane</h1>
        <p className="text-gray-400">Paris/Luxembourg → Cayenne (CAY) | Seuil: {PRICE_THRESHOLD}€ A/R</p>
        {lastScan && <p className="text-sm text-gray-500 mt-1">Dernier scan: {lastScan}</p>}
      </header>

      {error && (
        <div className="bg-red-900/30 border border-red-700 rounded-lg p-4 mb-6">
          <p className="text-red-400">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        {bestPrice?.url ? (
          <a href={bestPrice.url} target="_blank" rel="noopener noreferrer"
             className="rounded-xl p-5 block group cursor-pointer transition-all hover:scale-[1.02]"
             style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
            <p className="text-sm text-gray-400 mb-1 flex items-center gap-1">
              Meilleur prix
              <span className="opacity-0 group-hover:opacity-100 transition-opacity text-blue-400">↗</span>
            </p>
            <p className="text-3xl font-bold" style={{ color: bestPrice.price <= PRICE_THRESHOLD ? 'var(--green)' : 'var(--orange)' }}>
              {bestPrice.price}€
            </p>
            <p className="text-xs text-gray-500 mt-1 group-hover:text-blue-400 transition-colors">
              via {sourceLabel(bestPrice.source)} — {bestPrice.airline !== 'N/A' ? bestPrice.airline : 'Voir l\'offre'} →
            </p>
          </a>
        ) : (
          <div className="rounded-xl p-5" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
            <p className="text-sm text-gray-400 mb-1">Meilleur prix</p>
            <p className="text-3xl font-bold" style={{ color: bestPrice && bestPrice.price <= PRICE_THRESHOLD ? 'var(--green)' : 'var(--orange)' }}>
              {bestPrice ? `${bestPrice.price}€` : 'N/A'}
            </p>
            {bestPrice && <p className="text-xs text-gray-500 mt-1">via {sourceLabel(bestPrice.source)}</p>}
          </div>
        )}

        <div className="rounded-xl p-5" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
          <p className="text-sm text-gray-400 mb-1">Deals &lt; {PRICE_THRESHOLD}€</p>
          <p className="text-3xl font-bold" style={{ color: deals.length > 0 ? 'var(--green)' : 'var(--muted)' }}>{deals.length}</p>
          <p className="text-xs text-gray-500 mt-1">trouvé(s)</p>
        </div>

        <div className="rounded-xl p-5" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
          <p className="text-sm text-gray-400 mb-1">Prix moyen</p>
          <p className="text-3xl font-bold">
            {prices.length > 0 ? `${Math.round(prices.reduce((a, p) => a + p.price, 0) / prices.length)}€` : 'N/A'}
          </p>
          <p className="text-xs text-gray-500 mt-1">sur {prices.length} relevés</p>
        </div>

        <div className="rounded-xl p-5" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
          <p className="text-sm text-gray-400 mb-1">Objectif</p>
          <p className="text-3xl font-bold" style={{ color: 'var(--accent)' }}>{PRICE_THRESHOLD}€</p>
          <p className="text-xs text-gray-500 mt-1">
            {bestPrice ? `${Math.round(bestPrice.price - PRICE_THRESHOLD)}€ au-dessus` : ''}
          </p>
        </div>
      </div>

      {chartData.length > 0 && (
        <div className="rounded-xl p-5 mb-8" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
          <h2 className="text-lg font-semibold mb-4">Evolution des prix</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#333" />
              <XAxis dataKey="date" stroke="#666" fontSize={12} />
              <YAxis stroke="#666" fontSize={12} domain={['auto', 'auto']} />
              <Tooltip contentStyle={{ background: '#1a1a1a', border: '1px solid #333', borderRadius: '8px' }} labelStyle={{ color: '#999' }} />
              <ReferenceLine y={PRICE_THRESHOLD} stroke="#22c55e" strokeDasharray="5 5" label={{ value: `${PRICE_THRESHOLD}€`, fill: '#22c55e', fontSize: 12 }} />
              <Line type="monotone" dataKey="minPrice" stroke="#3b82f6" strokeWidth={2} dot={false} name="Prix min" />
              <Line type="monotone" dataKey="avgPrice" stroke="#666" strokeWidth={1} dot={false} name="Prix moyen" strokeDasharray="3 3" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {deals.length > 0 && (
        <div className="rounded-xl p-5 mb-8" style={{ background: '#052e16', border: '1px solid #166534' }}>
          <h2 className="text-lg font-semibold mb-4 text-green-400">Deals trouvés!</h2>
          <div className="space-y-3">
            {deals.map((deal) => (
              <div key={deal.id} className="flex items-center justify-between p-3 rounded-lg" style={{ background: 'rgba(34, 197, 94, 0.1)' }}>
                <div>
                  <span className="text-2xl font-bold text-green-400">{deal.price}€</span>
                  <span className="text-sm text-gray-400 ml-3">{deal.airline} | {deal.origin} → CAY</span>
                  <span className="text-xs text-gray-500 ml-2">{deal.departure_date}</span>
                </div>
                <a href={deal.url} target="_blank" rel="noopener noreferrer"
                   className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg text-sm font-medium transition-colors">
                  Voir
                </a>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="rounded-xl p-5" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
        <h2 className="text-lg font-semibold mb-4">Derniers relevés de prix</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-gray-400 border-b" style={{ borderColor: 'var(--border)' }}>
                <th className="text-left py-2 px-3">Date</th>
                <th className="text-left py-2 px-3">Source</th>
                <th className="text-right py-2 px-3">Prix</th>
                <th className="text-left py-2 px-3">Compagnie</th>
                <th className="text-left py-2 px-3">Départ</th>
                <th className="text-left py-2 px-3">Trajet</th>
                <th className="text-center py-2 px-3">Lien</th>
              </tr>
            </thead>
            <tbody>
              {prices.slice(0, 50).map((p) => (
                <tr key={p.id} className="border-b hover:bg-white/5 transition-colors" style={{ borderColor: 'var(--border)' }}>
                  <td className="py-2 px-3 text-gray-400">
                    {new Date(p.timestamp).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td className="py-2 px-3">
                    <span className="inline-block px-2 py-0.5 rounded text-xs font-medium" style={{ background: sourceColor(p.source) + '22', color: sourceColor(p.source) }}>
                      {sourceLabel(p.source)}
                    </span>
                  </td>
                  <td className="py-2 px-3 text-right font-mono font-bold" style={{ color: p.price <= PRICE_THRESHOLD ? 'var(--green)' : p.price <= 500 ? 'var(--orange)' : 'var(--text)' }}>
                    {p.url ? (
                      <a href={p.url} target="_blank" rel="noopener noreferrer" className="hover:underline">
                        {p.price}€
                      </a>
                    ) : (
                      <>{p.price}€</>
                    )}
                  </td>
                  <td className="py-2 px-3">{p.airline}</td>
                  <td className="py-2 px-3 text-gray-400">{p.departure_date}</td>
                  <td className="py-2 px-3 text-gray-400">{p.origin} → {p.destination}</td>
                  <td className="py-2 px-3 text-center">
                    {p.url && (
                      <a href={p.url} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300">
                        Voir
                      </a>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <footer className="mt-8 text-center text-sm text-gray-500">
        <p>Scan automatique toutes les 2h via GitHub Actions</p>
        <p className="mt-1">Critères: Départ 15-30 mars 2026 | Retour +45j | Budget &lt; {PRICE_THRESHOLD}€</p>
      </footer>
    </div>
  )
}
