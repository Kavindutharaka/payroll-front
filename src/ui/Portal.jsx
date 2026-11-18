import { createPortal } from "react-dom";

/* Draws a dialog straight onto the page body. A dialog opened from inside the sidebar
 * (which slides with a CSS transform) was otherwise centred in the sidebar, not the window. */
export default function Portal({ children }) {
  return createPortal(children, document.body);
}
