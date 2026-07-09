# Seyon Microfinance Management System 🏦

Seyon Microfinance Management System is an enterprise-grade web application built to manage microfinance operations, including street-wise groups (Kulu), member registers, loan assignments, dynamic schemes, automated weekly collections desk tracking, P&L statements, operational expenses, and audit security trails.

---

## 🛠️ Technology Stack

- **Frontend SPA**: React 19, TypeScript, Tailwind CSS, Vite, Lucide Icons, Recharts, React Router, and TanStack Query.
- **Backend API**: Node.js, Express.js.
- **Database Layer**: MongoDB, Mongoose ODM.
- **Authentication**: Role-Based Access Control, JWT, Refresh Tokens, and BCrypt Hashing.
- **Reporting Services**: PDF Generation (`pdfkit`), Excel Spreadsheet Generation (CSV exports).

---

## 📁 System Architecture

```text
client/            # React 19 Frontend SPA
  ├── public/
  ├── src/
  │   ├── components/  # Shared layouts & navbar wrappers
  │   ├── pages/       # Login, Dashboard, Collections, Members, Reports, Staff, Expenses
  │   ├── App.tsx      # Main routing gates, contexts (Auth, Theme)
  │   └── main.tsx
  ├── tsconfig.json
  └── tailwind.config.js

server/            # Express.js REST API Backend
  ├── src/
  │   ├── config/      # Database connect client, Cloudinary fallbacks
  │   ├── controllers/ # Auth, Dashboard metrics, Loans, Collections, Backups
  │   ├── middlewares/ # Auth verification, DDoS rate limiting, Error boundary
  │   ├── models/      # Mongoose schemas (13 collections)
  │   ├── routes/      # REST API endpoints mappings
  │   └── index.js     # Entrypoint server bootstrap
  ├── seed.js        # Realistic database seeder
  ├── test_api.js    # API integration tests
  └── package.json
```

---

## 🚀 Installation & Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (version 18+ recommended)
- [MongoDB](https://www.mongodb.com/) (running locally on port `27017` or via MongoDB Atlas URI)

### 1. Database Seeding & Backend Run

```bash
# Navigate to the server folder
cd server

# Create your .env file
# Customize MONGODB_URI and JWT secrets if required
cp .env.example .env

# Install backend dependencies
npm install

# Run database seeder (clears database and seeds default data)
npm run seed

# Start the Express server (defaults to port 5000)
npm run dev
```

### 2. Frontend React Client Run

```bash
# Open a new terminal and navigate to client
cd client

# Install dependencies (ignoring React 19 peer checks)
npm install --legacy-peer-deps

# Start Vite local development server (defaults to port 3000)
npm run dev
```

---

## 🔐 Default Demo Credentials

You can sign in with the following default accounts populated by the database seeder:

| Role | Email | Password |
| :--- | :--- | :--- |
| **Super Admin** | `admin@seyon.com` | `admin123` |
| **Manager** | `manager@seyon.com` | `manager123` |
| **Collection Officer** | `officer@seyon.com` | `officer123` |
| **Viewer / Auditor** | `viewer@seyon.com` | `viewer123` |

---

## 🧪 Integration Testing

You can run automated integration tests to assert that endpoints and database aggregates are functioning:

```bash
cd server
node test_api.js
```

---

## 🐳 Docker Deployment

The application features full Docker and Docker-Compose support:

```bash
# Build and launch database, server API, and client containers
docker-compose up --build
```

- **React Client SPA**: Accessible at `http://localhost:3000`
- **Express Backend API**: Accessible at `http://localhost:5000`
- **MongoDB**: Runs inside the container at port `27017`
