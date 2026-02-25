import React from 'react';

export const Table = ({ children, className = '', ...rest }: React.TableHTMLAttributes<HTMLTableElement>) => (
  <div className="w-full overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950 shadow-2xl">
    <table className={`min-w-full divide-y divide-zinc-800 ${className}`} {...rest}>
      {children}
    </table>
  </div>
);

export const THead = ({ children, className = '', ...rest }: React.HTMLAttributes<HTMLTableSectionElement>) => (
  <thead className={`bg-zinc-900/50 ${className}`} {...rest}>{children}</thead>
);

export const TBody = ({ children, className = '', ...rest }: React.HTMLAttributes<HTMLTableSectionElement>) => (
  <tbody className={`divide-y divide-zinc-900 bg-transparent ${className}`} {...rest}>{children}</tbody>
);

export const Th = ({ children, className = '', ...rest }: React.ThHTMLAttributes<HTMLTableCellElement>) => (
  <th 
    scope="col" 
    className={`px-6 py-4 text-left text-xs font-semibold text-zinc-400 uppercase tracking-widest ${className}`} 
    {...rest}
  >
    {children}
  </th>
);