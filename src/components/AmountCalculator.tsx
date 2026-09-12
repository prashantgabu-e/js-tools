import { useEffect, useMemo, useState } from "react";
import { Calculator, X } from "lucide-react";

type Operator = "+" | "-" | "*" | "/";

interface AmountCalculatorProps {
  value: string;
  onApply: (value: string) => void;
  buttonClassName?: string;
}

interface NumberToken {
  type: "number";
  raw: string;
  percent: boolean;
}

interface OperatorToken {
  type: "operator";
  value: Operator;
}

type CalcToken = NumberToken | OperatorToken;

const operatorLabels: Record<Operator, string> = {
  "+": "+",
  "-": "-",
  "*": "x",
  "/": "/"
};

const buttons = [
  ["AC", "back", "%", "/"],
  ["7", "8", "9", "*"],
  ["4", "5", "6", "-"],
  ["1", "2", "3", "+"],
  ["0", ".", "=", "OK"]
];

function sanitizeInitialValue(value: string): string {
  const amount = Number(value);
  return Number.isFinite(amount) && amount > 0 ? formatAmount(amount) : "";
}

function formatAmount(value: number): string {
  if (!Number.isFinite(value)) {
    return "";
  }

  const rounded = Math.round((value + Number.EPSILON) * 100) / 100;
  return Number.isInteger(rounded) ? String(rounded) : String(rounded);
}

function tokenText(token: CalcToken): string {
  if (token.type === "operator") {
    return operatorLabels[token.value];
  }

  return `${token.raw}${token.percent ? "%" : ""}`;
}

function numberValue(token: NumberToken): number {
  const value = Number(token.raw);
  return token.percent ? value / 100 : value;
}

function evaluateTokens(tokens: CalcToken[]): number {
  const completeTokens = tokens.filter((token, index) => token.type === "number" || index < tokens.length - 1);
  const values: number[] = [];
  const operators: Operator[] = [];

  function applyTopOperator() {
    const operator = operators.pop();
    const right = values.pop();
    const left = values.pop();

    if (!operator || left === undefined || right === undefined) {
      throw new Error("Incomplete formula");
    }

    if (operator === "/" && right === 0) {
      throw new Error("Cannot divide by zero");
    }

    const nextValue = operator === "+" ? left + right : operator === "-" ? left - right : operator === "*" ? left * right : left / right;
    values.push(nextValue);
  }

  function precedence(operator: Operator): number {
    return operator === "+" || operator === "-" ? 1 : 2;
  }

  for (const token of completeTokens) {
    if (token.type === "number") {
      values.push(numberValue(token));
      continue;
    }

    while (operators.length && precedence(operators[operators.length - 1]) >= precedence(token.value)) {
      applyTopOperator();
    }
    operators.push(token.value);
  }

  while (operators.length) {
    applyTopOperator();
  }

  if (values.length !== 1 || !Number.isFinite(values[0])) {
    throw new Error("Invalid formula");
  }

  return values[0];
}

export function AmountCalculator({ value, onApply, buttonClassName }: AmountCalculatorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [tokens, setTokens] = useState<CalcToken[]>([]);
  const [currentValue, setCurrentValue] = useState("");
  const [result, setResult] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setTokens([]);
    setCurrentValue(sanitizeInitialValue(value));
    setResult("");
    setError("");
  }, [isOpen, value]);

  const formulaText = useMemo(() => {
    const parts = [...tokens.map(tokenText), currentValue].filter(Boolean);
    return parts.length ? parts.join(" ") : "0";
  }, [currentValue, tokens]);

  function clearResult() {
    setResult("");
    setError("");
  }

  function commitCurrentNumber(): CalcToken[] | null {
    if (!currentValue || currentValue === ".") {
      return null;
    }

    return [...tokens, { type: "number", raw: currentValue, percent: false }];
  }

  function inputDigit(digit: string) {
    clearResult();
    setCurrentValue((current) => {
      if (digit === "." && current.includes(".")) {
        return current;
      }

      if (digit === ".") {
        return current ? `${current}.` : "0.";
      }

      if (current === "0") {
        return digit;
      }

      return `${current}${digit}`;
    });
  }

  function inputOperator(operator: Operator) {
    clearResult();
    setTokens((currentTokens) => {
      if (currentValue && currentValue !== ".") {
        const nextTokens: CalcToken[] = [...currentTokens, { type: "number", raw: currentValue, percent: false }, { type: "operator", value: operator }];
        setCurrentValue("");
        return nextTokens;
      }

      if (!currentTokens.length) {
        return currentTokens;
      }

      const nextTokens = [...currentTokens];
      const lastToken = nextTokens[nextTokens.length - 1];
      if (lastToken.type === "operator") {
        nextTokens[nextTokens.length - 1] = { type: "operator", value: operator };
        return nextTokens;
      }
      return [...nextTokens, { type: "operator", value: operator }];
    });
  }

  function inputPercent() {
    clearResult();
    if (!currentValue || currentValue === ".") {
      return;
    }

    setTokens((currentTokens) => [...currentTokens, { type: "number", raw: currentValue, percent: true }]);
    setCurrentValue("");
  }

  function deleteLast() {
    clearResult();
    if (currentValue) {
      setCurrentValue((current) => current.slice(0, -1));
      return;
    }

    setTokens((currentTokens) => currentTokens.slice(0, -1));
  }

  function clearAll() {
    setTokens([]);
    setCurrentValue("");
    setResult("");
    setError("");
  }

  function calculate() {
    const nextTokens = commitCurrentNumber() ?? tokens;

    try {
      const value = evaluateTokens(nextTokens);
      setTokens(nextTokens);
      setCurrentValue("");
      setResult(formatAmount(value));
      setError("");
    } catch (calcError) {
      setResult("");
      setError(calcError instanceof Error ? calcError.message : "Invalid formula");
    }
  }

  function applyResult() {
    if (!result) {
      return;
    }

    onApply(result);
    setIsOpen(false);
  }

  function handleButton(label: string) {
    if (/^\d$/.test(label) || label === ".") {
      inputDigit(label);
      return;
    }

    if (label === "AC") {
      clearAll();
      return;
    }

    if (label === "back") {
      deleteLast();
      return;
    }

    if (label === "%") {
      inputPercent();
      return;
    }

    if (label === "=") {
      calculate();
      return;
    }

    if (label === "OK") {
      applyResult();
      return;
    }

    inputOperator(label as Operator);
  }

  return (
    <>
      <button
        type="button"
        className={buttonClassName ?? "amount-calculator-trigger"}
        onClick={() => setIsOpen(true)}
        aria-label="Open amount calculator"
        title="Open calculator"
      >
        <Calculator className="icon" aria-hidden="true" />
      </button>

      {isOpen ? (
        <div className="amount-calculator-overlay" role="presentation">
          <section className="amount-calculator" role="dialog" aria-modal="true" aria-labelledby="amountCalculatorTitle">
            <div className="amount-calculator__header">
              <div>
                <p className="eyebrow" id="amountCalculatorTitle">
                  Calculator
                </p>
                <h3>Amount</h3>
              </div>
              <button type="button" className="amount-calculator__close" onClick={() => setIsOpen(false)} aria-label="Close calculator">
                <X className="icon" aria-hidden="true" />
              </button>
            </div>

            <div className="amount-calculator__display" aria-live="polite">
              <div className="amount-calculator__formula">{formulaText}</div>
              <div className={`amount-calculator__result${error ? " is-error" : ""}`}>{error || (result ? `= ${result}` : "")}</div>
            </div>

            <div className="amount-calculator__keys">
              {buttons.flat().map((label) => (
                <button
                  key={label}
                  type="button"
                  className={`amount-calculator__key amount-calculator__key--${label === "OK" ? "ok" : label === "=" ? "equals" : ["+", "-", "*", "/", "%"].includes(label) ? "operator" : "plain"}`}
                  onClick={() => handleButton(label)}
                  disabled={label === "OK" && !result}
                >
                  {label === "back" ? "Back" : label === "*" ? "x" : label}
                </button>
              ))}
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}
