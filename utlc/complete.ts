import { parser, syntax, token } from "../sexp";
import { parse_expr, type exp } from "./parse_expr";
import * as vscode from "vscode";
import { CompletionItemKind as kind, CompletionItem as Item } from "vscode";
import type { CompletionItemProvider as Provider } from "vscode";

export { make };

const is_typing = (tok: token, pos: vscode.Position): boolean => {
    return tok.line === pos.line && tok.character + tok.length === pos.character;
};

const typing_token = (sexp: syntax[], pos: vscode.Position): token | undefined => {
    const dfs = (syn: syntax): token | undefined => {
        switch (syn.tag) {
            case syntax.tag.atom:
            case syntax.tag.lone: {
                if (is_typing(syn.leaf, pos)) return syn.leaf;
                return undefined;
            }
            case syntax.tag.group:
            case syntax.tag.mismatch: {
                return dfs_many(syn.children);
            }
        }
    };
    const dfs_many = (syns: syntax[]): token | undefined => {
        for (const tl of syns) {
            const val = dfs(tl);
            if (val !== undefined) return val;
        }
        return undefined;
    };
    return dfs_many(sexp);
};

const typing_span = (sexp: syntax[], text: string, pos: vscode.Position): string => {
    const tok = typing_token(sexp, pos);
    return tok ? text.slice(tok.start, tok.end) : "";
};

// 从 AST 中收集光标位置可见的 lambda 参数名
// 用 is_typing 做 fast exit，用 scope stack 保证作用域正确
function collect_params_in_scope(exprs: exp[], pos: vscode.Position, sexp: syntax[]): string[] {
    const tok = typing_token(sexp, pos);
    if (!tok || !is_typing(tok, pos)) return [];

    const tok_range = token.to_range(tok);
    console.log("[utlc] typing token", {
        line: tok.line,
        character: tok.character,
        length: tok.length,
    });

    const before = (a: { line: number; character: number }, b: { line: number; character: number }): boolean =>
        a.line < b.line || (a.line === b.line && a.character <= b.character);

    const inside = (r: { start: { line: number; character: number }; end: { line: number; character: number } }): boolean =>
        before(r.start, tok_range.start) && before(tok_range.end, r.end);

    const scope: string[] = [];
    let result: string[] = [];

    const walk = (e: exp): boolean => {
        if (!inside(e.range)) return false;

        switch (e.tag) {
            case "abs": {
                scope.push(e.param);
                if (inside(e.body.range) && walk(e.body)) {
                    scope.pop();
                    return true;
                }
                // 光标在 param 位置 → 弹出当前 param，返回外层作用域
                scope.pop();
                result = scope.slice();
                console.log("[utlc] scope", `(${result.length})`, result);
                return true;
            }
            case "app": {
                if (inside(e.func.range) && walk(e.func)) return true;
                if (inside(e.args.range) && walk(e.args)) return true;
                result = scope.slice();
                console.log("[utlc] scope", `(${result.length})`, result);
                return true;
            }
            case "var_": {
                result = scope.slice();
                console.log("[utlc] scope", `(${result.length})`, result);
                return true;
            }
        }
    };

    for (const e of exprs) {
        if (walk(e)) break;
    }

    return result;
}

const make = (_out: vscode.OutputChannel): Provider => {
    return {
        provideCompletionItems: (doc, pos) => {
            const text = doc.getText();
            const p = parser.make(text);
            const sexp = parser.parse(p);
            const { exprs } = parse_expr(text);

            const params = collect_params_in_scope(exprs, pos, sexp);
            const ts = typing_span(sexp, text, pos);

            const rslt: vscode.CompletionItem[] = [];

            // 关键字补全
            const lambdaKeyword = new Item("lambda", kind.Keyword);
            lambdaKeyword.insertText = new vscode.SnippetString("lambda ${1:x} ${2:body}");
            lambdaKeyword.documentation = new vscode.MarkdownString("Insert a lambda abstraction: `(lambda x body)`");
            lambdaKeyword.command = { command: "editor.action.triggerSuggest", title: "Re-trigger completions..." };
            rslt.push(lambdaKeyword);

            const lambdaSymbol = new Item("λ", kind.Keyword);
            lambdaSymbol.insertText = new vscode.SnippetString("λ ${1:x} ${2:body}");
            lambdaSymbol.documentation = new vscode.MarkdownString("Insert a lambda abstraction: `(λ x body)`");
            lambdaSymbol.command = { command: "editor.action.triggerSuggest", title: "Re-trigger completions..." };
            rslt.push(lambdaSymbol);

            // 变量补全
            const seen = new Set<string>();
            for (const name of params) {
                if (!seen.has(name) && name !== ts) {
                    seen.add(name);
                    rslt.push(new Item(name, kind.Variable));
                }
            }

            return rslt;
        },
    };
};
