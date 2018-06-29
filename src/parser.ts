const enum ParserTag {
    CharClass,
    Regexp,
    Keyword,
    Sequence,
    Choice,
    Many,
    Variable,
    Option,
    Capture,
    Transform,
    Collect,
    Literal,
    Not, 
    Error
}

interface CharClass {
    tag: ParserTag.CharClass,
    pred: string
}

interface Regexp {
    tag: ParserTag.Regexp,
    re: string
}

interface Keyword {
    tag: ParserTag.Keyword,
    kw: string
}

interface Sequence {
    tag: ParserTag.Sequence,
    ps: Parser[]
}

interface Choice {
    tag: ParserTag.Choice,
    ps: Parser[]
}

interface Many {
    tag: ParserTag.Many,
    p: Parser,
    recover?: string
}

interface Variable {
    tag: ParserTag.Variable,
    name: string
}

interface Option {
    tag: ParserTag.Option,
    p: Parser
}

interface Capture {
    tag: ParserTag.Capture,
    p: Parser
}

interface Transform {
    tag: ParserTag.Transform,
    p: Parser,
    fun: string
}

interface Collect {
    tag: ParserTag.Collect,
    p: Parser,
    fields: string[]
}

interface Literal {
    tag: ParserTag.Literal,
    s: string
}

interface Not {
    tag: ParserTag.Not,
    p: Parser
}

interface Error {
    tag: ParserTag.Error,
    label: string
}

export type Parser = string | CharClass | Sequence | Choice | Many | Variable
    | Option | Capture | Transform | Collect | Regexp | Keyword | Literal | Not | Error

function generate(p: Parser, recover?: Map<String, Parser>): string {
    if(typeof p === "string") {
        return `this.${p}()`;
    } else switch(p.tag) {
        case ParserTag.CharClass: {
            return `if(this.pos < this.input.length && defs.${p.pred}(this.input.charAt(this.pos))) this.pos++; else throw "fail";`;
        }
        case ParserTag.Regexp: {
            return `if(this.pos < this.input.length && this.input.charAt(this.pos).match(${p.re}) !== null) this.pos++; else throw "fail";`;
        }
        case ParserTag.Keyword: {
            return `
                if(this.input.substr(this.pos, ${p.kw.length}) === "${p.kw}") {
                    this.pos += ${p.kw.length};
                    if(this.input.charAt(this.pos).match(/\\w/) !== null) throw "fail";
                } else throw "fail";
            `
        }
        case ParserTag.Literal: {
            return `
                if(this.input.substr(this.pos, ${p.s.length}) === "${p.s}") {
                    this.pos += ${p.s.length};
                } else throw "fail";
            `
        }
        case ParserTag.Sequence: {
            let gps: string[] = [];
            for(let x of p.ps) {
                gps.push(generate(x, recover));
            }
            return gps.join("\n");
        }
        case ParserTag.Choice: {
            if(p.ps.length === 1) {
                return generate(p.ps[0], recover);
            } else {
                let ps = [ ...p.ps ];
                let p0 = ps.shift();
                return `
                    {
                        let savepos = this.pos;
                        let savecap = [...this.captures];
                        try {
                            ${generate(p0, recover)}
                        } catch(f) {
                            if(f === "fail") {
                                this.pos = savepos;
                                this.captures = savecap;
                                ${generate(choice(...ps), recover)}
                            } else throw f;
                        }
                    }
                `
            }
        }
        case ParserTag.Many: {
            if(p.recover) return `
                while(true) {
                    let savepos = this.pos;
                    let savecap = [...this.captures];
                    try {
                        ${generate(p.p, recover)}
                    } catch(f) {
                        if(f === "fail") {
                            this.pos = savepos;
                            this.captures = savecap;
                            break;
                        } else if(f === "${p.recover}") {
                            this.captures = savecap;
                        } else throw f;
                    }
                }
            `; 
            else return `
                while(true) {
                    let savepos = this.pos;
                    let savecap = [...this.captures];
                    try {
                        ${generate(p.p, recover)}
                    } catch(f) {
                        if(f === "fail") {
                            this.pos = savepos;
                            this.captures = savecap;
                            break;
                        }
                        else throw f;
                    }
                }
            `
        }
        case ParserTag.Variable: {
            return `this.${p.name}()`
        }
        case ParserTag.Option: {
            return `
                {
                    let savepos = this.pos;
                    let savecap = [...this.captures];
                    try {
                        ${generate(p.p, recover)}
                    } catch(f) {
                        if(f === "fail") {
                            this.pos = savepos;
                            this.captures = savecap;
                        }
                        else throw f;
                    }
                }
            `
        }
        case ParserTag.Capture: {
            return `
            {
                let startpos = this.pos;
                ${generate(p.p, recover)}
                this.captures.push(this.input.substring(startpos, this.pos));
            }
            `
        }
        case ParserTag.Transform: {
            return `
                {
                    let ocap = this.captures;
                    this.captures = [];
                    ${generate(p.p, recover)}
                    ocap.push(defs.${p.fun}(...this.captures));
                    this.captures = ocap;
                }
            `
        }
        case ParserTag.Collect: {
            let fields: string[] = [];
            for(let i = 0; i < fields.length; i++) {
                fields.push(`${fields[i]}: this.captures[${i}]`);
            }
            return `
                {
                    let ocap = this.captures;
                    this.captures = [];
                    ${generate(p.p, recover)}
                    ocap.push({ ${fields.join(", ")} });
                    this.captures = ocap;
                }
            `
        }
        case ParserTag.Not: {
            return `
                {
                    let savepos = this.pos;
                    let savecap = [...this.captures];
                    this.captures = [];
                    try {
                        ${generate(p.p)}
                        throw "failfail";
                    } catch(f) {
                        this.captures = savecap;
                        if(f === "fail") {
                            this.pos = savepos;
                        } else if(f === "failfail") {
                            throw "fail";
                        } else {
                            throw f;
                        }
                    }
                }
            `
        }
        case ParserTag.Error: {
            if(recover && recover.has(p.label)) {
                return `
                    this.errors.push({ pos: this.pos, label: "${p.label}" });
                    ${generate(recover.get(p.label))}
                `
            } else if(recover && recover.has("panic")) {
                return `
                    this.errors.push({ pos: this.pos, label: "${p.label}" });
                    ${generate(recover.get("panic"))}
                    throw "panic";
                `
            } else {
                return `
                    throw "${p.label}";
                `;
            }
        }
    }
}

export type Grammar = { readonly [name: string]: Parser }

export function cc(name: string): CharClass {
    return {
        tag: ParserTag.CharClass,
        pred: name
    }
}

export function re(exp: string): Regexp {
    return {
        tag: ParserTag.Regexp,
        re: exp
    }
}

export function kw(kw: string): Keyword {
    return {
        tag: ParserTag.Keyword,
        kw: kw
    }
}

export function not(p: Parser): Not {
    return {
        tag: ParserTag.Not,
        p: p
    }
}

export function str(s: string): Literal {
    return {
        tag: ParserTag.Literal,
        s: s
    }
}

export function seq(...ps: Parser[]): Sequence {
    return {
        tag: ParserTag.Sequence,
        ps: ps
    }
}

export function choice(...ps: Parser[]): Choice {
    return {
        tag: ParserTag.Choice,
        ps: ps
    }
}

export function v(name: string): Variable {
    return {
        tag: ParserTag.Variable,
        name: name
    }
}

export function many(p: Parser, recover?: string): Many {
    return {
        tag: ParserTag.Many,
        p: p,
        recover: recover
    }
}

export function plus(p: Parser): Parser {
    return seq(p, many(p));
}

export function opt(p: Parser): Option {
    return {
        tag: ParserTag.Option,
        p: p
    }
}

export function cap(p: Parser): Capture {
    return {
        tag: ParserTag.Capture,
        p: p
    }
}

export function trans(p: Parser, f: string): Transform {
    return {
        tag: ParserTag.Transform,
        p: p,
        fun: f
    }
}

export function collect(p: Parser, ...fields: string[]): Collect {
    return {
        tag: ParserTag.Collect,
        p: p,
        fields: fields
    }
}

export function error(label: string): Error {
    return {
        tag: ParserTag.Error,
        label: label
    }
}

export function tryp(p: Parser, label: string): Parser {
    return choice(p, error(label))
}

export function fromGrammar(g: Grammar, name: string, defs?: string, recover?: Map<String, Parser>): string {
    let variables: string[] = [];
    for(let variable in g) {
        if(g.hasOwnProperty(variable)) {
            variables.push(`
                ${variable}() {
                    ${generate(g[variable], recover)}
                }
            `
            )
        }
    }
    return `
        import * as defs from "${defs}";

        export default class ${name} {
            input?: string;
            pos: number;
            captures: any[];
            errors: { pos: number, label: string }[];

            constructor() {
                this.input = undefined;
                this.pos = 0;
                this.captures = [];
                this.errors = [];
            }

            parse(input: string) {
                this.input = input;
                this.pos = 0;
                this.captures = [];
                this.main();
                this.space();
                if(this.pos < this.input.length) throw "fail";
            }

            ${variables.join("\n\n")}
        }
    `
}