/**
 * Helper function to clean and extract JSON from response
 * Shared across all content parsers
 */
export function extractJsonObject(jsonResponse: string): string {
  let cleaned = jsonResponse.trim();
  
  // Handle markdown code blocks
  cleaned = cleaned.replace(/^```[a-z]*\n?/i, '');
  cleaned = cleaned.replace(/\n?```\s*$/m, '');
  cleaned = cleaned.trim();
  
  // Extract JSON object - find the first { and try to match it with the last }
  const firstBrace = cleaned.indexOf('{');
  if (firstBrace === -1) {
    throw new Error('No JSON object found in response');
  }
  
  cleaned = cleaned.substring(firstBrace);
  
  // Find the matching closing brace by counting braces
  let braceCount = 0;
  let bracketCount = 0;
  let inString = false;
  let escapeNext = false;
  let lastValidIndex = -1;
  
  for (let i = 0; i < cleaned.length; i++) {
    const char = cleaned[i];
    
    if (escapeNext) {
      escapeNext = false;
      continue;
    }
    
    if (char === '\\') {
      escapeNext = true;
      continue;
    }
    
    if (char === '"') {
      inString = !inString;
      continue;
    }
    
    if (!inString) {
      if (char === '{') {
        braceCount++;
      } else if (char === '}') {
        braceCount--;
        if (braceCount === 0 && bracketCount === 0) {
          lastValidIndex = i;
          break;
        }
      } else if (char === '[') {
        bracketCount++;
      } else if (char === ']') {
        bracketCount--;
      }
    }
  }
  
  // If we found a complete JSON object, use it
  if (lastValidIndex > 0) {
    cleaned = cleaned.substring(0, lastValidIndex + 1);
  } else {
    // JSON is incomplete - try to close it
    if (braceCount > 0) {
      cleaned += '}'.repeat(braceCount);
    }
    if (bracketCount > 0) {
      cleaned += ']'.repeat(bracketCount);
    }
  }
  
  return cleaned;
}

