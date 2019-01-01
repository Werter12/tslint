/**
 * @license
 * Copyright 2018 Palantir Technologies, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { isImportDeclaration } from "tsutils";
import * as ts from "typescript";

import * as Lint from "../index";

export class Rule extends Lint.Rules.AbstractRule {
    /* tslint:disable:object-literal-sort-keys */
    public static metadata: Lint.IRuleMetadata = {
        ruleName: "import-from-emotion",
        description: "Disallows importing from react-emotion and encourage import from emotion.",
        descriptionDetails: Lint.Utils.dedent`
             Disallows if anything other than styled is imported from react-emotion, because 
             emotion's exports are not re-exported from react-emotion in emotion 10 and above.
        `,
        optionsDescription: "Not configurable.",
        options: null,
        optionExamples: [true],
        type: "functionality",
        hasFix: true,
        typescriptOnly: false,
    };

    public static DISALLOWED_IMPORT = "react-emotion";

    public static FAILURE_STRING_FACTORY() {
        return "React emotion is disallowed";
    }

    public apply(sourceFile: ts.SourceFile): Lint.RuleFailure[] {
        return this.applyWithWalker(new Walker(sourceFile, this.ruleName, undefined));
    }
}

class Walker extends Lint.AbstractWalker<void> {
    public walk({ statements }: ts.SourceFile): void {
        for (const statement of statements) {
            if (!isImportDeclaration(statement)) {
                continue;
            }

            const { importClause } = statement;
            if (importClause === undefined) {
                continue;
            }
            this.checkImportClause(statement, importClause);
        }
    }

    private checkImportClause(
        statement: ts.ImportDeclaration & { moduleSpecifier: any },
        importClause: ts.ImportClause,
    ): void {
        if (statement.moduleSpecifier.text !== Rule.DISALLOWED_IMPORT) {
            return;
        }
        const name: ts.Identifier | undefined = importClause.name;
        const namedBindings:
            | ts.NamedImports
            | undefined = importClause.namedBindings as ts.NamedImports;
        const emotionImport =
            namedBindings && Array.isArray(namedBindings.elements) && namedBindings.elements.length
                ? `import { ${namedBindings.elements
                      .map(
                          (element: ts.ImportSpecifier) =>
                              element.propertyName
                                  ? `${element.propertyName.escapedText} as ${
                                        element.name.escapedText
                                    }`
                                  : element.name.escapedText,
                      )
                      .join(",")} } from 'emotion';`
                : "";
        const styledImport =
            name && name.escapedText
                ? `import ${name.escapedText} from '@emotion/styled';${emotionImport ? `\n` : ""}`
                : "";
        const fix = `${styledImport}${emotionImport}`;

        this.addFailureAtNode(
            statement.moduleSpecifier,
            Rule.FAILURE_STRING_FACTORY(),
            Lint.Replacement.replaceNode(statement, fix),
        );
    }

    /*    private checkNameBindingsType(namedBindings: ts.NamedImportBindings){
        return namedBindings.kind === ts.SyntaxKind.ImportDeclaration ;
    }*/
}

/*
function checkStatement(statement: ts.Statement): ts.ImportDeclaration|boolean {
    return isImportDeclaration(statement) ? statement : false;
}
*/
