"use client";

import { useState } from "react";
import { Calculator as CalculatorIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetTrigger,
} from "@/components/ui/sheet";

type Operator = "+" | "−" | "×" | "÷";

function calculate(a: number, b: number, operator: Operator): number {
  switch (operator) {
    case "+":
      return a + b;
    case "−":
      return a - b;
    case "×":
      return a * b;
    case "÷":
      return b === 0 ? NaN : a / b;
  }
}

function parseDisplay(display: string): number {
  return parseFloat(display.replace(",", "."));
}

function formatResult(value: number): string {
  if (Number.isNaN(value)) return "Error";
  return parseFloat(value.toPrecision(12)).toString().replace(".", ",");
}

function Calculator() {
  const [display, setDisplay] = useState("0");
  const [previousValue, setPreviousValue] = useState<number | null>(null);
  const [operator, setOperator] = useState<Operator | null>(null);
  const [waitingForOperand, setWaitingForOperand] = useState(false);

  function clear() {
    setDisplay("0");
    setPreviousValue(null);
    setOperator(null);
    setWaitingForOperand(false);
  }

  function inputDigit(digit: string) {
    if (display === "Error" || waitingForOperand) {
      setDisplay(digit);
      setWaitingForOperand(false);
      return;
    }
    setDisplay(display === "0" ? digit : display + digit);
  }

  function inputDecimal() {
    if (display === "Error" || waitingForOperand) {
      setDisplay("0,");
      setWaitingForOperand(false);
      return;
    }
    if (!display.includes(",")) {
      setDisplay(display + ",");
    }
  }

  function handleOperator(nextOperator: Operator) {
    const inputValue = parseDisplay(display);

    if (previousValue === null) {
      setPreviousValue(inputValue);
    } else if (operator && !waitingForOperand) {
      const result = calculate(previousValue, inputValue, operator);
      setPreviousValue(result);
      setDisplay(formatResult(result));
    }

    setOperator(nextOperator);
    setWaitingForOperand(true);
  }

  function handleEquals() {
    if (operator === null || previousValue === null) return;

    const inputValue = parseDisplay(display);
    const result = calculate(previousValue, inputValue, operator);

    setDisplay(formatResult(result));
    setPreviousValue(null);
    setOperator(null);
    setWaitingForOperand(true);
  }

  const digitButtons = ["7", "8", "9", "4", "5", "6", "1", "2", "3"];

  return (
    <div className="flex flex-col gap-3">
      <div className="flex min-h-16 items-end justify-end rounded-lg border bg-muted/50 px-4 py-3">
        <span className="truncate text-3xl font-medium tabular-nums">
          {display}
        </span>
      </div>

      <div className="grid grid-cols-4 gap-2">
        <Button
          variant="secondary"
          className="col-span-3"
          onClick={clear}
        >
          Borrar
        </Button>
        <Button
          variant={operator === "÷" ? "default" : "secondary"}
          onClick={() => handleOperator("÷")}
        >
          ÷
        </Button>

        {digitButtons.slice(0, 3).map((digit) => (
          <Button key={digit} variant="outline" onClick={() => inputDigit(digit)}>
            {digit}
          </Button>
        ))}
        <Button
          variant={operator === "×" ? "default" : "secondary"}
          onClick={() => handleOperator("×")}
        >
          ×
        </Button>

        {digitButtons.slice(3, 6).map((digit) => (
          <Button key={digit} variant="outline" onClick={() => inputDigit(digit)}>
            {digit}
          </Button>
        ))}
        <Button
          variant={operator === "−" ? "default" : "secondary"}
          onClick={() => handleOperator("−")}
        >
          −
        </Button>

        {digitButtons.slice(6, 9).map((digit) => (
          <Button key={digit} variant="outline" onClick={() => inputDigit(digit)}>
            {digit}
          </Button>
        ))}
        <Button
          variant={operator === "+" ? "default" : "secondary"}
          onClick={() => handleOperator("+")}
        >
          +
        </Button>

        <Button
          variant="outline"
          className="col-span-2"
          onClick={() => inputDigit("0")}
        >
          0
        </Button>
        <Button variant="outline" onClick={inputDecimal}>
          ,
        </Button>
        <Button onClick={handleEquals}>=</Button>
      </div>
    </div>
  );
}

export function CalculatorButton() {
  return (
    <Sheet>
      <SheetTrigger
        render={
          <Button
            size="icon"
            className="fixed left-6 bottom-6 z-40 size-12 rounded-full shadow-lg"
          />
        }
      >
        <CalculatorIcon className="size-5" />
        <span className="sr-only">Abrir calculadora</span>
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Calculadora</SheetTitle>
          <SheetDescription>
            Operaciones básicas: suma, resta, multiplicación y división.
          </SheetDescription>
        </SheetHeader>
        <div className="px-4 pb-4">
          <Calculator />
        </div>
      </SheetContent>
    </Sheet>
  );
}
