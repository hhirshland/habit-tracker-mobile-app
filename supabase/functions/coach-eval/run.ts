#!/usr/bin/env -S deno run --allow-read --allow-net --allow-env
//
// Coach Eval Runner — scores coach responses against quality criteria.
// Usage: ANTHROPIC_API_KEY=sk-... deno run --allow-read --allow-net --allow-env run.ts
//
// Reads scenarios from scenarios.json, generates a coach response for each,
// then uses Claude as a judge to score the response on multiple dimensions.

import { buildCoachSystemPrompt, buildNudgePrompt } from "../_shared/coach-persona.ts";

interface Scenario {
  id: string;
  description: string;
  userContext: string;
  userMessage: string;
  expectedQualities: string[];
}

interface JudgeScore {
  dimension: string;
  score: number; // 1-5
  reasoning: string;
}

interface EvalResult {
  scenarioId: string;
  coachResponse: string;
  scores: JudgeScore[];
  averageScore: number;
  pass: boolean; // average >= 3.5
}

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
if (!ANTHROPIC_API_KEY) {
  console.error("Set ANTHROPIC_API_KEY env var");
  Deno.exit(1);
}

const MODEL = "claude-sonnet-4-20250514";

async function callClaude(system: string, userMessage: string): Promise<string> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": ANTHROPIC_API_KEY!,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 1024,
      system,
      messages: [{ role: "user", content: userMessage }],
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Claude API ${res.status}: ${body}`);
  }

  const data = await res.json();
  return data.content?.[0]?.text ?? "";
}

async function generateCoachResponse(scenario: Scenario): Promise<string> {
  const isNudge = scenario.userMessage.startsWith("[NUDGE_TRIGGER:");

  if (isNudge) {
    const prompt = buildNudgePrompt({
      userName: "Alex",
      userContext: scenario.userContext,
      triggerType: "missed_streak",
      triggerDetail: scenario.userMessage,
    });
    return callClaude(prompt, "Generate the nudge.");
  }

  const systemPrompt = buildCoachSystemPrompt({
    userName: "Alex",
    userContext: scenario.userContext,
  });
  return callClaude(systemPrompt, scenario.userMessage);
}

async function judgeResponse(
  scenario: Scenario,
  coachResponse: string,
): Promise<JudgeScore[]> {
  const judgePrompt = `You are evaluating an AI coach's response for quality. Score each dimension 1-5 where:
1 = Completely fails
2 = Mostly fails
3 = Adequate
4 = Good
5 = Excellent

## Scenario
${scenario.description}

## User Context Given to Coach
${scenario.userContext}

## User Message
${scenario.userMessage}

## Coach Response
${coachResponse}

## Expected Qualities
${scenario.expectedQualities.join(", ")}

## Dimensions to Score
1. **tone_accuracy**: Does it sound like a motivational speaker/coach? (Tony Robbins warmth + Goggins intensity)
2. **identity_grounding**: Does it reference the user's identity statements and connect habits to identity?
3. **data_specificity**: Does it use specific habit names, numbers, and streaks from the context?
4. **actionability**: Does it push toward a specific next action, not just acknowledgment?
5. **empathy_toughness_balance**: Does it balance caring with challenging? Not too soft, not too harsh?
6. **quote_usage**: If a quote is used, does it fit naturally? (Score 3 if no quote was warranted)
7. **expected_qualities_met**: How many of the expected qualities does the response demonstrate?

Return ONLY a JSON array of objects with "dimension", "score" (integer 1-5), and "reasoning" (1 sentence).`;

  const raw = await callClaude(judgePrompt, "Score the response.");

  try {
    const cleaned = raw.replace(/```json?\n?/g, "").replace(/```/g, "").trim();
    return JSON.parse(cleaned);
  } catch {
    console.error("Failed to parse judge response:", raw.slice(0, 300));
    return [];
  }
}

// ─── Main ───

async function main() {
  const scenariosRaw = await Deno.readTextFile(
    new URL("./scenarios.json", import.meta.url),
  );
  const scenarios: Scenario[] = JSON.parse(scenariosRaw);

  console.log(`\n🏋️ Running ${scenarios.length} eval scenarios...\n`);

  const results: EvalResult[] = [];

  for (const scenario of scenarios) {
    process.stdout?.write?.(`  ${scenario.id}... `) ?? console.log(`  ${scenario.id}...`);

    try {
      const coachResponse = await generateCoachResponse(scenario);
      const scores = await judgeResponse(scenario, coachResponse);
      const avg =
        scores.length > 0
          ? Math.round(
              (scores.reduce((s, sc) => s + sc.score, 0) / scores.length) * 10,
            ) / 10
          : 0;

      const result: EvalResult = {
        scenarioId: scenario.id,
        coachResponse,
        scores,
        averageScore: avg,
        pass: avg >= 3.5,
      };
      results.push(result);

      const icon = result.pass ? "✅" : "❌";
      console.log(`${icon} avg=${avg}`);

      // Print low scores
      for (const score of scores) {
        if (score.score <= 2) {
          console.log(`     ⚠️  ${score.dimension}: ${score.score}/5 — ${score.reasoning}`);
        }
      }
    } catch (err) {
      console.log(`💥 Error: ${(err as Error).message}`);
      results.push({
        scenarioId: scenario.id,
        coachResponse: "",
        scores: [],
        averageScore: 0,
        pass: false,
      });
    }
  }

  // Summary
  const passed = results.filter((r) => r.pass).length;
  const totalAvg =
    results.length > 0
      ? Math.round(
          (results.reduce((s, r) => s + r.averageScore, 0) / results.length) *
            10,
        ) / 10
      : 0;

  console.log(`\n${"═".repeat(50)}`);
  console.log(`Results: ${passed}/${results.length} passed (avg score: ${totalAvg})`);
  console.log(`${"═".repeat(50)}\n`);

  // Write detailed results
  const outPath = new URL("./results.json", import.meta.url);
  await Deno.writeTextFile(outPath, JSON.stringify(results, null, 2));
  console.log(`Detailed results written to results.json`);
}

main();
