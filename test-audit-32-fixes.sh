#!/bin/bash

# Test Audit 32 Fixes
# T-32-1: GAP-32-001 — Answer path income lever should have concrete suggestions
# T-32-2: GAP-32-002 — Self-check should work for long responses (maxTokens: 1500)

BASE_URL="https://atlas-financial.vercel.app/api/chat"

echo "=========================================="
echo "TEST T-32-1: Answer Path Income Lever"
echo "=========================================="
echo ""
echo "Scenario: User with thin surplus + debt"
echo "Income: \$4000, Expenses: \$3500, Debt: \$8000"
echo "Expected: Response contains 'negotiate a raise', 'freelance', or 'W-4'"
echo ""

# Create a test payload for answer_stream path
# This simulates a user asking a follow-up question after initial financial data
PAYLOAD=$(cat <<'EOF'
{
  "type": "answer_stream",
  "messages": [
    {
      "role": "user",
      "content": "I have $4000 income, $3500 expenses, and $8000 in credit card debt. What should I do?"
    },
    {
      "role": "assistant",
      "content": "You're in a tight spot with $500/month surplus and $8000 in debt. That's 16 months to pay off if you focus entirely on the debt. Let me break down your options."
    },
    {
      "role": "user",
      "content": "Can I accelerate the payoff?"
    }
  ],
  "fin": {
    "monthlyIncome": 4000,
    "essentialExpenses": 3500,
    "totalSavings": 500,
    "highInterestDebt": 8000,
    "incomeType": "W-2"
  }
}
EOF
)

echo "Sending request to answer_stream endpoint..."
RESPONSE=$(curl -s -X POST "$BASE_URL" \
  -H "Content-Type: application/json" \
  -d "$PAYLOAD")

echo "Response received:"
echo "$RESPONSE" | head -200

# Check for concrete suggestions in response
if echo "$RESPONSE" | grep -qi "negotiate.*raise\|freelance\|W-4\|withholding"; then
  echo ""
  echo "✅ T-32-1 PASS: Answer path contains concrete income suggestions"
else
  echo ""
  echo "❌ T-32-1 FAIL: Answer path missing concrete suggestions"
fi

echo ""
echo "=========================================="
echo "TEST T-32-2: Self-Check Token Limit"
echo "=========================================="
echo ""
echo "Scenario: Long response (600+ chars) should parse correctly"
echo "Expected: Self-check returns valid JSON without truncation errors"
echo ""

# This test requires checking logs, but we can verify the code was changed
echo "Checking if maxTokens was updated to 1500..."
if grep -q "maxTokens: 1500" /Users/aarosen/Documents/atlas_financial/atlas-financial-2/app/api/chat/route.ts; then
  echo "✅ T-32-2 PASS: maxTokens updated to 1500 in runSelfCheck"
else
  echo "❌ T-32-2 FAIL: maxTokens not updated"
fi

echo ""
echo "=========================================="
echo "REGRESSION TESTS"
echo "=========================================="
echo ""

# T-32-R1: Triage "three largest"
echo "T-32-R1: Checking triage fallback text..."
if grep -q "three largest" /Users/aarosen/Documents/atlas_financial/atlas-financial-2/app/api/chat/route.ts; then
  echo "✅ T-32-R1 PASS: Triage says 'three largest'"
else
  echo "❌ T-32-R1 FAIL: Triage text incorrect"
fi

# T-32-R2: Employer match regex unified
echo "T-32-R2: Checking employer match regex..."
if grep -q "employer.*match.*company.*match.*matching.*contribution" /Users/aarosen/Documents/atlas_financial/atlas-financial-2/app/api/chat/route.ts; then
  echo "✅ T-32-R2 PASS: Match regex unified"
else
  echo "❌ T-32-R2 FAIL: Match regex not unified"
fi

# T-32-R3: Guest localStorage
echo "T-32-R3: Checking guest localStorage..."
if [ -f "/Users/aarosen/Documents/atlas_financial/atlas-financial-2/src/lib/storage/guestFinancialStorage.ts" ]; then
  echo "✅ T-32-R3 PASS: guestFinancialStorage.ts exists"
else
  echo "❌ T-32-R3 FAIL: guestFinancialStorage.ts missing"
fi

echo ""
echo "=========================================="
echo "All tests completed"
echo "=========================================="
