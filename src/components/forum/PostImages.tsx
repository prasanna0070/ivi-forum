/**
 * PostImages — renders a topic's or reply's attached images.
 * Server component: plain <img> tags served through /api/uploads; each links to
 * the full-size image in a new tab. One image shows large; several tile 2-up.
 */
import { imageSrc } from '@/lib/images';

export default function PostImages({ images }: { images?: string[] }) {
  if (!images || images.length === 0) return null;

  if (images.length === 1) {
    return (
      <div className="mt-4 max-w-lg">
        <a
          href={imageSrc(images[0])}
          target="_blank"
          rel="noopener noreferrer"
          className="block overflow-hidden rounded-card border border-border bg-surface"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageSrc(images[0])}
            alt="Attached image"
            loading="lazy"
            className="max-h-[28rem] w-full object-contain"
          />
        </a>
      </div>
    );
  }

  return (
    <div className="mt-4 grid max-w-lg grid-cols-2 gap-2">
      {images.map((path) => (
        <a
          key={path}
          href={imageSrc(path)}
          target="_blank"
          rel="noopener noreferrer"
          className="block overflow-hidden rounded-card border border-border bg-surface"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageSrc(path)}
            alt="Attached image"
            loading="lazy"
            className="aspect-[4/3] w-full object-cover"
          />
        </a>
      ))}
    </div>
  );
}
