export const AI_LIMIT_NOTICE_TEXT = "Today's limit reached";

const normalizeMessage = (value) => String(value || '').trim().toLowerCase();

const TOKEN_LIMIT_PATTERNS = [
  /today'?s\s+limit\s+reached/i,
  /daily\s+limit\s+reached/i,
  /token\s+limit/i,
  /tokens?\s+exceeded/i,
  /quota/i,
  /usage\s+limit/i,
  /insufficient[_\s-]?quota/i,
  /credits?\s+exhausted/i,
  /plan\s+limit/i,
  /limit\s+reached/i
];

export const isAiTokenLimitError = (errorLike) => {
  const status = Number(errorLike?.response?.status || errorLike?.status || 0);

  const messagesToInspect = [
    errorLike,
    errorLike?.message,
    errorLike?.error,
    errorLike?.detail,
    errorLike?.response?.data?.message,
    errorLike?.response?.data?.error,
    errorLike?.response?.data?.detail,
    errorLike?.data?.message,
    errorLike?.data?.error,
    errorLike?.data?.detail
  ];

  const mergedMessage = messagesToInspect
    .map((entry) => normalizeMessage(entry))
    .filter(Boolean)
    .join(' | ');

  if (!mergedMessage) {
    return false;
  }

  if (!TOKEN_LIMIT_PATTERNS.some((pattern) => pattern.test(mergedMessage))) {
    return false;
  }

  if ([402, 429].includes(status)) {
    return true;
  }

  if (status === 0) {
    return true;
  }

  return status >= 400 && status < 600;
};
