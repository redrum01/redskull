🟥 Redskull – The All-Seeing Crawler
"You could have the power of the gods!" – But you choose to crawl websites instead.

🕵️ What is Redskull?
Redskull is a TypeScript-powered web crawler that interrogates a site's robots.txt and uncovers all available sitemap.xml URLs.
It organizes discovered links into a tree-like structure, providing a clear view of a site's architecture.

No infinity stones required—just pnpm or npm.

🚀 Features
🔹 Fetches and parses robots.txt to understand crawl permissions.
🔹 Extracts and analyzes all sitemap URLs while respecting robot rules.
🔹 Filters outdated links and keeps results relevant.
🔹 Visualizes site structure in an easy-to-read tree format.

🛠 Setup
Experimenting with pnpm, so if you don’t have it yet:
npm install -g pnpm@latest-10

🏗 Installation & Usage
1️⃣ Install dependencies:
'pnpm install'

2️⃣ Set the target website in main.ts:
const siteUrl = 'https://your-site.com/'; // Change this to your desired site

3️⃣ Highly recommended: Since the output is quite large, save it for later review:
pnpm run dev | tee output.log
(This ensures nothing gets lost in the terminal!)

4️⃣ Run the crawler normally if needed:
pnpm run dev

🕶 Debugging (Optional)
If you want to debug the script using VS Code, use the provided launch.json configuration.