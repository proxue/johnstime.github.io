import React, { useState } from 'react';
import { Sparkles, ArrowRight, AlertCircle } from 'lucide-react';
import { parseBookingRequest } from '../services/geminiService';
import { GeminiBookingSuggestion } from '../types';
import { Button } from './Button';

interface AISchedulerProps {
  onSuggestion: (suggestion: GeminiBookingSuggestion) => void;
}

export const AIScheduler: React.FC<AISchedulerProps> = ({ onSuggestion }) => {
  const [prompt, setPrompt] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check if API key is present (injected by Vite)
  const hasApiKey = !!process.env.API_KEY;

  const handleSmartSchedule = async () => {
    if (!prompt.trim()) return;
    setIsProcessing(true);
    setError(null);

    try {
      const suggestion = await parseBookingRequest(prompt, new Date());
      if (suggestion && suggestion.date && suggestion.startTime) {
        onSuggestion(suggestion);
        setPrompt('');
      } else {
        // If client returns null but key existed, it was a parsing/model error
        // If client returns null because key missing, hasApiKey check below handles UI
        if (!hasApiKey) {
           setError("AI features are disabled because no API Key was provided.");
        } else {
           setError("I couldn't quite understand that date or time. Please try being more specific (e.g., 'Friday at 2pm').");
        }
      }
    } catch (err) {
        setError("AI service is currently unavailable. Please check your API key.");
    } finally {
      setIsProcessing(false);
    }
  };

  if (!hasApiKey) {
    return (
      <div className="bg-slate-50 rounded-xl p-4 sm:p-6 mb-8 border border-slate-200 opacity-75">
        <div className="flex items-center gap-2 mb-2 text-slate-500 font-semibold">
          <Sparkles size={18} />
          <h3>Smart Assistant</h3>
          <span className="text-xs bg-slate-200 px-2 py-0.5 rounded text-slate-600 font-normal">Disabled</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-slate-500 bg-white p-3 rounded-lg border border-slate-200">
           <AlertCircle size={16} />
           <span>App deployed without API Key. AI scheduling features are turned off, but manual booking still works!</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-indigo-50 rounded-xl p-4 sm:p-6 mb-8 border border-indigo-100">
      <div className="flex items-center gap-2 mb-3 text-indigo-900 font-semibold">
        <Sparkles size={18} className="text-indigo-600" />
        <h3>Smart Assistant</h3>
      </div>
      <p className="text-sm text-indigo-700 mb-4">
        Type a request like "Book 45 mins with Alex next Tuesday at 10 AM for code review"
      </p>
      
      <div className="flex gap-2">
        <input 
          type="text" 
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSmartSchedule()}
          placeholder="Describe when you want to meet..."
          className="flex-1 px-4 py-2 rounded-lg border border-indigo-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-slate-800 placeholder:text-slate-400"
        />
        <Button 
          onClick={handleSmartSchedule} 
          isLoading={isProcessing}
          disabled={!prompt.trim()}
          className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-200"
        >
          <span className="hidden sm:inline">Check</span> 
          <ArrowRight size={18} className="sm:ml-2" />
        </Button>
      </div>
      {error && (
          <p className="text-sm text-red-600 mt-2 animate-pulse">{error}</p>
      )}
    </div>
  );
};