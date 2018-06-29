The beginnings of a parser generator for labeled PEGs, using TypeScript, for TypeScript.

Right now mostly a proof of concept that generates a TypeScript parser from a
parser description (an AST built from parser combinators). Uses exceptions
to backtrack, and a capture model similar to the one of [LPEG](http://www.inf.puc-rio.br/~roberto/lpeg/)
for extracting and building results from the input.

Builtin support for error recovery through resynchronization, right
now any repetition can be a resynchronization point. The idea
is that on a syntax error the input is advanced to a synchronization
token (using a recovery parsing expression), 
and then a synchronization error is thrown that lets
the parser continue on a synchronization point.