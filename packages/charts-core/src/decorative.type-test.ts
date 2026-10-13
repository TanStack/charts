import { dot } from './dot'
import { whenFocused } from './focus-mark'
import { compositeMark } from './mark-composite'
import { decorative } from './mark-decorative'

function verifyDecorativeFocusBoundary() {
  const ordinary = dot([1, 2])
  const stateful = dot([1, 2], {
    states: [{ when: { focus: 'primary' }, style: { r: 5 } }],
  })
  decorative(ordinary)
  decorative(stateful)
  decorative(compositeMark([ordinary, stateful]))
  decorative(decorative(ordinary))
  const focused = whenFocused(ordinary)
  // @ts-expect-error Focus-filtered geometry is not always decorative.
  decorative(focused)
  // @ts-expect-error A focus-filtered child also prevents decorative wrapping.
  decorative(compositeMark([ordinary, focused]))
  // @ts-expect-error The restriction survives nested composites.
  decorative(compositeMark([compositeMark([focused])]))
}

void verifyDecorativeFocusBoundary
