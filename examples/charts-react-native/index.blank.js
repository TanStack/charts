import * as React from 'react'
import { AppRegistry, View } from 'react-native'
import { name as appName } from './app.json'

function BlankApp() {
  return React.createElement(View)
}

AppRegistry.registerComponent(appName, () => BlankApp)
