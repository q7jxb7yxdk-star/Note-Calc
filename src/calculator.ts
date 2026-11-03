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
    const parser = new Parser(expressionMatch.expression);
    const value = parser.parse();
    if (!Number.isFinite(value)) {
      return null;
    }

    return {
      answer: parser.currencySymbol + formatNumber(value, options.decimalPlaces),
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
  const [integer, fraction] = normalized.toFixed(decimalPlaces).split(".");
  const groupedInteger = integer.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return fraction === undefined ? groupedInteger : `${groupedInteger}.${fraction}`;
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
    // Do not reinterpret a tail of an invalid formula as a new expression.
    if (/(?:\p{Sc}|[\d,.)]\s*[+\-−*×/÷%^]?|[\d,.)][eE][+-]?)\s*$/u.test(trimmed.slice(0, index))) {
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
  return /[\d.(+\-−\p{Sc}]/u.test(character);
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
  currencySymbol = "";

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
    const currency = /^\p{Sc}/u.exec(this.source.slice(this.position));
    if (currency) {
      if (this.currencySymbol && this.currencySymbol !== currency[0]) {
        throw new Error("Mixed currencies are not supported");
      }
      this.currencySymbol = currency[0];
      this.position += currency[0].length;
      this.skipWhitespace();
    }
    const remaining = this.source.slice(this.position);
    // Read the entire numeric token before validating grouping so malformed
    // commas cannot leave behind a valid-looking suffix to calculate.
    const match = /^(?:[\d,]+(?:\.[\d,]*)?|\.[\d,]+)(?:e[+-]?[\d,]+)?/i.exec(remaining);

    if (!match || !/^(?:(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(match[0])) {
      throw new Error("Expected number");
    }

    this.position += match[0].length;
    return Number(match[0].replace(/,/g, ""));
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
