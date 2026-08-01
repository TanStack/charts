import * as React from 'react'
import { AppRegistry, View } from 'react-native'
import { Circle, Svg } from 'react-native-svg'
import { name as appName } from './app.json'

function SvgApp() {
  return React.createElement(
    View,
    null,
    React.createElement(
      Svg,
      { width: 100, height: 100 },
      React.createElement(Circle, {
        cx: 50,
        cy: 50,
        r: 20,
        fill: '#2563eb',
      }),
    ),
  )
}

AppRegistry.registerComponent(appName, () => SvgApp)
