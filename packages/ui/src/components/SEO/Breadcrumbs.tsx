/**
 * Breadcrumb Navigation Component
 * 
 * Provides visual breadcrumb navigation with schema.org markup
 */

import { BreadcrumbSchema } from './StructuredData';

interface BreadcrumbItem {
  label: string;
  href: string;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  className?: string;
}

export function Breadcrumbs({ items, className = '' }: BreadcrumbsProps) {
  // Generate full URLs for schema
  const schemaItems = items.map((item) => ({
    name: item.label,
    url: item.href,
  }));

  return (
    <>
      <BreadcrumbSchema items={schemaItems} />
      <nav aria-label="Breadcrumb" className={`text-sm ${className}`}>
        <ol className="flex items-center gap-2 flex-wrap">
          {items.map((item, index) => {
            const isLast = index === items.length - 1;

            return (
              <li key={item.href} className="flex items-center gap-2">
                {index > 0 && (
                  <span className="text-gray-500" aria-hidden="true">
                    /
                  </span>
                )}
                {isLast ? (
                  <span className="text-gray-400" aria-current="page">
                    {item.label}
                  </span>
                ) : (
                  <a
                    href={item.href}
                    className="text-blue-400 hover:text-blue-300 transition-colors"
                  >
                    {item.label}
                  </a>
                )}
              </li>
            );
          })}
        </ol>
      </nav>
    </>
  );
}
