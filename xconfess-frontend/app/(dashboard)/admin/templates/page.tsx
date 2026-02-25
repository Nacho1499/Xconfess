'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { rolloutApi, type TemplateRollout } from "@/app/api/client";
import { Table, THead, TBody, Th } from '@/app/components/ui/table';
import { ErrorBoundary } from '@/app/components/common/ErrorBoundary';
import { Zap, ArrowUpCircle, RotateCcw, Activity, CheckCircle2, AlertCircle } from 'lucide-react';

export default function AdminTemplatesPage() {
  const [templates, setTemplates] = useState<TemplateRollout[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await rolloutApi.getTemplates();
      setTemplates(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'System sync failed');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleAction = async (key: string, label: string, action: () => Promise<unknown>) => {
    if (window.confirm(`⚠️ CONFIRM ${label} for ${key}?`)) {
      try {
        await action();
        await loadData();
      } catch (err) {
        alert("Operation failed.");
      }
    }
  };

  return (
    <ErrorBoundary onReset={loadData}>
      <div className="min-h-screen bg-black text-white p-8 font-sans">
        {/* Header omitted for brevity - keep your existing header here */}

        <main className="max-w-7xl mx-auto">
          {loading ? (
             <p className="animate-pulse text-zinc-500 font-mono italic">FETCHING_METRICS...</p>
          ) : error ? (
            <div className="p-6 border border-red-900 bg-red-950/20 rounded-xl text-red-500 font-mono">
              ERROR: {error}
              <button onClick={loadData} className="ml-4 underline">RETRY</button>
            </div>
          ) : (
            <Table>
              <THead>
                <tr>
                  <Th>Template ID</Th>
                  <Th>Version State</Th>
                  <Th>Traffic Weight</Th>
                  <Th>Integrity</Th>
                  <Th className="text-right">Emergency</Th>
                </tr>
              </THead>
              <TBody>
                {templates.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-zinc-600 font-mono">NO_TEMPLATES_FOUND</td>
                  </tr>
                ) : (
                  templates.map((t) => (
                    <tr key={t.key} className="hover:bg-zinc-900/40">
                      <td className="px-6 py-6 font-mono text-blue-500 text-sm font-bold">{t.key}</td>
                      <td className="px-6 py-6 text-xs uppercase font-bold text-zinc-500">
                        v{t.activeVersion} {t.canaryVersion && <span className="text-orange-500 ml-2">→ v{t.canaryVersion}</span>}
                      </td>
                      <td className="px-6 py-6">
                        <input 
                          type="range" 
                          defaultValue={t.canaryPercentage} 
                          onMouseUp={(e) => rolloutApi.updateCanary(t.key, parseInt((e.target as HTMLInputElement).value)).then(loadData)}
                          className="w-32 accent-orange-500 cursor-pointer" 
                        />
                      </td>
                      <td className="px-6 py-6">
                        {t.status === 'healthy' ? <CheckCircle2 className="text-green-500" size={16}/> : <AlertCircle className="text-red-500" size={16}/>}
                      </td>
                      <td className="px-6 py-6 text-right space-x-2">
                        <button onClick={() => handleAction(t.key, 'PROMOTE', () => rolloutApi.promote(t.key))}><ArrowUpCircle size={18}/></button>
                        <button onClick={() => handleAction(t.key, 'ROLLBACK', () => rolloutApi.rollback(t.key))}><RotateCcw size={18}/></button>
                        <button onClick={() => handleAction(t.key, 'KILL', () => rolloutApi.killSwitch(t.key))}><Zap size={18}/></button>
                      </td>
                    </tr>
                  ))
                )}
              </TBody>
            </Table>
          )}
        </main>
      </div>
    </ErrorBoundary>
  );
}