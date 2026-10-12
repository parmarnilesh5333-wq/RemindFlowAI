/**
 * Template parser and message personalization utility.
 * Handles variable extraction, interpolation, and validation.
 */

export interface TemplateValidationResult {
  isValid: boolean;
  variables: string[];
  errors: string[];
  warnings: string[];
}

export function extractVariables(templateText: string): string[] {
  if (!templateText) return [];
  const regex = /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g;
  const variables = new Set<string>();
  let match: RegExpExecArray | null;

  while ((match = regex.exec(templateText)) !== null) {
    variables.add(match[1]);
  }

  return Array.from(variables);
}

export function validateTemplate(templateText: string): TemplateValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!templateText || !templateText.trim()) {
    errors.push("Message template cannot be empty.");
    return {
      isValid: false,
      variables: [],
      errors,
      warnings,
    };
  }

  // Check for mismatched braces
  const openCount = (templateText.match(/\{\{/g) || []).length;
  const closeCount = (templateText.match(/\}\}/g) || []).length;

  if (openCount !== closeCount) {
    errors.push(
      `Mismatched variable tags: ${openCount} opening '{{' and ${closeCount} closing '}}'.`
    );
  }

  // Check for single braces that might be typos
  const singleOpen = (templateText.match(/(?<!\{)\{(?!\{)/g) || []).length;
  const singleClose = (templateText.match(/(?<!\})\}(?!\})/g) || []).length;
  if (singleOpen > 0 || singleClose > 0) {
    warnings.push("Found single braces '{' or '}'. Use double braces '{{variable}}' for variables.");
  }

  const variables = extractVariables(templateText);

  // Check character count for WhatsApp standard guidelines (e.g. 1024 chars recommended)
  if (templateText.length > 1024) {
    warnings.push(
      `Message length (${templateText.length} characters) is long. Messages under 1024 characters are recommended for WhatsApp.`
    );
  }

  return {
    isValid: errors.length === 0,
    variables,
    errors,
    warnings,
  };
}

export function renderPersonalizedMessage(
  templateText: string,
  context: Record<string, string | number | null | undefined>
): { rendered: string; missingVariables: string[] } {
  if (!templateText) return { rendered: "", missingVariables: [] };

  const missingVariables: string[] = [];
  const regex = /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g;

  const rendered = templateText.replace(regex, (match, varName) => {
    const val = context[varName];
    if (val === undefined || val === null || String(val).trim() === "") {
      missingVariables.push(varName);
      return match; // preserve un-replaced token so user notices
    }
    return String(val);
  });

  return {
    rendered,
    missingVariables: Array.from(new Set(missingVariables)),
  };
}
