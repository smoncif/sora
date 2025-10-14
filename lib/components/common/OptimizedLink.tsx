'use client';

import React, { useState, useCallback } from 'react';
import Link, { LinkProps } from 'next/link';
import { useRouter } from 'next/navigation';

interface OptimizedLinkProps extends Omit<LinkProps, 'href'> {
  href: string;
  children: React.ReactNode;
  prefetch?: boolean | 'hover' | 'focus';
  onPrefetch?: () => void | Promise<void>;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * 🚀 Composant Link optimisé avec stratégies de prefetching avancées
 * 
 * **Modes de prefetch :**
 * - `true` : Prefetch immédiat (par défaut Next.js)
 * - `'hover'` : Prefetch au survol (recommandé)
 * - `'focus'` : Prefetch au focus clavier
 * - `false` : Pas de prefetch
 * 
 * **Usage :**
 * ```tsx
 * <OptimizedLink 
 *   href="/dashboard/analysis/sod/123" 
 *   prefetch="hover"
 *   onPrefetch={() => prefetchSession('123')}
 * >
 *   Voir l'analyse
 * </OptimizedLink>
 * ```
 */
export function OptimizedLink({
  href,
  children,
  prefetch = 'hover',
  onPrefetch,
  className,
  style,
  ...linkProps
}: OptimizedLinkProps) {
  const router = useRouter();
  const [isPrefetched, setIsPrefetched] = useState(false);

  // ⚡ Handler de prefetch (appelé une seule fois)
  const handlePrefetch = useCallback(async () => {
    if (isPrefetched) return;
    
    setIsPrefetched(true);
    
    // Prefetch Next.js route
    router.prefetch(href);
    
    // Prefetch custom data (ex: TanStack Query)
    if (onPrefetch) {
      await onPrefetch();
    }
  }, [isPrefetched, router, href, onPrefetch]);

  // 🎯 Déterminer les props de prefetch selon le mode
  const getPrefetchProps = () => {
    switch (prefetch) {
      case true:
        // Prefetch immédiat (Next.js par défaut)
        return { prefetch: true };
      
      case 'hover':
        // Prefetch au survol
        return {
          prefetch: false,
          onMouseEnter: handlePrefetch,
        };
      
      case 'focus':
        // Prefetch au focus clavier (accessibilité)
        return {
          prefetch: false,
          onFocus: handlePrefetch,
        };
      
      case false:
        // Pas de prefetch
        return { prefetch: false };
      
      default:
        return { prefetch: false };
    }
  };

  return (
    <Link
      href={href}
      className={className}
      style={style}
      {...getPrefetchProps()}
      {...linkProps}
    >
      {children}
    </Link>
  );
}

/**
 * 🎯 Variante avec prefetch au hover ET focus (recommandée pour accessibilité)
 */
export function AccessibleOptimizedLink({
  href,
  children,
  onPrefetch,
  className,
  style,
  ...linkProps
}: Omit<OptimizedLinkProps, 'prefetch'>) {
  const router = useRouter();
  const [isPrefetched, setIsPrefetched] = useState(false);

  const handlePrefetch = useCallback(async () => {
    if (isPrefetched) return;
    
    setIsPrefetched(true);
    router.prefetch(href);
    
    if (onPrefetch) {
      await onPrefetch();
    }
  }, [isPrefetched, router, href, onPrefetch]);

  return (
    <Link
      href={href}
      className={className}
      style={style}
      prefetch={false}
      onMouseEnter={handlePrefetch}
      onFocus={handlePrefetch}
      {...linkProps}
    >
      {children}
    </Link>
  );
}

/**
 * 🔥 Variante haute performance : Prefetch conditionnel basé sur la visibilité
 * 
 * Utilise IntersectionObserver pour prefetch uniquement les liens visibles
 */
export function IntersectionOptimizedLink({
  href,
  children,
  onPrefetch,
  className,
  style,
  threshold = 0.5,
  ...linkProps
}: OptimizedLinkProps & { threshold?: number }) {
  const router = useRouter();
  const [isPrefetched, setIsPrefetched] = useState(false);
  const linkRef = React.useRef<HTMLAnchorElement>(null);

  React.useEffect(() => {
    if (!linkRef.current || isPrefetched) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(async (entry) => {
          if (entry.isIntersecting && !isPrefetched) {
            setIsPrefetched(true);
            router.prefetch(href);
            
            if (onPrefetch) {
              await onPrefetch();
            }
          }
        });
      },
      { threshold }
    );

    observer.observe(linkRef.current);

    return () => observer.disconnect();
  }, [isPrefetched, router, href, onPrefetch, threshold]);

  return (
    <Link
      ref={linkRef}
      href={href}
      className={className}
      style={style}
      prefetch={false}
      {...linkProps}
    >
      {children}
    </Link>
  );
}



