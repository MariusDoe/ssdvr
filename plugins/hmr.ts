import * as babel from "@babel/core";
import * as t from "@babel/types";
import { Plugin } from "vite";

const jsFiles = /\.[jt]sx?$/;

const runningModuleModule = "/src/hmr/running-module.ts";
const keepAliveModule = "/src/hmr/keep-alive.ts";
const updateExportsModule = "/src/hmr/update-exports.ts";

const parse = (source: string) => babel.parse(source)!.program.body;

const beforeProgram = parse(`
import {
  pushRunningModule as __pushRunningModule,
  popRunningModule as __popRunningModule,
  moduleNamespaceToModule as __moduleNamespaceToModule,
} from "${runningModuleModule}";
__pushRunningModule(import.meta);
`);

const afterProgram = parse(`
__popRunningModule();
`);

const currentModuleNamespaceId = "__currentModuleNamespace";

const acceptProgram = parse(`
import { moduleReloaded as __moduleReloaded } from "${keepAliveModule}";
import { updateExports as __updateExports } from "${updateExportsModule}";
if (import.meta.hot) {
  import.meta.hot.accept(newModuleNamespace => {
    __moduleReloaded(import.meta, __moduleNamespaceToModule(newModuleNamespace));
    __updateExports(import.meta, ${currentModuleNamespaceId}, newModuleNamespace);
  });
}
`);

const babelPlugin: babel.PluginObj = {
  visitor: {
    Program(programPath) {
      const {
        node: { body },
      } = programPath;
      body.unshift(...beforeProgram);
      let acceptable = true;
      const exportStatements: {
        path: babel.NodePath<babel.types.ExportNamedDeclaration>;
        ids: babel.types.Identifier[];
      }[] = [];
      let exportDefault: babel.NodePath<babel.types.ExportDefaultDeclaration> =
        null;
      programPath.traverse({
        ExportNamedDeclaration(exportPath) {
          const { node } = exportPath;
          if (node.source !== null) {
            return;
          }
          if (node.specifiers.length > 0) {
            acceptable = false;
            programPath.stop();
            exportPath.stop();
            return;
          }
          const ids = [];
          exportPath.traverse({
            VariableDeclaration(variablePath) {
              variablePath.skip();
              if (variablePath.node.kind !== "const") {
                acceptable = false;
                programPath.stop();
                variablePath.stop();
                return;
              }
              ids.push(
                ...variablePath.node.declarations.map(
                  (declarator) => declarator.id
                )
              );
            },
            FunctionDeclaration(path) {
              ids.push(path.node.id);
              path.skip(); // ignore body
            },
            ClassDeclaration(path) {
              ids.push(path.node.id);
              path.skip(); // ignore body
            },
          });
          exportStatements.push({
            path: exportPath,
            ids,
          });
        },
        ExportDefaultDeclaration(path) {
          exportDefault = path;
        },
      });
      body.push(...afterProgram);
      if (acceptable) {
        let index = 0;
        const mutableIdMap = new Map<
          babel.types.Identifier,
          babel.types.Identifier
        >();
        const mutableIdFor = (id: babel.types.Identifier) => {
          if (mutableIdMap.has(id)) {
            return mutableIdMap.get(id);
          }
          const mutableId = t.identifier(`__mutableExport${index++}`);
          mutableIdMap.set(id, mutableId);
          return mutableId;
        };
        for (const { path, ids } of exportStatements) {
          path.replaceWithMultiple([
            path.node.declaration,
            t.variableDeclaration(
              "let",
              ids.map((id) => t.variableDeclarator(mutableIdFor(id), id))
            ),
            t.exportNamedDeclaration(
              null,
              ids.map((id) => t.exportSpecifier(mutableIdFor(id), id))
            ),
          ]);
        }
        if (exportDefault) {
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
          const defaultId = t.identifier("default");
          exportDefault.replaceWithMultiple([
            ...beforeLet,
            t.variableDeclaration("let", [
              t.variableDeclarator(
                mutableIdFor(defaultId),
                letInitializer as babel.types.Expression
              ),
            ]),
            t.exportNamedDeclaration(null, [
              t.exportSpecifier(mutableIdFor(defaultId), defaultId),
            ]),
          ]);
        }
        const newValue = t.identifier("newValue");
        body.push(
          t.variableDeclaration("const", [
            t.variableDeclarator(
              t.identifier(currentModuleNamespaceId),
              t.objectExpression(
                Array.from(mutableIdMap.entries()).flatMap(
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
        body.push(...acceptProgram);
      }
    },
  },
};

export default function hmr(): Plugin {
  return {
    name: "hmr",
    async transform(originalCode, id) {
      if (!jsFiles.test(id) || id.endsWith(runningModuleModule)) {
        return;
      }
      const { code, map } = babel.transform(originalCode, {
        plugins: [babelPlugin],
      });
      return { code, map };
    },
  };
}
