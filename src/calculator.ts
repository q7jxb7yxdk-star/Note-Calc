export interface CalculationMatch {
  answer: string;
  answerPrefix: string;
}

const CALCULATION_LINE = /^(\s*)(.+?)(\s*)=(\s*)$/;
const NUMBER_EPSILON = 1e-12;

export function calculateLine(text: string): CalculationMatch | null {
  const match = CALCULATION_LINE.exec(text);
  if (!match) {
    return null;
  }

  const expression = match[2];
  const whitespaceBeforeEquals = match[3];
  const whitespaceAfterEquals = match[4];

  try {
    const value = new Parser(expression).parse();
    if (!Number.isFinite(value)) {
      return null;
    }

    return {
      answer: formatNumber(value),
      answerPrefix:
        whitespaceAfterEquals.length > 0 || whitespaceBeforeEquals.length > 0
          ? whitespaceAfterEquals || " "
          : "",
    };
  } catch {
    return null;
  }
}

function formatNumber(value: number): string {
  const normalized = Math.abs(value) < NUMBER_EPSILON ? 0 : value;
  return Number.parseFloat(normalized.toPrecision(12)).toString();
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
