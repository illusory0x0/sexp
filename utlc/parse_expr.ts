import { syntax, token } from "../sexp"

type exp = exp.var_ | exp.abs | exp.app;
export namespace exp {
    export type var_ = { tag: "var_"; name: string };
    export type abs = { tag: "abs"; param: string; body: exp };
    export type app = { tag: "app"; func: exp; args: exp };
}

//辅助函数：提取syntax中的文本内容，并返回其在原始输入中的位置（span）
function syntax_to_span(syn: syntax, text: string): string {

}
// 过滤掉可跳过的节点（空格、注释等）
function is_skipable(syn: syntax, text: string): boolean {
  // 简化：根据 token.kind 判断，暂时全部返回 false
  return false;
}

export function parse_expr(syn: syntax, text:string): exp {
    switch(syn.tag){
        case "atom": {
            const name = syntax_to_span(syn, text);
            return { tag: "var_", name };
        }
        case "line":
        case "mismatch": 

        case "group":{

        }
        default:
            throw new Error(`Unexpected syntax tag: ${syn.tag}`);
    }
}