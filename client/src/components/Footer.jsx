export default function Footer() {
  return (
    <footer className="mx-auto max-w-6xl px-4 py-8 text-center text-xs text-slate-400 dark:text-slate-500">
      Axiora v{__APP_VERSION__} by Virasaka Technologies LLP ·{" "}
      <a
        href="https://virasaka.com/"
        target="_blank"
        rel="noopener noreferrer"
        className="hover:text-slate-600 hover:underline dark:hover:text-slate-300"
      >
        virasaka.com
      </a>
    </footer>
  );
}
