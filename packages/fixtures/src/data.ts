import { downloads } from '@tanstack/charts-data/downloads'
import { penguins } from '@tanstack/charts-data/penguins'
import type { DownloadsRow } from '@tanstack/charts-data/downloads'
import type { PenguinsRow } from '@tanstack/charts-data/penguins'

export interface PenguinBodyMassRow extends PenguinsRow {
  readonly body_mass_g: number
}

export type { DownloadsRow, PenguinsRow }

export const downloadData = downloads
export const penguinData = penguins.filter(
  (penguin): penguin is PenguinBodyMassRow => penguin.body_mass_g !== null,
)
