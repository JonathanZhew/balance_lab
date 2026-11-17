const scale = document.querySelector("#balanceScale");
const leftValue = document.querySelector("#leftValue");
const rightValue = document.querySelector("#rightValue");
const leftWeights = document.querySelector("#leftWeights");
const rightWeights = document.querySelector("#rightWeights");
const balanceStatus = document.querySelector("#balanceStatus");
const scaleDescription = document.querySelector("#scaleDescription");
const beamGroup = document.querySelector("#beamGroup");
const originalEquationInput = document.querySelector("#originalEquationInput");
const nextEquationButton = document.querySelector("#nextEquationButton");
const leftEquationInput = document.querySelector("#leftEquationInput");
const rightEquationInput = document.querySelector("#rightEquationInput");
const equationError = document.querySelector("#equationError");
const answerBubble = document.querySelector("#answerBubble");
const answerExplosion = document.querySelector("#answerExplosion");
const leftPanel = document.querySelector('[data-side="left"]');
const rightPanel = document.querySelector('[data-side="right"]');
const leftHistory = document.querySelector("#leftHistory");
const rightHistory = document.querySelector("#rightHistory");
const svgNamespace = "http://www.w3.org/2000/svg";

let beamAngle = 0;
let animationFrame = 0;
let bubbleGrowthFrame = 0;
let bubbleIsGrowing = false;
let bubbleHoldStart = 0;
let referenceValue = 0;
let referenceVariable = null;
let originalEquationIndex = 0;

const originalEquations = [
  "x - 3.25 = 8.75",
  "y + 3/4 = 5/2",
  "x + 3/13 = 35/13",
  "x + 2/5 = 7/5",
  "x + 12.3 = 20.5",
  "x - 0.5 = 3.6",
  "m/4 = 1.5",
  "(1/5)y = 3/20",
  "2.5x = 15",
  "(5/6)x = 20",
  "4x = 3/4",
  "7y = 9.1",
  "3.2x = 12.8",
  "(4/9)j = 8",
];

function renderWeights(container, terms, centerX) {
  container.replaceChildren();
  const weightWidth = 52;
  const weightHeight = 72;
  const gap = 8;
  const totalWidth = terms.length * weightWidth + (terms.length - 1) * gap;
  const startX = centerX - totalWidth / 2;

  terms.forEach((term, index) => {
    const x = startX + index * (weightWidth + gap);
    const y = 219;
    const weight = document.createElementNS(svgNamespace, "rect");
    weight.setAttribute("class", `weight-block ${/[a-z]/i.test(term) ? "unknown-weight" : "number-weight"}`);
    weight.setAttribute("x", String(x));
    weight.setAttribute("y", String(y));
    weight.setAttribute("width", String(weightWidth));
    weight.setAttribute("height", String(weightHeight));
    weight.setAttribute("rx", "10");
    container.append(weight);
    renderWeightLabel(container, term, x, y, weightWidth);
  });
}

function renderWeightLabel(container, term, x, y, width) {
  const product = term.match(/^([+-]?(?:\d+(?:\.\d*)?|\.\d+))\s*\*\s*([+-]?(?:\d+(?:\.\d*)?|\.\d+))(?:\s*\/\s*([+-]?(?:\d+(?:\.\d*)?|\.\d+)))?$/);
  if (product) {
    if (product[3]) {
      appendWeightText(container, product[1], x + 8, y + 44, "weight-product-label");
      appendWeightText(container, "×", x + 22, y + 44, "weight-product-operator");
      renderStackedFraction(container, product[2], product[3], x + 40, y);
    } else {
      appendWeightText(container, `${product[1]} × ${product[2]}`, x + width / 2, y + 44, "weight-product-label centered");
    }
    return;
  }

  const displayTerm = term.replace(/^\(([+-]?(?:\d+(?:\.\d*)?|\.\d+)\s*\/\s*(?:\d+(?:\.\d*)?|\.\d+))\)\s*([a-z])$/i, "$1$2");
  const variableNumerator = displayTerm.match(/^([+-]?)\s*([a-z])\s*\/\s*((?:\d+(?:\.\d*)?|\.\d+))$/i);
  if (variableNumerator) {
    const fractionCenter = x + width / 2 - 5;
    renderStackedFraction(container, `${variableNumerator[1]}${variableNumerator[2]}`, variableNumerator[3], fractionCenter, y);
    return;
  }

  const fraction = displayTerm.match(/^([+-]?)\s*((?:\d+(?:\.\d*)?|\.\d+))\s*\/\s*((?:\d+(?:\.\d*)?|\.\d+))\s*\*?\s*([a-z])?$/i);
  if (fraction) {
    const hasVariable = Boolean(fraction[4]);
    const fractionCenter = x + width / 2 - (hasVariable ? 5 : 0);
    renderStackedFraction(container, `${fraction[1]}${fraction[2]}`, fraction[3], fractionCenter, y);

    if (hasVariable) {
      appendWeightText(container, fraction[4], x + width - 8, y + 43, "weight-variable-label");
    }
    return;
  }

  appendWeightText(container, formatTerm(displayTerm), x + width / 2, y + 44, `weight-label${displayTerm.length > 4 ? " compact" : ""}`);
}

function renderStackedFraction(container, numerator, denominator, centerX, y) {
  appendWeightText(container, numerator, centerX, y + 29, "weight-fraction-label");
  appendWeightText(container, denominator, centerX, y + 49, "weight-fraction-label");

  const fractionBar = document.createElementNS(svgNamespace, "line");
  fractionBar.setAttribute("class", "weight-fraction-bar");
  fractionBar.setAttribute("x1", String(centerX - 10));
  fractionBar.setAttribute("x2", String(centerX + 10));
  fractionBar.setAttribute("y1", String(y + 36));
  fractionBar.setAttribute("y2", String(y + 36));
  container.append(fractionBar);
}

function appendWeightText(container, value, x, y, className) {
  const label = document.createElementNS(svgNamespace, "text");
  label.setAttribute("class", className);
  label.setAttribute("x", String(x));
  label.setAttribute("y", String(y));
  label.setAttribute("text-anchor", "middle");
  label.textContent = value;
  container.append(label);
}

function formatTerm(term) {
  return term.replace(/\s*([+-])\s*/g, "$1").replace(/\s*\*\s*/g, "*");
}

function parseSide(side) {
  return (side.match(/[+-]?\s*[^+-]+/g) || []).map((term) => term.trim()).filter(Boolean);
}

function parseNumber(value) {
  let text = value.trim().replace(/^([+-])\s+/, "$1");
  const parenthesized = text.match(/^([+-]?)\s*\((.+)\)$/);
  if (parenthesized) {
    text = `${parenthesized[1]}${parenthesized[2]}`;
  }

  const mixed = text.match(/^([+-]?\d+)\s+(\d+)\/(\d+)$/);
  if (mixed) {
    const denominator = Number(mixed[3]);
    if (denominator === 0) return null;
    const sign = mixed[1].startsWith("-") ? -1 : 1;
    return Number(mixed[1]) + sign * Number(mixed[2]) / denominator;
  }

  const numericExpression = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:\s*[*/]\s*[+-]?(?:\d+(?:\.\d*)?|\.\d+))*$/;
  if (!numericExpression.test(text)) return null;

  const tokens = text.match(/[*/]|[+-]?(?:\d+(?:\.\d*)?|\.\d+)/g);
  let result = Number(tokens[0]);
  for (let index = 1; index < tokens.length; index += 2) {
    const operand = Number(tokens[index + 1]);
    if (tokens[index] === "/" && operand === 0) return null;
    result = tokens[index] === "*" ? result * operand : result / operand;
  }

  return Number.isFinite(result) ? result : null;
}

function parseTerm(term) {
  const variableNumerator = term.match(/^([+-]?)\s*([a-z])\s*\/\s*(.+)$/i);
  if (variableNumerator) {
    const denominator = parseNumber(variableNumerator[3]);
    if (denominator === null || denominator === 0) return null;
    return {
      coefficient: (variableNumerator[1] === "-" ? -1 : 1) / denominator,
      constant: 0,
      variable: variableNumerator[2].toLowerCase(),
    };
  }

  const variable = term.match(/^([+-]?)\s*(.*?)\s*\*?\s*([a-z])$/i);
  if (variable) {
    const coefficient = variable[2] ? parseNumber(variable[2]) : 1;
    if (coefficient === null) return null;
    return {
      coefficient: variable[1] === "-" ? -coefficient : coefficient,
      constant: 0,
      variable: variable[3].toLowerCase(),
    };
  }

  const constant = parseNumber(term);
  return constant === null ? null : { coefficient: 0, constant, variable: null };
}

function parseSides(leftSide, rightSide) {
  const left = parseSide(leftSide);
  const right = parseSide(rightSide);
  if (left.length < 1 || right.length < 1 || left.length > 2 || right.length > 2) return null;

  const parsedLeft = left.map(parseTerm);
  const parsedRight = right.map(parseTerm);
  if (parsedLeft.includes(null) || parsedRight.includes(null)) return null;
  const variables = [...parsedLeft, ...parsedRight].map((term) => term.variable).filter(Boolean);
  if (new Set(variables).size > 1) return null;

  return { left, right, parsedLeft, parsedRight };
}

function parseOriginalEquation() {
  const sides = originalEquationInput.value.split("=");
  if (sides.length !== 2) return null;
  return parseSides(sides[0], sides[1]);
}

function solveEquation(equation) {
  const leftSlope = equation.parsedLeft.reduce((total, term) => total + term.coefficient, 0);
  const rightSlope = equation.parsedRight.reduce((total, term) => total + term.coefficient, 0);
  const leftConstant = equation.parsedLeft.reduce((total, term) => total + term.constant, 0);
  const rightConstant = equation.parsedRight.reduce((total, term) => total + term.constant, 0);
  const slopeDifference = leftSlope - rightSlope;
  if (Math.abs(slopeDifference) < Number.EPSILON) return null;

  return (rightConstant - leftConstant) / slopeDifference;
}

function formatValue(value) {
  const normalized = Math.abs(value) < 0.0005 ? 0 : value;
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 3 }).format(normalized);
}

function evaluateSide(terms, x) {
  return terms.reduce((total, term) => total + term.coefficient * x + term.constant, 0);
}

function describeWeights(terms) {
  return terms.map((term) => {
    const type = /x/i.test(term) ? "silver unknown" : "light blue number";
    return `${type} weight labeled ${formatTerm(term)}`;
  }).join(" and ");
}

function hasCorrectIsolatedAnswer(equation) {
  const sides = [
    { variableSide: equation.parsedLeft, numberSide: equation.parsedRight },
    { variableSide: equation.parsedRight, numberSide: equation.parsedLeft },
  ];

  return sides.some(({ variableSide, numberSide }) => {
    if (variableSide.length !== 1 || numberSide.length !== 1) return false;
    const [variableTerm] = variableSide;
    const [numberTerm] = numberSide;
    if (variableTerm.variable !== referenceVariable || variableTerm.coefficient !== 1 || variableTerm.constant !== 0) return false;
    if (numberTerm.variable || numberTerm.coefficient !== 0) return false;

    const tolerance = Math.max(0.0000005, Math.abs(referenceValue) * 0.000000001);
    return Math.abs(numberTerm.constant - referenceValue) <= tolerance;
  });
}

function moveBeam(targetAngle) {
  window.cancelAnimationFrame(animationFrame);

  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    beamAngle = targetAngle;
    beamGroup.setAttribute("transform", `rotate(${beamAngle} 480 178)`);
    return;
  }

  const startAngle = beamAngle;
  const startTime = window.performance.now();
  const duration = 680;

  function animate(now) {
    const progress = Math.min((now - startTime) / duration, 1);
    const easedProgress = 1 - Math.pow(1 - progress, 3);
    beamAngle = startAngle + (targetAngle - startAngle) * easedProgress;
    beamGroup.setAttribute("transform", `rotate(${beamAngle} 480 178)`);

    if (progress < 1) {
      animationFrame = window.requestAnimationFrame(animate);
    } else {
      animationFrame = 0;
    }
  }

  animationFrame = window.requestAnimationFrame(animate);
}

function syncEquationWeights() {
  const equation = parseSides(leftEquationInput.value, rightEquationInput.value);
  equationError.hidden = Boolean(equation);
  leftEquationInput.setAttribute("aria-invalid", String(!equation));
  rightEquationInput.setAttribute("aria-invalid", String(!equation));
  if (!equation) {
    answerBubble.hidden = true;
    return;
  }

  const leftTotal = evaluateSide(equation.parsedLeft, referenceValue);
  const rightTotal = evaluateSide(equation.parsedRight, referenceValue);
  const difference = leftTotal - rightTotal;
  const tolerance = Math.max(0.0000005, Math.max(Math.abs(leftTotal), Math.abs(rightTotal)) * 0.000000001);
  const balanced = Math.abs(difference) <= tolerance;
  const isCorrectAnswer = hasCorrectIsolatedAnswer(equation);
  if (isCorrectAnswer && answerBubble.hidden) {
    answerBubble.hidden = false;
  } else if (!isCorrectAnswer) {
    stopAnswerBubbleGrowth();
    answerBubble.hidden = true;
  }
  const state = balanced ? "balanced" : difference > 0 ? "left" : "right";
  const angle = balanced ? 0 : Math.max(-8, Math.min(8, -difference * 0.8));

  leftValue.textContent = formatValue(leftTotal);
  rightValue.textContent = formatValue(rightTotal);
  balanceStatus.textContent = balanced ? "Balanced" : state === "left" ? "Left side is heavier" : "Right side is heavier";
  leftPanel.dataset.heavy = String(state === "left");
  rightPanel.dataset.heavy = String(state === "right");
  scale.dataset.state = state;
  scaleDescription.textContent = `At the original equation's solution, the left side is ${formatValue(leftTotal)} and the right side is ${formatValue(rightTotal)}. ${balanceStatus.textContent}.`;
  moveBeam(angle);
  renderWeights(leftWeights, equation.left, 245);
  renderWeights(rightWeights, equation.right, 715);
}

function syncOriginalEquation() {
  const matchedIndex = originalEquations.indexOf(originalEquationInput.value.trim());
  if (matchedIndex >= 0) originalEquationIndex = matchedIndex;

  const equation = parseOriginalEquation();
  const solution = equation ? solveEquation(equation) : null;
  const isValid = solution !== null && Number.isFinite(solution);
  originalEquationInput.setAttribute("aria-invalid", String(!isValid));
  if (!equation || !isValid) {
    stopAnswerBubbleGrowth();
    answerBubble.hidden = true;
    return;
  }

  referenceValue = solution;
  referenceVariable = [...equation.parsedLeft, ...equation.parsedRight].find((term) => term.variable)?.variable ?? null;
  leftEquationInput.value = equation.left.join(" ");
  rightEquationInput.value = equation.right.join(" ");
  syncEquationWeights();
}

function showNextOriginalEquation() {
  originalEquationIndex = (originalEquationIndex + 1) % originalEquations.length;
  originalEquationInput.value = originalEquations[originalEquationIndex];
  syncOriginalEquation();
}

function appendHistoryEntry(list, terms) {
  const entry = document.createElement("li");
  entry.textContent = terms.map(formatTerm).join(" ");
  list.append(entry);
  list.scrollTop = list.scrollHeight;
}

function recordEquationHistory() {
  const equation = parseSides(leftEquationInput.value, rightEquationInput.value);
  if (!equation) return;

  appendHistoryEntry(leftHistory, equation.left);
  appendHistoryEntry(rightHistory, equation.right);
}

function confirmHarryEquation(event) {
  if (event.key !== "Enter" || event.repeat) return;
  event.preventDefault();
  syncEquationWeights();
  recordEquationHistory();
}

function confirmOriginalEquation(event) {
  if (event.key !== "Enter" || event.repeat) return;
  event.preventDefault();
  syncOriginalEquation();
  if (originalEquationInput.getAttribute("aria-invalid") !== "true") {
    recordEquationHistory();
  }
}

answerBubble.addEventListener("animationend", (event) => {
  if (event.animationName === "answer-bubble-pop" && !bubbleIsGrowing) {
    answerBubble.hidden = true;
  }
});

function startAnswerBubbleGrowth(event) {
  if (event.key !== "Enter" || event.repeat || answerBubble.hidden) return;
  if (event.target !== leftEquationInput && event.target !== rightEquationInput) return;

  event.preventDefault();
  beginAnswerBubbleGrowth();
}

function beginAnswerBubbleGrowth() {
  if (bubbleIsGrowing || answerBubble.hidden) return;

  bubbleIsGrowing = true;
  bubbleHoldStart = window.performance.now();
  answerBubble.classList.add("is-growing");
  answerBubble.style.setProperty("--growth-scale", "1");

  function grow(now) {
    if (!bubbleIsGrowing || answerBubble.hidden) return;

    const progress = Math.min((now - bubbleHoldStart) / 4000, 1);
    const scale = 1 + 9 * progress;
    answerBubble.style.setProperty("--growth-scale", String(scale));

    if (progress === 1) {
      explodeAnswerBubble();
      return;
    }

    bubbleGrowthFrame = window.requestAnimationFrame(grow);
  }

  bubbleGrowthFrame = window.requestAnimationFrame(grow);
}

function stopAnswerBubbleGrowth() {
  if (!bubbleIsGrowing) return;

  bubbleIsGrowing = false;
  window.cancelAnimationFrame(bubbleGrowthFrame);
  answerBubble.classList.remove("is-growing");
  answerBubble.style.removeProperty("--growth-scale");
  answerBubble.hidden = true;
}

function startAnswerBubblePointer(event) {
  if (answerBubble.hidden || bubbleIsGrowing) return;
  if (event.pointerType === "mouse" && event.button !== 0) return;

  event.preventDefault();
  beginAnswerBubbleGrowth();
}

function explodeAnswerBubble() {
  bubbleIsGrowing = false;
  answerBubble.classList.remove("is-growing");
  answerBubble.style.removeProperty("--growth-scale");
  answerBubble.hidden = true;
  answerExplosion.replaceChildren();
  answerExplosion.hidden = false;

  const particleCount = 24;
  let particlesRemaining = particleCount;

  for (let index = 0; index < particleCount; index += 1) {
    const angle = (index / particleCount) * Math.PI * 2;
    const distance = 90 + (index % 3) * 24;
    const particle = document.createElement("span");
    particle.className = `answer-particle particle-color-${index % 4}`;
    particle.style.setProperty("--dx", `${Math.cos(angle) * distance}px`);
    particle.style.setProperty("--dy", `${Math.sin(angle) * distance}px`);
    particle.addEventListener("animationend", () => {
      particlesRemaining -= 1;
      if (particlesRemaining === 0) {
        answerExplosion.hidden = true;
        answerExplosion.replaceChildren();
      }
    }, { once: true });
    answerExplosion.append(particle);
  }
}

document.addEventListener("keydown", startAnswerBubbleGrowth);
document.addEventListener("keyup", (event) => {
  if (event.key === "Enter") stopAnswerBubbleGrowth();
});
answerBubble.addEventListener("pointerdown", startAnswerBubblePointer);
answerBubble.addEventListener("pointerup", stopAnswerBubbleGrowth);
answerBubble.addEventListener("pointercancel", stopAnswerBubbleGrowth);
window.addEventListener("blur", stopAnswerBubbleGrowth);

originalEquationInput.addEventListener("keydown", confirmOriginalEquation);
originalEquationInput.addEventListener("input", syncOriginalEquation);
nextEquationButton.addEventListener("click", showNextOriginalEquation);
leftEquationInput.addEventListener("input", syncEquationWeights);
rightEquationInput.addEventListener("input", syncEquationWeights);
leftEquationInput.addEventListener("keydown", confirmHarryEquation);
rightEquationInput.addEventListener("keydown", confirmHarryEquation);
syncOriginalEquation();