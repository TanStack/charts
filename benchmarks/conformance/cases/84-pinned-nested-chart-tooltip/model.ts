import type { ChartTooltipContent } from '@tanstack/charts'

export const energyColors = {
  consumption: '#8b8d90',
  household: '#1685ff',
  heatPump: '#e82285',
  hotWater: '#ee4c91',
  evCharging: '#5cbd68',
  generationMuted: '#f4c675',
  generation: '#f2a900',
  exported: '#f8d99a',
} as const

export const energyAnnualOverview = {
  generation: 3_509,
  consumption: 17_847,
} as const

export const energyMonthIds = [
  'jan',
  'feb',
  'mar',
  'apr',
  'may',
  'jun',
  'jul',
  'aug',
  'sep',
  'oct',
  'nov',
  'dec',
] as const

export type EnergyMonthId = (typeof energyMonthIds)[number]

export interface EnergyMonth {
  readonly id: EnergyMonthId
  readonly month: string
  readonly monthShort: string
  readonly household: number
  readonly heatPump: number
  readonly hotWater: number
  readonly evCharging: number
  readonly consumption: number
  readonly generation: number
  readonly usedOnSite: number
  readonly exported: number
  readonly householdStart: number
  readonly householdEnd: number
  readonly heatPumpStart: number
  readonly heatPumpEnd: number
  readonly hotWaterStart: number
  readonly hotWaterEnd: number
  readonly evChargingStart: number
  readonly evChargingEnd: number
}

export interface EnergyBreakdownPart {
  readonly id: string
  readonly label: string
  readonly value: number
  readonly start: number
  readonly end: number
  readonly color: string
}

const baseMonths = [
  ['jan', 'January', 'Jan', 783, 637, 468, 688, 188, 180, 8],
  ['feb', 'February', 'Feb', 672, 531, 400, 563, 219, 217, 2],
  ['mar', 'March', 'Mar', 668, 466, 397, 614, 262, 257, 5],
  ['apr', 'April', 'Apr', 570, 342, 352, 524, 375, 322, 53],
  ['may', 'May', 'May', 376, 191, 232, 352, 427, 219, 208],
  ['jun', 'June', 'Jun', 241, 122, 150, 225, 482, 169, 313],
  ['jul', 'July', 'Jul', 246, 91, 155, 233, 367, 150, 217],
  ['aug', 'August', 'Aug', 241, 96, 155, 233, 354, 138, 216],
  ['sep', 'September', 'Sep', 242, 135, 147, 223, 304, 142, 162],
  ['oct', 'October', 'Oct', 362, 239, 218, 335, 258, 185, 73],
  ['nov', 'November', 'Nov', 577, 449, 345, 524, 174, 171, 3],
  ['dec', 'December', 'Dec', 607, 495, 365, 570, 100, 99, 1],
] as const satisfies readonly (readonly [
  EnergyMonthId,
  string,
  string,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
])[]

export function energyMonths(revision = 0): readonly EnergyMonth[] {
  return baseMonths.map(
    ([
      id,
      month,
      monthShort,
      household,
      heatPump,
      hotWater,
      baseEvCharging,
      generation,
      usedOnSite,
      exported,
    ]) => {
      const evCharging =
        id === 'dec' && revision % 2 === 1
          ? baseEvCharging + 18
          : baseEvCharging
      const householdStart = 0
      const householdEnd = household
      const heatPumpStart = householdEnd
      const heatPumpEnd = heatPumpStart + heatPump
      const hotWaterStart = heatPumpEnd
      const hotWaterEnd = hotWaterStart + hotWater
      const evChargingStart = hotWaterEnd
      const evChargingEnd = evChargingStart + evCharging
      return {
        id,
        month,
        monthShort,
        household,
        heatPump,
        hotWater,
        evCharging,
        consumption: evChargingEnd,
        generation,
        usedOnSite,
        exported,
        householdStart,
        householdEnd,
        heatPumpStart,
        heatPumpEnd,
        hotWaterStart,
        hotWaterEnd,
        evChargingStart,
        evChargingEnd,
      }
    },
  )
}

export function isEnergyMonthId(value: unknown): value is EnergyMonthId {
  return energyMonthIds.some((id) => id === value)
}

export function monthFromTarget(target: { view?: string; anchor: string }) {
  if (target.view !== undefined && target.view !== 'main') return null
  const [kind, id] = target.anchor.split(':')
  return kind === 'month' && isEnergyMonthId(id) ? id : null
}

export function consumptionBreakdown(
  month: EnergyMonth,
): readonly EnergyBreakdownPart[] {
  return [
    {
      id: 'household',
      label: 'Household',
      value: month.household,
      start: month.householdStart,
      end: month.householdEnd,
      color: energyColors.household,
    },
    {
      id: 'heat-pump',
      label: 'Heat pump',
      value: month.heatPump,
      start: month.heatPumpStart,
      end: month.heatPumpEnd,
      color: energyColors.heatPump,
    },
    {
      id: 'hot-water',
      label: 'Hot water',
      value: month.hotWater,
      start: month.hotWaterStart,
      end: month.hotWaterEnd,
      color: energyColors.hotWater,
    },
    {
      id: 'ev-charging',
      label: 'EV charging',
      value: month.evCharging,
      start: month.evChargingStart,
      end: month.evChargingEnd,
      color: energyColors.evCharging,
    },
  ]
}

export function energyTooltipContent(
  points: readonly { readonly datum: EnergyMonth }[],
  _pinned: boolean,
): ChartTooltipContent {
  const month = points[0]?.datum
  if (!month) return { rows: [] }
  return {
    title: month.month,
    rows: [
      {
        label: 'Consumption',
        value: formatEnergy(month.consumption),
      },
      {
        label: 'Generation',
        value: formatEnergy(month.generation),
      },
    ],
  }
}

export function formatEnergy(value: number) {
  return `${value.toLocaleString('en-US')} kWh`
}

export function formatPercent(value: number) {
  return `${Math.round(value * 100)}%`
}
