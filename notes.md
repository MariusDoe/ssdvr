# Code Editor
- monaco + HTMLCanvas
  - bad performance (around 1fps)
- CodeMirror in DOM + ViewPlugin + THREE.js
  - scan DOM on change
  - `getComputedStyle` to extract colors
  - text rendering: [options](https://threejs.org/docs/#manual/en/introduction/Creating-text)
    - DOM not available for VR
    - Texture has resolution problems
    - model: text not known up front
    - `TextGeometry`: 3D, want 2D
    - `BMFonts`, Troika: external dependencies, ignore for now
    - current option: `Font.generateShapes`, inspired by [example](https://threejs.org/examples/?q=font#webgl_geometry_text_shapes)
  - optimizations:
    - character geometry cache

# Changing Files on Disk
- vite has file watcher, writes will trigger HMR
- cannot write directly from browser
- write using vite plugin
- communicate via WebSocket connection on `import.meta.hot` ([`.on`](https://vitejs.dev/guide/api-hmr#hot-on-event-cb), [`.send`](https://vitejs.dev/guide/api-hmr#hot-send-event-data))
- initially tracked pending requests using path
- as more request types were added, switched to using UUID per request

# HMR
- initial ideas
  - import.meta.hot.data to `preserve` data
    - no option to discard and reevaluate
  - keep-alive: register classes and instances to swap prototypes
    - developer overhead of calling bookkeeping functions
    - might have garbage collection issues
  - import.meta.hot.dispose wrapper based on keeping track of running module
  - vite plugin to rewrite const exports to mutable exports
- notice:
  - can use Proxies on class prototypes to avoid swapping prototypes
  - can also use Proxies to wrap exported objects
    - survives reassignments of imports
- new HMR solution based on insights
  - vite plugin to wrap classes and exports in Proxies
  - drops keep-alive

# Updating Objects
- `onBeforeRender` only called on renderable objects
- idea: tick system traversing scene
- how to notify objects of tick?
  - [`userData` should not hold functions](https://threejs.org/docs/index.html?q=object3#api/en/core/Object3D.userData)
  - global registry of tick listeners
    - problem: when to remove listeners?
  - custom tick event?
  - custom tick method?
- decision: both event and method
  - event for listening on instances of existing classes without subclassing
  - method for subclassing THREE.js classes (more convenient than listening on self)
- scene traversal conveniently handles stopping of ticking for removed objects

# Interaction Handling
- THREE.js only emits global events when controller state (position, rotation, buttons) changes
- which object is hit is left to app
- want to locally register handler for object interaction
- need global system that tracks handlers and objects
- need to unregister handlers when objects leave scene
- implementation
  - registry for handlers
  - on global event, iterate through objects and find closest intersection using THREE.js Raycaster
  - call handlers on closest object
- sometimes, global listeners are needed, regardless of intersection
  - e. g. `move` event for dragging objects
  - still need to respect lifetime of handler
  - solution: pass "witness" object when registering handler
- can build "draggable" abstraction on these primitives

# Movable
- want to move objects around in 3D
- inspiration: AR Home
  - handles below windows to move them around
  - toolbars above handles to minimize or close windows
- implement handle using draggable abstraction

## Handle
- problem: where to position handle
- initial implementation:
  - keep track of bounding box of movable object
  - position handle at bottom of bounding box
- problems:
  - handle moves when bounding box changes
  - shrinking bounding box:
    - moving back is problematic if bounding box changes periodically (e. g. solar system)
    - not moving back is problematic if bounding box changes occasionally (e. g. file picker, code editor)
- solution: let movable object position itself, handle stays fixed
  - movable objects may decide to move below the handle (e. g. solar system)

## Movement
- problem: far away objects may be difficult to move
- ideas
  - increase sensitivity along depth axis (e. g. constant multiplier, square actually moved distance, ...)
  - use other axes of dragging hand (e. g. wrist rotation)
  - use other hand with increased sensitivity
  - add inertia to movable object
- problem: need to

## Rotation
- problem: how to rotate movable objects when dragging
- ideas:
  - absolute lock
  - relative to user lock
  - look at user while dragging
  - look at user always
  - toggle between the above using toolbar button

# Handling Objects Leaving the Scene
- idea: drop handlers associated with object when it leaves the scene
- THREE.js provides `removed` and `childremoved` events
- problem: only emitted on object that is removed, not on its children
- might have handlers associated with children
- possible solutions
  - add `removed` listeners to all parents of an object of interest
    - doesn't handle reparenting
  - global `MutationObserver`-like API
    - could support reparenting
- decision: global observer

# Scroller
- want to wrap object in scrollable container
- need to hide parts of object
- THREE.js supports clipping
  - global clipping on renderer
    - don't want to clip all objects
  - local clipping per material
    - don't have control over materials of child object
- ideas:
  - render order
    - use THREE's render order to enable clipping before the children and disable after
    - question: can clipping be changed mid-render?
  - subtree rendering
    - remove child object from scene and render it separately
    - use global clipping on separate render call
    - problem: lights probably won't have an effect on subtree
  - layered rendering
    - put scrollable children onto separate layer
    - render each layer individually with the respective clipping options
    - lights can be put on separate layer and rendered on each pass
- decision: layered rendering, because it seems easiest and most promising
- implementation problems
  - camera layers
    - THREE's VR implementation creates separate cameras
    - it keeps these up to date with the regular user-created camera
    - but it doesn't sync camera.layers
    - solution: assign layers manually to VR cameras
