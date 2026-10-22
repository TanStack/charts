import { useEffect, useMemo, useState } from 'react'
import { useMapI18n } from './use-map-i18n.js'
import {
  recentCriticalCompanies,
  timestampValue,
} from './engine/lib/company-dates.js'

export function CompanyDate({ value }) {
  const { locale, t } = useMapI18n()
  if (!Number.isFinite(timestampValue(value)))
    return <span>{t('dateUnknown')}</span>
  return (
    <time dateTime={value}>
      {new Intl.DateTimeFormat(locale, {
        dateStyle: 'short',
        timeStyle: 'short',
      }).format(new Date(value))}
    </time>
  )
}

function DigitalClock() {
  const { locale, t } = useMapI18n()
  const [now, setNow] = useState(null)
  useEffect(() => {
    const update = () => {
      if (!document.hidden) setNow(new Date())
    }
    update()
    const timer = setInterval(update, 1000)
    document.addEventListener('visibilitychange', update)
    return () => {
      clearInterval(timer)
      document.removeEventListener('visibilitychange', update)
    }
  }, [])
  const clock = useMemo(
    () =>
      new Intl.DateTimeFormat(locale, {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hourCycle: 'h23',
      }),
    [locale],
  )
  const date = useMemo(
    () =>
      new Intl.DateTimeFormat(locale, {
        dateStyle: 'long',
      }),
    [locale],
  )
  return (
    <div
      className="atlas-monitor-clock"
      role="timer"
      aria-label={t('localClock')}
      aria-live="off"
    >
      <span>{t('localClock')}</span>
      <time dateTime={now?.toISOString()} data-testid="monitor-clock">
        {now ? clock.format(now) : '--:--:--'}
      </time>
      <span>{now ? date.format(now) : '—'}</span>
    </div>
  )
}

function CompanyMetrics({ matching, pageSize, loading }) {
  const { t, format } = useMapI18n()
  return (
    <section aria-label={t('companySummary')} className="atlas-monitor-metrics">
      <div>
        <p>{t('companiesFound')}</p>
        <strong className="atlas-monitor-total">
          {loading ? '—' : format(matching.length)}
        </strong>
        <p>
          {pageSize === 'all'
            ? t('allInCity')
            : t('companiesPerCity', { count: format(pageSize) })}
        </p>
      </div>
      <div className="atlas-monitor-statuses">
        {['healthy', 'warning', 'critical'].map((status) => (
          <div
            key={status}
            className={`atlas-monitor-status atlas-monitor-status--${status}`}
          >
            <span aria-hidden="true" />
            <strong>
              {loading
                ? '—'
                : format(
                    matching.filter((company) => company.status === status)
                      .length,
                  )}
            </strong>
            <p>{t(`status.${status}`)}</p>
          </div>
        ))}
      </div>
    </section>
  )
}
export function CompanyMonitor({
  companies,
  matching,
  pageSize,
  loading,
  error,
}) {
  const { t, format } = useMapI18n()
  const recent = useMemo(() => recentCriticalCompanies(companies), [companies])
  return (
    <aside className="atlas-company-monitor" aria-label={t('monitoring')}>
      <DigitalClock />
      <CompanyMetrics
        matching={matching}
        pageSize={pageSize}
        loading={loading}
      />
      <section
        aria-label={t('recentCritical')}
        className="atlas-monitor-alerts"
      >
        <h2>{t('recentCritical')}</h2>
        <p className="atlas-monitor-caption">{t('monitorScope')}</p>
        {loading || error ? (
          <p className="atlas-monitor-empty">
            {t(error ? 'monitorUnavailable' : 'monitorLoading')}
          </p>
        ) : (
          <>
            <ol>
              {recent.companies.map((company) => (
                <li key={company.id}>
                  <strong title={company.name}>{company.name}</strong>
                  <CompanyDate value={company.statusChangedAt} />
                </li>
              ))}
            </ol>
            {!recent.total && (
              <p className="atlas-monitor-empty">{t('noCritical')}</p>
            )}
            {recent.undatedCount > 0 && (
              <p className="atlas-monitor-caption">
                {t('criticalWithoutDate', {
                  count: format(recent.undatedCount),
                })}
              </p>
            )}
          </>
        )}
      </section>
    </aside>
  )
}
