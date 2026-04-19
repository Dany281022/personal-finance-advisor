import os
import boto3
from fastapi import FastAPI, Depends
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Optional
from fastapi_clerk_auth import ClerkConfig, ClerkHTTPBearer, HTTPAuthorizationCredentials
from mangum import Mangum
from dynamo_memory import load_conversation, save_conversation

app = FastAPI()

USE_DYNAMODB = os.getenv("USE_DYNAMODB", "false").lower() == "true"

cors_origins = os.getenv("CORS_ORIGINS", "http://localhost:3000").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)

clerk_config = ClerkConfig(jwks_url=os.getenv("CLERK_JWKS_URL"))
clerk_guard = ClerkHTTPBearer(clerk_config)


class InputRecord(BaseModel):
    monthly_income: float = Field(gt=0)
    monthly_expenses: float = Field(ge=0)
    total_debt: float = Field(ge=0)
    savings_goal: float = Field(gt=0)
    savings_deadline: str
    situation_description: str = Field(min_length=20, max_length=1000)


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


@app.get("/conversation/{session_id}")
def get_conversation(
    session_id: str,
    creds: HTTPAuthorizationCredentials = Depends(clerk_guard),
):
    # Only the authenticated user can access their own conversation history.
    user_id = creds.decoded["sub"]
    if USE_DYNAMODB:
        messages = load_conversation(session_id)
    else:
        messages = []
    return {"session_id": session_id, "messages": messages, "count": len(messages)}


@app.post("/api")
def process(
    record: InputRecord,
    creds: HTTPAuthorizationCredentials = Depends(clerk_guard),
):
    user_id = creds.decoded["sub"]
    session_id = user_id

    bedrock = boto3.client(
        service_name="bedrock-runtime",
        region_name=os.getenv("BEDROCK_REGION", "us-east-1")
    )

    response = bedrock.converse_stream(
        modelId=os.getenv("BEDROCK_MODEL_ID", "global.amazon.nova-2-lite-v1:0"),
        system=[{"text": system_prompt}],
        messages=[
            {
                "role": "user",
                "content": [{"text": user_prompt_for(record)}]
            }
        ]
    )

    full_response = []

    def event_stream():
        try:
            stream = response.get("stream")
            if stream:
                for event in stream:
                    if "contentBlockDelta" in event:
                        delta = event["contentBlockDelta"].get("delta", {})
                        text = delta.get("text", "")
                        if text:
                            full_response.append(text)
                            encoded = text.replace("\r\n", "\n").replace("\r", "\n")
                            encoded = encoded.replace("\n", "__NL__")
                            yield f"data: {encoded}\n\n"

            if USE_DYNAMODB:
                assistant_response = "".join(full_response)
                conversation = load_conversation(session_id)
                conversation.append({"role": "user", "content": user_prompt_for(record)})
                conversation.append({"role": "assistant", "content": assistant_response})
                save_conversation(session_id, conversation)

            yield "data: [DONE]\n\n"
        except Exception as e:
            yield f"data: Error during streaming: {str(e)}\n\n"

    return StreamingResponse(event_stream(), media_type="text/event-stream")


handler = Mangum(app)
