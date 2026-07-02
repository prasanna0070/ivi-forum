/**
 * IviArrow — the exact I-Venture @ ISB arrow mark.
 *
 * These are the real ISB arrow glyphs, lifted verbatim from ISB's own `isb`
 * icon font (glyph "b" = arrow-right, "r" = arrow-right-slant, "c" = arrow-left,
 * "i" = arrow-down) and reproduced here as vector paths so we match ISB's UI
 * precisely — including that distinctive organic, slightly-hooked arrowhead
 * rather than a generic chevron.
 *
 * They are FILLED shapes (fill: currentColor), not stroked — matching ISB.
 * Font glyphs are Y-up, so each path is flipped into SVG's Y-down space.
 * Pair with `group-hover:translate-x-2` (ISB's --arrow-transformx: 8px) +
 * `transition-transform duration-200` for ISB's signature slide-on-hover.
 */
type Dir = "right" | "right-slant" | "left" | "down";

const PATHS: Record<Dir, string> = {
  right:
    "M411 319 398 306 385 293V294L383 295L376 302Q372 307 353 324Q308 367 288 383L312 410Q345 383 378 350Q382 346 390.5 338.5Q399 331 402 328Q407 323 408 321L410 319ZM55 278H457L458 241Q443 241 430 234Q414 225 399 205Q390 196 366 169Q360 163 357 159Q319 117 314 111L286 134Q288 136 294.5 143.5Q301 151 311.5 163.0Q322 175 330 183Q337 190 340 194Q352 208 357 213Q359 215 362.0 218.5Q365 222 366 223Q369 226 369 227L370 228V227V228Q374 233 382 241H55Z",
  "right-slant":
    "M89 121 391 423 419 396Q408 383 404 370Q398 351 402 325Q402 322 404 274Q405 269 405 259Q406 246 406.5 229.5Q407 213 408.0 203.0Q409 193 409 190L371 186Q369 204 367 257Q367 260 366.5 265.0Q366 270 366 272Q366 277 365.5 286.0Q365 295 365 299Q364 305 364 314V319L363 320Q363 324 362.5 330.0Q362 336 362 339L117 94ZM326 419V400V381H325H322Q321 381 318.0 380.5Q315 380 312 380H278Q211 378 186 375L182 413Q234 418 277 418Q291 419 312 419H322H325Z",
  left:
    "M155 360Q193 402 198 408L226 385Q224 382 217.5 375.0Q211 368 200.5 356.0Q190 344 182 335L172 325Q160 311 155.0 306.0Q150 301 146 295Q143 294 143 292L142 291Q138 286 130 278H457V241H55V278Q69 278 82 285Q98 294 113 314L146 349Q148 351 151.0 354.5Q154 358 155 360ZM101 200 114 213 127 226V225L129 223Q131 222 136 217Q140 212 159 195Q204 152 224 136L200 108Q170 134 134 168Q124 177 110 191Q109 193 106.5 195.0Q104 197 104 198L102 199Z",
  down:
    "M275 473V46H237Q235 62 229 75Q220 91 199 108Q197 109 191.5 114.0Q186 119 177.0 127.0Q168 135 160 142Q157 146 149 152Q103 194 98 198L122 228Q138 215 175 181Q177 179 181.0 175.5Q185 172 186 171Q202 157 207 152Q209 150 213.0 146.5Q217 143 218 142L221 139L222 138L224 137L222 138L237 126V473ZM319 95 305 109 292 122V123L294 125L301 132L325 156Q363 196 387 225L416 200Q391 170 353 130Q348 125 340.0 116.5Q332 108 329 105L322 98L320 96Z",
};

export default function IviArrow({
  dir = "right",
  size = 20,
  className,
  ...rest
}: {
  dir?: Dir;
  size?: number;
  className?: string;
} & React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 512 512"
      fill="currentColor"
      aria-hidden="true"
      focusable="false"
      className={className}
      {...rest}
    >
      <g transform="translate(0,512) scale(1,-1)">
        <path d={PATHS[dir]} />
      </g>
    </svg>
  );
}
