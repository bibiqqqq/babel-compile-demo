/**
 * 词法分析
 * @param {string} input 
 */
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

/**
 * 语法分析
 * @param {*} tokens 
 */
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

/**
 * 生成新ast
 * @param {*} ast 
 */
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

module.exports = {
  tokenizer,
  parser,
  transformer,
  codeGenerator,
}