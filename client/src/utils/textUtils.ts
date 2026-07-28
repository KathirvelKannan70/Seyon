/**
 * Capitalizes the first letter of each word in a string.
 * Used for name inputs across all forms.
 */
export const capitalizeWords = (val: string): string =>
  val.replace(/(^|\s)(\S)/g, (_, space, char) => space + char.toUpperCase());
