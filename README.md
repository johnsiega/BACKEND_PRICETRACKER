# 🌾 PriceTrackerPH - Backend

Agricultural Price Tracking System for NCR (National Capital Region) - Department of Agriculture Daily Price Index

## 📋 Table of Contents
- [Overview](#overview)
- [Tech Stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Database Setup](#database-setup)
- [Environment Configuration](#environment-configuration)
- [Running the Server](#running-the-server)
- [API Endpoints](#api-endpoints)
- [Project Structure](#project-structure)
- [Testing](#testing)
- [Troubleshooting](#troubleshooting)

---

## 🎯 Overview

This backend system processes Department of Agriculture daily price index PDFs and stores commodity prices in a PostgreSQL database. It automatically detects price changes and generates alerts when significant price fluctuations occur.

**Key Features:**
- 📄 PDF upload and parsing
- 💾 Automatic data extraction and storage
- 📊 Price change detection (alerts for >5% changes)
- 🔍 Historical price tracking
- 📈 Category-based organization (13 categories)

---

## 🛠️ Tech Stack

- **Runtime:** Node.js (v16+ recommended)
- **Framework:** Express.js
- **Database:** PostgreSQL (v12+)
- **PDF Processing:** pdf-parse
- **File Upload:** multer
- **Environment Variables:** dotenv

---

## ✅ Prerequisites

Before you begin, make sure you have these installed:

### 1. **Node.js and npm**
- Download from [nodejs.org](https://nodejs.org/)
- Verify installation:
  ```bash
  node --version  # Should show v16.0.0 or higher
  npm --version   # Should show v8.0.0 or higher
  ```

### 2. **PostgreSQL**
- **Windows:** Download from [postgresql.org](https://www.postgresql.org/download/windows/)
- **Mac:** `brew install postgresql@15`
- **Linux:** `sudo apt install postgresql postgresql-contrib`
- Verify installation:
  ```bash
  psql --version  # Should show PostgreSQL 12 or higher
  ```

### 3. **Git** (for cloning the repository)
- Download from [git-scm.com](https://git-scm.com/)

---

## 📦 Installation

### Step 1: Clone the Repository
```bash
git clone <your-repository-url>
cd pricetrackerph
```

### Step 2: Install Dependencies
```bash
npm install
```

This will install all required packages listed in `package.json`:
- `express` - Web framework
- `pg` - PostgreSQL client
- `dotenv` - Environment variables
- `cors` - Cross-origin resource sharing
- `multer` - File upload handling
- `pdf-parse` - PDF text extraction

### Step 3: Create Required Folders
```bash
mkdir uploads
```
This folder stores temporary PDF files during processing.

---

## 🗄️ Database Setup

### Step 1: Start PostgreSQL Service

**Windows:**
- PostgreSQL should start automatically after installation
- Or use: Services → PostgreSQL → Start

**Mac:**
```bash
brew services start postgresql@15
```

**Linux:**
```bash
sudo systemctl start postgresql
```

### Step 2: Access PostgreSQL
```bash
# Windows (using SQL Shell - psql)
# Search "SQL Shell" in Start Menu

# Mac/Linux
psql postgres

# Or as postgres user
sudo -u postgres psql
```

### Step 3: Create Database
```sql
CREATE DATABASE agri_price_tracker;
\c agri_price_tracker
```

### Step 4: Create Tables

Copy and paste each SQL block:

```sql
-- 1. Categories table
CREATE TABLE categories (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  type VARCHAR(50) CHECK (type IN ('dry', 'wet')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Commodities table
CREATE TABLE commodities (
  id SERIAL PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  specification TEXT,
  category_id INTEGER REFERENCES categories(id),
  unit VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(name, specification)
);

-- 3. Price history table
CREATE TABLE price_history (
  id SERIAL PRIMARY KEY,
  commodity_id INTEGER REFERENCES commodities(id) ON DELETE CASCADE,
  price DECIMAL(10, 2) NOT NULL,
  date DATE NOT NULL,
  source VARCHAR(50) DEFAULT 'DA',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(commodity_id, date)
);

-- 4. Price changes table (for alerts/news)
CREATE TABLE price_changes (
  id SERIAL PRIMARY KEY,
  commodity_id INTEGER REFERENCES commodities(id) ON DELETE CASCADE,
  old_price DECIMAL(10, 2),
  new_price DECIMAL(10, 2),
  change_amount DECIMAL(10, 2),
  change_percentage DECIMAL(5, 2),
  change_date DATE NOT NULL,
  is_increase BOOLEAN,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. Create indexes for performance
CREATE INDEX idx_price_history_date ON price_history(date DESC);
CREATE INDEX idx_price_history_commodity ON price_history(commodity_id);
CREATE INDEX idx_price_changes_date ON price_changes(change_date DESC);
CREATE INDEX idx_commodities_category ON commodities(category_id);
```

### Step 5: Insert Initial Categories
```sql
INSERT INTO categories (name, type) VALUES
  ('Imported Commercial Rice', 'dry'),
  ('Local Commercial Rice', 'dry'),
  ('Corn Products', 'dry'),
  ('Fish Products', 'wet'),
  ('Beef Meat Products', 'wet'),
  ('Pork Meat Products', 'wet'),
  ('Other Livestock Meat Products', 'wet'),
  ('Poultry Products', 'wet'),
  ('Lowland Vegetables', 'wet'),
  ('Highland Vegetables', 'wet'),
  ('Spices', 'dry'),
  ('Fruits', 'wet'),
  ('Other Basic Commodities', 'dry');
```

### Step 6: Verify Setup
```sql
-- Check tables
\dt

-- Check categories
SELECT * FROM categories;

-- Exit
\q
```

You should see 4 tables and 13 categories.

---

## ⚙️ Environment Configuration

### Create `.env` file in project root:

```env
# Server Configuration
PORT=5000

# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=agri_price_tracker
DB_USER=postgres
DB_PASSWORD=your_postgres_password_here

# Note: Replace 'your_postgres_password_here' with your actual PostgreSQL password
# This is the password you set during PostgreSQL installation
```

**Important:** 
- Never commit `.env` to GitHub!
- Make sure `.gitignore` includes `.env`

---

## 🚀 Running the Server

### Development Mode:
```bash
node server.js
```

Or with nodemon (auto-restart on changes):
```bash
npm install -g nodemon
nodemon server.js
```

### Expected Output:
```
🚀 Server running on port 5000
✅ Connected to PostgreSQL database
```

### Test the Server:
Open browser and go to: `http://localhost:5000/api/health`

You should see:
```json
{
  "status": "OK",
  "message": "Server is running"
}
```

---

## 📡 API Endpoints

### 1. **Health Check**
```
GET /api/health
```
**Response:**
```json
{
  "status": "OK",
  "message": "Server is running"
}
```

### 2. **Upload PDF**
```
POST /api/upload
```
**Request:**
- Method: POST
- Body: form-data
- Key: `file` (type: File)
- Value: PDF file (Daily Price Index from DA)

**Response:**
```json
{
  "success": true,
  "message": "PDF processed successfully",
  "summary": {
    "date": "2025-10-07",
    "totalCommodities": 150,
    "saved": 150,
    "priceChanges": [
      {
        "name": "Tomato",
        "oldPrice": 145.5,
        "newPrice": 155.3,
        "changePercentage": 6.73,
        "isIncrease": true
      }
    ]
  }
}
```

---

## 📁 Project Structure

```
pricetrackerph/
├── config/
│   └── db.js                 # PostgreSQL connection pool
├── controllers/
│   └── uploadController.js   # Upload and processing logic
├── models/
│   └── commodityModel.js     # Database queries (CRUD operations)
├── routes/
│   └── upload.js             # Upload route definition
├── services/
│   ├── pdfParser.js          # PDF text extraction
│   └── dataProcessor.js      # Text parsing and structuring
├── uploads/                  # Temporary PDF storage (auto-cleaned)
├── .env                      # Environment variables (DO NOT COMMIT!)
├── .gitignore                # Git ignore rules
├── package.json              # Dependencies and scripts
├── server.js                 # Main entry point
└── README.md                 # This file
```

### Key Files Explained:

**`server.js`** - Main Express server, routes setup, middleware configuration

**`config/db.js`** - PostgreSQL connection pool configuration

**`services/pdfParser.js`** - Extracts raw text from PDF files using pdf-parse

**`services/dataProcessor.js`** - Parses PDF text into structured JSON:
- Extracts date
- Identifies categories
- Parses commodity names, specifications, and prices

**`models/commodityModel.js`** - Database operations:
- `getCategoryIdByName()` - Lookup category
- `findOrCreateCommodity()` - Insert/update commodity
- `insertPriceHistory()` - Save daily price
- `checkPriceChange()` - Detect and record significant changes

**`controllers/uploadController.js`** - Orchestrates the upload process:
1. Receives PDF
2. Extracts text
3. Processes data
4. Saves to database
5. Returns summary

---

## 🧪 Testing

### Test Database Connection:
```bash
node testDb.js
```
Expected: "✅ Database connection successful!"

### Test PDF Parser:
```bash
node testPdfParser.js
```
Expected: Extracted text from PDF displayed

### Test Data Processor:
```bash
node services/dataProcessor.js
```
Expected: Parsed commodity data displayed

### Test Database Model:
```bash
node testModel.js
```
Expected: "✅ All tests passed!"

### Test Full Upload (Manual):
1. Start server: `node server.js`
2. Use Postman, Thunder Client, or curl
3. POST to `http://localhost:5000/api/upload`
4. Attach a PDF file with form-data key `file`
5. Check response and server logs

---

## 🔧 Troubleshooting

### Issue: "Cannot connect to database"
**Solution:**
- Check if PostgreSQL is running
- Verify credentials in `.env`
- Test connection: `psql -U postgres -d agri_price_tracker`

### Issue: "Error: ENOENT: no such file or directory, open 'uploads/...'"
**Solution:**
- Create uploads folder: `mkdir uploads`
- Check file permissions

### Issue: "Only PDF files are allowed"
**Solution:**
- Make sure you're uploading a PDF file
- Check file MIME type is `application/pdf`

### Issue: "Category not found"
**Solution:**
- Verify categories are inserted in database
- Run: `SELECT * FROM categories;`
- If missing, re-run category INSERT statements

### Issue: Port 5000 already in use
**Solution:**
- Change PORT in `.env` to another number (e.g., 5001)
- Or kill process using port 5000

### Issue: Module not found
**Solution:**
- Run `npm install` again
- Delete `node_modules` and `package-lock.json`, then `npm install`

---

## 📊 Database Queries (Useful Commands)

### Check saved commodities:
```sql
SELECT COUNT(*) FROM commodities;
```

### View commodities by category:
```sql
SELECT c.name, COUNT(co.id) as commodity_count
FROM categories c
LEFT JOIN commodities co ON c.id = co.category_id
GROUP BY c.name
ORDER BY commodity_count DESC;
```

### View recent price changes:
```sql
SELECT 
  co.name,
  pc.old_price,
  pc.new_price,
  pc.change_percentage,
  pc.change_date
FROM price_changes pc
JOIN commodities co ON pc.commodity_id = co.id
ORDER BY pc.change_date DESC
LIMIT 10;
```

### View price history for specific commodity:
```sql
SELECT date, price 
FROM price_history
WHERE commodity_id = 1
ORDER BY date DESC;
```

---

## 👥 Team Setup Instructions

### For Your Partner:

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd pricetrackerph
   ```

2. **Install Node.js** (if not installed)
   - Download from nodejs.org
   - Verify: `node --version`

3. **Install PostgreSQL** (if not installed)
   - Follow instructions in Prerequisites section
   - Remember your postgres password!

4. **Install dependencies**
   ```bash
   npm install
   ```

5. **Set up database**
   - Follow all steps in "Database Setup" section
   - Don't skip any SQL commands!

6. **Create `.env` file**
   - Copy the template from "Environment Configuration"
   - Update with your postgres password

7. **Create uploads folder**
   ```bash
   mkdir uploads
   ```

8. **Test the setup**
   ```bash
   node testDb.js
   ```
   Should see: "✅ Database connection successful!"

9. **Start the server**
   ```bash
   node server.js
   ```

10. **Test upload**
    - Use Postman or Thunder Client
    - Upload a PDF to `http://localhost:5000/api/upload`

---

## 🔐 Security Notes

- Never commit `.env` file
- Never commit `node_modules`
- Keep PostgreSQL password secure
- Use environment variables for all sensitive data

---

## 📝 Notes

- PDFs are temporarily stored in `uploads/` and automatically deleted after processing
- Price changes are only recorded if difference is ≥ 5%
- Default unit is `kg` for all commodities
- System handles duplicate uploads (upserts price for same date)
- Invalid/unparseable lines are skipped with warnings in console

---

## 🚧 Future Enhancements

- [ ] Additional API endpoints (search, filter, trends)
- [ ] Automated PDF fetching from DA website
- [ ] Price prediction using historical data
- [ ] Email/SMS alerts for significant price changes
- [ ] Admin dashboard for data management
- [ ] Export data to CSV/Excel
- [ ] Real-time WebSocket updates

---

## 📞 Support

If you encounter issues:
1. Check Troubleshooting section
2. Verify all prerequisites are installed
3. Check server logs for error messages
4. Verify database connection and data

---

## 📄 License

[Your License Here]

---

**Built with ❤️ for Agricultural Price Transparency**
