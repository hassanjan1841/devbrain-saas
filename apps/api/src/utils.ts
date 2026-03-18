export function ok<T>(data: T, status = 200) {
  return {
    status,
    body: {
      success: true,
      data
    }
  };
}

export function fail(message: string, status = 400, details?: unknown) {
  return {
    status,
    body: {
      success: false,
      error: {
        message,
        details
      }
    }
  };
}

export function buildTaskOutput(input: string, memories: Array<{ content: string }>) {
  const hints = memories.map((memory, index) => `Memory ${index + 1}: ${memory.content}`).join('\n\n');
  return [
    `DevBrain task summary for: ${input}`,
    '',
    'Suggested implementation approach:',
    '- Break the problem into reusable modules.',
    '- Align the output with the user\'s previous coding preferences.',
    '- Keep typing, auth, and persistence concerns separated.',
    '',
    hints ? 'Relevant prior memories:' : 'Relevant prior memories: none found.',
    hints || 'No similar memories were available yet.'
  ].join('\n');
}
