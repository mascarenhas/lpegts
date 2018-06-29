import Tiny from "./tiny";

let t = new Tiny();

let input = `
if foo then
  bar := 
  foo := 3
else
  baz := xxx
end
bar := 3
`
try {
  t.parse(input)
} catch(f) {
  console.log(f);
}

console.log(t.pos, input.length)
for(let s of t.captures[0]) {
  console.log(s);
}
console.log(t.errors)
