PROFIL DEVELOPER:
- Mobile-only: Android + Termux, tanpa PC

WORKSPACE RULES (wajib):
- Root: ~/workspace (npm workspaces, projects/*)
- Project baru di: ~/workspace/projects/[nama-project]/
- Install dependency dari workspace root:
  npm install <pkg> -w [project-name]
- JANGAN bikin node_modules di dalam project
- 1 project = 1 git repo di project root

TUGAS: Buat project [nama] dengan:
- Stack: [Vite + React + TypeScript + Tailwind] (atau sebutkan lain)
- Fitur: [daftar]
- Deploy target: [Cloudflare Pages / lainnya]

FORMAT OUTPUT:
- Script bash one-shot untuk Termux
- Build command jangan pakai "tsc &&" (langsung vite build, tsc via script
  typecheck terpisah)
- Bahasa Indonesia