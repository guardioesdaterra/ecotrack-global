# EcoTrack Global

A modern web application for tracking and visualizing environmental initiatives worldwide.

## 🌱 Features

- Interactive global map visualization with particle effects and activity markers
- Submit and monitor environmental activities with geolocation support
- User authentication with Google via Supabase
- Responsive design optimized for desktop and mobile devices
- Profile management for registered users
- Dark mode support

## 📋 Tech Stack

- **Frontend**: Next.js 15.2.4, React 19.0.0, TailwindCSS 3.4.17
- **UI Components**: Radix UI, Shadcn UI
- **Authentication**: Supabase Auth
- **Database**: Supabase PostgreSQL
- **Mapping**: Leaflet and React Leaflet
- **Animation**: Framer Motion
- **State Management**: React Context API

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ and npm/yarn
- Supabase account (free tier works for development)
- mkcert for local HTTPS certificates (required for geolocation features)

### Installation

1. Clone the repository
```bash
git clone https://github.com/your-username/ecotrack-global.git
cd ecotrack-global
```

2. Install dependencies
```bash
npm install
# or
yarn install
```

3. Generate HTTPS certificates for local development
```bash
npm run cert
```
This will use mkcert to generate localhost certificates. If you don't have mkcert installed, follow the instructions in the terminal.

4. Create a `.env.local` file with the following variables:
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Supabase Configuration

1. Create a new project in Supabase
2. Set up your database using the SQL schema below
3. Configure Google OAuth in the Authentication settings
4. Add your localhost URLs to the redirect URLs in the Auth settings

#### Database Schema

Run the following SQL in your Supabase SQL editor:

```sql
-- Create the main ecotrack table
CREATE TABLE ecotrack (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  type TEXT NOT NULL, 
  description TEXT NOT NULL,
  country TEXT NOT NULL,
  city TEXT,
  street TEXT,
  email TEXT,
  hyperlink TEXT,
  responsible TEXT,
  latitude NUMERIC,
  longitude NUMERIC,
  photos TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable Row Level Security (RLS)
ALTER TABLE ecotrack ENABLE ROW LEVEL SECURITY;

-- Policy for viewing all records (public read)
CREATE POLICY "Public can view all activities" ON ecotrack
  FOR SELECT USING (true);

-- Policy for inserting records (authenticated users only)
CREATE POLICY "Authenticated users can insert" ON ecotrack
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Policy for updating own records
CREATE POLICY "Users can update their own activities" ON ecotrack
  FOR UPDATE USING (auth.uid() = user_id);

-- Policy for deleting own records
CREATE POLICY "Users can delete their own activities" ON ecotrack
  FOR DELETE USING (auth.uid() = user_id);
```

### Google Authentication Setup

1. Create a project in the [Google Cloud Console](https://console.cloud.google.com/)
2. Enable the Google OAuth API
3. Create credentials (OAuth client ID)
4. Set up authorized JavaScript origins (including `https://localhost:3000`)
5. Set up authorized redirect URIs (including `https://localhost:3000/auth/callback`)
6. Add the Client ID and Secret to Supabase Auth settings

### Running the Application

For development with HTTPS (recommended for geolocation features):
```bash
npm run dev:https
```

For regular development:
```bash
npm run dev
```

Open [https://localhost:3000](https://localhost:3000) or [http://localhost:3000](http://localhost:3000) in your browser.

### Database Seeding

To populate your database with sample environmental activities:

```bash
npm run seed
```

## 📱 Core Features

### Map Visualization

The application's main feature is an interactive world map that displays environmental activities. The map includes:

- Activity markers with popup details
- Particle effects connecting related activities
- Filtering by activity type and location
- Responsive design for mobile and desktop

### User Authentication

- Google OAuth integration via Supabase
- Protected routes for authenticated users
- User profile management

### Environmental Activity Submission

- Multi-step form with validation
- Geolocation support for accurate positioning
- Address lookup and reverse geocoding
- Image uploads for documentation

## 🛠️ Development Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start the development server (HTTP) |
| `npm run dev:https` | Start the development server with HTTPS |
| `npm run cert` | Generate self-signed certificates for HTTPS |
| `npm run build` | Build the application for production |
| `npm run start` | Start the production server |
| `npm run lint` | Run eslint |
| `npm run seed` | Seed the database with sample data |

## 🚢 Deployment

### Deploying to Vercel

1. Connect your GitHub repository to Vercel
2. Set the environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
3. Deploy

### Deploying to Other Platforms

1. Build the application:
```bash
npm run build
```

2. Start the production server:
```bash
npm run start
```

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgements

- [Next.js](https://nextjs.org/)
- [Supabase](https://supabase.io/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Leaflet](https://leafletjs.com/)
- [Framer Motion](https://www.framer.com/motion/)
- [Radix UI](https://www.radix-ui.com/)
- [Lucide Icons](https://lucide.dev/) 