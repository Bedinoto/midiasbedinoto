import React, { useState } from 'react';
import { GoogleGenAI, Type } from '@google/genai';
import { Sparkles, Loader2, Send } from 'lucide-react';
import { Button } from './ui/Button';

export const MediaAssistant: React.FC = () => {
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const generateIdeas = async () => {
    if (!prompt.trim()) return;
    setLoading(true);
    setResult(null);

    try {
      // Fix: Always create a new GoogleGenAI instance right before making an API call
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Gere 3 slogans publicitários cativantes e uma breve estratégia de exibição para uma tela de sinalização digital sobre: ${prompt}. Formate em tópicos e responda em Português do Brasil.`,
        config: {
          temperature: 0.7,
          // Fix: When using maxOutputTokens, thinkingConfig must be provided for Gemini 3 series models
          maxOutputTokens: 500,
          thinkingConfig: { thinkingBudget: 100 }
        }
      });
      // Fix: Directly access the .text property (not a method) as per guidelines
      setResult(response.text || 'Nenhuma resposta gerada.');
    } catch (error) {
      console.error('Erro Gemini:', error);
      setResult('Falha ao gerar ideias. Por favor, tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-gradient-to-br from-indigo-900/20 to-slate-900 border border-indigo-500/30 rounded-2xl p-6 shadow-xl overflow-hidden relative">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-indigo-500/20 rounded-lg">
          <Sparkles className="text-indigo-400" size={20} />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-white">Assistente de Conteúdo IA</h3>
          <p className="text-sm text-slate-400">Sem ideias para o anúncio? Deixe a IA ajudar você.</p>
        </div>
      </div>

      <div className="flex gap-2 mb-6">
        <input
          type="text"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="ex: Descontos sazonais de café, Venda de planos de academia..."
          className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-white"
        />
        <Button 
          onClick={generateIdeas} 
          disabled={loading || !prompt}
          icon={loading ? <Loader2 className="animate-spin" size={18} /> : <Send size={18} />}
        >
          {loading ? 'Pensando...' : 'Gerar'}
        </Button>
      </div>

      {result && (
        <div className="bg-slate-950/50 rounded-xl p-4 border border-slate-800 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="prose prose-invert prose-sm max-w-none">
             {result.split('\n').map((line, i) => (
               <p key={i} className="mb-2 text-slate-300">{line}</p>
             ))}
          </div>
        </div>
      )}
    </div>
  );
};
