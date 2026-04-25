'use client';

import { useState } from 'react';
import apiclient from '@/app/lib/api/client';

export default function AnchorButton() {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAnchor = async () => {
    if (isSubmitting) return; // prevent duplicate clicks

    try {
      setIsSubmitting(true);

      await apiclient.post('/confessions/anchor', {});

    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <button
      onClick={handleAnchor}
      disabled={isSubmitting}
      className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
    >
      {isSubmitting ? 'Anchoring...' : 'Anchor'}
    </button>
  );
}