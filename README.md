# NEU-STAT: Salaysay Tracking And Archival Tool

## Project Overview

**Project URL**: https://neu-salaysay-tracker.lovable.app/

NEU-STAT (Salaysay Tracking And Archival Tool) is a web application developed for New Era University to streamline the submission, tracking, and archiving of "salaysay" documents. A "salaysay" is a formal excuse or explanation letter commonly used in Philippine educational institutions when students need to explain absences or other academic issues.

## Key Features

**User Authentication**
- Google Sign-In integration specifically restricted to NEU email domains (@neu.edu.ph)
- User profile management with avatar support
- Session tracking and activity logging

**Document Management**
- Upload and analysis of salaysay documents in PDF format
- Support for image uploads (JPG, PNG) with automatic conversion to PDF with OCR
- AI-powered document analysis that extracts:
  - Student ID/Number
  - Student Name
  - Submission Date
  - Nature of Excuse
  - Addressee information
- Automatic violation type categorization (Attendance Issue, Academic Misconduct, etc.)
- Support for both English and Tagalog language documents with translation capabilities

**Dashboard and Analytics**
- Comprehensive dashboard with document statistics
- Interactive charts displaying violation distribution
- Top submitters tracking
- Filtering by violation type, date range, and keywords
- Full-text search across documents

**Activity Tracking**
- Complete audit trail of user actions
- Login/logout tracking
- Document upload and viewing history

## Technical Stack

**Frontend**
- React with TypeScript
- Vite as build tool
- Tailwind CSS for styling
- shadcn/ui component library
- Framer Motion for animations
- Recharts for data visualization

**Backend**
- Supabase for database and authentication
  - PostgreSQL database
  - Row Level Security for data protection
  - Storage buckets for document management

**Document Processing**
- PDF.js for PDF text extraction
- Tesseract.js for OCR processing
- Image-to-PDF conversion
- AI-powered text analysis for metadata extraction

## Database Schema
The application utilizes three main tables:
1. profiles - Stores user profile information
2. salaysay_submissions - Records document submissions with metadata
3. activity_logs - Tracks user activity and system events

## Getting Started
**Prerequisites**
- Node.js and npm installed
- Supabase project set up with tables: profiles, salaysay_submissions, activity_logs
- Google OAuth credentials configured in Supabase

**Installation**
1. Clone the Repository:
```
git clone https://github.com/LesterNevado/neu-salaysay-tracker.git
cd neu-salaysay-tracker
```
2. Install dependencies:
```
npm install
```
3. Start the development server:
```
npm run dev
```

## Project Structure
- /src/components - React components
- /src/components/salaysay - Dashboard and file management components
- /src/components/upload - File upload components and logic
- /src/components/ui - Reusable UI components
- /src/utils/ai - AI text analysis utilities
- /src/utils/pdf - PDF processing utilities
- /src/integrations/supabase - Supabase client and configuration
- /src/pages - Main application pages

## Deployment
The project is deployed via Lovable and can be accessed at the project URL.
