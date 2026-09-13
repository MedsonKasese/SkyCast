// Shared utility functions for SkyCast

// Escapes text before it is inserted via innerHTML, so data coming from
// APIs or user input can never be interpreted as markup.
export function escapeHtml(value) {
  const element = document.createElement("div");

  element.textContent = value ?? "";

  return element.innerHTML;
}
