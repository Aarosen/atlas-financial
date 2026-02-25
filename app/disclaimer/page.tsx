'use client';

export const metadata = {
  title: 'Disclaimer — Atlas',
  description: 'Important disclaimer about Atlas financial education platform.',
};

export default function DisclaimerPage() {
  return (
    <div className="container py-12">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-4xl font-bold mb-6">Disclaimer</h1>

        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-6 mb-8">
          <p className="text-amber-900 dark:text-amber-100 font-semibold">
            Atlas provides financial education and general information only. This is not personalized financial, investment, tax, or legal advice.
          </p>
        </div>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Important Disclosures</h2>

          <div className="space-y-6">
            <div>
              <h3 className="font-semibold text-lg mb-2">Not Professional Advice</h3>
              <p className="text-slate-700 dark:text-slate-300">
                Atlas is an AI-powered educational tool. Nothing provided by Atlas constitutes professional financial, investment, tax, or legal advice. We do not know your complete financial situation, goals, or constraints.
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-lg mb-2">No Fiduciary Relationship</h3>
              <p className="text-slate-700 dark:text-slate-300">
                Atlas does not act as your financial advisor, investment advisor, or fiduciary. We have no obligation to act in your best interest or to provide advice tailored to your specific circumstances.
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-lg mb-2">Past Performance</h3>
              <p className="text-slate-700 dark:text-slate-300">
                Historical financial performance does not guarantee future results. Investment returns and principal value will fluctuate, so that an investor's shares, when redeemed, may be worth more or less than their original cost.
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-lg mb-2">Market Risk</h3>
              <p className="text-slate-700 dark:text-slate-300">
                All investments carry risk, including potential loss of principal. Different types of investments involve varying degrees of risk, and there is no assurance that any specific investment or strategy will be suitable or profitable for a client.
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-lg mb-2">Tax Considerations</h3>
              <p className="text-slate-700 dark:text-slate-300">
                Atlas does not provide tax advice. Tax laws are complex and subject to change. Consult with a qualified tax professional regarding your specific tax situation before making any financial decisions.
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-lg mb-2">Accuracy of Information</h3>
              <p className="text-slate-700 dark:text-slate-300">
                While we strive to provide accurate information, Atlas may contain errors, omissions, or outdated information. We do not warrant the accuracy, completeness, or timeliness of any information provided.
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-lg mb-2">No Guarantees</h3>
              <p className="text-slate-700 dark:text-slate-300">
                Atlas makes no guarantees about financial outcomes, investment returns, or the effectiveness of any strategy discussed. Your actual results may differ materially from any projections or estimates.
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-lg mb-2">Consult Professionals</h3>
              <p className="text-slate-700 dark:text-slate-300">
                Before making any significant financial decisions, please consult with qualified professionals including a financial advisor, tax professional, or attorney as appropriate for your situation.
              </p>
            </div>
          </div>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Limitation of Liability</h2>
          <p className="text-slate-700 dark:text-slate-300 mb-4">
            In no event shall Atlas, its creators, or its contributors be liable for any damages (including, without limitation, lost profits, lost data, or business interruption) arising out of the use or inability to use the materials on Atlas, even if Atlas or an authorized representative has been notified of the possibility of such damages.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">Acknowledgment</h2>
          <p className="text-slate-700 dark:text-slate-300">
            By using Atlas, you acknowledge that you have read this disclaimer, understand its terms, and agree to be bound by them. If you do not agree with any part of this disclaimer, please do not use Atlas.
          </p>
        </section>
      </div>
    </div>
  );
}
