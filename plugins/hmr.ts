import type { NodePath } from "@babel/core";
import * as babel from "@babel/core";
import * as t from "@babel/types";
import { Plugin } from "vite";

const jsFiles = /\.[jt]sx?$/;

const hmrModulesDirectory = "/src/hmr";
const runningModuleModule = `${hmrModulesDirectory}/running-module.ts`;
const proxyClassModule = `${hmrModulesDirectory}/proxy-class.ts`;
const exportsModule = `${hmrModulesDirectory}/exports.ts`;

const parse = (source: string) => babel.parse(source)!.program.body;

const updateExportsRegistry = "__updateExportsRegistry";
const wrapExport = "__wrapExport";
const updateClassRegistry = "__updateClassRegistry";
const proxifyClass = "__proxifyClass";

const beforeProgram = parse(`
import {
  pushRunningModule as __pushRunningModule,
  popRunningModule as __popRunningModule,
} from "${runningModuleModule}";
import {
  registerModule as __registerModule,
  scheduleExportsUpdate as __scheduleExportsUpdate,
  updateExportsRegistry as ${updateExportsRegistry},
  wrapExport as ${wrapExport},
} from "${exportsModule}";
import {
  updateClassRegistry as ${updateClassRegistry},
  proxifyClass as ${proxifyClass},
} from "${proxyClassModule}";
__pushRunningModule(import.meta);
__registerModule(import.meta);
`);

const afterProgram = parse(`
__popRunningModule();
`);

const mutableModuleNamespace = "__mutableModuleNamespace";

const acceptProgram = parse(`
if (import.meta.hot) {
  import.meta.hot.accept(newModuleNamespace => {
    __scheduleExportsUpdate(import.meta, ${mutableModuleNamespace}, newModuleNamespace);
  });
}
`);

class State {
  prefix = [...beforeProgram];
  suffix = [...afterProgram];

  classNames: t.Identifier[] = [];

  acceptable = true;
  exportStatements: {
    path: NodePath<t.ExportNamedDeclaration>;
    ids: t.Identifier[];
  }[] = [];
  exportDefault: NodePath<t.ExportDefaultDeclaration> | null = null;
  exportDefaultId = t.identifier("default");

  nextMutableIdIndex = 0;
  mutableIdMap = new Map<t.Identifier, t.Identifier>();

  visitProgram(programPath: NodePath<t.Program>) {
    this.visitTopLevelStatements(programPath);
    this.addUpdateRegistryCall(updateClassRegistry, this.classNames);
    if (this.acceptable) {
      this.accept();
    }
  }

  visitTopLevelStatements(programPath: NodePath<t.Program>) {
    for (const statementPath of programPath.get("body")) {
      this.visitTopLevelStatement(statementPath);
    }
  }

  visitTopLevelStatement(statementPath: NodePath<t.Statement>) {
    if (statementPath.isExportNamedDeclaration()) {
      this.visitNamedExport(statementPath);
    } else if (statementPath.isExportDefaultDeclaration()) {
      this.visitDefaultExport(statementPath);
    } else if (statementPath.isClassDeclaration()) {
      this.wrapClassDeclaration(statementPath);
    }
  }

  visitNamedExport(exportPath: NodePath<t.ExportNamedDeclaration>) {
    const { node } = exportPath;
    if (node.source !== null) {
      return;
    }
    if (node.specifiers.length > 0) {
      this.acceptable = false;
      return;
    }
    const ids = [];
    const declarationPath = exportPath.get("declaration");
    if (declarationPath.isVariableDeclaration()) {
      if (declarationPath.node.kind !== "const") {
        this.acceptable = false;
        return;
      }
      ids.push(
        ...declarationPath.node.declarations.map((declarator) => declarator.id)
      );
    } else if (declarationPath.isFunctionDeclaration()) {
      ids.push(declarationPath.node.id);
    } else if (declarationPath.isClassDeclaration()) {
      ids.push(declarationPath.node.id);
      this.wrapClassDeclaration(declarationPath);
    } else {
      throw new TypeError(`unknown named export declaration: ${node.type}`);
    }
    this.exportStatements.push({
      path: exportPath,
      ids,
    });
  }

  visitDefaultExport(exportPath: NodePath<t.ExportDefaultDeclaration>) {
    this.exportDefault = exportPath;
    const declaration = exportPath.get("declaration");
    if (declaration.isClassDeclaration()) {
      this.wrapClassDeclaration(declaration, exportPath);
    }
  }

  wrapClassDeclaration(
    classDeclarationPath: NodePath<t.ClassDeclaration>,
    insertDeclarationBefore?: NodePath<t.Statement>
  ) {
    const {
      node: { id, superClass, body: classBody, decorators },
    } = classDeclarationPath;
    if (!id) {
      return;
    }
    this.classNames.push(id);
    const statement = t.variableDeclaration("const", [
      t.variableDeclarator(
        id,
        t.callExpression(t.identifier(proxifyClass), [
          t.classExpression(null, superClass, classBody, decorators),
          t.stringLiteral(id.name),
          this.importMeta(),
        ])
      ),
    ]);
    if (insertDeclarationBefore) {
      insertDeclarationBefore.insertBefore(statement);
      classDeclarationPath.replaceWith(id);
    } else {
      classDeclarationPath.replaceWith(statement);
    }
  }

  addUpdateRegistryCall(functionName: string, ids: t.Identifier[]) {
    this.prefix.push(
      t.expressionStatement(
        t.callExpression(t.identifier(functionName), [
          this.importMeta(),
          t.newExpression(t.identifier("Set"), [
            t.arrayExpression(
              ids.map((className) => t.stringLiteral(className.name))
            ),
          ]),
        ])
      )
    );
  }

  accept() {
    this.addUpdateRegistryCall(updateExportsRegistry, this.exportIds());
    for (const { path, ids } of this.exportStatements) {
      this.makeNamedExportMutable(path, ids);
    }
    if (this.exportDefault) {
      this.makeDefaultExportMutable(this.exportDefault);
    }
    this.declareMutableNamespace();
    this.suffix.push(...acceptProgram);
  }

  makeNamedExportMutable(
    path: NodePath<t.ExportNamedDeclaration>,
    ids: t.Identifier[]
  ) {
    path.replaceWithMultiple([
      path.node.declaration,
      t.variableDeclaration(
        "let",
        ids.map((id) =>
          t.variableDeclarator(this.mutableIdFor(id), this.wrapExport(id, id))
        )
      ),
      t.exportNamedDeclaration(
        null,
        ids.map((id) => t.exportSpecifier(this.mutableIdFor(id), id))
      ),
    ]);
  }

  makeDefaultExportMutable(
    exportDefault: NodePath<t.ExportDefaultDeclaration>
  ) {
    const {
      node: { declaration },
    } = exportDefault;
    const beforeLet = [];
    let letInitializer = declaration;
    if (
      (t.isFunctionDeclaration(declaration) ||
        t.isClassDeclaration(declaration)) &&
      declaration.id
    ) {
      beforeLet.push(declaration);
      letInitializer = declaration.id;
    }
    exportDefault.replaceWithMultiple([
      ...beforeLet,
      t.variableDeclaration("let", [
        t.variableDeclarator(
          this.mutableIdFor(this.exportDefaultId),
          this.wrapExport(letInitializer as t.Expression, this.exportDefaultId)
        ),
      ]),
      t.exportNamedDeclaration(null, [
        t.exportSpecifier(
          this.mutableIdFor(this.exportDefaultId),
          this.exportDefaultId
        ),
      ]),
    ]);
  }

  wrapExport(expression: t.Expression, id: t.Identifier) {
    return t.callExpression(t.identifier(wrapExport), [
      expression as t.Expression,
      t.stringLiteral(id.name),
      this.importMeta(),
    ]);
  }

  declareMutableNamespace() {
    const newValue = t.identifier("newValue");
    this.suffix.push(
      t.variableDeclaration("const", [
        t.variableDeclarator(
          t.identifier(mutableModuleNamespace),
          t.objectExpression(
            Array.from(this.mutableIdMap.entries()).flatMap(
              ([id, mutableId]) => [
                t.objectMethod(
                  "get",
                  id,
                  [],
                  t.blockStatement([t.returnStatement(mutableId)])
                ),
                t.objectMethod(
                  "set",
                  id,
                  [newValue],
                  t.blockStatement([
                    t.expressionStatement(
                      t.assignmentExpression("=", mutableId, newValue)
                    ),
                  ])
                ),
              ]
            )
          )
        ),
      ])
    );
  }

  exportIds() {
    return this.exportStatements
      .flatMap(({ ids }) => ids)
      .concat(this.exportDefault ? [this.exportDefaultId] : []);
  }

  mutableIdFor(id: t.Identifier) {
    if (this.mutableIdMap.has(id)) {
      return this.mutableIdMap.get(id);
    }
    const mutableId = t.identifier(
      `__mutableExport${this.nextMutableIdIndex++}`
    );
    this.mutableIdMap.set(id, mutableId);
    return mutableId;
  }

  importMeta() {
    return t.metaProperty(t.identifier("import"), t.identifier("meta"));
  }
}

const babelPlugin = {
  visitor: {
    Program(programPath) {
      const {
        node: { body },
      } = programPath;
      programPath.skip();
      const state = new State();
      state.visitProgram(programPath);
      body.unshift(...state.prefix);
      body.push(...state.suffix);
    },
  },
};

export function hmr(): Plugin {
  return {
    name: "hmr",
    async transform(originalCode, id) {
      if (
        !jsFiles.test(id) ||
        id.includes(hmrModulesDirectory) ||
        !id.includes("/src/")
      ) {
        return;
      }
      const { code, map } = await babel.transformAsync(originalCode, {
        plugins: [babelPlugin],
      });
      return { code, map };
    },
  };
}
