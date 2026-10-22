// Source timestamps must identify an instant, including a timezone.
export function timestampValue(value) {
  if (typeof value !== 'string') return NaN
  const parts =
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/.exec(
      value,
    )
  if (!parts) return NaN
  const [, year, month, day, hour, minute, second] = parts.map(Number)
  const days = new Date(Date.UTC(year, month, 0)).getUTCDate()
  if (
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > days ||
    hour > 23 ||
    minute > 59 ||
    second > 59
  )
    return NaN
  return Date.parse(value)
}

export function normalizeCompanyDates(record, index) {
  const dates = {}
  for (const key of ['updatedAt', 'statusChangedAt']) {
    if (record[key] == null) continue
    const timestamp = timestampValue(record[key])
    if (!Number.isFinite(timestamp))
      throw new Error(
        `Empresa ${index + 1}: ${key} deve ser uma data ISO 8601 válida com fuso horário.`,
      )
    dates[key] = new Date(timestamp).toISOString()
  }
  if (
    dates.updatedAt &&
    dates.statusChangedAt &&
    dates.statusChangedAt > dates.updatedAt
  )
    throw new Error(
      `Empresa ${index + 1}: statusChangedAt não pode ser posterior a updatedAt.`,
    )
  return dates
}

export function recentCriticalCompanies(companies) {
  const critical = companies.filter((company) => company.status === 'critical')
  const dated = critical.filter((company) =>
    Number.isFinite(timestampValue(company.statusChangedAt)),
  )
  return {
    companies: dated
      .sort(
        (a, b) =>
          timestampValue(b.statusChangedAt) -
            timestampValue(a.statusChangedAt) ||
          String(a.id).localeCompare(String(b.id)),
      )
      .slice(0, 4),
    undatedCount: critical.length - dated.length,
    total: critical.length,
  }
}
