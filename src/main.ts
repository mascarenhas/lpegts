import { choice, seq, re, v, many, plus, kw, tryp, 
    str, cap, not, trans, error, Parser, fromGrammar } from "./parser";

let G = {
    main: trans(many(choice("stat", seq("token", error("stat"))), "panic"), "stats"),
    stats: trans(many("stat", "panic"), "stats"),
    stat: choice("sif", "assign"),
    sif: trans(seq("IF", tryp(seq("exp", "THEN", "stats", "ELSE", "stats", "END"), "if")), "sif"),
    assign: trans(seq("ID", tryp(seq("ASSIGN", "exp"), "assign")), "assign"),
    exp: choice(trans("ID", "id"), trans("NUM", "num")),
    space: many(re("/[ \\t\\n\\r]/")),
    IF: seq("space", kw("if")),
    THEN: seq("space", kw("then")),
    ELSE: seq("space", kw("else")),
    END: seq("space", kw("end")),
    ASSIGN: seq("space", str(":=")),
    ID: seq(not("rws"), "space", cap(seq(re("/[a-zA-Z_]/"), many(re("/\\w/"))))),
    NUM: seq("space", cap(plus(re("/\\d/")))),
    rws: choice("IF", "THEN", "ELSE", "END"),
    token: seq("space", plus(re("/[^ \\t\\n\\r]/")))
}

let recover = new Map<String, Parser>();
recover.set("panic", many(seq(not(choice("IF", "ID")), "token")));

console.log(fromGrammar(G, "Tiny", "./defs", recover))
