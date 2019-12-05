const {
  tokenizer,
  parser,
  transformer,
  codeGenerator,
} = require('./util')

const input = `const add = (a, b) => a + b`

const compiler = input => {
  const tokens = tokenizer(input)
  const ast = parser(tokens)
  const newAst = transformer(ast)
  const output = codeGenerator(newAst)
  return output
}

const result = compiler(input)
console.log(result)