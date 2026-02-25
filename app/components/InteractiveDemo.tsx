/**
 * Interactive Demo Component
 * Provides an interactive simulation of the chat interface
 * Addresses design recommendation: "Introduce interactive demos"
 */

import React, { useState } from 'react';
import { ChevronRight, MessageCircle } from 'lucide-react';

interface DemoMessage {
  role: 'user' | 'atlas';
  content: string;
}

const DEMO_CONVERSATION: DemoMessage[] = [
  {
    role: 'user',
    content: "I'm feeling overwhelmed with money. I make about $4,500 a month but I'm not sure where it all goes.",
  },
  {
    role: 'atlas',
    content:
      "That feeling is completely normal—and honestly, the fact that you're asking about it is a really good sign. Let's break this down together.\n\nFirst, I want to understand what's essential: what are your non-negotiable monthly expenses? Things like rent, utilities, groceries, insurance—the stuff that has to get paid.",
  },
  {
    role: 'user',
    content: 'Rent is $1,400, utilities maybe $150, groceries around $400. I have a car payment of $250 and insurance is $120.',
  },
  {
    role: 'atlas',
    content:
      "Okay, so that's about $2,320 in essentials. That leaves roughly $2,180 for everything else—which is actually a solid position to be in.\n\nHere's what I'm noticing: you have real breathing room. The question is where that $2,180 is going. Is it going to things you value, or is it leaking away?\n\nWhat does a typical week of spending look like for you? Dining out, subscriptions, shopping—just give me a rough sense.",
  },
  {
    role: 'user',
    content: 'Probably $200-300 a week on random stuff. Coffee, eating out, apps I forgot I had...',
  },
  {
    role: 'atlas',
    content:
      "That's $800-1,200 a month on discretionary spending. Combined with your essentials, you're at roughly $3,100-3,500. That means you could have $1,000-1,400 left over each month.\n\n**Here's what I'd suggest as your first move:** Before we talk about investing or big plans, let's build a small emergency buffer—$1,000-2,000 in a savings account. This takes the panic out of unexpected expenses.\n\nOnce that's done, we can look at what to do with that $1,000/month surplus. Sound reasonable?",
  },
];

export function InteractiveDemo() {
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  const handleNext = () => {
    if (currentStep < DEMO_CONVERSATION.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleReset = () => {
    setCurrentStep(0);
    setIsPlaying(false);
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 max-w-2xl mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-bold flex items-center gap-2 mb-2">
          <MessageCircle className="w-6 h-6 text-blue-600" />
          See How Atlas Works
        </h2>
        <p className="text-slate-600">
          Watch a real conversation between a user and Atlas. This shows how Atlas listens, understands context, and
          provides personalized guidance.
        </p>
      </div>

      {/* Chat Display */}
      <div className="bg-slate-50 rounded-lg p-4 mb-6 h-96 overflow-y-auto border border-slate-200">
        <div className="space-y-4">
          {DEMO_CONVERSATION.slice(0, currentStep + 1).map((msg, idx) => (
            <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-xs px-4 py-3 rounded-lg ${
                  msg.role === 'user'
                    ? 'bg-blue-600 text-white rounded-br-none'
                    : 'bg-white border border-slate-200 text-slate-900 rounded-bl-none'
                }`}
              >
                <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Controls */}
      <div className="flex gap-3 justify-between items-center">
        <div className="flex gap-2">
          <button
            onClick={handlePrev}
            disabled={currentStep === 0}
            className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            Previous
          </button>
          <button
            onClick={handleNext}
            disabled={currentStep === DEMO_CONVERSATION.length - 1}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            Next <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <button
          onClick={handleReset}
          className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200"
        >
          Reset
        </button>

        <div className="text-sm text-slate-600">
          Step {currentStep + 1} of {DEMO_CONVERSATION.length}
        </div>
      </div>

      {/* Key Takeaways */}
      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-semibold text-blue-900 mb-2">What You're Seeing:</h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>✓ Atlas listens to what you say, not a fixed script</li>
          <li>✓ Asks clarifying questions to understand your situation</li>
          <li>✓ Explains concepts (like emergency funds) in plain language</li>
          <li>✓ Suggests one high-impact action at a time</li>
          <li>✓ Warm, conversational tone—like a friend with expertise</li>
        </ul>
      </div>
    </div>
  );
}
