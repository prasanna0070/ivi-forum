export default function Footer() {
  return (
    <footer className="border-t border-ink/10 bg-white">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 px-4 py-6 text-sm text-ink/50 sm:flex-row sm:px-6">
        <a
          href="https://github.com/prasanna0070/ivi-forum"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-brand"
        >
          Open source on GitHub
        </a>
        <p>Built by the iVi community — not an official ISB product</p>
      </div>
    </footer>
  );
}
