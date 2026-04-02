import Anthropic from '@anthropic-ai/sdk';

export type PrimaryGoal = 'emergency_fund' | 'debt_payoff' | 'budget' | 'savings_goal' | 'income_gap' | 'major_purchase' | 'retirement' | 'general';
export type EmotionalState = 'anxious' | 'ashamed' | 'motivated' | 'confused' | 'urgent' | 'neutral';
export type LifeEvent = 'job_loss' | 'raise' | 'divorce' | 'baby' | 'college' | 'home_purchase' | 'medical' | 'none';
export type EntryPoint = 'crisis' | 'vague_stress' | 'specific_goal' | 'question' | 'shame' | 'milestone';
export type Urgency = 'immediate' | 'near_term' | 'long_term';

export interface UserIntent {
  primary_goal: PrimaryGoal;
  emotional_state: EmotionalState;
  life_event: LifeEvent;
  entry_point: EntryPoint;
  urgency: Urgency;
  confidence: number;
}

function getIntentClassificationPrompt(userMessage: string): string {
  return `You are classifying a user's financial situation for Atlas, a financial companion AI.
Given their message, return ONLY valid JSON (no markdown, no explanation):

{
  "primary_goal": "emergency_fund|debt_payoff|budget|savings_goal|income_gap|major_purchase|retirement|general",
  "emotional_state": "anxious|ashamed|motivated|confused|urgent|neutral",
  "life_event": "job_loss|raise|divorce|baby|college|home_purchase|medical|none",
  "entry_point": "crisis|vague_stress|specific_goal|question|shame|milestone",
  "urgency": "immediate|near_term|long_term",
  "confidence": 0.0-1.0
}

CLASSIFICATION RULES:

primary_goal:
- emergency_fund: mentions savings, emergency, unexpected expense, "don't have", "can't afford"
- debt_payoff: mentions debt, credit cards, loans, "owe", "paying off"
- budget: mentions spending, expenses, "where does it go", "can't save", "living paycheck"
- savings_goal: mentions specific future goal (house, car, college, vacation)
- income_gap: mentions not enough income, underpaid, wants to earn more
- major_purchase: mentions buying something specific (house, car, etc)
- retirement: mentions retirement, future, long-term planning
- general: unclear or foundational financial literacy

emotional_state:
- anxious: stressed, worried, overwhelmed, scared, panic
- ashamed: embarrassed, guilty, failure, "should know this", "at my age"
- motivated: excited, ready, determined, "finally", "opportunity"
- confused: "don't know", "no idea", "don't understand", lost
- urgent: immediate crisis, emergency, "need to", "right now"
- neutral: factual, informational, matter-of-fact

life_event:
- job_loss: laid off, fired, quit, lost job, unemployed
- raise: promotion, raise, bonus, new job with higher pay
- divorce: separation, divorce, breakup, relationship change
- baby: pregnant, new baby, kids, family growing
- college: kid starting college, education costs
- home_purchase: buying house, mortgage, moving
- medical: health issue, medical bills, disability
- none: no major life event mentioned

entry_point:
- crisis: immediate financial emergency, "drowning", "can't pay", "urgent"
- vague_stress: knows something is wrong but can't name it, "something's off"
- specific_goal: clear goal or question, "I want to", "How do I"
- question: asking for advice or information
- shame: embarrassment, guilt, feeling bad about financial situation
- milestone: good news, opportunity, positive change

urgency:
- immediate: needs help now, crisis, emergency
- near_term: within weeks/months, upcoming deadline
- long_term: years away, foundational, no rush

confidence: 0.0-1.0 based on clarity of the message (1.0 = very clear, 0.5 = ambiguous)

EXAMPLES:
"I'm drowning in debt" → 
{
  "primary_goal": "debt_payoff",
  "emotional_state": "anxious",
  "life_event": "none",
  "entry_point": "crisis",
  "urgency": "immediate",
  "confidence": 0.95
}

"I make good money but never have anything saved" →
{
  "primary_goal": "budget",
  "emotional_state": "confused",
  "life_event": "none",
  "entry_point": "vague_stress",
  "urgency": "near_term",
  "confidence": 0.85
}

"Just got a $20k raise, what should I do with it?" →
{
  "primary_goal": "savings_goal",
  "emotional_state": "motivated",
  "life_event": "raise",
  "entry_point": "milestone",
  "urgency": "near_term",
  "confidence": 0.9
}

"I just got promoted and want to make smarter money decisions" →
{
  "primary_goal": "budget",
  "emotional_state": "motivated",
  "life_event": "raise",
  "entry_point": "milestone",
  "urgency": "near_term",
  "confidence": 0.85
}

"Finally got my first job, how do I manage my money?" →
{
  "primary_goal": "budget",
  "emotional_state": "motivated",
  "life_event": "none",
  "entry_point": "milestone",
  "urgency": "near_term",
  "confidence": 0.8
}

"My kid starts college in 2 years" →
{
  "primary_goal": "savings_goal",
  "emotional_state": "neutral",
  "life_event": "college",
  "entry_point": "specific_goal",
  "urgency": "near_term",
  "confidence": 0.9
}

"I'm embarrassed I don't have more saved at my age" →
{
  "primary_goal": "savings_goal",
  "emotional_state": "ashamed",
  "life_event": "none",
  "entry_point": "shame",
  "urgency": "long_term",
  "confidence": 0.85
}

"My parents never talked about money and I feel lost" →
{
  "primary_goal": "budget",
  "emotional_state": "ashamed",
  "life_event": "none",
  "entry_point": "shame",
  "urgency": "long_term",
  "confidence": 0.8
}

"I'm 35 and have no idea what I'm doing with money" →
{
  "primary_goal": "budget",
  "emotional_state": "ashamed",
  "life_event": "none",
  "entry_point": "shame",
  "urgency": "near_term",
  "confidence": 0.85
}

"I feel stupid about money" →
{
  "primary_goal": "general",
  "emotional_state": "ashamed",
  "life_event": "none",
  "entry_point": "shame",
  "urgency": "long_term",
  "confidence": 0.75
}

"My car needs $3,000 in repairs and I don't have it" →
{
  "primary_goal": "emergency_fund",
  "emotional_state": "anxious",
  "life_event": "none",
  "entry_point": "crisis",
  "urgency": "immediate",
  "confidence": 0.9
}

Now classify this user message:
"${userMessage}"`;
}

let client: Anthropic | null = null;

function getClient(): Anthropic {
  if (!client) {
    client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
  }
  return client;
}

export async function classifyUserIntent(userMessage: string): Promise<UserIntent> {
  try {
    if (!process.env.ANTHROPIC_API_KEY) {
      // Fallback for offline/testing mode
      return {
        primary_goal: 'general',
        emotional_state: 'neutral',
        life_event: 'none',
        entry_point: 'question',
        urgency: 'long_term',
        confidence: 0.5,
      };
    }

    const prompt = getIntentClassificationPrompt(userMessage);
    const c = getClient();
    
    const response = await c.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 300,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '';
    const cleaned = text.replace(/```json|```/g, '').trim();
    const intent = JSON.parse(cleaned) as UserIntent;
    
    return intent;
  } catch (e) {
    console.error('Intent classification error:', e);
    // Fallback to general classification on error
    return {
      primary_goal: 'general',
      emotional_state: 'neutral',
      life_event: 'none',
      entry_point: 'question',
      urgency: 'long_term',
      confidence: 0.3,
    };
  }
}
