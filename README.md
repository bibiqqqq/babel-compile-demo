### Babel是什么
Babel 是一个工具链，主要用于将 ECMAScript 2015+ 版本的代码转换为向后兼容的 JavaScript 语法，以便能够运行在当前和旧版本的浏览器或其他环境中。这样我们才可以很爽的在代码中写入很多es6及以上的API，而不用担心语法的兼容性。这里我将手写一个小demo来演示babel是如何把我们的代码解析的。
### 工作流程
babel编译过程分为三个阶段
1. 解析：将我们的代码解析成一个抽象语法树
2. 变换：将解析后的抽象语法树根据规则变换成新的语法树
3. 再建：将变换后的新的语法树再构建成新的代码

我们先看看个栗子
![avatar](https://51nbimg.u51.com/fd040e363c7543eda31779acf8972d87.jpg)

像这个简单的一个函数，babel是如何转换的呢。

首先第一步：解析，会进过词法分析，将代码以单元形式呈现。例如：
```js
[
    {
        "type": "Keyword",
        "value": "const"
    },
    {
        "type": "Identifier",
        "value": "add"
    },
    {
        "type": "Punctuator",
        "value": "="
    },
    {
        "type": "Punctuator",
        "value": "("
    },
    {
        "type": "Identifier",
        "value": "a"
    },
    {
        "type": "Punctuator",
        "value": ","
    },
    {
        "type": "Identifier",
        "value": "b"
    },
    {
        "type": "Punctuator",
        "value": ")"
    },
    {
        "type": "Punctuator",
        "value": "=>"
    },
    {
        "type": "Identifier",
        "value": "a"
    },
    {
        "type": "Punctuator",
        "value": "+"
    },
    {
        "type": "Identifier",
        "value": "b"
    }
]
```
这就是经过词法分析生成的一个数组，具体可参考[esprima](https://esprima.org/demo/parse.html#)这个网站。

生成这个词法单元列表之后，我们需要把这个列表解析成一个语法树，这样就完成了第一步解析的过程。
```js
{
  "type": "Program",
  "body": [
    {
      "type": "VariableDeclaration",
      "declarations": [
        {
          "type": "VariableDeclarator",
          "id": {
            "type": "Identifier",
            "name": "add"
          },
          "init": {
            "type": "ArrowFunctionExpression",
            "id": null,
            "params": [
              {
                "type": "Identifier",
                "name": "a"
              },
              {
                "type": "Identifier",
                "name": "b"
              }
            ],
            "body": {
              "type": "BinaryExpression",
              "operator": "+",
              "left": {
                "type": "Identifier",
                "name": "a"
              },
              "right": {
                "type": "Identifier",
                "name": "b"
              }
            },
          }
        }
      ],
      "kind": "const"
    }
  ],
}
```
这个其实就是图中左边的抽象语法树，可以参考[astexplorer](https://astexplorer.net/)这个网站。

第二步转换就是将上面的语法树转换成我们需要的语法树。比如我们需要把`const`转变成`var`，`=>`箭头函数转变成普通函数等。都是在这一步完成。

第三步，则是将转换后的语法树变成最后我们需要的代码，也就是图上右边的代码。

接下来我们仔细分析每一个步骤，给出具体实现demo。

### 具体步骤
我们希望的步骤是：
```js
const compiler = input => {
  <!--第一步进行词法分析，解析成最小单元的数组-->
  const tokens = tokenizer(input)
  <!--再经过parser生成语法树-->
  const ast = parser(tokens)
  <!--转换成新的语法树-->
  const newAst = transformer(ast)
  <!--再建成新的代码输出-->
  const output = codeGenerator(newAst)
  return output
}
```
#### 1.词法分析
词法分析就是把代码拆成具备实际意义的最小单元，在这里我们的组小单元比如`const`，`add`等等。所以其实我们就是分情况来判断，没有什么很特别的操作。
```js
const tokenizer = input => {
  let current = 0
  const tokens = []
  while(current < input.length) {
    let char = input[current]
    // 跳过空白符号
    if (/\s/.test(char)) {
      current++
      continue
    }

    // Punctuator
    if (/[=(,)+]/.test(char)) {
      let value = ''
      value += char
      current++
      if (char.concat(input[current]) === '=>') {
        tokens.push({
          type: 'Punctuator',
          value: '=>'
        })
        current++
      } else {
        tokens.push({
          type: 'Punctuator',
          value,
        })
      }
      continue
    }

    // Keyword and Identifier
    if (/[a-zA-Z_$]/.test(char)) {
      let value = ''
      while(/[a-zA-Z0-9_$]/.test(char) && current < input.length) {
        value += char
        char = input[++current]
      }
      if (/const|return/.test(value)) {
        tokens.push({
          type: 'Keyword',
          value,
        })
      } else {
        tokens.push({
          type: 'Identifier',
          value,
        })
      }
      continue
    }
    throw new TypeError('I dont know what this character is: ' + char);
  }

  return tokens
}
```

#### 2.语法分析
语法分析就是将之前的代码转换成抽象语法树，这里是简化的代码，babel实际的语法分析要比这个复杂的多。
```js
const parser = tokens => {
  let current = 0
  let token = tokens[current]
  const parseDeclarations = () => {
    if (token.type === 'Keyword' && token.value === 'const') {
      const VariableDeclaration = {
        type: 'VariableDeclaration',
        kind: token.value,
        declarations: [],
      }

      next()

      if (token.type !== 'Identifier') {
        throw new Error('Expected Variable after const');
      }

      const VariableDeclarator = {
        type: 'VariableDeclarator',
        id: {
          type: token.type,
          name: token.value
        },
      }

      next()

      if (token.type === 'Punctuator' && token.value === '=') {
        VariableDeclarator.init = parseFunction()
      }

      VariableDeclaration.declarations.push(VariableDeclarator)
      return VariableDeclaration
    }
  }

  const parseFunction = () => {
    next()
    let init = {}
    if ((token.type === 'Punctuator' && token.value === '(') || token.type === 'Identifier') {
      stash()
      next()
      while(token.type === 'Identifier' || token.value === ',') {
        next()
      }
      if (token.type === 'Punctuator' && token.value === ')') {
        next()
        if (token.type === 'Punctuator' && token.value === '=>') {
          init = {
            type: 'ArrowFunctionExpression',
            id: null,
            params: [],
            body: {}
          }

          rewind()

          init.params = parseExpressionParams()

          init.body = parseExpressionBody()
        }
      }
    }
    return init
  }
  

  const parseExpressionParams = () => {
    const params = []
    if (token.type === 'Punctuator' && token.value === '(') {
      next()
      while(token.value !== ')') {
        if (token.type === 'Identifier') {
          params.push({
            type: token.type,
            name: token.value
          })
        }
        next()
      }
    }
    return params
  }

  const parseExpressionBody = () => {
    let body = {}
    next()
    if (token.type === 'Punctuator' && token.value === '=>') {
      next()
    }
    if (token.type === 'Identifier') {
      body = {
        type: 'BinaryExpression',
        left: {
          type: token.type,
          name: token.value
        },
      }
      next()

      if (token.type === 'Punctuator' && token.value === '+') {
        body.operator = token.value
      }

      next()

      if (token.type === 'Identifier') {
        body.right = {
          type: token.type,
          name: token.value
        }
      }
    }
    return body
  }

  const next = () => {
    token = tokens[++current]
  }

  const stashStack = []

  const stash = () => {
    stashStack.push(current)
  }

  const rewind = () => {
    current = stashStack.pop()
    token = tokens[current]
  }

  const ast = {
    type: 'Program',
    body: []
  }
  while (current < tokens.length) {
    const statement = parseDeclarations();
    if (!statement) {
        break;
    }
    ast.body.push(statement);
  }
  return ast
}
```

#### 3. 代码转换
首先我们需要定义一个规则，然后就是遍历原来的语法树，找到需要更换的节点进行更换。所以我们先来实现一个遍历方法
##### 3.1 遍历抽象语法树
```js
const traverser = (ast, visitor) => {
  const traverseArray = (array, parent) => {
    array.forEach(child => {
      traverseNode(child, parent)
    })
  }

  const traverseNode = (node, parent) => {
    let method = visitor[node.type]
    
    if (method && method.enter) {
      method.enter(node, parent)
    }

    switch(node.type) {
      case 'Program':
        traverseArray(node.body, node)
        break
      case 'VariableDeclaration':
        traverseArray(node.declarations, node)
        break
      case 'VariableDeclarator':
        traverseArray(node.init.params, node.init)
        break
      case 'Identifier':
        break
      default:
        throw new TypeError(node.type);
    }
  }

  traverseNode(ast, null)
}
```
##### 3.2 转换代码
```js
const transformer = ast => {
  const newAst = {
    type: 'Program',
    body: [],
  }

  ast._context = newAst.body;

  traverser(ast, {
    VariableDeclaration: {
      enter: (node, parent) => {
        const declarationNode = {
          type: 'VariableDeclaration',
          kind: 'var',
          declarations: []
        }
        parent._context.push(declarationNode)
        node._context = declarationNode.declarations
      }
    },
    VariableDeclarator: {
      enter: (node, parent) => {
        const init = {}
        const declaratorNode = {
          type: 'VariableDeclarator',
          id: node.id,
          init,
        }
        if (node.init.type === 'ArrowFunctionExpression') {
          init.type = 'FunctionExpression'
          init.id = node.id
          init.params = node.init.params
        }
        if (node.init.body.type === 'BinaryExpression') {
          init.body = {
            type: 'BlockStatement',
            body: [
              {
                type: 'ReturnStatement',
                argument: node.init.body
              }
            ]
          }
        }
        parent._context.push(declaratorNode)
      }
    },
  })

  return newAst
}
```
#### 4. 生成新的代码
```js
const codeGenerator = node => {
  const whitespace = ' '
  switch(node.type) {
    case 'Program':
      return node.body.map(codeGenerator).join('')
    case 'VariableDeclaration':
      return node.kind + whitespace + node.declarations.map(codeGenerator)
    case 'VariableDeclarator':
      return node.id.name + whitespace + '=' + whitespace + 'function' + codeGenerator(node.init)
    case 'FunctionExpression':
      return whitespace + codeGenerator(node.id) + whitespace + '(' + node.params.map(codeGenerator) + ')' + whitespace + codeGenerator(node.body)
    case 'BlockStatement':
      return '{' + node.body.map(codeGenerator) + '}'
    case 'ReturnStatement':
      return 'return' + whitespace +  codeGenerator(node.argument)
    case 'BinaryExpression':
      return codeGenerator(node.left) + whitespace + node.operator + whitespace + codeGenerator(node.right)
    case 'Identifier':
      return node.name
    default:
      throw new TypeError(node.type)
  }
}
```

这里我就完成了整个编译流程。
```js
const input = `const add = (a, b) => a + b`
const compiler = input => {
  const tokens = tokenizer(input)
  const ast = parser(tokens)
  const newAst = transformer(ast)
  const output = codeGenerator(newAst)
  return output
}
const result = compiler(input) // var add = function add (a,b) {return a + b}
```

### 最后
至此我们完成了这个babel编译的demo，我们通过这个demo了解了babel是如何解析编译我们的代码的。其实大多数编译相关其实步骤都类似。最关键的其实还是生成的抽象语法树。

参考：
- [Babel](https://babeljs.io/)
- [the-super-tiny-compiler](https://github.com/jamiebuilds/the-super-tiny-compiler)
- [Babel是如何读懂JS代码的](https://zhuanlan.zhihu.com/p/27289600)


