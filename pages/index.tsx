"use client"
import Link from 'next/link';
import { SignInButton, SignedIn, SignedOut, UserButton } from '@clerk/nextjs';

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-12">

        <nav className="flex justify-between items-center mb-12">
          <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-200">
            FinanceAdvisor AI
          </h1>
          <div>
            <SignedOut>
              <SignInButton mode="modal">
                <button className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-6 rounded-lg transition-colors">
                  Sign In
                </button>
              </SignInButton>
            </SignedOut>
            <SignedIn>
              <div className="flex items-center gap-4">
                <Link href="/product" className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-6 rounded-lg transition-colors">
                  Go to App
                </Link>
                <UserButton showName={true} />
              </div>
            </SignedIn>
          </div>
        </nav>

        <div className="text-center py-20">
          <h2 className="text-6xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent mb-6">
            Take Control of
            <br />
            Your Financial Future
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-400 mb-12 max-w-2xl mx-auto">
            Get a personalized budget analysis, a step-by-step savings plan, and a clear risk report — in seconds, based on your actual numbers.
          </p>

          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto mb-12">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
              <div className="text-3xl mb-4">📊</div>
              <h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-gray-100">Budget Analysis</h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                See your exact monthly surplus or deficit calculated from your real income and expenses.
              </p>
            </div>
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
              <div className="text-3xl mb-4">🎯</div>
              <h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-gray-100">Savings Plan</h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                A concrete month-by-month plan with specific dollar milestones to reach your savings goal.
              </p>
            </div>
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
              <div className="text-3xl mb-4">⚠️</div>
              <h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-gray-100">Risk Awareness</h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                Spot the two or three financial risks in your current situation before they become problems.
              </p>
            </div>
          </div>

          <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg rounded-xl p-6 max-w-sm mx-auto mb-8">
            <h3 className="text-2xl font-bold mb-2">Premium Plan</h3>
            <p className="text-4xl font-bold text-blue-600 mb-2">$10<span className="text-lg text-gray-600">/month</span></p>
            <ul className="text-left text-gray-600 dark:text-gray-400 mb-6 space-y-2">
              <li>✓ Unlimited financial analyses</li>
              <li>✓ Personalized savings milestones</li>
              <li>✓ Risk detection on every report</li>
            </ul>
          </div>

          <SignedOut>
            <SignInButton mode="modal">
              <button className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold py-4 px-12 rounded-xl text-lg transition-all">
                Start Free — No Credit Card Needed
              </button>
            </SignInButton>
          </SignedOut>
          <SignedIn>
            <Link href="/product">
              <button className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold py-4 px-12 rounded-xl text-lg transition-all">
                Open My Advisor
              </button>
            </Link>
          </SignedIn>
        </div>

      </div>
    </main>
  );
}
