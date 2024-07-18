# Documentation

You start out on a square floor with three spherical buttons surrounding your
waste. This is your tool belt. The buttons each spawn an object in front of you.
You can use your hands or the controllers to interact with them or anything else
that is interactable. If you prefer to use your hands, you can pinch the tips of
your thumb and index finger together to click/select an object you are pointing
at. If you prefer to use the controllers, use either trigger button on your
index fingers to click/select. The direction you are currently pointing at is
visualized via a red line originating from both of your hands.

### Movables

If you spawn one of the objects in your tool belt, it pops up in front of you
with a white bar below it, a name in front of the bar and one button to either
side of it. This kind of object with a bar below it is called a Movable. By
selecting and dragging the bar, which is called the Movable's handle, you can
move the object around.  Motion towards or away from your hand is amplified so
as to make it easier to move objects that are far away.

The name attached to the handle describes the object in the Movable. The button
to the left of the handle closes the Movable. This removes it from the scene,
you cannot bring it back. The button to the right minimizes the Movable. This
hides the Movable and its contained object and adds a new button to your tool
belt that maximizes the Movable, i. e. it is shown again, at its last position.

### File Picker

The file picker lets you open an editor to edit source code and other text
files. It is structured hierarchically like the file system it represents. By
selecting the blue rectangle labeled _File picker_, you open a directory
listing of the root directory of this project below it. You can then select a
file to open an editor for it or select a directory to show its contents. To the
right of the file picker is a gray scroll handle. You can select and then drag
it to scroll through the contents of the file picker.

### Editor

The editor allows you to edit source code and other text files. You can open one
by using the file picker. Once you open an editor, you can select any point
within the editor to move the cursor where you pointed. Then, you can type
normally to edit the file.

Behind the scenes, a [CodeMirror](https://codemirror.net) instance is used, so
you may want to inspect the
[configuration](https://codemirror.net/docs/ref/#codemirror.basicSetup),
especially the [default keymap](https://codemirror.net/docs/ref/#commands.defaultKeymap).
One additional keybinding is `Ctrl+s`: you can use it to commit your changes to the
file to disk. Only then will the changes take effect, e. g. code will only then
be re-executed.

In case the file you opened is large, you can use the scroll handle to the right
of the editor to scroll through the lines. The editor will also scroll
automatically when the primary cursor goes outside of the visible range.

For TypeScript code, a language server is set up, so you will get completions as
you type. They pop up inside a small scroll container below the cursor, so you
may need to scroll the editor to see them. You can select a completion with the
up and down arrow keys and accept it using the enter key.

### Workspace

You can use a workspace to run arbitrary JavaScript code, e. g. to experiment
with some new library code you just wrote. To do anything interesting, you first
need to import some modules. As described in the help comment inside the
workspace, you can do so by calling `this.import` with a name or path to a
module. This returns a `Promise` that resolves to the module object. To import a
named export from the module, you can use `(await this.import("path/to/module")).theNamedExport`.
The default export of a module is simply named `default`.

Within the workspace, `this` refers to a plain JavaScript object that is
associated with the workspace. You can use it to reuse values across executions.
This is especially helpful for imports, e. g. you can use
`this.BoxGeometry = (await this.import("three")).BoxGeometry;` and execute it once,
then use `new this.BoxGeometry()` to create an instance.

Another useful feature is the `getNextSelected` helper from the `interaction.ts`
module. It returns a `Promise` that resolves to the next object that is selected
by you. So you can use `this.myObject = await this.getNextSelected();` (assuming
you imported `getNextSelected` as described above) to get a reference to an
object that you forgot to assign to a property of `this`.

### Solar System

This is a demo project you can play around with. It contains a sun with a light
and a few planets that orbit around the sun. You can tweak the parameters of the
simulation in the `demo.ts` module.
