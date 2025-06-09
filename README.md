# Forest of Emotions – Backend Setup

## About the Project

Backend API for Forest of Emotions that analyzes email sentiments and serves data for the frontend visualization. It connects to a PostgreSQL database on Supabase, uses Hugging Face for emotion analysis, and Postmark for email handling.

## Features

- REST API with Express.js
- Connects to Supabase PostgreSQL with connection pooling
- Emotion analysis using Hugging Face API
- Email sending and receiving via Postmark API
- Robust error handling and logging

## Prerequisites

- Node.js (v16+)
- Access to Supabase PostgreSQL database
- Hugging Face API token
- Postmark API token

## Setup Steps

### 1. Clone repo and navigate

```bash
git clone https://github.com/NitinPSingh/forest-of-emotions-be.git
cd forest-of-emotions-be
```

### 2. Install dependencies

```bash
npm install
```

### 3. Create .env file in the root with the following variables:

```env
# Connect to Supabase via connection pooling
DATABASE_URL="postgresql://postgres.[YOUR_PROJECT_REF]:[YOUR_PASSWORD]@aws-0-ap-south-1.pooler.supabase.com:6543/postgres?pgbouncer=true"

# Direct DB connection for migrations
DIRECT_URL="postgresql://postgres.[YOUR_PROJECT_REF]:[YOUR_PASSWORD]@aws-0-ap-south-1.pooler.supabase.com:5432/postgres"

# Hugging Face API token for emotion analysis
HUGGINGFACE_API_TOKEN="your_huggingface_token_here"

# Postmark API token for email sending and receiving
POSTMARK_API_TOKEN="your_postmark_token_here"

# Server port (optional, defaults to 3001)
PORT=3001
```

### 4. Run Prisma migrations

```bash
npx prisma migrate deploy
```

### 5. Start the backend server

```bash
npm run dev
```

### 6. The API will be available at

```bash
http://localhost:3001/api
```

## Notes

- Use the connection pooling DATABASE_URL for your app runtime
- Use DIRECT_URL for Prisma migrations only
- Ensure your Supabase database is accessible and credentials are correct
- Hugging Face token is used to call the HF API for emotion detection
- Postmark token allows sending and receiving emails programmatically

## Tech Stack

- Node.js, Express.js
- Prisma ORM with PostgreSQL (Supabase)
- Hugging Face API
- Postmark API
- dotenv for config
