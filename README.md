# AI-Powered Root Cause Analysis (RCA) & CAPA

## Project Overview

An AI-powered investigation application designed to support pharmaceutical API manufacturing deviation investigations. It analyzes incident reports, suggests potential root causes, identifies missing evidence, and recommends Corrective and Preventive Actions (CAPA).

AI-generated findings are suggestions and require review and approval by a qualified investigator.

## Key Features

- Upload incident reports in PDF, TXT, and EML formats.
- Paste incident descriptions directly into the application.
- Perform Root Cause Analysis using 5 Whys or Fishbone methods.
- Identify potential root causes and contributing factors.
- Highlight missing evidence and evidence limitations.
- Generate corrective and preventive action recommendations with justifications.
- Review and edit AI-generated findings before saving.
- Save investigations and CAPA records in MySQL.
- View saved investigations and download review results as JSON.

## Technology Stack

**Frontend:** React, Redux Toolkit, Vite

**Backend:** Python, FastAPI

**AI:** LangGraph, LangChain-Groq, Groq API

**Database:** MySQL, SQLAlchemy, PyMySQL

**Document Processing:** pypdf, python-multipart

## Project Structure

    AIVOA-RCA/
    ├── backend/
    │   ├── main.py
    │   ├── requirements.txt
    │   ├── schemas/
    │   ├── services/
    │   └── .env.example
    ├── frontend/
    │   ├── src/
    │   ├── package.json
    │   └── vite.config.js
    ├── .gitignore
    └── README.md

## Prerequisites

- Python
- Node.js and npm
- MySQL
- A Groq API key

## Backend Setup

Open a terminal in the backend directory:

    cd backend

Create and activate a virtual environment:

    python -m venv .venv

On Windows:

    .venv\Scripts\activate

Install dependencies:

    pip install -r requirements.txt

Configure the environment variables in `backend/.env` using the provided `.env.example` as a guide. Set the required Groq API key and MySQL connection settings.

Start the backend:

    uvicorn main:app --reload

Backend API documentation:

    http://127.0.0.1:8000/docs

## Frontend Setup

Open a second terminal:

    cd frontend

Install dependencies:

    npm install

Start the development server:

    npm run dev

Open the local URL printed by Vite in your terminal.

## Investigation Workflow

1. Upload an incident document or paste incident information.
2. Select 5 Whys or Fishbone analysis.
3. Review the generated problem statement, facts, potential root causes, contributing factors, and evidence gaps.
4. Edit the findings and CAPA recommendations as necessary.
5. Save the reviewed investigation.
6. View saved investigation records or download the review as JSON.

## Safety and Review

AI-generated root causes and CAPA recommendations are not confirmed findings. Investigators must verify supporting evidence and approve appropriate actions before implementation.

## Security

- Keep API keys and database credentials in environment variables.
- Never commit `.env` files or real credentials.
- Use `.env.example` only for placeholder configuration values.
- Do not include virtual environments or `node_modules` in the source submission.