import type { ChartTooltipContent } from '@tanstack/charts'

export const energyColors = {
  household: '#2563eb',
  heatPump: '#60a5fa',
  hotWater: '#93c5fd',
  evCharging: '#c7d2fe',
  generation: '#f5b942',
  exported: '#fde6a8',
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
  ['jan', 'January', 'Jan', 214, 174, 128, 188, 286, 238, 48],
  ['feb', 'February', 'Feb', 205, 162, 122, 172, 354, 257, 97],
  ['mar', 'March', 'Mar', 212, 148, 126, 195, 455, 294, 161],
  ['apr', 'April', 'Apr', 220, 132, 136, 202, 522, 304, 218],
  ['may', 'May', 'May', 232, 118, 143, 216, 574, 298, 276],
  ['jun', 'June', 'Jun', 241, 122, 150, 225, 482, 236, 246],
  ['jul', 'July', 'Jul', 246, 109, 154, 238, 641, 274, 367],
  ['aug', 'August', 'Aug', 238, 112, 148, 231, 612, 263, 349],
  ['sep', 'September', 'Sep', 229, 128, 139, 212, 508, 285, 223],
  ['oct', 'October', 'Oct', 221, 146, 133, 204, 414, 278, 136],
  ['nov', 'November', 'Nov', 216, 168, 129, 196, 326, 251, 75],
  ['dec', 'December', 'Dec', 228, 186, 137, 214, 258, 226, 32],
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
  pinned: boolean,
): ChartTooltipContent {
  const month = points[0]?.datum
  if (!month) return { rows: [] }
  return {
    title: month.month,
    rows: [
      {
        label: 'Consumption',
        value: formatEnergy(month.consumption),
        color: energyColors.household,
      },
      {
        label: 'Generation',
        value: formatEnergy(month.generation),
        color: energyColors.generation,
      },
      ...(pinned
        ? [
            {
              label: 'Solar coverage',
              value: formatPercent(month.usedOnSite / month.consumption),
            },
          ]
        : []),
    ],
  }
}

export function formatEnergy(value: number) {
  return `${value.toLocaleString('en-US')} kWh`
}

export function formatPercent(value: number) {
  return `${Math.round(value * 100)}%`
}
