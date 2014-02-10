import re,math,numbers,json
import logging

################################################################################
################################################################################
##
##  Expression parsing/evaluation
##
################################################################################
################################################################################

# token patterns
hex_number = r"""0x[0-9a-fA-F_]*"""   # allow _ for easy reading
binary_number = r"""0b[01_]*"""       # allow _ for easy reading
engineering_number = r"""([0-9]*\.)?[0-9]+([eE][\-+]?[0-9]+|[TGMKkdcmunpfa])?"""
number = '|'.join([hex_number, binary_number, engineering_number])
identifier = r"""[a-zA-Z_]\w*"""
operators = r"""\+|\-|\*|\/|\^|\(|\)|\,"""
token = '|'.join([number, identifier, operators])

engineering_suffix = {
    'T': 1e12,
    'G': 1e9,
    'M': 1e6,
    'K': 1e3,
    'k': 1e3,
    'd': 1e-1,
    'c': 1e-2,
    'm': 1e-3,
    'u': 1e-6,
    'n': 1e-9,
    'p': 1e-12,
    'f': 1e-15,
    'a': 1e-18,
}

built_in_functions = {
    "abs": abs,
    "acos": math.acos,
    "asin": math.asin,
    "atan": math.atan,
    "atan2": math.atan2, # 2 arg
    "ceil": math.ceil,
    "cos": math.cos,
    "exp": math.exp,
    "floor": math.floor,
    "log": math.log,
    "max": max, # multi-arg
    "min": min, # multi-arg
    "pow": math.pow, # 2 arg
    "round": round,
    "sin": math.sin,
    "sqrt": math.sqrt,
}

built_in_environment = {
    "e": math.e,
    "pi": math.pi,
}

def read_token(t,tokens):
    if len(tokens)>0 and tokens[0]==t:
        tokens.pop(0)
        return True
    return False

# add, subtract
def parse_expression(tokens):
    expression = parse_term(tokens)
    while True:
        if read_token('+',tokens):
            expression = ['+',expression,parse_term(tokens)]
        elif read_token('-',tokens):
            expression = ['-',expression,parse_term(tokens)]
        else:
            break
    return expression

# multiply, divide
def parse_term(tokens):
    term = parse_exp(tokens)
    while True:
        if read_token('*',tokens):
            term = ['*',term,parse_exp(tokens)]
        elif read_token('/',tokens):
            term = ['/',term,parse_exp(tokens)]
        else:
            break
    return term

# exponentiate
def parse_exp(tokens):
    exp = parse_unary(tokens)
    while True:
        if read_token('^',tokens):
            exp = ['^',exp,parse_unary(tokens)]
        else:
            break
    return exp

# unary + and -
def parse_unary(tokens):
    if read_token('-',tokens):
        return ['neg',parse_factor(tokens)]
    # simply consume unary +
    read_token('+',tokens)    
    return parse_factor(tokens)

# parenthesized expression, identifier, number
def parse_factor(tokens):
    if read_token('(',tokens):
        expression = parse_expression(tokens)
        if read_token(')',tokens):
            return expression
        raise Exception("Missing ) in expression")
    elif len(tokens) > 0:
        token = tokens.pop(0)
        if not re.match(identifier,token) is None:
            if read_token('(',tokens):
                args = []
                while True:
                    args.append(parse_expression(tokens))
                    if read_token(',',tokens): continue
                    if read_token(')',tokens): break
                    raise Exception('Expected comma or close paren in function call')
                if not built_in_functions.has_key(token):
                    raise Exception('Call to unrecognized function: '+token)
                return ['call '+token] + args
            return token
        elif token.startswith('0x'):
            # remove any _ added for readability
            return int(''.join(token[2:].split('_')),16)
        elif token.startswith('0b'):
            # remove any _ added for readability
            return int(''.join(token[2:].split('_')),2)
        elif not re.match(engineering_number,token) is None:
            multiplier = engineering_suffix.get(token[-1])
            if multiplier is None:
                multiplier = 1
            else:
                token = token[:-1]
            return float(token)*multiplier
        else:
            raise Exception("Expected an operand, got "+token);
    else:
        raise Exception("Unexpected end of expression")
    

def parse(text):
    text = str(text)  # no unicode please!
    tokens = [text[t.start():t.end()] for t in re.finditer(token,text)]
    if len(tokens) == 0:
        raise Exception("No expression found")
    return parse_expression(tokens)

def evaluate(tree,environment=None):
    env = built_in_environment.copy()
    if not environment is None:
        env.update(environment)

    if isinstance(tree,numbers.Number):
        return tree
    elif isinstance(tree,str):
        if env.has_key(tree):
            return env[tree]
        raise Exception("Use of undefined variable: "+tree)
    else:
        # expecting [operator, tree, ...]
        args = [evaluate(t,environment) for t in tree[1:]]
        if tree[0].startswith('call '):
            f = tree[0][5:]
            if built_in_functions.has_key(f):
                return built_in_functions[f](*args)
            raise Exception("Unknown function: "+f)
        elif tree[0] == 'neg': return -args[0]
        elif tree[0] == '+': return args[0] + args[1]
        elif tree[0] == '-': return args[0] - args[1]
        elif tree[0] == '*': return args[0] * args[1]
        elif tree[0] == '/': return float(args[0]) / args[1]
        elif tree[0] == '^': return math.pow(args[0],args[1])
        raise Exception("Unrecognized operator: "+tree[0])

################################################################################
################################################################################
##
##  Answer checking
##
################################################################################
################################################################################

# check numeric value or expression
def check_number(answer,expect,tol=0):
    if isinstance(expect,str):
        try:
            expect = evaluate(parse(expect))
        except Exception as e:
            return 'not graded', 'System error: cannot evaluate expected value: ' + e.args[0]

    try:
        got = evaluate(parse(answer))
    except Exception as e:
        return 'wrong', e.args[0]
    
    if got >= (1.0 - tol)*expect and got <= (1.0 + tol)*expect:
        return 'right',None
    else:
        return 'wrong','Answer evaluated to %g, which did not match expected value' % got

# check expression with variables
# info = {expected: "expression", testing: {var: testing_info, ...}}
def check_formula(answer,expect,variables=[],samples=[]):
    if isinstance(expect,str):
        try:
            expect = parse(expect)
        except Exception as e:
            return 'not graded', 'System error: cannot parse expected value: ' + e.args[0]
    
    try:
        answer = parse(answer)
    except Exception as e:
        return 'wrong', 'Error in formula: ' + e.args[0]

    env = {}
    for s in samples:
        env.clear()
        if len(s) != len(variables):
            return 'not graded', "System error: varianbles and samples disagree: "+str(variables)+", "+str(samples)
        for i in xrange(len(variables)):
            env[variables[i]] = s[i]
        try:
            want = evaluate(expect,env)
        except Exception as e:
            return 'not graded', 'System error: cannot parse expected value: ' + e.args[0]
        try:
            got = evaluate(answer,env)
        except Exception as e:
            return 'wrong', 'Error in formula: ' + e.args[0]
        if got < 0.999*want or got > 1.001*want:
            message = 'When '+','.join(["%s=%g" % (n,v) for n,v in env.items()])+(': expected %g but got %g' % (want,got))
            return 'wrong',message

    return 'right',None
