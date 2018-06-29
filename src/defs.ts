const enum ExpTag {
    NUM,
    ID
}

const enum StatTag {
    IF,
    ASSIGN
}

interface Num {
    tag: ExpTag.NUM
    val: string
}

interface Id {
    tag: ExpTag.ID
    name: string
}

export type Exp = Num | Id

interface If {
    tag: StatTag.IF
    cond: Exp
    bthen: Stat[]
    belse: Stat[]
}

interface Assign {
    tag: StatTag.ASSIGN
    lval: string
    rval: Exp
}

export type Stat = If | Assign

export function sif(cond: Exp, bthen: Stat[], belse: Stat[]): If {
    return {
        tag: StatTag.IF,
        cond: cond,
        bthen: bthen,
        belse: belse
    }
}

export function assign(lval: string, rval: Exp): Assign {
    return {
        tag: StatTag.ASSIGN,
        lval: lval,
        rval: rval
    }
}

export function num(val: string): Num {
    return {
        tag: ExpTag.NUM,
        val: val
    }
}

export function id(name: string): Id {
    return {
        tag: ExpTag.ID,
        name: name
    }
}

export function stats(...s: Stat[]): Stat[] {
    return s;
}
