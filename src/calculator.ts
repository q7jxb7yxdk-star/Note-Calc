export interface CalculationMatch {
  answer: string;
  answerPrefix: string;
  expressionFrom: number;
  expressionTo: number;
  equalsFrom: number;
  equalsTo: number;
}

export interface CalculationOptions {
  decimalPlaces: number;
}

const CALCULATION_LINE = /^(.*?)(\s*)=(\s*)$/;
const NUMBER_EPSILON = 1e-12;

export function calculateLine(
  text: string,
  options: CalculationOptions,
): CalculationMatch | null {
  const match = CALCULATION_LINE.exec(text);
  if (!match) {
    return null;
  }

  const beforeEquals = match[1];
  const whitespaceBeforeEquals = match[2];
  const whitespaceAfterEquals = match[3];
  const equalsFrom = beforeEquals.length + whitespaceBeforeEquals.length;
  const expressionMatch = findExpressionAtEnd(beforeEquals);

  if (!expressionMatch) {
    return null;
  }

  try {
    const value = new Parser(expressionMatch.expression).parse();
    if (!Number.isFinite(value)) {
      return null;
    }

    return {
      answer: formatNumber(value, options.decimalPlaces),
      answerPrefix:
        whitespaceAfterEquals.length > 0 || whitespaceBeforeEquals.length > 0
          ? whitespaceAfterEquals || " "
          : "",
      expressionFrom: expressionMatch.from,
      expressionTo: expressionMatch.to,
      equalsFrom,
      equalsTo: equalsFrom + 1,
    };
  } catch {
    return null;
  }
}

function formatNumber(value: number, decimalPlaces: number): string {
  const normalized = Math.abs(value) < NUMBER_EPSILON ? 0 : value;
  return normalized.toFixed(decimalPlaces);
}

function findExpressionAtEnd(text: string): {
  expression: string;
  from: number;
  to: number;
} | null {
  const expressionEnd = trimEndIndex(text);
  const trimmed = text.slice(0, expressionEnd);
  const wholeLineExpressionStart = trimStartIndex(trimmed);

  for (let index = wholeLineExpressionStart; index < trimmed.length; index += 1) {
    if (!isExpressionStart(trimmed[index])) {
      continue;
    }

    const expression = trimmed.slice(index);
    if (!canParseExpression(expression)) {
      continue;
    }

    if (index === wholeLineExpressionStart || hasOperator(expression)) {
      return {
        expression,
        from: index,
        to: expressionEnd,
      };
    }
  }

  return null;
}

function canParseExpression(expression: string): boolean {
  try {
    const value = new Parser(expression).parse();
    return Number.isFinite(value);
  } catch {
    return false;
  }
}

function hasOperator(expression: string): boolean {
  return /[+\-−*×/÷%^]/.test(expression);
}

function isExpressionStart(character: string): boolean {
  return /[\d.(+\-−]/.test(character);
}

function trimStartIndex(text: string): number {
  const match = /\S/.exec(text);
  return match?.index ?? text.length;
}

function trimEndIndex(text: string): number {
  let index = text.length;
  while (index > 0 && /\s/.test(text[index - 1])) {
    index -= 1;
  }
  return index;
}

class Parser {
  private position = 0;

  constructor(private readonly source: string) {}

  parse(): number {
    const value = this.parseAdditive();
    this.skipWhitespace();

    if (this.position !== this.source.length) {
      throw new Error("Unexpected token");
    }

    return value;
  }

  private parseAdditive(): number {
    let value = this.parseMultiplicative();

    while (true) {
      if (this.consume("+")) {
        value += this.parseMultiplicative();
      } else if (this.consume("-") || this.consume("−")) {
        value -= this.parseMultiplicative();
      } else {
        return value;
      }
    }
  }

  private parseMultiplicative(): number {
    let value = this.parseUnary();

    while (true) {
      if (this.consume("*") || this.consume("×")) {
        value *= this.parseUnary();
      } else if (this.consume("/") || this.consume("÷")) {
        value /= this.parseUnary();
      } else if (this.consume("%")) {
        value %= this.parseUnary();
      } else {
        return value;
      }
    }
  }

  private parseUnary(): number {
    if (this.consume("+")) {
      return this.parseUnary();
    }
    if (this.consume("-") || this.consume("−")) {
      return -this.parseUnary();
    }
    return this.parsePower();
  }

  private parsePower(): number {
    const base = this.parsePrimary();
    if (this.consume("^")) {
      return base ** this.parseUnary();
    }
    return base;
  }

  private parsePrimary(): number {
    if (this.consume("(")) {
      const value = this.parseAdditive();
      if (!this.consume(")")) {
        throw new Error("Missing closing parenthesis");
      }
      return value;
    }

    return this.parseNumber();
  }

  private parseNumber(): number {
    this.skipWhitespace();
    const remaining = this.source.slice(this.position);
    const match = /^(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?/i.exec(remaining);

    if (!match) {
      throw new Error("Expected number");
    }

    this.position += match[0].length;
    return Number(match[0]);
  }

  private consume(token: string): boolean {
    this.skipWhitespace();
    if (!this.source.startsWith(token, this.position)) {
      return false;
    }

    this.position += token.length;
    return true;
  }

  private skipWhitespace(): void {
    while (/\s/.test(this.source[this.position] ?? "")) {
      this.position += 1;
    }
  }
}
