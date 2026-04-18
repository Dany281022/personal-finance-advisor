import os
from fastapi import FastAPI, Depends
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from fastapi_clerk_auth import ClerkConfig, ClerkHTTPBearer, HTTPAuthorizationCredentials
from openai import OpenAI

app = FastAPI()

client = OpenAI(api_key=os.environ.get("OPENAI_API_KEY"))

clerk_config = ClerkConfig(jwks_url=os.getenv("CLERK_JWKS_URL"))
clerk_guard = ClerkHTTPBearer(clerk_config)


# Pydantic model — the contract between frontend and backend.
# FastAPI validates every incoming request against this model automatically.
# If a required field is missing or has the wrong type, FastAPI returns
# a 422 Unprocessable Entity error before the endpoint logic runs.
class InputRecord(BaseModel):
    monthly_income: float = Field(gt=0)
    monthly_expenses: float = Field(ge=0)
    total_debt: float = Field(ge=0)
    savings_goal: float = Field(gt=0)
    savings_deadline: str
    situation_description: str = Field(min_length=20, max_length=1000)


# The system prompt establishes the AI's role and required output structure.
# Putting structural instructions here is more reliable than embedding them
# in the user prompt — the model treats system messages as persistent rules
# that apply throughout the entire response.
system_prompt = """
You are a certified personal finance advisor with expertise in budgeting,
debt management, and savings strategy for young adults and self-employed workers.

When given financial data, you MUST generate a report using EXACTLY this structure, with NO deviation:

## Personal Finance Report

**Monthly Income:** $[monthly_income]
**Monthly Expenses:** $[monthly_expenses]
**Total Debt:** $[total_debt]
**Savings Goal:** $[savings_goal]
**Savings Deadline:** [savings_deadline]

**Budget Summary:**
[2-3 sentences in prose only — no bullet points. State the exact monthly surplus or deficit in dollars (income minus expenses). State the expense-to-income ratio as a percentage. Tone: direct, factual, number-driven. No emotional language.]

## Savings Plan

1. **Monthly Savings Target – High Priority**
   - Proposed monthly savings amount based on the surplus
   - Calculation: $[savings_goal] / $[proposed monthly amount] = [X] months to goal

2. **Deadline Alignment – High Priority**
   - Compare the calculated timeline to [savings_deadline]
   - Adjustment: [state whether the timeline fits or needs acceleration]

3. **Debt Reduction Strategy – Medium Priority**
   - Recommended allocation toward existing debt of $[total_debt]
   - Action: [specific monthly amount toward debt repayment]

[If the user runs a deficit, replace step 1 with two specific expense reduction strategies before any savings target]

## Risk Awareness Notice

**Risk 1 — [Risk Title]:**
[Description based directly on user data. Mitigation: one concrete action.]

**Risk 2 — [Risk Title]:**
[Description based directly on user data. Mitigation: one concrete action.]

**Risk 3 — [Risk Title]:**
[Description based directly on user data. Mitigation: one concrete action.]

This analysis is for informational purposes only and does not constitute professional financial advice.

Best regards,
Your AI Finance Advisor

IMPORTANT RULES:
- Always produce all three sections in the exact order above.
- Each section MUST be preceded by a blank line, then the ## heading.
- The header block (Monthly Income through Savings Deadline) must have NO extra blank lines between fields.
- Savings Plan steps MUST be numbered and each MUST include a priority level.
- The report MUST always end with the exact sign-off: "Best regards," on one line, then "Your AI Finance Advisor" on the next line.
- Do NOT wrap the output in a code block.
- Do NOT add any introductory sentence or commentary before the report.
- Do NOT add any closing sentence or commentary after the sign-off.
- Do NOT invent numbers not present in the input.
- Always use the currency symbol $ before dollar amounts.
"""


# The user prompt injects actual financial data at runtime.
# Every field is labelled explicitly so the model cannot confuse them.
# Without labels, the model might treat monthly_income as monthly_expenses
# when both are plain numbers with no context.
def user_prompt_for(record: InputRecord) -> str:
    return f"""
PERSONAL FINANCE REPORT REQUEST

Monthly Income: ${record.monthly_income}
Monthly Expenses: ${record.monthly_expenses}
Total Debt: ${record.total_debt}
Savings Goal: ${record.savings_goal}
Savings Deadline: {record.savings_deadline}

Financial Situation Description:
{record.situation_description}

Analyze this data and produce the structured financial report.
"""


@app.get("/health")
def health_check():
    return {"status": "healthy", "version": "1.0"}


# The Depends(clerk_guard) parameter runs the Clerk JWT verification
# before any endpoint logic executes. If the token is missing or invalid,
# the request is rejected with 401 automatically — this is the actual
# security enforcement layer, not the frontend Protect component.
@app.post("/api")
def process(
    record: InputRecord,
    creds: HTTPAuthorizationCredentials = Depends(clerk_guard),
):
    user_id = creds.decoded["sub"]

    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_prompt_for(record)},
    ]

    stream = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=messages,
        stream=True,
    )

    # Newlines are encoded as __NL__ so each SSE chunk is a single event.
    # Splitting on \n would fragment numbers like $4,200.00 or dates like
    # 2026-04-17 into multiple broken events on the frontend.
    def event_stream():
        try:
            for chunk in stream:
                text = chunk.choices[0].delta.content
                if text:
                    encoded = text.replace("\r\n", "\n").replace("\r", "\n")
                    encoded = encoded.replace("\n", "__NL__")
                    yield f"data: {encoded}\n\n"
            yield "data: [DONE]\n\n"
        except Exception as e:
            yield f"data: Error during streaming: {str(e)}\n\n"

    return StreamingResponse(event_stream(), media_type="text/event-stream")
    