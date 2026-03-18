export function buildReflection(params: { input: string; output: string }) {
  const keywords = Array.from(
    new Set(
      `${params.input} ${params.output}`
        .toLowerCase()
        .split(/[^a-z0-9_]+/i)
        .filter((token) => token.length > 4)
        .slice(0, 12)
    )
  );

  return {
    summary: `Task focused on: ${params.input}`,
    styleSignals: keywords,
    learnedPattern: `The user tends to work on tasks related to: ${keywords.join(', ') || 'general coding patterns'}.`
  };
}
