/**
 * Site footer — I-Venture dark-slate recipe: #2e3b42 column band + #5d6f7a
 * bottom strip, white lockup with the peach underline intact. Links are the
 * app's real routes + the source repo (functionality unchanged).
 */
import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

const linkClass =
  "text-[15px] leading-[2.2] text-white/85 transition-colors hover:text-accent";

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer>
      <div className="bg-footer text-white">
        <div className="px-safe mx-auto grid max-w-6xl gap-10 px-4 pb-12 pt-16 sm:px-6 md:grid-cols-4">
          {/* brand */}
          <div className="md:col-span-2">
            <Image
              src="/brand/ivi-logo-white.png"
              alt="I-Venture @ ISB"
              width={1920}
              height={389}
              className="h-9 w-auto"
            />
            <span aria-hidden className="mt-3 block h-[2px] w-24 bg-accent" />
            <p className="mt-5 max-w-xs text-[15px] leading-relaxed text-white/85">
              Every cohort. One room. The member directory and forum for
              I-Venture @ ISB founders — built by the community.
            </p>
          </div>

          {/* community */}
          <div>
            <h4 className="text-base font-semibold text-white">Community</h4>
            <ul className="mt-3">
              <li>
                <Link href="/directory" className={linkClass}>
                  Directory
                </Link>
              </li>
              <li>
                <Link href="/forum" className={linkClass}>
                  Forum
                </Link>
              </li>
              <li>
                <a
                  href="https://github.com/prasanna0070/ivi-forum"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`inline-flex items-center gap-1 ${linkClass}`}
                >
                  Open source on GitHub
                  <ArrowUpRight size={15} strokeWidth={2} />
                </a>
              </li>
              <li>
                <a
                  href="https://www.quarktex.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`inline-flex items-center gap-1 ${linkClass}`}
                >
                  Powered by Quarktex Co&apos;4
                  <ArrowUpRight size={15} strokeWidth={2} />
                </a>
              </li>
            </ul>
          </div>

          {/* about */}
          <div>
            <h4 className="text-base font-semibold text-white">About</h4>
            <ul className="mt-3">
              <li>
                <a
                  href="https://i-venture.org"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`inline-flex items-center gap-1 ${linkClass}`}
                >
                  I-Venture @ ISB
                  <ArrowUpRight size={15} strokeWidth={2} />
                </a>
              </li>
              <li>
                <a
                  href="https://www.isb.edu"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`inline-flex items-center gap-1 ${linkClass}`}
                >
                  ISB
                  <ArrowUpRight size={15} strokeWidth={2} />
                </a>
              </li>
            </ul>
          </div>
        </div>
      </div>

      <div className="bg-footer-strip text-white/90">
        <div className="pb-safe px-safe mx-auto flex max-w-6xl flex-col items-center justify-between gap-1 px-4 py-4 text-[13px] sm:flex-row sm:px-6">
          <p>© {year} iVi Forum</p>
          <p>Built by the iVi community — not an official ISB product</p>
        </div>
      </div>
    </footer>
  );
}
