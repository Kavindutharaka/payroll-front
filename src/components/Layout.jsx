import { useEffect, useRef, useState } from "react";
import { HiMenu } from "react-icons/hi";
import { SideNav } from "./SideNav";

const DESKTOP = 1024;   // Tailwind's lg: the sidebar is always shown from here up

/* Every page sits in this shell.
 *  - Desktop: the sidebar stays on the left.
 *  - Tablet and phone: a slim top bar with a menu button; the sidebar slides in over the page.
 *  - Long lists (.table-viewport) are sized to end at the bottom of the window, so the
 *    headings stay in view and the sideways scrollbar is on screen - without a second,
 *    page-level scrollbar on top of the list's own. */
export default function Layout({ children }) {
  const [navOpen, setNavOpen] = useState(false);
  const mainRef = useRef(null);
  useFitTables(mainRef);

  // Escape closes the form that's open (its ✕ button), unless a confirmation is on top of it
  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== "Escape" || e.defaultPrevented) return;
      if (document.querySelector('[class*="z-[90]"], [class*="z-[95]"]')) return;
      const close = document.querySelectorAll("[data-modal-close]");
      if (close.length) { e.preventDefault(); close[close.length - 1].click(); }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  // the drawer closes with Escape, and the page behind it doesn't scroll while it's open
  useEffect(() => {
    if (!navOpen) return;
    const esc = (e) => { if (e.key === "Escape") setNavOpen(false); };
    document.addEventListener("keydown", esc);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", esc); document.body.style.overflow = prev; };
  }, [navOpen]);

  return (
    <div className="flex min-h-screen w-full bg-gray-50 dark:bg-gray-900">
      <SideNav open={navOpen} onClose={() => setNavOpen(false)} />

      <div className="flex min-w-0 flex-1 flex-col lg:ml-64">
        {/* top bar: tablet and phone only */}
        <header className="sticky top-0 z-30 flex h-14 flex-shrink-0 items-center gap-3 border-b border-gray-200 bg-white/90 px-4 backdrop-blur dark:border-gray-700 dark:bg-gray-900/90 lg:hidden">
          <button type="button" onClick={() => setNavOpen(true)} aria-label="Open menu" aria-expanded={navOpen}
            className="-ml-1.5 rounded-lg p-1.5 text-gray-600 hover:bg-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/40 dark:text-gray-300 dark:hover:bg-gray-800">
            <HiMenu className="h-6 w-6" />
          </button>
          <img src="/ais-logo.jpg" alt="" className="h-7 w-7 rounded bg-white object-contain" />
          <span className="truncate text-sm font-semibold text-gray-800 dark:text-white">AIS Payroll</span>
        </header>

        <main ref={mainRef} className="min-w-0 flex-1 p-4 sm:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}

/* Sizes each long list on the page to finish at the bottom of the window (desktop only).
 * On a phone the page simply scrolls and the list only scrolls sideways. */
function useFitTables(mainRef) {
  useEffect(() => {
    const main = mainRef.current;
    if (!main) return undefined;
    let timer = 0;

    const fit = () => {
      timer = 0;
      const boxes = main.querySelectorAll(".table-viewport");
      if (window.innerWidth < DESKTOP) { boxes.forEach((el) => { el.style.maxHeight = ""; }); return; }
      const pageRoot = main.firstElementChild;
      const padBottom = parseFloat(getComputedStyle(main).paddingBottom) || 0;
      boxes.forEach((el) => {
        // what sits below the list: the rest of its card (totals, paging) and anything after it
        const end = pageRoot && pageRoot.contains(el) ? pageRoot : el;
        const below = padBottom + Math.max(0, end.getBoundingClientRect().bottom - el.getBoundingClientRect().bottom);
        const top = el.getBoundingClientRect().top + window.scrollY;
        const room = window.innerHeight - top - below;
        // never squeezed below most of a screen: then the page scrolls a little instead
        el.style.maxHeight = `${Math.round(Math.max(room, Math.min(400, window.innerHeight * 0.5)))}px`;
      });
    };
    // a short timer, not an animation frame: frames pause while the tab is in the background
    const schedule = () => { if (!timer) timer = setTimeout(fit, 50); };

    schedule();
    window.addEventListener("resize", schedule);
    const mo = new MutationObserver(schedule);
    mo.observe(main, { childList: true, subtree: true });
    return () => { window.removeEventListener("resize", schedule); mo.disconnect(); clearTimeout(timer); };
  }, [mainRef]);
}
