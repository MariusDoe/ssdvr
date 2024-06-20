+ check selection theory
+ look for VR code editor
+ continue to use vite
+ no js frameworks (react / solid)
+ no hacking into home environment, instead stay in VR
+ check for keyboard input in App
+ basic interactions: cursor movement + keyboard input + cursor rendering
- slides
  - demo (editor, live reloading?)
  - HMR: problem statement (detail, but not too much)
+ import.meta.hot primitives: use Proxies
+ hot reloading in VR (read/write + CodeMirror editor)

- fancier interactions with CodeMirror
- potentially use Logitech K380 keyboard passthrough

- ticks: subclassing erstmal ok, wenn gebraucht: events hinzufügen

slides: goals
- most basic way to input text
- live reload text as source code
- build infrastructure on top

demo
- increase font size
- VSCode + scrcpy
- drastischere effekte (planeten stop / go, etc.)

+ write down things
+ cursor interactions
+ remove button
+ Movable: fix handle at (0, 0, 0) and make child (e. g. Editor) responsible for positioning self
  - getSizeInMovable -> getOffsetInMovable
- RenderPlugin rewrite based on MutationObserver
- scroller:
  - camera layer + object layer
  - based on render order
  - sub-scene rendering for clipping
- constraint: interaction tweaking only within VR
- controller dragging: z axis multiplier
  - hand space transformation
  - bug?
- custom mutation observer by recursively listening for childadded/childremoved
- dragging inertia?
- Star Wars: use the force
- Editor optimization
  - check whether parent is Scrollable
  - check for cursor movements only
- name for movables
- movable rotation modes via button in handle
  - absolute lock
  - relative to user lock
  - look at user while dragging
  - look at user always
  - look at origin always
- file picker bug: after closing and reopening parent, cannot open children
- iframe using HTMLCanvas for (THREE.js) documentation
