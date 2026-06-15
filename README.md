# Ocean Tap 🌊

Ocean Tap is a fast-paced, 2D clicking game built with modern web technologies. Players tap on sea creatures swimming across the screen to score points, build combos, and climb the global leaderboard.

## 🚀 Features

- **PixiJS Game Engine:** Smooth, hardware-accelerated 2D rendering for an optimal gaming experience.
- **Dynamic Gameplay:** Various creatures with different speeds, sizes, and point values.
- **Combo System:** String together successful taps without missing to multiply your score!
- **Global Leaderboard:** Compete with players worldwide for the top spot.
- **Authentication:** Seamless Google Sign-In powered by Firebase.
- **Guest Mode:** Jump right into the action without logging in.
- **Responsive Design:** Optimized for both desktop and mobile screens.

## 🛠 Tech Stack

- **Frontend Framework:** React 18 & Vite
- **Game Engine:** PixiJS (v8)
- **Styling:** Tailwind CSS + Shadcn UI
- **Backend & Database:** Firebase (Authentication, Firestore Database)
- **Deployment:** Vercel

## 📦 Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/tducn110/ClickingFast.git
   cd ClickingFast
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure Environment Variables:
   Create a `.env` file in the root directory and add your Firebase configuration. You can copy the template from `.env.example`:
   ```env
   VITE_FIREBASE_API_KEY=your_api_key
   VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
   VITE_FIREBASE_PROJECT_ID=your_project_id
   VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket
   VITE_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
   VITE_FIREBASE_APP_ID=your_app_id
   VITE_FIREBASE_MEASUREMENT_ID=your_measurement_id
   ```

4. Start the development server:
   ```bash
   npm run dev
   ```

## 🎮 How to Play

1. Log in with Google or continue as a Guest.
2. Tap "Start Fishing" to begin.
3. Tap on the fish and creatures as they swim by.
4. **Combos:** Don't miss! Sequential hits build a combo multiplier for higher scores.
5. **Game Over:** Missing too many creatures will end your run.

## 🚀 Deployment

This project is deployed using [Vercel](https://vercel.com/).
When pushing to the `main` branch, Vercel will automatically trigger a new deployment. Ensure your Firebase environment variables are added to the Vercel Project Settings for production builds.

## 📄 License

This project is open-source. Feel free to fork and modify!
