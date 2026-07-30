import { downloads } from '@charts-poc/demo-data/downloads'
import { penguins } from '@charts-poc/demo-data/penguins'
import type { DownloadsRow } from '@charts-poc/demo-data/downloads'
import type { PenguinsRow } from '@charts-poc/demo-data/penguins'

export interface PenguinBodyMassRow extends PenguinsRow {
  readonly body_mass_g: number
}

export type { DownloadsRow, PenguinsRow }

export const downloadData = downloads
export const penguinData = penguins.filter(
  (penguin): penguin is PenguinBodyMassRow => penguin.body_mass_g !== null,
)
