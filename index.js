// const add = (a, b) => {
//   return a + b
// }

// var add = function add(a, b) {
//   return a + b;
// };

const result = tokenizer(`const add = (a, b) => {
  return a + b
}`)

console.log(result)

/**
 * 词法分析
 * @param {string} input 
 */
function tokenizer(input) {
  
}