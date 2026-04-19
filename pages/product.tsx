"use client"
import { useState, FormEvent, useEffect } from 'react';
import { useAuth } from '@clerk/nextjs';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import { fetchEventSource } from '@microsoft/fetch-event-source';
import { Protect, PricingTable, UserButton } from '@clerk/nextjs';

const API_URL = process.env.NEXT_PUBLIC_API_URL || '/api';

function FinanceAdvisorForm() {
  const { getToken } = useAuth();

  const [monthlyIncome, setMonthlyIncome] = useState('');
  const [monthlyExpenses, setMonthlyExpenses] = useState('');
  const [totalDebt, setTotalDebt] = useState('');
  const [savingsGoal, setSavingsGoal] = useState('');
  const [savingsDeadline, setSavingsDeadline] = useState('');
  const [situationDescription, setSituationDescription] = useState('');
  const [sessionId, setSessionId] = useState<string | null>(null);

  const [output, setOutput] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem('finance_session_id');
    if (stored) setSessionId(stored);
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setOutput('');
    setLoading(true);

    const jwt = await getToken();
    if (!jwt) {
      setOutput('Authentication required');
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    let buffer = '';

    await fetchEventSource(`${API_URL}`, {
      signal: controller.signal,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${jwt}`,
      },
      body: JSON.stringify({
        monthly_income: parseFloat(monthlyIncome),
        monthly_expenses: parseFloat(monthlyExpenses),
        total_debt: parseFloat(totalDebt),
        savings_goal: parseFloat(savingsGoal),
        savings_deadline: savingsDeadline,
        situation_description: situationDescription,
      }),
      openWhenHidden: true,
      onmessage(ev) {
        if (ev.data === '[DONE]') {
          controller.abort();
          setLoading(false);
          if (sessionId) {
            localStorage.setItem('finance_session_id', sessionId);
          }
          return;
        }
        const decoded = ev.data.replace(/__NL__/g, '\n');
        buffer += decoded;
        setOutput(buffer);
      },
      onclose() {
        setLoading(false);
      },
      onerror(err) {
        console.error('SSE error:', err);
        controller.abort();
        setLoading(false);
        throw err;
      },
    });
  }

  return (
    <div className="container mx-auto px-4 py-12 max-w-3xl">
      <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100 mb-2">
        Personal Finance Advisor
      </h1>
      <p className="text-gray-500 dark:text-gray-400 mb-8">
        Enter your financial details to receive a personalized AI analysis.
      </p>

      <form onSubmit={handleSubmit} className="space-y-6 bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8">

        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Monthly Net Income ($)
          </label>
          <input
            type="number" min="0.01" step="0.01" required
            value={monthlyIncome}
            onChange={(e) => setMonthlyIncome(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            placeholder="e.g. 4500.00"
          />
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Total Monthly Expenses ($)
          </label>
          <input
            type="number" min="0" step="0.01" required
            value={monthlyExpenses}
            onChange={(e) => setMonthlyExpenses(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            placeholder="e.g. 3200.00"
          />
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Total Current Debt ($)
          </label>
          <input
            type="number" min="0" step="0.01" required
            value={totalDebt}
            onChange={(e) => setTotalDebt(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            placeholder="e.g. 15000.00"
          />
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Savings Goal ($)
          </label>
          <input
            type="number" min="0.01" step="0.01" required
            value={savingsGoal}
            onChange={(e) => setSavingsGoal(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            placeholder="e.g. 10000.00"
          />
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Savings Deadline
          </label>
          <input
            type="date" required
            value={savingsDeadline}
            onChange={(e) => setSavingsDeadline(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
          />
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Describe Your Financial Situation
          </label>
          <textarea
            required minLength={20} maxLength={1000} rows={5}
            value={situationDescription}
            onChange={(e) => setSituationDescription(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            placeholder="e.g. I am a freelance developer with variable income. I have a car loan and two credit cards. My goal is to build a 3-month emergency fund by December 2026."
          />
          <p className="text-xs text-gray-400">{situationDescription.length}/1000 characters (minimum 20)</p>
        </div>

        <button
          type="submit" disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200"
        >
          {loading ? 'Analyzing your finances...' : 'Get My Financial Analysis'}
        </button>
      </form>

      {output && (
        <section className="mt-8 bg-gray-50 dark:bg-gray-800 rounded-xl shadow-lg p-8">
          <div className="markdown-content prose prose-blue dark:prose-invert max-w-none">
            <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]}>
              {output}
            </ReactMarkdown>
          </div>
        </section>
      )}
    </div>
  );
}

export default function Product() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 dark:from-gray-900 dark:to-gray-800">
      <div className="absolute top-4 right-4">
        <UserButton showName={true} />
      </div>
      <Protect
        plan="premium_subscription"
        fallback={
          <div className="container mx-auto px-4 py-12">
            <header className="text-center mb-12">
              <h1 className="text-5xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent mb-4">
                Finance Advisor Pro
              </h1>
              <p className="text-gray-600 dark:text-gray-400 text-lg mb-8">
                Subscribe to access your personalized AI financial advisor
              </p>
            </header>
            <div className="max-w-4xl mx-auto">
              <PricingTable />
            </div>
          </div>
        }
      >
        <FinanceAdvisorForm />
      </Protect>
    </main>
  );
}
