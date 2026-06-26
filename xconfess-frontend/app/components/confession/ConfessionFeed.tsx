"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useWindowVirtualizer } from "@tanstack/react-virtual";
import { ConfessionCard } from "./ConfessionCard";
import { ConfessionFeedSkeleton } from "./LoadingSkeleton";
import { useInfiniteConfessions } from "../../lib/hooks/useConfessionsQuery";
import ErrorState from "../common/ErrorState";
import { ArrowUp } from "lucide-react";

const ESTIMATED_CARD_HEIGHT = 300;
const SCROLL_THRESHOLD = 400;
const OVERSCAN = 3;

export const ConfessionFeed = () => {
  const {
    data,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    error,
    refetch,
  } = useInfiniteConfessions();

  const allConfessions = data?.pages.flatMap((page) => page.confessions) ?? [];
  const isEmpty = !isLoading && allConfessions.length === 0;
  const [showScrollTop, setShowScrollTop] = useState(false);

  const loadMoreRef = useRef<HTMLDivElement>(null);

  const virtualizer = useWindowVirtualizer({
    count: allConfessions.length,
    estimateSize: () => ESTIMATED_CARD_HEIGHT,
    overscan: OVERSCAN,
    scrollMargin: 0,
  });

  useEffect(() => {
    const el = loadMoreRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { rootMargin: `${SCROLL_THRESHOLD}px` },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 600);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToTop = useCallback(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const scrollToComposer = () => {
    document.getElementById("composer")?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  const handleRetry = () => {
    void refetch();
  };

  if (isLoading) {
    return <ConfessionFeedSkeleton />;
  }

  if (error) {
    return (
      <ErrorState
        error={undefined}
        title="Unable to load feed"
        description="We couldn't load recent confessions. Please try again or check your connection."
        showRetry
        onRetry={handleRetry}
      />
    );
  }

  if (isEmpty) {
    return (
      <div className="luxury-panel rounded-[30px] p-8 text-center">
        <p className="mb-3 font-editorial text-3xl sm:text-4xl text-[var(--foreground)]">
          No confessions yet.
        </p>
        <p className="mb-4 max-w-xl mx-auto text-sm leading-7 text-[var(--secondary)]">
          Be the first to set the tone for the community — share something
          thoughtful, kind, and true. Your first post helps others
          understand what belongs here.
        </p>
        <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <button
            onClick={scrollToComposer}
            className="rounded-full bg-[linear-gradient(135deg,var(--primary),var(--primary-deep))] px-5 py-2.5 text-sm font-medium text-white shadow-[0_18px_40px_-22px_rgba(143,109,60,0.85)] transition-colors hover:brightness-105"
          >
            Begin writing
          </button>
          <button
            onClick={handleRetry}
            className="rounded-full border border-[var(--border)] bg-[var(--surface-muted)] px-5 py-2.5 text-sm font-medium text-[var(--secondary)] transition-colors hover:bg-[var(--surface-strong)] hover:text-[var(--foreground)]"
          >
            Refresh
          </button>
        </div>
      </div>
    );
  }

  const virtualItems = virtualizer.getVirtualItems();

  return (
    <div className="relative">
      <div
        className="relative w-full"
        style={{ height: `${virtualizer.getTotalSize()}px` }}
      >
        {virtualItems.map((virtualItem) => {
          const confession = allConfessions[virtualItem.index];
          if (!confession) return null;

          return (
            <div
              key={confession.id}
              className="absolute inset-x-0 top-0"
              style={{
                height: `${virtualItem.size}px`,
                transform: `translateY(${virtualItem.start - virtualizer.options.scrollMargin}px)`,
              }}
            >
              <div className="pb-5">
                <ConfessionCard confession={confession} />
              </div>
            </div>
          );
        })}
      </div>

      <div ref={loadMoreRef} className="flex justify-center py-6">
        {isFetchingNextPage && (
          <div className="flex items-center gap-2 text-sm text-[var(--secondary)]">
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Loading more confessions...
          </div>
        )}
        {!hasNextPage && allConfessions.length > 0 && (
          <p className="text-xs text-[var(--secondary)]">
            You&apos;ve reached the end of the feed
          </p>
        )}
      </div>

      {showScrollTop && (
        <button
          onClick={scrollToTop}
          className="fixed bottom-8 right-8 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--primary)] text-white shadow-lg transition-all hover:bg-[var(--primary-deep)] hover:-translate-y-1"
          aria-label="Scroll to top"
        >
          <ArrowUp className="h-5 w-5" />
        </button>
      )}
    </div>
  );
};
