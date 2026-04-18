variable "aws_region" {
  description = "AWS region for all resources"
  type        = string
  default     = "us-east-2"
}

variable "project_name" {
  description = "Short name used as a prefix for all resource names"
  type        = string
  default     = "personal-finance-advisor"
}

variable "environment" {
  description = "Environment label used in resource tags"
  type        = string
  default     = "dev"
}

variable "bedrock_model_id" {
  description = "Bedrock model ID"
  type        = string
  default     = "amazon.nova-lite-v1:0"
}

variable "lambda_timeout" {
  description = "Lambda function timeout in seconds"
  type        = number
  default     = 30
}

variable "clerk_jwks_url" {
  description = "Clerk JWKS URL for JWT verification"
  type        = string
  default     = ""
}
