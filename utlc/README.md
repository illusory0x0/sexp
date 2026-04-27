## textmate 项目分析

这是一个 **TextMate Language Grammar 生成器** 的 VS Code 扩展。它用 S-expression 语法来描述 TextMate 语法高亮规则，然后编译成 TextMate 的 `.json` 格式。

### 架构（从底到顶）

```
sexp.ts          — S-expression 解析器（词法分析 + 语法分析）
check.ts         — 类型检查 + 作用域解析（infer_source）
lower.ts         — 将 AST 降级为 emit 层的 IR
emit.ts          — 将 IR 输出为 TextMate JSON 格式
```

### 各文件职责

| 文件 | 功能 |
|------|------|
| `sexp.ts` | 通用的 S-expression 解析器（和根目录的 `sexp.ts` 一样） |
| `check.ts` | **类型检查**：解析 S-expression 为 AST，做类型推断和作用域检查。定义了 `regex`、`pattern`、`binding`、`grammar` 等类型 |
| `lower.ts` | **降级编译**：把 `check` 层的 AST 转换成 `emit` 层的 IR |
| `emit.ts` | **代码生成**：把 IR 输出为 TextMate Language Grammar 的 JSON 格式 |
| `complete.ts` | **自动补全**：提供变量名补全 |
| `rename.ts` | **重命名**：提供变量重命名功能 |
| `diagnostic.ts` | **诊断**：实时错误检查 |
| `action.ts` | **Code Action**：提供"emit"操作，把 `.tm` 文件编译成 `.json` |

### 数据流

```
.tm 文件 (S-expression)
  → sexp.ts 解析为 syntax tree
  → check.ts 类型检查 + 作用域解析 → AST
  → lower.ts 降级为 IR
  → emit.ts 输出为 TextMate JSON
```

### 语法示例

```lisp
;; 定义一个 grammar
(grammar sexp)

;; 定义一个正则表达式绑定
(let identifier (negative (choice 32 40 41 91 93 123 125)))

;; 定义一个 pattern 绑定
(let keywords (match "keyword.other" (choice "let" "lambda" "type")))
```

### 核心类型系统

- **regex** 类型：`concat`、`choice`、`repeat`、`negative`、`code_point`、`lstr`
- **pattern** 类型：`match`（匹配正则）、`surround`（begin/end 包围）、`variable`（引用）
- **stmt** 类型：`binding`（let 绑定）、`grammar`（grammar 声明）