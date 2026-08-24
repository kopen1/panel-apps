irkop/
├── irkop-panel/                          # Web Admin Panel
│   ├── .env                              # Supabase credentials
│   ├── .env.example
│   ├── .gitignore
│   ├── package.json
│   ├── vite.config.ts
│   ├── tsconfig.json
│   ├── tsconfig.node.json
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   ├── index.html
│   ├── public/
│   │   ├── favicon.svg
│   │   └── _redirects                   # Cloudflare SPA routing
│   └── src/
│       ├── main.tsx                      # Entry point
│       ├── App.tsx                       # Routes
│       ├── index.css                     # Tailwind + custom styles
│       ├── vite-env.d.ts
│       ├── lib/
│       │   └── supabase.ts               # Supabase client
│       ├── utils/
│       │   ├── cn.ts                     # className utility
│       │   └── formatters.ts             # formatNumber, formatCurrency, formatDate
│       ├── context/
│       │   ├── AuthContext.tsx           # Auth state + admin profile
│       │   └── ThemeContext.tsx          # Dark/Light/Auto theme
│       ├── components/
│       │   ├── ui/
│       │   │   └── Modal.tsx             # Reusable modal
│       │   ├── layout/
│       │   │   ├── Layout.tsx            # Main layout wrapper
│       │   │   ├── Sidebar.tsx           # Navigation sidebar
│       │   │   └── Topbar.tsx            # Top bar with theme toggle
│       │   ├── shared/
│       │   │   ├── StatCard.tsx          # Stat display card
│       │   │   ├── DataTable.tsx         # Reusable table
│       │   │   └── AppUsersTable.tsx     # Per-app users table
│       │   └── modals/
│       │       ├── NewAppModal.tsx
│       │       ├── EditAppModal.tsx
│       │       └── DeleteAppModal.tsx
│       ├── routes/
│       │   └── ProtectedRoute.tsx        # Auth guard
│       └── pages/
│           ├── Login.tsx
│           ├── Dashboard.tsx
│           ├── Apps.tsx
│           ├── AppDetail.tsx
│           ├── AdsConfig.tsx              # Embedded in AppDetail
│           ├── Settings.tsx
│           ├── AuditLogs.tsx
│           └── NotFound.tsx
│
├── irkop-flutter-template/               # Flutter App Template (PLANNED - Fase 3)
│   ├── .github/workflows/
│   │   └── build-apk.yml
│   ├── lib/
│   │   ├── main.dart
│   │   ├── config/
│   │   │   ├── supabase_config.dart
│   │   │   └── remote_config.dart
│   │   ├── services/
│   │   │   ├── auth_service.dart
│   │   │   ├── ads_service.dart
│   │   │   └── user_service.dart
│   │   ├── screens/
│   │   │   ├── splash_screen.dart
│   │   │   ├── maintenance_screen.dart
│   │   │   ├── home_screen.dart
│   │   │   └── settings_screen.dart
│   │   ├── widgets/
│   │   │   ├── banner_ad_widget.dart
│   │   │   └── interstitial_ad_widget.dart
│   │   └── utils/
│   │       └── theme.dart
│   ├── android/
│   │   ├── app/build.gradle
│   │   └── app/src/main/AndroidManifest.xml
│   ├── pubspec.yaml
│   └── README.md
│
├── supabase/
│   ├── migrations/
│   │   └── irkop_migration_v2.sql        # Final consolidated SQL
│   └── README.md
│
├── docs/
│   ├── PRD.md                            # Product Requirements Document
│   ├── ARCHITECTURE.md                   # System architecture
│   └── DEPLOYMENT.md                     # Deployment guides
│
└── README.md                             # Project overview