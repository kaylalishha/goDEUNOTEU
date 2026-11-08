import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ABOUT,
  ADMINS,
  HERO,
  HIGHLIGHT_ROW,
  HIGHLIGHTS,
  REVIEW_PROMPT,
  SOCIALS,
  STATS,
  TESTIMONIALS,
  TESTIMONIALS_SECTION,
} from '../content'
import {
  ArrowRightIcon,
  ArrowUpRightIcon,
  ChatIcon,
  GiftIcon,
  InstagramIcon,
  StarIcon,
  StoreIcon,
  XLogoIcon,
} from '../components/Icons'
import { AvatarPlaceholder, MediaPlaceholder } from '../components/MediaPlaceholder'

const SLIDE_MS = 5000

export function HomeTab() {
  return (
    <div className="pb-24">
      <HeroSection />
      <AboutSection />
      <TestimonialsSection />
    </div>
  )
}

// ── Hero ───────────────────────────────────────────────────────────
function HeroSection() {
  return (
    <section className="relative px-5 pt-8 pb-16 sm:px-6 md:pt-12 md:pb-24">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-[70%]"
        style={{
          background:
            'radial-gradient(ellipse 90% 70% at 50% 0%, color-mix(in srgb, var(--b200) 55%, transparent) 0%, transparent 70%)',
        }}
      />
      <div className="hero-grid relative mx-auto max-w-6xl lg:grid lg:grid-cols-[1.25fr_0.75fr] lg:items-center lg:gap-16">
        <div className="relative z-10">
          <h1 className="t-hero text-ink">
            {HERO.lines.map((line, i) => (
              <span
                key={line}
                className="hero-line"
                style={i === HERO.lines.length - 1 ? { color: 'var(--accent)' } : undefined}
              >
                {line}
              </span>
            ))}
          </h1>
          <p className="mt-8 max-w-xl text-[15px] leading-[1.7] text-ink-2 sm:text-lg">{HERO.body}</p>
        </div>
        <div className="relative mt-12 lg:mt-0" style={{ transform: 'scale(0.94)', transformOrigin: 'center top' }}>
          <div className="relative z-10 mx-auto w-full max-w-md lg:max-w-none">
            <HighlightCard />
          </div>
        </div>
      </div>

      <div className="mx-auto mt-16 max-w-6xl md:mt-20">
        <div className="stats-bar">
          <div className="stats-grid">
            {STATS.map((s) => (
              <div key={s.label} className="stats-cell">
                <div className="tnum stats-number">{s.value}</div>
                <div className="t-small mt-2 text-ink-2">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

function HighlightCard() {
  const [active, setActive] = useState(0)
  const [paused, setPaused] = useState(false)
  const slide = HIGHLIGHTS[active]

  // Advances in step with the CSS progress-bar animation (5 s); pausing on
  // hover freezes both.
  useEffect(() => {
    if (paused || HIGHLIGHTS.length < 2) return
    const t = setTimeout(() => setActive((i) => (i + 1) % HIGHLIGHTS.length), SLIDE_MS)
    return () => clearTimeout(t)
  }, [active, paused])

  return (
    <div>
      <div
        className="highlight-frame"
        data-paused={paused}
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
      >
        <Link className="highlight group" aria-label={slide.title} to={slide.href}>
          {HIGHLIGHTS.map((h, i) => (
            <MediaPlaceholder
              key={i}
              src={h.imageSrc}
              label={`Foto batch unggulan ${i + 1}`}
              iconSize={32}
              className="highlight-slide h-full w-full"
              active={i === active}
            />
          ))}
          <span className="highlight-scrim" aria-hidden="true" />
          <div className="relative z-10 flex h-full flex-col justify-between p-5 pt-10 sm:p-6 sm:pt-11">
            <span aria-hidden="true" />
            <div key={active} className="highlight-text flex items-end justify-between gap-4">
              <div className="min-w-0">
                <p className="highlight-title line-clamp-2">{slide.title}</p>
                <p className="tnum mt-2 text-[15px] font-semibold" style={{ color: 'rgba(255,255,255,0.9)' }}>
                  {slide.caption}
                </p>
              </div>
              <span className="highlight-arrow" aria-hidden="true">
                <ArrowUpRightIcon size={20} />
              </span>
            </div>
          </div>
        </Link>
        <div className="highlight-stories" role="tablist" aria-label="Sorotan batch">
          {HIGHLIGHTS.map((h, i) => (
            <button
              key={i}
              type="button"
              role="tab"
              aria-selected={i === active}
              aria-label={`${i + 1} dari ${HIGHLIGHTS.length}: ${h.title}`}
              className="highlight-story"
              onClick={() => setActive(i)}
            >
              <span className="highlight-story-track">
                <span
                  key={i === active ? `run-${active}` : `idle-${i}`}
                  className="highlight-story-fill"
                  data-state={i < active ? 'done' : i === active ? 'running' : 'next'}
                />
              </span>
            </button>
          ))}
        </div>
      </div>
      <Link className="highlight-row group" to={HIGHLIGHT_ROW.href}>
        <span className="highlight-stack" aria-hidden="true">
          {HIGHLIGHT_ROW.thumbnailSrcs.map((src, i) => (
            <MediaPlaceholder key={i} src={src} label="" iconSize={14} className="overflow-hidden" />
          ))}
        </span>
        <span className="min-w-0 flex-1 text-[15px] font-semibold text-ink">{HIGHLIGHT_ROW.label}</span>
        <ArrowRightIcon size={16} className="text-ink-2 transition-transform group-hover:translate-x-0.5" />
      </Link>
    </div>
  )
}

// ── About + admin team ─────────────────────────────────────────────
const SOCIAL_ICONS = {
  line: ChatIcon,
  x: XLogoIcon,
  instagram: InstagramIcon,
  shop: StoreIcon,
}

function AboutSection() {
  return (
    <section className="border-t border-hairline px-6 py-20">
      <div className="mx-auto max-w-6xl">
        <div className="mb-14 max-w-2xl">
          <p className="t-label mb-3 text-accent">{ABOUT.eyebrow}</p>
          <h2 className="t-section text-ink">{ABOUT.title}</h2>
          <p className="t-body read-measure mt-5 text-ink-2">{ABOUT.body}</p>
          <div className="mt-8 flex items-center gap-2">
            {SOCIALS.map((s) => {
              const Icon = SOCIAL_ICONS[s.kind]
              return (
                <a
                  key={s.kind}
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={s.title}
                  aria-label={s.title}
                  className="raised-interactive flex h-11 w-11 items-center justify-center text-ink-2 hover:text-accent"
                >
                  <Icon size={18} />
                </a>
              )
            })}
          </div>
        </div>

        <div>
          <h3 className="t-label mb-6 text-ink-3">Tim admin</h3>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {ADMINS.map((a, i) => (
              <div key={i} className="raised flex flex-col p-6">
                <div className="flex items-center gap-3.5">
                  <AvatarPlaceholder name={a.name} src={a.avatarSrc} />
                  <div className="min-w-0">
                    <p className="t-heading capitalize text-ink">{a.name}</p>
                    <p className="t-label mt-0.5 text-ink-3">{a.role}</p>
                  </div>
                </div>
                <p className="t-small mt-4 flex-1 text-ink-2">{a.bio}</p>
                <a
                  href={a.lineHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="t-label mt-4 inline-flex min-h-[44px] items-center gap-1.5 text-accent"
                >
                  <ChatIcon size={14} />
                  Hubungi
                </a>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

// ── Testimonials + review prompt ───────────────────────────────────
function TestimonialsSection() {
  return (
    <section className="border-t border-hairline px-5 py-20 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <div className="mb-10 flex flex-wrap items-end justify-between gap-5">
          <div className="max-w-2xl">
            <p className="t-label mb-3 text-accent">{TESTIMONIALS_SECTION.eyebrow}</p>
            <h2 className="t-section text-ink">{TESTIMONIALS_SECTION.title}</h2>
            <p className="t-body read-measure mt-3 text-ink-2">{TESTIMONIALS_SECTION.body}</p>
          </div>
          <a className="see-all" href={TESTIMONIALS_SECTION.seeAllHref}>
            {TESTIMONIALS_SECTION.seeAllLabel}
            <ArrowRightIcon size={16} />
          </a>
        </div>

        <div className="testi-wall">
          {TESTIMONIALS.map((t, i) => (
            <div key={i} className="testi-wall-item">
              <figure
                className="flex flex-col overflow-hidden rounded-[20px]"
                style={{ background: 'var(--surface)', boxShadow: 'var(--lift)' }}
              >
                {t.photo && (
                  <MediaPlaceholder
                    src={t.photo.photoSrc}
                    label="Foto dari pembeli"
                    className="block w-full"
                    style={{ aspectRatio: t.photo.photoSrc ? undefined : String(t.photo.photoRatio) }}
                  />
                )}
                <div className="flex flex-col px-5 pt-4 pb-4">
                  {!t.photo && (
                    <span
                      aria-hidden="true"
                      style={{
                        fontFamily: 'Georgia, serif',
                        fontSize: 40,
                        lineHeight: 0.7,
                        color: 'var(--b100)',
                        marginBottom: 6,
                      }}
                    >
                      “
                    </span>
                  )}
                  <p className="whitespace-pre-line text-ink-2" style={{ fontSize: 13, lineHeight: 1.55 }}>
                    {t.text}
                  </p>
                  <figcaption
                    className="mt-3 flex shrink-0 items-center gap-2.5 pt-3"
                    style={{ borderTop: '1px solid var(--hairline)' }}
                  >
                    <span
                      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full"
                      style={{ background: 'var(--accent-soft)', color: 'var(--accent)', fontSize: 12, fontWeight: 700 }}
                    >
                      {t.name.charAt(0).toUpperCase()}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-ink" style={{ fontSize: 13, fontWeight: 600 }}>
                      {t.name}
                    </span>
                  </figcaption>
                </div>
              </figure>
            </div>
          ))}
        </div>

        <ReviewPrompt />
      </div>
    </section>
  )
}

function ReviewPrompt() {
  const [hover, setHover] = useState(0)
  return (
    <div className="review-prompt">
      <div className="min-w-0">
        <p className="t-heading text-ink">{REVIEW_PROMPT.title}</p>
        <p className="t-small mt-1.5 text-ink-2">{REVIEW_PROMPT.body}</p>
        {REVIEW_PROMPT.reward && (
          <span className="review-prompt-reward mt-4">
            <GiftIcon size={14} />
            <span className="tnum">{REVIEW_PROMPT.reward}</span>
          </span>
        )}
      </div>
      <div>
        <div className="review-prompt-stars" onMouseLeave={() => setHover(0)}>
          {REVIEW_PROMPT.starLabels.map((label, i) => (
            <a
              key={label}
              href={REVIEW_PROMPT.href(i + 1)}
              aria-label={`${i + 1} bintang — ${label}`}
              data-lit={i < hover}
              onMouseEnter={() => setHover(i + 1)}
              onFocus={() => setHover(i + 1)}
            >
              <StarIcon size={24} />
            </a>
          ))}
        </div>
        <p className="review-prompt-hint" aria-live="polite">
          {hover ? REVIEW_PROMPT.starLabels[hover - 1] : REVIEW_PROMPT.hint}
        </p>
      </div>
    </div>
  )
}
