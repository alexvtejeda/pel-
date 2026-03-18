'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faEye,
  faHandPointer,
  faArrowTrendUp,
  faChartLine,
  faLightbulb,
  faSpinner,
  faDog,
  faCat,
} from '@fortawesome/free-solid-svg-icons'
import { useTranslation } from 'react-i18next'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { getMetrics, MetricsResponse } from '@/lib/api/metrics'

type Period = '7d' | '30d' | 'all'

const PERIODS: Period[] = ['7d', '30d', 'all']

function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  const day = d.getDate()
  const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
  return `${day} ${months[d.getMonth()]}`
}

export function MetricsTab() {
  const { t } = useTranslation('pets')
  const [period, setPeriod] = useState<Period>('30d')
  const [data, setData] = useState<MetricsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    getMetrics(period).then(res => {
      if (cancelled) return
      if (res.error) {
        setError(res.error)
        setData(null)
      } else {
        setData(res.data)
      }
      setLoading(false)
    })

    return () => { cancelled = true }
  }, [period])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <FontAwesomeIcon icon={faSpinner} className="w-6 h-6 text-muted-foreground animate-spin" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <FontAwesomeIcon icon={faChartLine} className="w-10 h-10 text-muted-foreground/30" />
        <p className="text-sm text-muted-foreground">{error}</p>
      </div>
    )
  }

  const isEmpty = !data || (data.summary.total_views === 0 && data.summary.total_adopt_clicks === 0)

  return (
    <div className="space-y-6">
      {/* Period toggle */}
      <div className="flex gap-2">
        {PERIODS.map((value) => (
          <button
            key={value}
            onClick={() => setPeriod(value)}
            className={`px-4 py-2 text-sm font-medium rounded-xl transition-colors ${
              period === value
                ? 'bg-pop-550 text-white'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            {t(`metrics.period_${value}`)}
          </button>
        ))}
      </div>

      {isEmpty ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <FontAwesomeIcon icon={faChartLine} className="w-12 h-12 text-muted-foreground/30" />
          <p className="text-lg font-medium text-muted-foreground">{t('metrics.empty_title')}</p>
          <p className="text-sm text-muted-foreground/70">
            {t('metrics.empty_subtitle')}
          </p>
        </div>
      ) : (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="rounded-2xl">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                  <FontAwesomeIcon icon={faEye} className="w-4 h-4" />
                  {t('metrics.total_views')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">
                  {data!.summary.total_views.toLocaleString()}
                </p>
              </CardContent>
            </Card>

            <Card className="rounded-2xl">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                  <FontAwesomeIcon icon={faHandPointer} className="w-4 h-4" />
                  {t('metrics.adopt_clicks')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-pop-550">
                  {data!.summary.total_adopt_clicks.toLocaleString()}
                </p>
              </CardContent>
            </Card>

            <Card className="rounded-2xl">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                  <FontAwesomeIcon icon={faArrowTrendUp} className="w-4 h-4" />
                  {t('metrics.conversion_rate')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className={`text-3xl font-bold ${data!.summary.conversion_rate >= 5 ? 'text-green-500' : 'text-red-500'}`}>
                  {data!.summary.conversion_rate.toFixed(1)}%
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Area chart */}
          {data!.daily.length > 0 && (
            <Card className="rounded-2xl">
              <CardHeader>
                <CardTitle className="text-sm">{t('metrics.chart_title')}</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={data!.daily}>
                    <defs>
                      <linearGradient id="viewsFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="oklch(65% 0.25 25)" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="oklch(65% 0.25 25)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis
                      dataKey="date"
                      tickFormatter={formatDate}
                      tick={{ fontSize: 12 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 12 }}
                      axisLine={false}
                      tickLine={false}
                      allowDecimals={false}
                    />
                    <Tooltip
                      labelFormatter={(label) => formatDate(String(label))}
                      formatter={(value, name) => [
                        Number(value).toLocaleString(),
                        name === 'views' ? t('metrics.chart_views') : t('metrics.chart_clicks'),
                      ]}
                    />
                    <Area
                      type="monotone"
                      dataKey="views"
                      stroke="oklch(65% 0.25 25)"
                      fill="url(#viewsFill)"
                      strokeWidth={2}
                    />
                    <Area
                      type="monotone"
                      dataKey="adopt_clicks"
                      stroke="oklch(65% 0.25 25)"
                      fill="none"
                      strokeWidth={1.5}
                      strokeDasharray="5 5"
                      strokeOpacity={0.5}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* Per-pet table */}
          {data!.pets.length > 0 && (
            <Card className="rounded-2xl">
              <CardHeader>
                <CardTitle className="text-sm">{t('metrics.table_title')}</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <PetMetricsTable pets={data!.pets} />
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  )
}

function PetMetricsTable({ pets }: { pets: MetricsResponse['pets'] }) {
  const { t } = useTranslation('pets')
  const sorted = [...pets].sort((a, b) => b.views - a.views)
  const maxViews = sorted[0]?.views || 1

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{t('metrics.table_pet')}</TableHead>
          <TableHead className="text-right">{t('metrics.table_views')}</TableHead>
          <TableHead className="text-right">{t('metrics.table_adopt')}</TableHead>
          <TableHead className="text-right">{t('metrics.table_conversion')}</TableHead>
          <TableHead className="w-32">Tendencia</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {sorted.map(pet => (
          <TableRow key={pet.pet_id}>
            <TableCell>
              <div className="flex items-center gap-3">
                {pet.pet_photo_url ? (
                  <Image
                    src={pet.pet_photo_url}
                    alt={pet.pet_name}
                    width={32}
                    height={32}
                    className="w-8 h-8 rounded-xl object-cover"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-xl bg-muted flex items-center justify-center">
                    <FontAwesomeIcon
                      icon={pet.species === 'dog' ? faDog : faCat}
                      className="w-3.5 h-3.5 text-muted-foreground"
                    />
                  </div>
                )}
                <div>
                  <p className="text-sm font-medium">{pet.pet_name}</p>
                  <p className="text-xs text-muted-foreground capitalize">
                    {pet.species === 'dog' ? t('species.dog') : t('species.cat')} · {pet.gender === 'male' ? t('gender.male') : t('gender.female')}
                  </p>
                </div>
              </div>
            </TableCell>
            <TableCell className="text-right tabular-nums">{pet.views.toLocaleString()}</TableCell>
            <TableCell className="text-right tabular-nums">{pet.adopt_clicks.toLocaleString()}</TableCell>
            <TableCell className="text-right">
              <span className={`text-sm font-medium ${pet.conversion_rate >= 5 ? 'text-green-500' : 'text-red-500'}`}>
                {pet.conversion_rate.toFixed(1)}%
              </span>
              {pet.conversion_rate < 3 && pet.views > 0 && (
                <FontAwesomeIcon
                  icon={faLightbulb}
                  className="w-3 h-3 text-amber-500 ml-1.5"
                  title={t('metrics.tip_low_conversion')}
                />
              )}
            </TableCell>
            <TableCell>
              <div className="w-full bg-muted rounded-xl h-6 overflow-hidden">
                <div
                  className="bg-pop-550/20 h-6 rounded-xl"
                  style={{ width: `${(pet.views / maxViews) * 100}%` }}
                />
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
