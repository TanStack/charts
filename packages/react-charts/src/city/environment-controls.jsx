import { useMapI18n } from './use-map-i18n.js'
export function EnvironmentControls({
  lighting,
  weather,
  onLightingChange,
  onWeatherChange,
  disabled,
}) {
  const { t } = useMapI18n()
  return (
    <>
      {[
        {
          id: 'lighting',
          ariaLabel: t('lightingLabel'),
          label: t('lighting'),
          value: lighting,
          onChange: onLightingChange,
          options: [
            ['auto', t('auto')],
            ['twilight', t('twilight')],
            ['day', t('day')],
            ['night', t('night')],
          ],
        },
        {
          id: 'weather',
          ariaLabel: t('weatherLabel'),
          label: t('weather'),
          value: weather,
          onChange: onWeatherChange,
          options: [
            ['auto', t('auto')],
            ['none', t('none')],
            ['rain', t('rain')],
            ['snow', t('snow')],
          ],
        },
      ].map((control) => (
        <label
          key={control.id}
          className={`atlas-city-control atlas-city-environment-control atlas-city-environment-control--${control.id}`}
        >
          <span className="atlas-city-control-label">{control.label}</span>
          <select
            aria-label={control.ariaLabel}
            value={control.value}
            onChange={(event) => control.onChange(event.target.value)}
            disabled={disabled}
            className="atlas-city-select"
          >
            {control.options.map(([value, label]) => (
              <option
                className="atlas-city-select-option"
                key={value}
                value={value}
              >
                {label}
              </option>
            ))}
          </select>
        </label>
      ))}
    </>
  )
}
