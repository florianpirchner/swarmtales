// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * Reads the error codes out of the source of the packages, without running it. A code is a string literal
 * `"SWT-<letter><three digits>"` in code (a mention in a comment is none). Where a code is raised, the texts of its
 * issue are read off the syntax: the fields `summary`, `why` and `fix` of an object literal with that `code`; the
 * arguments of a call whose first argument is the code, by the parameter names of the helper it calls (of the same
 * file, else the one helper of that name in all files; with no helper the argument after the code is the summary); the
 * value of a catalogue entry keyed by the code. A part that is computed is written as a placeholder `{name}`.
 */
import ts from "typescript";

/** The pattern of a code; the same as `SWT_CODE` of `@swarmtales/contracts`. */
const CODE = /^SWT-[GMDRXPLCET][0-9]{3}$/;

/** The texts of one code. */
export type Texts = Partial<Record<"summary" | "why" | "fix", string>>;

/** One place in the source that names a code, with what it says about the code. */
export interface Site extends Texts {
	readonly code: string;
	readonly file: string;
	/** What the comment in front of the place says the code is, when it documents the code: a catalogue entry. */
	readonly doc?: string;
}

type Lookup = (name: string, from: ts.Node) => ts.Expression | undefined;

/** A function a code is passed to, with the constants of its file. */
interface Helper {
	readonly signature: ts.FunctionLikeDeclaration;
	readonly lookup: Lookup;
}

/** The helpers of one file by name, and of all files by name. */
interface Helpers {
	readonly local: ReadonlyMap<string, Helper>;
	readonly all: ReadonlyMap<string, readonly Helper[]>;
}

/** One source file to read. */
export interface SourceText {
	readonly file: string;
	readonly text: string;
}

function isCodeLiteral(node: ts.Node): node is ts.StringLiteral | ts.NoSubstitutionTemplateLiteral {
	return (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) && CODE.test(node.text);
}

/** The short name of a computed part: the last name in it. */
function nameOf(node: ts.Expression): string {
	if (ts.isIdentifier(node)) return node.text;
	if (ts.isPropertyAccessExpression(node)) return node.name.text;
	if (ts.isCallExpression(node)) return nameOf(node.arguments[0] ?? node.expression);
	if (ts.isElementAccessExpression(node) || ts.isNonNullExpression(node) || ts.isParenthesizedExpression(node)) return nameOf(node.expression);
	if (ts.isBinaryExpression(node)) return nameOf(node.left);
	return "value";
}

/** The branch of `x === "SWT-..." ? a : b` that belongs to the code; undefined for any other condition. */
function branchFor(node: ts.ConditionalExpression, code: string): ts.Expression | undefined {
	const test = node.condition;
	if (!ts.isBinaryExpression(test) || test.operatorToken.kind !== ts.SyntaxKind.EqualsEqualsEqualsToken) return undefined;
	const literal = [test.left, test.right].find(isCodeLiteral);
	if (literal === undefined) return undefined;
	return literal.text === code ? node.whenTrue : node.whenFalse;
}

/**
 * Renders an expression as text: literals as they are, a template with placeholders, a local constant by its value.
 *
 * @param node - The expression.
 * @param code - The code the text belongs to.
 * @param lookup - Finds the value of a local constant.
 * @returns The text.
 */
function render(node: ts.Expression, code: string, lookup: Lookup): string {
	const inner = unwrap(node, code);
	if (inner !== node) return render(inner, code, lookup);
	if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) return node.text;
	if (ts.isTemplateExpression(node)) return renderTemplate(node, code, lookup);
	if (ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.PlusToken) return render(node.left, code, lookup) + render(node.right, code, lookup);
	const value = ts.isIdentifier(node) ? lookup(node.text, node) : undefined;
	return value === undefined ? `{${nameOf(node)}}` : render(value, code, lookup);
}

/** The expression a text is read from: inside parentheses, and of a choice the branch of the code or the usual case. */
function unwrap(node: ts.Expression, code: string): ts.Expression {
	if (ts.isParenthesizedExpression(node)) return node.expression;
	// A choice by the code is resolved; any other choice shows its usual case, the one after the colon.
	return ts.isConditionalExpression(node) ? (branchFor(node, code) ?? node.whenFalse) : node;
}

function renderTemplate(node: ts.TemplateExpression, code: string, lookup: Lookup): string {
	let text = node.head.text;
	for (const span of node.templateSpans) {
		// A call that runs into the next word is a prefix that some cases have ("did you mean ...? Or "): left out.
		const prefix = ts.isCallExpression(span.expression) && /^[a-z]/.test(span.literal.text);
		text += (prefix ? "" : render(span.expression, code, lookup)) + span.literal.text;
	}
	return text;
}

/** The block, function or file a declaration is visible in. */
function scopeOf(node: ts.Node): ts.Node {
	let scope = node.parent;
	while (!ts.isBlock(scope) && !ts.isSourceFile(scope) && !ts.isFunctionLike(scope)) scope = scope.parent;
	return scope;
}

/** Finds the initialiser of a constant of that name: the innermost one visible from a node, else the only one of the file. */
function lookupIn(file: ts.SourceFile): Lookup {
	const declared = new Map<string, ts.VariableDeclaration[]>();
	const collect = (node: ts.Node): void => {
		if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.initializer !== undefined) declared.set(node.name.text, [...(declared.get(node.name.text) ?? []), node]);
		ts.forEachChild(node, collect);
	};
	collect(file);
	return (name, from) => {
		const all = declared.get(name) ?? [];
		const visible = all.filter((declaration) => from.pos >= scopeOf(declaration).pos && from.end <= scopeOf(declaration).end);
		const near = visible.sort((a, b) => scopeOf(b).pos - scopeOf(a).pos)[0] ?? (all.length === 1 ? all[0] : undefined);
		return near?.initializer;
	};
}

/** The helpers of a file by name: a function declaration or a function in a constant, at the top of the file. */
function helpersIn(file: ts.SourceFile, lookup: Lookup): ReadonlyMap<string, Helper> {
	const helpers = new Map<string, Helper>();
	for (const statement of file.statements) {
		if (ts.isFunctionDeclaration(statement) && statement.name !== undefined) helpers.set(statement.name.text, { signature: statement, lookup });
		if (!ts.isVariableStatement(statement)) continue;
		for (const declaration of statement.declarationList.declarations) {
			const value = declaration.initializer;
			if (ts.isIdentifier(declaration.name) && value !== undefined && (ts.isArrowFunction(value) || ts.isFunctionExpression(value))) helpers.set(declaration.name.text, { signature: value, lookup });
		}
	}
	return helpers;
}

/** The comment in front of the nearest node around the literal that documents the code, as one line. */
function docOf(literal: ts.Node, code: string, text: string): string | undefined {
	for (let node: ts.Node = literal; !ts.isSourceFile(node); node = node.parent) {
		for (const range of ts.getLeadingCommentRanges(text, node.getFullStart()) ?? []) {
			const comment = text.slice(range.pos, range.end).replace(/^\/\*\*?|\*\/$|^\s*\*\s?|^\/\/\s?/gm, "");
			const lead = comment.trim().split(/\n\s*\n|\n\s*@/)[0]?.replace(/\s+/g, " ") ?? "";
			const match = new RegExp(`^\`${code}\`(?:, [^:]*)?(?::| for) (.+)$`).exec(lead);
			if (match?.[1] !== undefined) return match[1];
		}
	}
	return undefined;
}

function fieldsOfObject(object: ts.ObjectLiteralExpression, code: string, lookup: Lookup): Texts {
	const texts: Texts = {};
	for (const property of object.properties) {
		const name = property.name !== undefined && ts.isIdentifier(property.name) ? property.name.text : undefined;
		if (name !== "summary" && name !== "why" && name !== "fix") continue;
		const value = ts.isPropertyAssignment(property) ? property.initializer : lookup(name, property);
		if (value !== undefined) texts[name] = render(value, code, lookup);
	}
	return texts;
}

/** The helper a call calls: of the same file, else the one helper of that name in all files. */
function helperOf(call: ts.CallExpression, helpers: Helpers): Helper | undefined {
	const name = ts.isIdentifier(call.expression) ? call.expression.text : "";
	const named = helpers.all.get(name) ?? [];
	return helpers.local.get(name) ?? (named.length === 1 ? named[0] : undefined);
}

function fieldsOfCall(call: ts.CallExpression, code: string, lookup: Lookup, helpers: Helpers): Texts {
	const helper = helperOf(call, helpers);
	const names = helper?.signature.parameters.map((parameter) => (ts.isIdentifier(parameter.name) ? parameter.name.text : "")) ?? ["code", "summary"];
	const texts: Texts = {};
	for (const field of ["summary", "why", "fix"] as const) {
		const argument = call.arguments[names.indexOf(field)];
		if (argument !== undefined) texts[field] = render(argument, code, lookup);
		else if (helper !== undefined) {
			// A text the helper computes itself is a constant in its body.
			const own = helper.lookup(field, helper.signature.body ?? helper.signature);
			if (own !== undefined) texts[field] = render(own, code, helper.lookup);
		}
	}
	return texts;
}

/** The object literal whose field `code` the literal is the value of. */
function codeObjectOf(literal: ts.Node): ts.ObjectLiteralExpression | undefined {
	const parent = literal.parent;
	const isCode = ts.isPropertyAssignment(parent) && parent.initializer === literal && ts.isIdentifier(parent.name) && parent.name.text === "code";
	return isCode && ts.isObjectLiteralExpression(parent.parent) ? parent.parent : undefined;
}

/** What one code literal says, by its place in the syntax. */
function textsAt(literal: ts.StringLiteral | ts.NoSubstitutionTemplateLiteral, lookup: Lookup, helpers: Helpers): Texts {
	const parent = literal.parent;
	const code = literal.text;
	const object = codeObjectOf(literal);
	if (object !== undefined) return fieldsOfObject(object, code, lookup);
	if (ts.isCallExpression(parent) && parent.arguments[0] === literal) return fieldsOfCall(parent, code, lookup, helpers);
	if (ts.isPropertyAssignment(parent) && parent.name === literal) {
		const value = parent.initializer;
		if (ts.isObjectLiteralExpression(value)) return fieldsOfObject(value, code, lookup);
		if (ts.isStringLiteral(value)) return { summary: value.text };
	}
	return {};
}

/**
 * Finds every code the source files name in code, with the texts each place gives.
 *
 * @param files - The files, each with its path relative to the repository root.
 * @returns One site per code literal, in the order of the files and of each file.
 */
export function sitesOf(files: readonly SourceText[]): readonly Site[] {
	const parsed = files.map(({ file, text }) => {
		const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
		const lookup = lookupIn(source);
		return { file, text, source, lookup, local: helpersIn(source, lookup) };
	});
	const all = new Map<string, Helper[]>();
	for (const { local } of parsed) for (const [name, helper] of local) all.set(name, [...(all.get(name) ?? []), helper]);
	const sites: Site[] = [];
	for (const { file, text, source, lookup, local } of parsed) {
		const visit = (node: ts.Node): void => {
			if (isCodeLiteral(node)) {
				const doc = docOf(node, node.text, text);
				sites.push({ code: node.text, file, ...textsAt(node, lookup, { local, all }), ...(doc === undefined ? {} : { doc }) });
			}
			ts.forEachChild(node, visit);
		};
		visit(source);
	}
	return sites;
}
