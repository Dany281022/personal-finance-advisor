# Personal Finance Advisor

An AI-powered SaaS application that delivers personalized financial reports to young adults and self-employed workers who cannot afford a professional advisor.

## Screenshot

![Personal Finance Advisor](public/screenshot.png)

## Live Demo

https://d3e3859j3271he.cloudfront.net

## Technology Stack

- **Frontend:** Next.js 16, TypeScript, Tailwind CSS, React Markdown
- **Backend:** FastAPI, Python 3.12, Pydantic
- **AI Model:** OpenAI GPT-4o-mini (Vercel), AWS Bedrock Nova 2 Lite (AWS)
- **Authentication:** Clerk (JWT verification, subscription gating)
- **Infrastructure:** AWS Lambda, API Gateway, S3, CloudFront, DynamoDB, Secrets Manager
- **IaC:** Terraform
- **CI/CD:** GitHub Actions with OIDC authentication
- **Hosting:** Vercel (Part 1), AWS CloudFront (Parts 2-4)

## Architecture Overview

User Browser (HTTPS) → Clerk (Auth) → Next.js Frontend (Vercel / S3 + CloudFront) → API Gateway → AWS Lambda (FastAPI via Mangum) → AWS Bedrock (Nova 2 Lite) / DynamoDB / Secrets Manager

Terraform manages all AWS resources. GitHub Actions triggers on push to master — packages Lambda, runs terraform apply, builds frontend, syncs to S3, and invalidates CloudFront.

## Local Development Setup

git clone https://github.com/Dany281022/personal-finance-advisor.git
cd personal-finance-advisor
npm install
pip install -r requirements.txt

Create .env.local with:
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
CLERK_JWKS_URL=https://YOUR-APP.clerk.accounts.dev/.well-known/jwks.json
OPENAI_API_KEY=sk-...

Run locally: vercel dev
## Deployment

**Terraform:** From the infra/ directory, run terraform init, terraform workspace select dev, then terraform apply. This provisions Lambda, API Gateway, S3, CloudFront, DynamoDB, and Secrets Manager in one command.

**GitHub Actions:** Push to master triggers the full pipeline automatically — Lambda packaging with Linux x86_64 binaries, Terraform apply, Next.js build, S3 sync, and CloudFront invalidation. Authentication uses OIDC so no long-lived AWS keys are stored.

## API Endpoints

GET /health — Returns {"status": "healthy", "version": "1.0"}

POST /api — Generates a personalized financial report. Requires a valid Clerk JWT and an active premium_subscription plan.

Request body: monthly_income (float), monthly_expenses (float), total_debt (float), savings_goal (float), savings_deadline (string YYYY-MM-DD), situation_description (string 20-1000 chars)

Response (Vercel): Server-Sent Events stream with __NL__ encoded newlines.
Response (AWS): {"response": "...", "session_id": "user_id"}

## Known Limitations

1. **No real-time streaming on AWS:** The Lambda deployment uses the non-streaming converse() call, so the full response loads at once. This would be resolved by implementing converse_stream() with a StreamingResponse.

2. **Single-turn analysis only:** Each form submission is an independent request. DynamoDB stores session history but the frontend does not yet send a session_id to resume previous conversations.

## Future Improvements

1. **Real-time Bedrock streaming** — Replace converse() with converse_stream() to stream tokens progressively to the browser, eliminating the wait time on the AWS deployment.

2. **Monthly progress tracking** — Add a dashboard showing all past financial reports per user, allowing them to compare their budget surplus, debt, and savings progress month over month.
