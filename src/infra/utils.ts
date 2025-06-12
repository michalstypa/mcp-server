export function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Unknown error';
}

export function createSuccessResponse(data: Record<string, unknown>, message?: string) {
  const responseData = message ? { ...data, message } : data;

  return {
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify(responseData, null, 2),
      },
    ],
  };
}

export function createErrorResponse(code: string, error: unknown) {
  const errorMessage = getErrorMessage(error);

  return {
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify(
          {
            error: {
              code,
              message: errorMessage,
            },
          },
          null,
          2
        ),
      },
    ],
    isError: true,
  };
}
